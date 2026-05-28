import { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { ApiRequestError, apiRequest } from '@/src/services/api-client';
import { supabase } from '@/src/services/supabase-client';
import { User } from '@/src/types/domain';

export interface LoginPayload {
  email: string;
  password: string;
}

const PROFILE_RETRY_DELAYS_MS = [350, 900, 1800];

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || 'Failed to restore session.');
  }

  return data.session;
}

export async function getCurrentUserProfile(): Promise<User | null> {
  const session = await getCurrentSession();

  if (!session) {
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

export async function loginUser(payload: LoginPayload): Promise<{ user: User }> {
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;

  if (!email) {
    throw new Error('Email is required.');
  }

  if (!password.trim()) {
    throw new Error('Password is required.');
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
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
        return { user };
      }
    } catch (profileError) {
      lastError =
        profileError instanceof Error ? profileError : new Error('Failed to load profile after sign in.');
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Profile was not found after sign in.');
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
