export type UserRole =
  | 'Instructor'
  | 'TO Supervisor'
  | 'TO'
  | 'Referee'
  | 'Staff'
  | 'Financialist';

export type AppLanguage = 'az' | 'en' | 'ru';

export type CountryCode = 'az';

export type DisciplineCode = 'basketball';

export interface User {
  id: string;
  email: string;
  fullName: string;
  photoUrl: string;
  licenseNumber: string;
  role: UserRole;
  category: string;
  lastSeenAt?: string | null;
}

export interface SessionSnapshot {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number | null;
}

export interface UnlockPreferences {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  pinCodeHash: string | null;
  lockOnLaunch: boolean;
}
