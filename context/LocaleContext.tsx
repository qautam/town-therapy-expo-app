import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { LOCALE_STORAGE_KEY, translate, type AppLocale, type EnKey } from '@/lib/i18n';

type LocaleContextValue = {
  locale: AppLocale;
  ready: boolean;
  /** True until the user has explicitly chosen a language at least once. */
  needsLanguagePick: boolean;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: EnKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en');
  const [ready, setReady] = useState(false);
  const [needsLanguagePick, setNeedsLanguagePick] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (!active) return;
        if (saved === 'en' || saved === 'hi') {
          setLocaleState(saved);
          setNeedsLanguagePick(false);
        } else {
          setLocaleState('en');
          setNeedsLanguagePick(true);
        }
      } catch {
        if (active) {
          setLocaleState('en');
          setNeedsLanguagePick(true);
        }
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback(async (next: AppLocale) => {
    setLocaleState(next);
    setNeedsLanguagePick(false);
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: EnKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, ready, needsLanguagePick, setLocale, t }),
    [locale, ready, needsLanguagePick, setLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
