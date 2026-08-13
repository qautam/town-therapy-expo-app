export type AppLocale = 'en' | 'hi';

export type TranslationKey = keyof typeof import('./en').en;

export const LOCALE_STORAGE_KEY = '@town_therapy_locale_v1';
