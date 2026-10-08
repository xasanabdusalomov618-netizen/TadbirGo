import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './uz.js';
import ru from './ru.js';
import en from './en.js';

export const LANGUAGES = [
  { code: 'uz', label: 'O‘zbek', short: 'UZ', flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', short: 'RU', flag: '🇷🇺' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
];

export const STORAGE_KEY = 'eventbox_language';

const initial = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'uz';
  } catch {
    return 'uz';
  }
})();

i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: initial,
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
});

export function setLanguage(code) {
  i18n.changeLanguage(code);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = code;
}

if (typeof document !== 'undefined') document.documentElement.lang = initial;

export default i18n;
