import { supabase } from './supabaseClient';

const API_TIMEOUT_MS = 45000;
const API_RETRY_DELAY_MS = 800;

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
  const method = String(options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';

  if (auth) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  for (let attempt = 0; attempt < (canRetry ? 2 : 1); attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

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
    } catch (error) {
      const isTimeout = error instanceof DOMException && error.name === 'AbortError';
      const isLastAttempt = attempt === (canRetry ? 1 : 0);

      if (!isLastAttempt && (isTimeout || error instanceof TypeError)) {
        await new Promise((resolve) => window.setTimeout(resolve, API_RETRY_DELAY_MS));
        continue;
      }

      if (isTimeout) {
        throw new ApiRequestError('API request timed out. Please try again.');
      }

      if (error instanceof ApiRequestError) {
        throw error;
      }

      throw new ApiRequestError('API server is unavailable.');
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw new ApiRequestError('API server is unavailable.');
}
