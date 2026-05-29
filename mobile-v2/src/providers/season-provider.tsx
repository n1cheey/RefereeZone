import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { secureStore } from '@/src/services/secure-store';

export type MobileSeasonId = '2025-2026' | '2026-2027';

interface SeasonContextValue {
  seasonId: MobileSeasonId;
  setSeasonId: (seasonId: MobileSeasonId) => void;
}

const STORAGE_KEY = 'irefzone_mobile_season';

const getDefaultSeasonId = (): MobileSeasonId => '2026-2027';

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [seasonId, setSeasonIdState] = useState<MobileSeasonId>(getDefaultSeasonId());

  useEffect(() => {
    void secureStore.get(STORAGE_KEY).then((storedSeason) => {
      if (storedSeason === '2025-2026' || storedSeason === '2026-2027') {
        setSeasonIdState(storedSeason);
      }
    });
  }, []);

  const setSeasonId = (nextSeasonId: MobileSeasonId) => {
    setSeasonIdState(nextSeasonId);
    void secureStore.set(STORAGE_KEY, nextSeasonId);
  };

  const value = useMemo(
    () => ({
      seasonId,
      setSeasonId,
    }),
    [seasonId],
  );

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export function useSeason() {
  const value = useContext(SeasonContext);
  if (!value) {
    throw new Error('useSeason must be used within SeasonProvider.');
  }

  return value;
}
