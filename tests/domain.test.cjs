const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseMoney, formatCurrency, moneyInput, MAX_MINOR } = require('../utils/currency.ts');
const { defaultData, validateData, migrateLegacy, calculateStats, newPersonId } = require('../utils/data.ts');
const { createRepository, STORAGE_KEYS: K } = require('../utils/repository.ts');
const { planReminders, createReminderService } = require('../utils/reminders.ts');
const { createTranslator } = require('../utils/i18n.ts');

function person(overrides = {}) {
  return { id: '1', name: 'Anna', presentType: '', presentName: '', priceLimitMinor: 5000, isBought: false, ...overrides };
}
function data(overrides = {}) {
  return { ...defaultData('hu', 2026), people: [person()], ...overrides };
}
function enabled() { const d = data(); d.settings.notificationsEnabled = true; return d; }
function memory(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values,
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); },
    async multiRemove(keys) { keys.forEach(key => values.delete(key)); },
  };
}

test('money accepts dot, comma and properly grouped unicode spaces exactly', () => {
  for (const input of ['12,99', '12.99']) assert.equal(parseMoney(input), 1299);
  for (const input of ['10 000', '10\u00a0000', '10\u202f000']) assert.equal(parseMoney(input), 1000000);
  assert.equal(parseMoney('0'), 0);
  assert.equal(parseMoney('0,10') + parseMoney('0.20'), 30);
  assert.equal(parseMoney(moneyInput(1299)), 1299);
  assert.equal(parseMoney('1000000000'), MAX_MINOR);
});
test('money rejects invalid, negative, partial, ambiguous, overprecise and excessive inputs', () => {
  for (const input of ['', 'abc', '-100', '+12', '12xyz', '1,234', '1.234,56', '10 00', '1 2', 'Infinity', '1e3', '1000000000.01']) {
    assert.throws(() => parseMoney(input), input);
  }
  assert.throws(() => parseMoney('0', false));
  assert.match(formatCurrency(1000000, 'HUF', 'hu'), /10\s000\sFt/);
  assert.match(formatCurrency(1299, 'HUF', 'hu'), /12,99/);
  assert.match(formatCurrency(1299, 'EUR', 'de'), /12,99/);
});
test('spending and estimates count zero purchased prices and exclude retained unchecked prices', () => {
  const stats = calculateStats([person({ isBought: true, actualPriceMinor: 0 }), person({ id: '2', actualPriceMinor: 9000 })], 5000);
  assert.equal(stats.spentMinor, 0); assert.equal(stats.estimatedMinor, 5000); assert.equal(stats.plannedMinor, 10000);
  assert.equal(stats.percent, 50); assert.equal(stats.estimatedOverMinor, 0);
  assert.equal(calculateStats([person({ isBought: true, actualPriceMinor: 5001 })], 5000).overMinor, 1);
  assert.equal(calculateStats([person({ isBought: true, actualPriceMinor: 5001 })], null).overMinor, 0);
  assert.equal(calculateStats([], null).percent, 0);
});
test('legacy migration preserves purchases and amounts and fills optional settings', () => {
  const migrated = migrateLegacy(JSON.stringify([{ id: 'old', name: 'Anna', priceLimit: 12.99, isBought: true, actualPrice: 0 }]),
    JSON.stringify({ globalBudgetLimit: 0, currency: 'HUF', language: 'hu' }), defaultData('en', 2026));
  assert.equal(migrated.people[0].priceLimitMinor, 1299); assert.equal(migrated.people[0].actualPriceMinor, 0);
  assert.equal(migrated.settings.globalBudgetLimitMinor, null); assert.equal(migrated.settings.language, 'hu');
  assert.equal(migrated.settings.reminderHour, 9); assert.equal(migrated.shoppingYear, 2026);
  assert.throws(() => migrateLegacy('[{"id":"x","name":"A","priceLimit":null,"isBought":false}]', null, defaultData()));
  assert.throws(() => migrateLegacy('[{"id":"x","name":"A","priceLimit":1.234,"isBought":false}]', null, defaultData()));
});
test('schema rejects corrupt types, duplicate IDs and impossible bought states', () => {
  assert.throws(() => validateData({ ...data(), people: [person(), person()] }));
  assert.throws(() => validateData(data({ people: [person({ isBought: true })] })));
  assert.throws(() => validateData(data({ people: [person({ actualPriceMinor: -1 })] })));
  const d = data(); d.settings.currency = 'GBP'; assert.throws(() => validateData(d));
  const ids = Array.from({ length: 100 }, () => newPersonId([])); assert.equal(new Set(ids).size, 100);
});
test('repository migrates once, verifies output, preserves sources and reloads purchases', async () => {
  const oldPeople = '[{"id":"old","name":"Anna","priceLimit":12.99,"isBought":false}]';
  const store = memory({ [K.people]: oldPeople });
  const repo = createRepository(store, () => defaultData('hu', 2026));
  const migrated = await repo.load();
  assert.equal(migrated.people[0].priceLimitMinor, 1299); assert.equal(store.values.get(K.people), oldPeople);
  assert.equal(JSON.parse(store.values.get(K.legacyBackup)).people, oldPeople);
  await repo.update(d => ({ ...d, people: d.people.map(p => ({ ...p, isBought: true, actualPriceMinor: 0 })) }));
  const reloaded = await createRepository(store, () => defaultData()).load();
  assert.equal(reloaded.people[0].actualPriceMinor, 0); assert.equal(reloaded.people[0].isBought, true);
});
test('failed migration verification preserves old data and blocks updates', async () => {
  const source = '[{"id":"a","name":"A","priceLimit":10,"isBought":false}]';
  const store = memory({ [K.people]: source });
  const realGet = store.getItem;
  let writes = false;
  const realSet = store.setItem;
  store.setItem = async (key, value) => { await realSet(key, value); if (key === K.data) writes = true; };
  store.getItem = async key => key === K.data && writes ? '{broken' : realGet(key);
  const repo = createRepository(store, () => defaultData());
  await assert.rejects(repo.load()); await assert.rejects(repo.update(d => d));
  assert.equal(store.values.get(K.people), source); assert.ok(store.values.has(K.legacyBackup));
});
test('corrupt current data is never mistaken for an empty list or overwritten', async () => {
  const store = memory({ [K.data]: '{broken', [K.backup]: JSON.stringify(data()) });
  const repo = createRepository(store, () => defaultData());
  await assert.rejects(repo.load()); await assert.rejects(repo.update(d => ({ ...d, people: [] })));
  assert.equal(store.values.get(K.data), '{broken');
  assert.equal((await repo.restore()).people.length, 1); assert.equal(store.values.get(K.damaged), '{broken');
});
test('failed writes reject, retain the successful snapshot and allow a later retry', async () => {
  const store = memory(); const repo = createRepository(store, () => defaultData('hu', 2026)); await repo.load();
  const realSet = store.setItem; let fail = true;
  store.setItem = async (key, value) => { if (key === K.data && fail) throw Error('disk full'); await realSet(key, value); };
  await assert.rejects(repo.update(d => ({ ...d, shoppingYear: 2027 })));
  assert.equal(JSON.parse(store.values.get(K.data)).shoppingYear, 2026);
  fail = false; const saved = await repo.update(d => ({ ...d, people: [person()] }));
  assert.equal(saved.shoppingYear, 2026); assert.equal(saved.people.length, 1);
});
test('queued mutations use the newest state and a rejected write does not poison the queue', async () => {
  const store = memory(); const repo = createRepository(store, () => defaultData()); await repo.load();
  const append = id => repo.update(d => ({ ...d, people: [...d.people, person({ id })] }));
  const result = await Promise.all([append('a'), append('b')]);
  assert.deepEqual(result[1].people.map(p => p.id), ['a', 'b']);
  await assert.rejects(append('a')); assert.equal((await append('c')).people.length, 3);
});
test('clear removes all app keys including damaged and migration copies, but not unrelated keys', async () => {
  const store = memory({ unrelated: 'keep' }); const repo = createRepository(store, () => defaultData()); await repo.load();
  Object.values(K).forEach(key => store.values.set(key, 'private'));
  await repo.clear(); assert.deepEqual([...store.values.entries()], [['unrelated', 'keep']]);
});
test('empty, disabled and complete lists never produce reminders', () => {
  const d = enabled(), now = new Date(2026, 9, 12);
  assert.equal(planReminders(d, now).length, 7);
  assert.equal(planReminders({ ...d, people: [] }, now).length, 0);
  assert.equal(planReminders({ ...d, people: [person({ isBought: true, actualPriceMinor: 0 })] }, now).length, 0);
  assert.equal(planReminders(data(), now).length, 0);
});
test('time boundaries and shopping year are explicit and never roll old lists into a new year', () => {
  const d = enabled();
  assert.equal(planReminders(d, new Date(2026, 11, 24, 8, 59))[0].date.getHours(), 9);
  assert.equal(planReminders(d, new Date(2026, 11, 24, 9)).length, 0);
  assert.equal(planReminders(d, new Date(2026, 11, 25)).length, 0);
  assert.equal(planReminders(d, new Date(2027, 0, 1)).length, 0);
  assert.equal(planReminders({ ...d, shoppingYear: 2027 }, new Date(2027, 0, 1)).length, 7);
  d.settings.reminderDays = [24, 1]; d.settings.reminderHour = 18; d.settings.reminderMinute = 30;
  const planned = planReminders(d, new Date(2026, 9, 12));
  assert.equal(planned[0].date.getDate(), 1); assert.equal(planned[0].date.getHours(), 18);
  assert.equal(planned[0].date.getMinutes(), 30); assert.doesNotMatch(planned[0].body, /Anna/);
});
test('permission is requested only by explicit action; denial and revocation cancel existing reminders', async () => {
  let requests = 0, scheduled = [], permission = 'granted';
  const service = createReminderService({ async permission(request) { if (request) requests++; return permission; },
    async cancelAll() { scheduled = []; }, async schedule(r) { scheduled.push(r); } }, () => new Date(2026, 9, 12));
  await service.reconcile(data()); assert.equal(requests, 0); assert.equal(scheduled.length, 0);
  await service.requestPermission(); assert.equal(requests, 1);
  const status = await service.reconcile(enabled()); assert.equal(scheduled.length, 7); assert.ok(status.next);
  permission = 'denied'; assert.equal((await service.reconcile(enabled())).next, null); assert.equal(scheduled.length, 0);
  assert.equal(requests, 1);
});
test('concurrent refreshes leave only the final list schedule and partial errors are cleared', async () => {
  let scheduled = [], count = 0, fail = false;
  const service = createReminderService({ async permission() { return 'granted'; },
    async cancelAll() { scheduled = []; }, async schedule(r) { count++; if (fail && count % 3 === 0) throw Error('schedule failed'); scheduled.push(r); }
  }, () => new Date(2026, 9, 12));
  await Promise.all([service.reconcile(enabled()), service.reconcile({ ...enabled(), people: [] })]);
  assert.equal(scheduled.length, 0);
  fail = true; await assert.rejects(service.reconcile(enabled())); assert.equal(scheduled.length, 0);
  fail = false; await service.reconcile(enabled()); assert.equal(scheduled.length, 7);
  assert.equal(new Set(scheduled.map(r => r.identifier)).size, 7);
});
test('all translations have identical keys and interpolate notification counts', () => {
  const en = require('../translations/en.ts').default;
  for (const language of ['hu', 'de']) {
    const translated = require(`../translations/${language}.ts`).default;
    assert.deepEqual(Object.keys(translated).sort(), Object.keys(en).sort());
    assert.doesNotMatch(createTranslator(language)('reminderBody', { bought: 3, total: 8, percent: 38 }), /\{/);
  }
});
