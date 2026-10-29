import { AppData } from '../types';
import { migrateLegacy, readStoredData, validateData } from './data';

export const STORAGE_KEYS = {
  data: '@krampus:data:v2', backup: '@krampus:last-good:v2', legacyBackup: '@krampus:migration-source',
  damaged: '@krampus:damaged', people: '@krampus:people', settings: '@krampus:settings',
};
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}
export function createRepository(storage: StorageAdapter, defaults: () => AppData) {
  let current: AppData | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  }
  async function verifiedWrite(data: AppData) {
    const encoded = JSON.stringify(validateData(data));
    await storage.setItem(STORAGE_KEYS.data, encoded);
    if (await storage.getItem(STORAGE_KEYS.data) !== encoded) throw new Error('verificationFailed');
  }
  return {
    load: () => serial(async () => {
      current = null;
      const raw = await storage.getItem(STORAGE_KEYS.data);
      if (raw !== null) { current = readStoredData(JSON.parse(raw)); return current; }
      const [people, settings] = await Promise.all([storage.getItem(STORAGE_KEYS.people), storage.getItem(STORAGE_KEYS.settings)]);
      // Retain both legacy keys until the new snapshot is verified (and afterwards for recovery).
      if (people !== null || settings !== null) await storage.setItem(STORAGE_KEYS.legacyBackup, JSON.stringify({ people, settings }));
      const data = migrateLegacy(people, settings, defaults());
      await verifiedWrite(data);
      await storage.setItem(STORAGE_KEYS.backup, JSON.stringify(data));
      current = data;
      return data;
    }),
    update: (change: (data: AppData) => AppData) => serial(async () => {
      if (!current) throw new Error('notLoaded');
      const next = validateData(change(current));
      await storage.setItem(STORAGE_KEYS.backup, JSON.stringify(current));
      await storage.setItem(STORAGE_KEYS.data, JSON.stringify(next));
      current = next;
      return next;
    }),
    restore: () => serial(async () => {
      current = null;
      const raw = await storage.getItem(STORAGE_KEYS.backup);
      if (raw === null) throw new Error('noBackup');
      const restored = readStoredData(JSON.parse(raw));
      const damaged = await storage.getItem(STORAGE_KEYS.data);
      if (damaged !== null) await storage.setItem(STORAGE_KEYS.damaged, damaged);
      await verifiedWrite(restored);
      current = restored;
      return restored;
    }),
    clear: () => serial(async () => {
      current = null;
      await storage.multiRemove(Object.values(STORAGE_KEYS));
      const remaining = await Promise.all(Object.values(STORAGE_KEYS).map(key => storage.getItem(key)));
      if (remaining.some(raw => raw !== null)) throw new Error('deleteFailed');
    }),
  };
}
