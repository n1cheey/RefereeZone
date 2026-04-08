import { AnnouncementItem } from '../types';
import { apiRequest } from './apiClient';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function getCurrentAnnouncement(userId: string) {
  return apiRequest<{ announcement: AnnouncementItem | null }>(
    `/api/announcements/current?userId=${encodeURIComponent(userId)}`,
  );
}

export function saveAnnouncement(payload: { userId: string; message: string }) {
  return apiRequest<{ message: string; announcement: AnnouncementItem }>(
    '/api/announcements/current',
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
}
