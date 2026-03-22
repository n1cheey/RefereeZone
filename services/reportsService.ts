import { ReportDetail, ReportListItem, ReportStatus } from '../types';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Reports server is unavailable. Start `npm run server` or `npm run dev:full`.');
  }

  const rawBody = await response.text();
  const data = rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.');
  }

  return data as T;
}

export function getReports(userId: string) {
  return request<{ reports: ReportListItem[] }>(`/api/reports?userId=${encodeURIComponent(userId)}`);
}

export function getReportDetail(userId: string, nominationId: string, refereeId: string) {
  return request<{ report: ReportDetail }>(
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
  return request<{ message: string; report: ReportDetail }>(
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
  return request<{ message: string }>(
    `/api/reports/${encodeURIComponent(payload.nominationId)}/${encodeURIComponent(payload.refereeId)}?userId=${encodeURIComponent(payload.userId)}`,
    {
      method: 'DELETE',
    },
  );
}
