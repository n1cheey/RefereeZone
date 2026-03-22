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

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

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

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || 'Failed to sign out.');
  }
}

export function subscribeToAuthChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
