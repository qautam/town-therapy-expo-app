import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type AppBootContextValue = {
  /** True once the branded welcome splash has finished and home can take focus. */
  splashComplete: boolean;
  markSplashComplete: () => void;
};

const AppBootContext = createContext<AppBootContextValue | null>(null);

export function AppBootProvider({ children }: { children: ReactNode }) {
  const [splashComplete, setSplashComplete] = useState(false);

  const value = useMemo(
    () => ({
      splashComplete,
      markSplashComplete: () => setSplashComplete(true),
    }),
    [splashComplete]
  );

  return <AppBootContext.Provider value={value}>{children}</AppBootContext.Provider>;
}

export function useAppBoot() {
  const value = useContext(AppBootContext);
  if (!value) {
    throw new Error('useAppBoot must be used within AppBootProvider');
  }
  return value;
}
