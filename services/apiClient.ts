import { supabase } from './supabaseClient';

const API_TIMEOUT_MS = 30000;

export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function apiRequest<T>(url: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(options.headers || {});
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    if (auth) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    let response: Response;

    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiRequestError('API request timed out. Please try again.');
      }

      throw new ApiRequestError('API server is unavailable.');
    }

    const rawBody = await response.text();
    let data: any = null;

    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      throw new ApiRequestError(data?.message || 'Request failed.', response.status);
    }

    return data as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
