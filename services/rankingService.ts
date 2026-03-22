import {
  RankingDashboardData,
  RankingEvaluation,
  RankingLeaderboardItem,
  RankingPerformanceProfile,
} from '../types';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Ranking server is unavailable. Start `npm run server` or `npm run dev:full`.');
  }

  const rawBody = await response.text();
  const data = rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.');
  }

  return data as T;
}

export function getRankingDashboard(userId: string) {
  return request<RankingDashboardData>(`/api/rankings?userId=${encodeURIComponent(userId)}`);
}

export function getRankingAdminData(instructorId: string) {
  return request<{
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
  return request<{ message: string }>('/api/rankings/evaluations', {
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
}) {
  return request<{ message: string }>('/api/rankings/performance', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}
