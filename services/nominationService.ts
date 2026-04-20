import { AnnouncementItem, InstructorNomination, RefereeDirectoryItem, RefereeNomination, ReplacementNotice } from '../types';
import { apiRequest } from './apiClient';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export interface InstructorDashboardResponse {
  referees: RefereeDirectoryItem[];
  toOfficials: RefereeDirectoryItem[];
  nominations: InstructorNomination[];
  assignments: RefereeNomination[];
  replacementNotices: ReplacementNotice[];
  activeAnnouncement?: AnnouncementItem | null;
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
  return apiRequest<{ nominations: RefereeNomination[]; replacementNotices: ReplacementNotice[]; activeAnnouncement?: AnnouncementItem | null }>(
    `/api/nominations/referee/${encodeURIComponent(refereeId)}`,
  );
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

export function editNominationOfficials(payload: {
  nominationId: string;
  instructorId: string;
  refereeIds: string[];
  teams?: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
}) {
  return apiRequest<{ message: string; nomination: InstructorNomination }>(
    `/api/nominations/${encodeURIComponent(payload.nominationId)}`,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        instructorId: payload.instructorId,
        refereeIds: payload.refereeIds,
        teams: payload.teams,
        matchDate: payload.matchDate,
        matchTime: payload.matchTime,
        venue: payload.venue,
      }),
    },
  );
}

export function assignNominationTOs(payload: {
  nominationId: string;
  toSupervisorId: string;
  toIds: string[];
}) {
  return apiRequest<{ message: string; nomination: InstructorNomination }>(
    `/api/nominations/${encodeURIComponent(payload.nominationId)}/tos`,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        toSupervisorId: payload.toSupervisorId,
        toIds: payload.toIds,
      }),
    },
  );
}

export function assignNominationStatistics(payload: {
  nominationId: string;
  toSupervisorId: string;
  statisticianIds: string[];
}) {
  return apiRequest<{ message: string; nomination: InstructorNomination }>(
    `/api/nominations/${encodeURIComponent(payload.nominationId)}/statistics`,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        toSupervisorId: payload.toSupervisorId,
        statisticianIds: payload.statisticianIds,
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
  return apiRequest<{ message: string; nomination: RefereeNomination | null }>(
    `/api/nominations/${encodeURIComponent(payload.nominationId)}/respond`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
}

export function updateNominationScore(payload: {
  nominationId: string;
  instructorId: string;
  finalScore: string;
  matchVideoUrl: string;
  matchProtocolUrl: string;
  refereeFee: string;
  toFee: string;
}) {
  return apiRequest<{ message: string; nomination: InstructorNomination }>(
    `/api/nominations/${encodeURIComponent(payload.nominationId)}/score`,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        instructorId: payload.instructorId,
        finalScore: payload.finalScore,
        matchVideoUrl: payload.matchVideoUrl,
        matchProtocolUrl: payload.matchProtocolUrl,
        refereeFee: payload.refereeFee,
        toFee: payload.toFee,
      }),
    },
  );
}
