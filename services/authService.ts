import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AuthResponse, User, UserRole } from '../types';
import { apiRequest } from './apiClient';
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

export async function getCurrentUserProfile(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    return null;
  }

  try {
    const response = await apiRequest<{ user: User }>('/api/auth/me');
    return response.user;
  } catch {
    await supabase.auth.signOut();
    return null;
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

  const user = await getCurrentUserProfile();
  if (!user) {
    throw new Error('Profile was not found after sign in.');
  }

  return {
    message: 'Login completed.',
    user,
  };
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
