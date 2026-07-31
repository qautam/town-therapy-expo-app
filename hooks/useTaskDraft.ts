import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const DRAFT_PREFIX = '@town_therapy/draft:';
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type DraftEnvelope<T> = {
  savedAt: number;
  value: T;
};

type Options<T> = {
  /** Skip auto-save while true (e.g. mid-submit). */
  pause?: boolean;
  onRestore?: (value: T) => void;
};

/**
 * Persists in-progress task state when the app backgrounds or the OS restarts the process.
 */
export function useTaskDraft<T>(key: string, initialValue: T, options?: Options<T>) {
  const storageKey = `${DRAFT_PREFIX}${key}`;
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!active) return;

        if (raw) {
          const envelope = JSON.parse(raw) as DraftEnvelope<T>;
          if (Date.now() - envelope.savedAt > MAX_DRAFT_AGE_MS) {
            await AsyncStorage.removeItem(storageKey);
          } else {
            setValue(envelope.value);
            options?.onRestore?.(envelope.value);
          }
        }
      } catch {
        try {
          await AsyncStorage.removeItem(storageKey);
        } catch {
          // ignore corrupt draft
        }
      } finally {
        if (active) setHydrated(true);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once per screen key
  }, [storageKey]);

  const persist = useCallback(async () => {
    if (options?.pause) return;

    try {
      const envelope: DraftEnvelope<T> = {
        savedAt: Date.now(),
        value: valueRef.current,
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(envelope));
    } catch {
      // ignore quota / serialization errors
    }
  }, [options?.pause, storageKey]);

  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        void persist();
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => {
      subscription.remove();
      void persist();
    };
  }, [persist]);

  useEffect(() => {
    if (!hydrated || options?.pause) return;

    const timer = setTimeout(() => {
      void persist();
    }, 600);

    return () => clearTimeout(timer);
  }, [hydrated, options?.pause, persist, value]);

  const setDraftValue = useCallback((next: T | ((prev: T) => T)) => {
    setValue(next);
  }, []);

  return {
    value,
    setValue: setDraftValue,
    hydrated,
    clearDraft,
    persist,
  };
}
