import { apiRequest } from '@/src/services/api-client';
import { User } from '@/src/types/domain';

export type MobileReportMode = 'standard' | 'to';
export type MobileReportStatus = 'Draft' | 'Submitted';

export interface MobileReportEntry {
  id: string;
  authorRole: 'Referee' | 'Instructor';
  status: 'Draft' | 'Submitted' | 'Reviewed';
  feedbackScore: number;
  threePO_IOT: string;
  criteria: string;
  teamwork: string;
  generally: string;
  googleDriveUrl?: string;
  updatedAt: string;
}

export interface MobileReportDetail {
  item: {
    nominationId: string;
    refereeId: string;
    gameCode: string;
    teams: string;
    matchDate: string;
    matchTime: string;
    venue: string;
    refereeName: string;
    googleDriveUrl: string | null;
  };
  refereeReport: MobileReportEntry | null;
  instructorReport: MobileReportEntry | null;
  canEditCurrentUserReport: boolean;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function getMobileReportDetail(user: User, nominationId: string, refereeId: string, mode: MobileReportMode, seasonId?: string | null) {
  return apiRequest<{ report: MobileReportDetail }>(
    `/api/reports/${encodeURIComponent(nominationId)}/${encodeURIComponent(refereeId)}?userId=${encodeURIComponent(user.id)}&mode=${mode}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
  );
}

export function saveMobileReport(payload: {
  user: User;
  nominationId: string;
  refereeId: string;
  mode: MobileReportMode;
  action: MobileReportStatus;
  gameCode?: string;
  teams?: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
  feedbackScore: number;
  threePO_IOT: string;
  criteria: string;
  teamwork: string;
  generally: string;
  googleDriveUrl?: string;
  seasonId?: string | null;
}) {
  return apiRequest<{ message: string; report: MobileReportDetail }>(
    `/api/reports/${encodeURIComponent(payload.nominationId)}/${encodeURIComponent(payload.refereeId)}`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        userId: payload.user.id,
        mode: payload.mode,
        action: payload.action,
        gameCode: payload.gameCode,
        teams: payload.teams,
        matchDate: payload.matchDate,
        matchTime: payload.matchTime,
        venue: payload.venue,
        feedbackScore: payload.feedbackScore,
        threePO_IOT: payload.threePO_IOT,
        criteria: payload.criteria,
        teamwork: payload.teamwork,
        generally: payload.generally,
        googleDriveUrl: payload.googleDriveUrl,
        seasonId: payload.seasonId,
      }),
    },
  );
}

export function extendMobileReportDeadline(user: User, nominationId: string, refereeId: string, mode: MobileReportMode) {
  return apiRequest<{ message: string; report: MobileReportDetail }>(
    `/api/reports/${encodeURIComponent(nominationId)}/${encodeURIComponent(refereeId)}/extend`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        userId: user.id,
        mode,
      }),
    },
  );
}
