import { InstructorNomination, RefereeDirectoryItem, RefereeNomination } from '../types';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Nomination server is unavailable. Start `npm run server` or `npm run dev:full`.');
  }

  const rawBody = await response.text();
  const data = rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.');
  }

  return data as T;
}

export function getReferees(instructorId: string) {
  return request<{ referees: RefereeDirectoryItem[] }>(`/api/referees?instructorId=${encodeURIComponent(instructorId)}`);
}

export function getInstructorNominations(instructorId: string) {
  return request<{ nominations: InstructorNomination[] }>(`/api/nominations/instructor/${encodeURIComponent(instructorId)}`);
}

export function getRefereeNominations(refereeId: string) {
  return request<{ nominations: RefereeNomination[] }>(`/api/nominations/referee/${encodeURIComponent(refereeId)}`);
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
  return request<{ message: string; nomination: InstructorNomination }>('/api/nominations', {
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
  return request<{ message: string; nomination: InstructorNomination }>(
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
  return request<{ message: string }>(
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
  return request<{ message: string; nomination: RefereeNomination }>(
    `/api/nominations/${encodeURIComponent(payload.nominationId)}/respond`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
}
