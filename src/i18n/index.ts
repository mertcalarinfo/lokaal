import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from './en.json';
import de from './de.json';

const LANGUAGE_KEY = '@prezence_language';

// Default to German when the device language OR region is German; otherwise
// English. Only used on first launch (no saved preference yet) — once the user
// picks a language anywhere, that choice is saved and always wins.
const detectDeviceLanguage = (): 'en' | 'de' => {
  try {
    const locales = Localization.getLocales();
    const isGerman = locales.some(
      (l) =>
        l.languageCode?.toLowerCase() === 'de' ||
        l.regionCode?.toUpperCase() === 'DE'
    );
    return isGerman ? 'de' : 'en';
  } catch {
    return 'en';
  }
};

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }
      // First launch — fall back to the device locale/region.
      callback(detectDeviceLanguage());
    } catch {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // ignore
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
  });

export const changeLanguage = async (language: 'en' | 'de'): Promise<void> => {
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // ignore
  }
};

export default i18n;
