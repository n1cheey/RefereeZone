import { AllowedAccessItem, User, UserRole } from '../types';
import { apiRequest } from './apiClient';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function getMembers(instructorId: string) {
  return apiRequest<{ members: User[] }>(`/api/members?instructorId=${encodeURIComponent(instructorId)}`);
}

export function getMember(memberId: string) {
  return apiRequest<{ member: User }>(`/api/members/${encodeURIComponent(memberId)}`);
}

export function updateMemberProfile(payload: {
  instructorId: string;
  memberId: string;
  email: string;
  fullName: string;
  licenseNumber: string;
  photoUrl: string;
}) {
  return apiRequest<{ message: string; member: User }>(`/api/members/${encodeURIComponent(payload.memberId)}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function deleteMember(payload: { instructorId: string; memberId: string }) {
  return apiRequest<{ message: string }>(
    `/api/members/${encodeURIComponent(payload.memberId)}?instructorId=${encodeURIComponent(payload.instructorId)}`,
    {
      method: 'DELETE',
    },
  );
}

export function getAllowedAccess(instructorId: string) {
  return apiRequest<{ accessList: AllowedAccessItem[] }>(`/api/access?instructorId=${encodeURIComponent(instructorId)}`);
}

export function addAllowedAccess(payload: {
  instructorId: string;
  email: string;
  licenseNumber: string;
  role: UserRole;
}) {
  return apiRequest<{ message: string; access: AllowedAccessItem }>('/api/access', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function deleteAllowedAccess(payload: { instructorId: string; accessId: string }) {
  return apiRequest<{ message: string }>(
    `/api/access/${encodeURIComponent(payload.accessId)}?instructorId=${encodeURIComponent(payload.instructorId)}`,
    {
      method: 'DELETE',
    },
  );
}
