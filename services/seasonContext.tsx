import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LeagueSeason, LeagueSeasonId } from '../types';

const ACTIVE_SEASON_STORAGE_KEY = 'abl-active-season';

const normalizeSeasonId = (value: string | null | undefined): LeagueSeasonId | null => {
  if (value === '2025-2026' || value === '2026-2027') {
    return value;
  }

  return null;
};

const defaultSeasonId = normalizeSeasonId(import.meta.env.VITE_DEFAULT_SEASON) || '2026-2027';
const appStage = import.meta.env.VITE_APP_STAGE || 'local';

export const LEAGUE_SEASONS: LeagueSeason[] = [
  {
    id: '2025-2026',
    label: 'ABL Season 2025-2026',
    shortLabel: '25/26',
    status: 'archive',
    description: 'Archive and analytics workspace for the closing season.',
  },
  {
    id: '2026-2027',
    label: 'ABL Season 2026-2027',
    shortLabel: '26/27',
    status: 'active',
    description: 'Primary operating season for the new league cycle and prelaunch rollout.',
  },
];

interface SeasonContextValue {
  activeSeasonId: LeagueSeasonId;
  activeSeason: LeagueSeason;
  seasons: LeagueSeason[];
  appStage: string;
  setActiveSeasonId: (seasonId: LeagueSeasonId) => void;
}

const SeasonContext = createContext<SeasonContextValue | null>(null);

const readStoredSeason = () => {
  if (typeof window === 'undefined') {
    return defaultSeasonId;
  }

  return normalizeSeasonId(window.localStorage.getItem(ACTIVE_SEASON_STORAGE_KEY)) || defaultSeasonId;
};

export const SeasonProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeSeasonId, setActiveSeasonIdState] = useState<LeagueSeasonId>(readStoredSeason);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(ACTIVE_SEASON_STORAGE_KEY, activeSeasonId);
  }, [activeSeasonId]);

  const value = useMemo<SeasonContextValue>(() => {
    const activeSeason =
      LEAGUE_SEASONS.find((season) => season.id === activeSeasonId) ||
      LEAGUE_SEASONS.find((season) => season.id === defaultSeasonId) ||
      LEAGUE_SEASONS[0];

    return {
      activeSeasonId,
      activeSeason,
      seasons: LEAGUE_SEASONS,
      appStage,
      setActiveSeasonId: setActiveSeasonIdState,
    };
  }, [activeSeasonId]);

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
};

export const useSeason = () => {
  const context = useContext(SeasonContext);

  if (!context) {
    throw new Error('useSeason must be used within a SeasonProvider.');
  }

  return context;
};
