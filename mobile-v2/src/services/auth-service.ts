import { User } from '@/src/types/domain';

export interface LoginPayload {
  email: string;
  password: string;
}

export async function loginUser(payload: LoginPayload): Promise<{ user: User }> {
  const email = payload.email.trim();
  const password = payload.password.trim();

  if (!email) {
    throw new Error('Email is required.');
  }

  if (!password) {
    throw new Error('Password is required.');
  }

  return {
    user: {
      id: 'mobile-preview-user',
      email,
      fullName: 'RefZone Mobile User',
      photoUrl: '',
      licenseNumber: 'Pending',
      role: 'Instructor',
      category: 'Instructor',
    },
  };
}
