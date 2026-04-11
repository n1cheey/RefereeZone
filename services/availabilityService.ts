import { AvailabilityOverview, AvailabilityStatus } from '../types';
import { apiRequest } from './apiClient';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function getAvailabilityOverview() {
  return apiRequest<AvailabilityOverview>('/api/availability');
}

export function createAvailabilityRequest(payload: {
  startDate: string;
  endDate: string;
  reason: string;
}) {
  return apiRequest<{ message: string; overview: AvailabilityOverview }>(
    '/api/availability',
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
}

export function reviewAvailabilityRequest(requestId: string, status: Exclude<AvailabilityStatus, 'Pending'>) {
  return apiRequest<{ message: string; overview: AvailabilityOverview }>(
    `/api/availability/${encodeURIComponent(requestId)}/review`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ status }),
    },
  );
}
