import { ActivityEntry } from '../types';
import { apiRequest } from './apiClient';

export function getRecentActivity() {
  return apiRequest<{ activity: ActivityEntry[] }>('/api/activity');
}
