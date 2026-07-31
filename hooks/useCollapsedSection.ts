import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const PREFIX = '@town_therapy_collapsed:';

export function useCollapsedSection(key: string, defaultCollapsed = false) {
  const storageKey = `${PREFIX}${key}`;
  const [collapsed, setCollapsedState] = useState(defaultCollapsed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!active) return;
        if (value === '1') setCollapsedState(true);
        if (value === '0') setCollapsedState(false);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [storageKey]);

  const setCollapsed = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      setCollapsedState((current) => {
        const value = typeof next === 'function' ? next(current) : next;
        AsyncStorage.setItem(storageKey, value ? '1' : '0').catch(() => undefined);
        return value;
      });
    },
    [storageKey]
  );

  const toggle = useCallback(() => setCollapsed((current) => !current), [setCollapsed]);

  return { collapsed, setCollapsed, toggle, ready };
}
