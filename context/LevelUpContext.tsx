import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { LevelUpModal } from '@/components/LevelUpModal';
import { getLevelAdvancement } from '@/lib/levelUp';
import type { VolunteerLevel } from '@/lib/volunteerLevels';

type LevelUpContextValue = {
  celebrateIfLeveledUp: (beforeEvents: number, afterEvents: number) => void;
  showLevelUp: (level: VolunteerLevel) => void;
};

const LevelUpContext = createContext<LevelUpContextValue | null>(null);

export function LevelUpProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [level, setLevel] = useState<VolunteerLevel | null>(null);

  const showLevelUp = useCallback((nextLevel: VolunteerLevel) => {
    setLevel(nextLevel);
    setVisible(true);
  }, []);

  const celebrateIfLeveledUp = useCallback(
    (beforeEvents: number, afterEvents: number) => {
      const advanced = getLevelAdvancement(beforeEvents, afterEvents);
      if (advanced) showLevelUp(advanced);
    },
    [showLevelUp]
  );

  const dismiss = useCallback(() => {
    setVisible(false);
    setLevel(null);
  }, []);

  const value = useMemo(
    () => ({ celebrateIfLeveledUp, showLevelUp }),
    [celebrateIfLeveledUp, showLevelUp]
  );

  return (
    <LevelUpContext.Provider value={value}>
      {children}
      <LevelUpModal visible={visible} level={level} onDismiss={dismiss} />
    </LevelUpContext.Provider>
  );
}

export function useLevelUp() {
  const context = useContext(LevelUpContext);
  if (!context) throw new Error('useLevelUp must be used within LevelUpProvider');
  return context;
}
