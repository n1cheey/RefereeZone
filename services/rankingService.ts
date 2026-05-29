import {
  RankingDashboardData,
  RankingEvaluation,
  RankingPerformanceEntry,
  RankingGameOption,
  RankingLeaderboardItem,
  RankingPerformanceProfile,
  LeagueSeasonId,
} from '../types';
import { apiRequest } from './apiClient';
const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const getSeasonQuery = (seasonId?: LeagueSeasonId | null, compact = false) =>
  `${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}${compact ? '&compact=1' : ''}`;

export function getRankingDashboard(userId: string, seasonId?: LeagueSeasonId | null, compact = false) {
  return apiRequest<RankingDashboardData>(
    `/api/rankings?userId=${encodeURIComponent(userId)}${getSeasonQuery(seasonId, compact)}`,
  );
}

export function getTORankingDashboard(userId: string, seasonId?: LeagueSeasonId | null, compact = false) {
  return apiRequest<RankingDashboardData>(
    `/api/rankings/to?userId=${encodeURIComponent(userId)}${getSeasonQuery(seasonId, compact)}`,
  );
}

export function getRankingAdminData(instructorId: string, seasonId?: LeagueSeasonId | null) {
  return apiRequest<{
    leaderboard: RankingLeaderboardItem[];
    evaluations: RankingEvaluation[];
    performanceEntries: RankingPerformanceEntry[];
    performanceProfiles: RankingPerformanceProfile[];
    games: RankingGameOption[];
    referees: Array<{ id: string; fullName: string }>;
  }>(`/api/rankings/admin?instructorId=${encodeURIComponent(instructorId)}${getSeasonQuery(seasonId)}`);
}

export function getTORankingAdminData(userId: string, seasonId?: LeagueSeasonId | null) {
  return apiRequest<{
    leaderboard: RankingLeaderboardItem[];
    evaluations: RankingEvaluation[];
    performanceEntries: RankingPerformanceEntry[];
    performanceProfiles: RankingPerformanceProfile[];
    games: RankingGameOption[];
    referees: Array<{ id: string; fullName: string }>;
  }>(`/api/rankings/admin/to?userId=${encodeURIComponent(userId)}${getSeasonQuery(seasonId)}`);
}

export function createRankingEvaluation(payload: {
  instructorId: string;
  refereeId: string;
  gameCode: string;
  evaluationDate: string;
  score: number;
  note: string;
  seasonId?: LeagueSeasonId | null;
}) {
  return apiRequest<{ message: string }>('/api/rankings/evaluations', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function saveRankingPerformance(payload: {
  instructorId: string;
  refereeId: string;
  gameCode: string;
  evaluationDate: string;
  note: string;
  physicalFitness: number;
  mechanics: number;
  iot: number;
  criteriaScore: number;
  teamworkScore: number;
  gameControl: number;
  newPhilosophy: number;
  communication: number;
  externalEvaluation: number;
  seasonId?: LeagueSeasonId | null;
}) {
  return apiRequest<{ message: string }>('/api/rankings/performance', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}
