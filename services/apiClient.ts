import { supabase } from './supabaseClient';

const API_TIMEOUT_MS = 12000;

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
        throw new Error('API request timed out. Please try again.');
      }

      throw new Error('API server is unavailable.');
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
      throw new Error(data?.message || 'Request failed.');
    }

    return data as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
