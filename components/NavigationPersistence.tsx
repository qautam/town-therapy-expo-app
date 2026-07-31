import { useNavigationContainerRef } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { saveNavigationState } from '@/lib/appSession';

type Props = {
  /** Navigation tree captured from the previous session (cold start only). */
  initialNavigationState?: Record<string, unknown>;
};

/**
 * Restores the last screen stack on cold start and keeps it saved while the user works.
 */
export function NavigationPersistence({ initialNavigationState }: Props) {
  const navigationRef = useNavigationContainerRef();
  const restoredRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !initialNavigationState) return undefined;

    const restore = () => {
      if (restoredRef.current || !navigationRef.isReady()) return;
      restoredRef.current = true;
      navigationRef.resetRoot(initialNavigationState as never);
    };

    const unsubscribe = navigationRef.addListener('state', restore);
    restore();

    return unsubscribe;
  }, [initialNavigationState, navigationRef]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const persistNow = () => {
      if (!navigationRef.isReady()) return;
      const state = navigationRef.getRootState();
      if (state) void saveNavigationState(state as Record<string, unknown>);
    };

    const schedulePersist = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(persistNow, 200);
    };

    const stateUnsubscribe = navigationRef.addListener('state', schedulePersist);

    const appStateSubscription = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        persistNow();
      }
    });

    return () => {
      stateUnsubscribe();
      appStateSubscription.remove();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [navigationRef]);

  return null;
}
