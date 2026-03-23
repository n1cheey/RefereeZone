import { NewsItem } from '../types';
import { apiRequest } from './apiClient';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function getNewsPosts() {
  return apiRequest<{ posts: NewsItem[] }>('/api/news');
}

export function createNewsPost(payload: { youtubeUrl: string; commentary: string }) {
  return apiRequest<{ posts: NewsItem[] }>('/api/news', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function deleteNewsPost(postId: string) {
  return apiRequest<{ message: string }>(`/api/news/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  });
}
