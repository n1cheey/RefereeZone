import { LeagueSeasonId, ReportDetail, ReportListItem, ReportMode, ReportStatus } from '../types';
import { apiRequest } from './apiClient';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const getReportModeQuery = (mode: ReportMode) => `mode=${encodeURIComponent(mode)}`;
const getSeasonQuery = (seasonId?: LeagueSeasonId | null) =>
  seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : '';

export function getReports(userId: string, mode: ReportMode = 'standard', seasonId?: LeagueSeasonId | null) {
  return apiRequest<{ reports: ReportListItem[] }>(
    `/api/reports?userId=${encodeURIComponent(userId)}&${getReportModeQuery(mode)}${getSeasonQuery(seasonId)}`,
  );
}

export function getReportOverview(userId: string, mode: ReportMode = 'standard', seasonId?: LeagueSeasonId | null) {
  return apiRequest<{
    availableReports: ReportListItem[];
    profiles: Array<{
      id: string;
      name: string;
      photoUrl?: string | null;
      submittedCount: number;
      overdueCount: number;
    }>;
  }>(`/api/mobile/reports?userId=${encodeURIComponent(userId)}&${getReportModeQuery(mode)}${getSeasonQuery(seasonId)}`);
}

export function getReportProfile(
  userId: string,
  profileId: string,
  mode: ReportMode = 'standard',
  seasonId?: LeagueSeasonId | null,
) {
  return apiRequest<{
    submittedReports: ReportListItem[];
    overdueReports: ReportListItem[];
    reviewedReports: ReportListItem[];
  }>(
    `/api/mobile/reports?userId=${encodeURIComponent(userId)}&${getReportModeQuery(mode)}${getSeasonQuery(seasonId)}&profileId=${encodeURIComponent(profileId)}`,
  );
}

export function getReportDetail(
  userId: string,
  nominationId: string,
  refereeId: string,
  mode: ReportMode = 'standard',
  seasonId?: LeagueSeasonId | null,
) {
  return apiRequest<{ report: ReportDetail }>(
    `/api/reports/${encodeURIComponent(nominationId)}/${encodeURIComponent(refereeId)}?userId=${encodeURIComponent(userId)}&${getReportModeQuery(mode)}${getSeasonQuery(seasonId)}`,
  );
}

export function saveReport(payload: {
  userId: string;
  nominationId: string;
  refereeId: string;
  mode?: ReportMode;
  gameCode?: string;
  teams?: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
  action: ReportStatus;
  feedbackScore: number;
  threePO_IOT: string;
  criteria: string;
  teamwork: string;
  generally: string;
  googleDriveUrl?: string;
  visibleToRefereeIds?: string[];
  seasonId?: LeagueSeasonId | null;
}) {
  return apiRequest<{ message: string; report: ReportDetail }>(
    `/api/reports/${encodeURIComponent(payload.nominationId)}/${encodeURIComponent(payload.refereeId)}`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
}

export function deleteReport(payload: {
  userId: string;
  nominationId: string;
  refereeId: string;
  mode?: ReportMode;
  seasonId?: LeagueSeasonId | null;
}) {
  return apiRequest<{ message: string }>(
    `/api/reports/${encodeURIComponent(payload.nominationId)}/${encodeURIComponent(payload.refereeId)}?userId=${encodeURIComponent(payload.userId)}&${getReportModeQuery(payload.mode || 'standard')}${getSeasonQuery(payload.seasonId)}`,
    {
      method: 'DELETE',
    },
  );
}

export function extendReportDeadline(payload: {
  userId: string;
  nominationId: string;
  refereeId: string;
}) {
  return apiRequest<{ message: string; report: ReportDetail }>(
    `/api/reports/${encodeURIComponent(payload.nominationId)}/${encodeURIComponent(payload.refereeId)}/extend`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ userId: payload.userId }),
    },
  );
}
