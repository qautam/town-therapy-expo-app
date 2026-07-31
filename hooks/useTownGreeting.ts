import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getTimeOfDayGreeting } from '@/lib/townTime';

const GREETING_SYNC_MS = 60_000;

/** Time-of-day greeting from the device clock, recomputed whenever the screen is active. */
export function useTownGreeting() {
  const [tick, setTick] = useState(0);

  const sync = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    sync();
  }, [sync]);

  useFocusEffect(
    useCallback(() => {
      sync();

      const onAppStateChange = (state: AppStateStatus) => {
        if (state === 'active') sync();
      };
      const appStateSub = AppState.addEventListener('change', onAppStateChange);
      const interval = setInterval(sync, GREETING_SYNC_MS);

      return () => {
        appStateSub.remove();
        clearInterval(interval);
      };
    }, [sync])
  );

  void tick;
  return getTimeOfDayGreeting();
}
