import { en, type EnKey } from './en';
import { hi } from './hi';
import type { AppLocale } from './types';

const catalogs: Record<AppLocale, Record<EnKey, string>> = {
  en: en as Record<EnKey, string>,
  hi,
};

export type { AppLocale, EnKey };
export { LOCALE_STORAGE_KEY } from './types';

export function translate(
  locale: AppLocale,
  key: EnKey,
  vars?: Record<string, string | number>
): string {
  const template = catalogs[locale]?.[key] ?? catalogs.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] != null ? String(vars[name]) : `{${name}}`
  );
}

export const localeLabels: Record<AppLocale, string> = {
  en: 'English',
  hi: 'हिन्दी',
};
