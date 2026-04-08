import { supabase } from './supabaseClient';

const API_TIMEOUT_MS = 45000;
const API_RETRY_DELAY_MS = 800;
const GET_CACHE_TTL_MS = 10000;

const responseCache = new Map<string, { expiresAt: number; data: unknown }>();
const inflightGetRequests = new Map<string, Promise<unknown>>();

export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

const getCacheKey = (method: string, url: string, token: string | undefined) => `${method}:${url}:${token || 'anon'}`;

export async function apiRequest<T>(url: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(options.headers || {});
  const method = String(options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';
  let token: string | undefined;

  if (auth) {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const cacheKey = canRetry ? getCacheKey(method, url, token) : null;
  const now = Date.now();

  if (cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data as T;
    }

    if (cached) {
      responseCache.delete(cacheKey);
    }

    const inflightRequest = inflightGetRequests.get(cacheKey);
    if (inflightRequest) {
      return inflightRequest as Promise<T>;
    }
  }

  const requestPromise = (async () => {
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

        if (cacheKey) {
          responseCache.set(cacheKey, {
            data,
            expiresAt: Date.now() + GET_CACHE_TTL_MS,
          });
        } else {
          responseCache.clear();
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
  })();

  if (cacheKey) {
    inflightGetRequests.set(cacheKey, requestPromise);
  }

  try {
    return await requestPromise;
  } finally {
    if (cacheKey) {
      inflightGetRequests.delete(cacheKey);
    }
  }
}
