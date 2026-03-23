import {
  RankingDashboardData,
  RankingEvaluation,
  RankingLeaderboardItem,
  RankingPerformanceProfile,
} from '../types';
import { apiRequest } from './apiClient';
const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function getRankingDashboard(userId: string) {
  return apiRequest<RankingDashboardData>(`/api/rankings?userId=${encodeURIComponent(userId)}`);
}

export function getRankingAdminData(instructorId: string) {
  return apiRequest<{
    leaderboard: RankingLeaderboardItem[];
    evaluations: RankingEvaluation[];
    performanceProfiles: RankingPerformanceProfile[];
    referees: Array<{ id: string; fullName: string }>;
  }>(`/api/rankings/admin?instructorId=${encodeURIComponent(instructorId)}`);
}

export function createRankingEvaluation(payload: {
  instructorId: string;
  refereeId: string;
  gameCode: string;
  evaluationDate: string;
  score: number;
  note: string;
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
  physicalFitness: number;
  mechanics: number;
  iot: number;
  criteriaScore: number;
  teamworkScore: number;
  gameControl: number;
  newPhilosophy: number;
  communication: number;
  externalEvaluation: number;
}) {
  return apiRequest<{ message: string }>('/api/rankings/performance', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}
