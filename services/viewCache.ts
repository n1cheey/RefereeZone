const VIEW_CACHE_TTL_MS = 5 * 60 * 1000;

interface ViewCacheEntry<T> {
  cachedAt: number;
  value: T;
}

export function readViewCache<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as ViewCacheEntry<T>;
    if (!parsed || typeof parsed.cachedAt !== 'number' || !('value' in parsed)) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    if (Date.now() - parsed.cachedAt > VIEW_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

export function writeViewCache<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload: ViewCacheEntry<T> = {
      cachedAt: Date.now(),
      value,
    };

    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota and serialization issues for non-critical UI cache.
  }
}

