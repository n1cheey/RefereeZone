import { env } from '@/src/config/env';

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

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = String(options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';

  for (let attempt = 0; attempt < (canRetry ? 3 : 1); attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(`${env.apiBaseUrl}${path}`, {
        ...options,
        signal: controller.signal,
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new ApiRequestError(
          typeof data?.message === 'string' ? data.message : 'Request failed.',
          response.status,
        );
      }

      return data as T;
    } catch (error) {
      const isLastAttempt = attempt === (canRetry ? 2 : 0);
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
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
