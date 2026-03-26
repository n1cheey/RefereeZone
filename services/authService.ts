import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AuthResponse, User, UserRole } from '../types';
import { ApiRequestError, apiRequest } from './apiClient';
import { supabase } from './supabaseClient';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  fullName: string;
  role: UserRole;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const PROFILE_RETRY_DELAYS_MS = [350, 900, 1800];
const PASSWORD_RESET_PATH = '/reset-password';

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const getPasswordResetRedirectUrl = () => {
  const configuredAppUrl = String(import.meta.env.VITE_APP_URL || '').trim().replace(/\/+$/, '');
  if (configuredAppUrl) {
    return `${configuredAppUrl}${PASSWORD_RESET_PATH}`;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  return `${window.location.origin}${PASSWORD_RESET_PATH}`;
};

export function isPasswordResetPage() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.pathname.replace(/\/+$/, '') === PASSWORD_RESET_PATH;
}

export function isPasswordRecoveryMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  return params.get('type') === 'recovery';
}

export function clearAuthHash() {
  if (typeof window === 'undefined') {
    return;
  }

  const nextPath = isPasswordResetPage() ? '/' : window.location.pathname;
  const nextUrl = `${nextPath}${window.location.search}`;
  window.history.replaceState({}, document.title, nextUrl);
}

export async function getCurrentUserProfile(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    return null;
  }

  try {
    const response = await apiRequest<{ user: User }>('/api/auth/me');
    return response.user;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      await supabase.auth.signOut();
      return null;
    }

    throw error;
  }
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const { error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  });

  if (error) {
    throw new Error(error.message || 'Failed to sign in.');
  }

  let lastError: Error | null = null;

  for (const delayMs of [0, ...PROFILE_RETRY_DELAYS_MS]) {
    if (delayMs > 0) {
      await wait(delayMs);
    }

    try {
      const user = await getCurrentUserProfile();
      if (user) {
        return {
          message: 'Login completed.',
          user,
        };
      }
    } catch (profileError) {
      lastError = profileError instanceof Error ? profileError : new Error('Failed to load profile after sign in.');
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Profile was not found after sign in.');
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  await apiRequest<AuthResponse>(
    '/api/auth/register',
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
    false,
  );

  return loginUser({
    email: payload.email,
    password: payload.password,
  });
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Enter your e-mail address first.');
  }

  const redirectTo = getPasswordResetRedirectUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send password reset email.');
  }
}

export async function updatePassword(password: string) {
  const normalizedPassword = password.trim();
  if (normalizedPassword.length < 10) {
    throw new Error('Password must be at least 10 characters.');
  }

  const { error } = await supabase.auth.updateUser({
    password: normalizedPassword,
  });

  if (error) {
    throw new Error(error.message || 'Failed to update password.');
  }
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || 'Failed to sign out.');
  }
}

export function subscribeToAuthChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
