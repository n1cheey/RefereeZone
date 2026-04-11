const NAVIGATION_INTENT_STORAGE_KEY = 'abl-navigation-intent';

export type NavigationIntentView = 'chat' | 'nominations' | 'availability' | 'calendar';

export interface NavigationIntent {
  view: NavigationIntentView;
  targetId?: string;
  targetDate?: string;
  createdAt: number;
}

export function setNavigationIntent(intent: Omit<NavigationIntent, 'createdAt'>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload: NavigationIntent = {
      ...intent,
      createdAt: Date.now(),
    };
    window.sessionStorage.setItem(NAVIGATION_INTENT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage issues for non-critical navigation hints.
  }
}

export function consumeNavigationIntent(view: NavigationIntentView): NavigationIntent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(NAVIGATION_INTENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as NavigationIntent;
    if (!parsed || parsed.view !== view) {
      return null;
    }

    window.sessionStorage.removeItem(NAVIGATION_INTENT_STORAGE_KEY);
    return parsed;
  } catch {
    return null;
  }
}
