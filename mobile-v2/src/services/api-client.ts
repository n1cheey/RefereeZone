import { env } from '@/src/config/env';
import { supabase } from '@/src/services/supabase-client';

const API_TIMEOUT_MS = 45000;
const API_RETRY_DELAY_MS = 700;

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

const isRetryableStatus = (status?: number) => [408, 425, 429, 500, 502, 503, 504].includes(Number(status || 0));

const parseResponsePayload = (text: string) => {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = String(options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';

  for (let attempt = 0; attempt < (canRetry ? 4 : 1); attempt += 1) {
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
      const responseData = parseResponsePayload(text);

      if (!response.ok) {
        if (canRetry && attempt < 3 && isRetryableStatus(response.status)) {
          await delay(API_RETRY_DELAY_MS);
          continue;
        }
        throw new ApiRequestError(
          typeof responseData === 'object' && responseData !== null && 'message' in responseData && typeof responseData.message === 'string'
            ? responseData.message
            : typeof responseData === 'string' && responseData.trim()
              ? responseData
              : 'Request failed.',
          response.status,
        );
      }

      return responseData as T;
    } catch (error) {
      const isAbort = isAbortError(error);
      const isNetwork = error instanceof TypeError;
      const isRetryableApiError = error instanceof ApiRequestError && isRetryableStatus(error.status);

      if (attempt < (canRetry ? 3 : 0) && (isAbort || isNetwork || isRetryableApiError)) {
        await delay(API_RETRY_DELAY_MS);
        continue;
      }

      if (error instanceof ApiRequestError) {
        throw error;
      }

      if (isAbort) {
        throw new ApiRequestError('API request timed out. Please try again.');
      }

      throw new ApiRequestError('API server is temporarily unavailable. Please try again.');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new ApiRequestError('API server is temporarily unavailable. Please try again.');
}
