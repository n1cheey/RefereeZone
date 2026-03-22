import { InstructorNomination, RefereeDirectoryItem, RefereeNomination } from '../types';
import { apiRequest } from './apiClient';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export interface InstructorDashboardResponse {
  referees: RefereeDirectoryItem[];
  nominations: InstructorNomination[];
  assignments: RefereeNomination[];
}

export function getReferees(instructorId: string) {
  return apiRequest<{ referees: RefereeDirectoryItem[] }>(`/api/referees?instructorId=${encodeURIComponent(instructorId)}`);
}

export function getInstructorDashboard(instructorId: string) {
  return apiRequest<InstructorDashboardResponse>(`/api/dashboard/instructor/${encodeURIComponent(instructorId)}`);
}

export function getInstructorNominations(instructorId: string) {
  return apiRequest<{ nominations: InstructorNomination[] }>(`/api/nominations/instructor/${encodeURIComponent(instructorId)}`);
}

export function getRefereeNominations(refereeId: string) {
  return apiRequest<{ nominations: RefereeNomination[] }>(`/api/nominations/referee/${encodeURIComponent(refereeId)}`);
}

export function createNomination(payload: {
  instructorId: string;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  refereeIds: string[];
}) {
  return apiRequest<{ message: string; nomination: InstructorNomination }>('/api/nominations', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function replaceNominationReferee(payload: {
  nominationId: string;
  slotNumber: number;
  instructorId: string;
  refereeId: string;
}) {
  return apiRequest<{ message: string; nomination: InstructorNomination }>(
    `/api/nominations/${encodeURIComponent(payload.nominationId)}/slots/${payload.slotNumber}`,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        instructorId: payload.instructorId,
        refereeId: payload.refereeId,
      }),
    },
  );
}

export function deleteNomination(payload: { nominationId: string; instructorId: string }) {
  return apiRequest<{ message: string }>(
    `/api/nominations/${encodeURIComponent(payload.nominationId)}?instructorId=${encodeURIComponent(payload.instructorId)}`,
    {
      method: 'DELETE',
    },
  );
}

export function respondToNomination(payload: {
  nominationId: string;
  refereeId: string;
  response: 'Accepted' | 'Declined';
}) {
  return apiRequest<{ message: string; nomination: RefereeNomination }>(
    `/api/nominations/${encodeURIComponent(payload.nominationId)}/respond`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
}
