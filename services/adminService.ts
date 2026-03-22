import { AllowedAccessItem, User, UserRole } from '../types';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Admin server is unavailable. Start `npm run server` or `npm run dev:full`.');
  }

  const rawBody = await response.text();
  const data = rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.');
  }

  return data as T;
}

export function getMembers(instructorId: string) {
  return request<{ members: User[] }>(`/api/members?instructorId=${encodeURIComponent(instructorId)}`);
}

export function updateMemberProfile(payload: {
  instructorId: string;
  memberId: string;
  fullName: string;
  photoUrl: string;
}) {
  return request<{ message: string; member: User }>(`/api/members/${encodeURIComponent(payload.memberId)}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function deleteMember(payload: { instructorId: string; memberId: string }) {
  return request<{ message: string }>(
    `/api/members/${encodeURIComponent(payload.memberId)}?instructorId=${encodeURIComponent(payload.instructorId)}`,
    {
      method: 'DELETE',
    },
  );
}

export function getAllowedAccess(instructorId: string) {
  return request<{ accessList: AllowedAccessItem[] }>(`/api/access?instructorId=${encodeURIComponent(instructorId)}`);
}

export function addAllowedAccess(payload: {
  instructorId: string;
  email: string;
  role: UserRole;
}) {
  return request<{ message: string; access: AllowedAccessItem }>('/api/access', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function deleteAllowedAccess(payload: { instructorId: string; accessId: string }) {
  return request<{ message: string }>(
    `/api/access/${encodeURIComponent(payload.accessId)}?instructorId=${encodeURIComponent(payload.instructorId)}`,
    {
      method: 'DELETE',
    },
  );
}
