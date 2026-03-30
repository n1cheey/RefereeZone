import { ReportDetail, ReportListItem, ReportStatus } from '../types';
import { apiRequest } from './apiClient';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function getReports(userId: string) {
  return apiRequest<{ reports: ReportListItem[] }>(`/api/reports?userId=${encodeURIComponent(userId)}`);
}

export function getReportDetail(userId: string, nominationId: string, refereeId: string) {
  return apiRequest<{ report: ReportDetail }>(
    `/api/reports/${encodeURIComponent(nominationId)}/${encodeURIComponent(refereeId)}?userId=${encodeURIComponent(userId)}`,
  );
}

export function saveReport(payload: {
  userId: string;
  nominationId: string;
  refereeId: string;
  action: ReportStatus;
  feedbackScore: number;
  threePO_IOT: string;
  criteria: string;
  teamwork: string;
  generally: string;
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
}) {
  return apiRequest<{ message: string }>(
    `/api/reports/${encodeURIComponent(payload.nominationId)}/${encodeURIComponent(payload.refereeId)}?userId=${encodeURIComponent(payload.userId)}`,
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
