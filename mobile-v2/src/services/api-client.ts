import { env } from '@/src/config/env';
import { supabase } from '@/src/services/supabase-client';

const API_TIMEOUT_MS = 20000;
const API_RETRY_DELAY_MS = 350;

export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

const delay = (timeoutMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, timeoutMs);
  });

const isAbortError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  (error as { name?: string }).name === 'AbortError';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = String(options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';

  for (let attempt = 0; attempt < (canRetry ? 3 : 1); attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const { data } = await supabase.auth.getSession();
      const headers = new Headers(options.headers || {});

      if (data.session?.access_token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${data.session.access_token}`);
      }

      const response = await fetch(`${env.apiBaseUrl}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const text = await response.text();
      const responseData = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new ApiRequestError(
          typeof responseData?.message === 'string' ? responseData.message : 'Request failed.',
          response.status,
        );
      }

      return responseData as T;
    } catch (error) {
      const isLastAttempt = attempt === (canRetry ? 2 : 0);
      const isAbort = isAbortError(error);
      const isNetwork = error instanceof TypeError;

      if (!isLastAttempt && (isAbort || isNetwork)) {
        await delay(API_RETRY_DELAY_MS);
        continue;
      }

      if (error instanceof ApiRequestError) {
        throw error;
      }

      if (isAbort) {
        throw new ApiRequestError('API request timed out. Please try again.');
      }

      throw new ApiRequestError('API server is unavailable.');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new ApiRequestError('API server is unavailable.');
}
