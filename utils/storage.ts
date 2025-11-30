import AsyncStorage from '@react-native-async-storage/async-storage';
import { Person, AppSettings, Currency, Language } from '../types';
import { setLanguage } from './i18n';
import { updateScheduledNotifications, cancelAllNotifications } from './notifications';

const PEOPLE_KEY = '@krampus:people';
const SETTINGS_KEY = '@krampus:settings';

const DEFAULT_SETTINGS: AppSettings = {
  globalBudgetLimit: 0,
  defaultPriceLimit: 50,
  notificationsEnabled: false,
  currency: 'USD',
  language: 'en',
};

export const getPeople = async (): Promise<Person[]> => {
  try {
    const data = await AsyncStorage.getItem(PEOPLE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading people:', error);
    return [];
  }
};

export const savePeople = async (people: Person[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
    // Update notifications when people list changes
    await updateScheduledNotifications();
  } catch (error) {
    console.error('Error saving people:', error);
  }
};

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    if (data) {
      const settings = JSON.parse(data);
      // Set language in i18n when loading settings
      if (settings.language) {
        setLanguage(settings.language);
      }
      return settings;
    }
    // Initialize with default settings if none exist
    await saveSettings(DEFAULT_SETTINGS);
    setLanguage(DEFAULT_SETTINGS.language);
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Update i18n language when saving settings
    if (settings.language) {
      setLanguage(settings.language);
    }
    // Update notifications when settings change
    if (settings.notificationsEnabled) {
      await updateScheduledNotifications();
    } else {
      await cancelAllNotifications();
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

