import { supabase } from './supabaseClient';

const API_TIMEOUT_MS = 45000;
const API_RETRY_DELAY_MS = 700;
const GET_CACHE_TTL_MS = 30000;
const GET_STALE_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
const GET_MAX_ATTEMPTS = 4;
const AUTH_SESSION_WAIT_MS = 2500;
const AUTH_SESSION_POLL_MS = 125;

const responseCache = new Map<string, { fetchedAt: number; expiresAt: number; data: unknown }>();
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

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const isAbortError = (error: unknown) =>
  error instanceof DOMException
    ? error.name === 'AbortError'
    : typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'AbortError';

const isRetryableStatus = (status?: number) => [408, 425, 429, 500, 502, 503, 504].includes(Number(status || 0));

const hasUsableStaleCache = (cached: { fetchedAt: number; expiresAt: number; data: unknown } | undefined | null) =>
  Boolean(cached && Date.now() - cached.fetchedAt <= GET_STALE_CACHE_MAX_AGE_MS);

const getTransientErrorMessage = (status?: number) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'No internet connection. Please check your network.';
  }

  if (status === 429) {
    return 'The server is busy right now. Please try again in a moment.';
  }

  if (status && status >= 500) {
    return 'The server is temporarily unavailable. Please try again.';
  }

  return 'Connection problem. Please try again.';
};

const waitForSessionAccessToken = async () => {
  const deadline = Date.now() + AUTH_SESSION_WAIT_MS;

  while (true) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (accessToken) {
      return accessToken;
    }

    if (Date.now() >= deadline) {
      return undefined;
    }

    await wait(AUTH_SESSION_POLL_MS);
  }
};

export async function apiRequest<T>(url: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(options.headers || {});
  const method = String(options.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';
  let token: string | undefined;

  if (auth) {
    token = await waitForSessionAccessToken();
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

    const inflightRequest = inflightGetRequests.get(cacheKey);
    if (inflightRequest) {
      return inflightRequest as Promise<T>;
    }
  }

  const requestPromise = (async () => {
    const staleCached = cacheKey ? responseCache.get(cacheKey) : null;
    const maxAttempts = canRetry ? GET_MAX_ATTEMPTS : 1;

    if (cacheKey && typeof navigator !== 'undefined' && navigator.onLine === false && hasUsableStaleCache(staleCached)) {
      return staleCached!.data as T;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
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
          const retryableResponse = canRetry && isRetryableStatus(response.status) && attempt < maxAttempts - 1;
          if (retryableResponse) {
            await wait(API_RETRY_DELAY_MS * (attempt + 1));
            continue;
          }

          throw new ApiRequestError(data?.message || 'Request failed.', response.status);
        }

        if (cacheKey) {
          responseCache.set(cacheKey, {
            fetchedAt: Date.now(),
            data,
            expiresAt: Date.now() + GET_CACHE_TTL_MS,
          });
        } else {
          responseCache.clear();
        }

        return data as T;
      } catch (error) {
        const isTimeout = isAbortError(error);
        const isLastAttempt = attempt === maxAttempts - 1;
        const retryableApiError = error instanceof ApiRequestError && isRetryableStatus(error.status);

        if (!isLastAttempt && (isTimeout || error instanceof TypeError || retryableApiError)) {
          await wait(API_RETRY_DELAY_MS * (attempt + 1));
          continue;
        }

        if (canRetry && hasUsableStaleCache(staleCached)) {
          return staleCached.data as T;
        }

        if (isTimeout) {
          throw new ApiRequestError('API request timed out. Please try again.');
        }

        if (error instanceof ApiRequestError) {
          if (isRetryableStatus(error.status)) {
            throw new ApiRequestError(getTransientErrorMessage(error.status), error.status);
          }
          throw error;
        }

        throw new ApiRequestError(getTransientErrorMessage());
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    if (canRetry && hasUsableStaleCache(staleCached)) {
      return staleCached.data as T;
    }

    throw new ApiRequestError(getTransientErrorMessage());
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
