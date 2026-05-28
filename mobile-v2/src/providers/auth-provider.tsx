import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { loginUser } from '@/src/services/auth-service';
import { canUseBiometrics, requestBiometricUnlock } from '@/src/services/biometric-service';
import { secureStore } from '@/src/services/secure-store';
import { User, UnlockPreferences } from '@/src/types/domain';
import { hashPin } from '@/src/utils/hash';

const AUTH_USER_KEY = 'refzone-mobile-v2:user';
const UNLOCK_PREFS_KEY = 'refzone-mobile-v2:unlock-prefs';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  locked: boolean;
  unlockPreferences: UnlockPreferences;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  enableBiometricUnlock: () => Promise<void>;
  savePin: (pin: string) => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
}

const defaultUnlockPreferences: UnlockPreferences = {
  biometricEnabled: false,
  pinEnabled: false,
  pinCodeHash: null,
  lockOnLaunch: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [locked, setLocked] = useState(false);
  const [unlockPreferences, setUnlockPreferences] = useState<UnlockPreferences>(defaultUnlockPreferences);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const [storedUser, storedPrefs] = await Promise.all([
        secureStore.get(AUTH_USER_KEY),
        secureStore.get(UNLOCK_PREFS_KEY),
      ]);

      if (!isMounted) {
        return;
      }

      if (storedUser) {
        setUser(JSON.parse(storedUser) as User);
      }

      if (storedPrefs) {
        setUnlockPreferences(JSON.parse(storedPrefs) as UnlockPreferences);
      }

      if (storedUser && storedPrefs) {
        const parsedPrefs = JSON.parse(storedPrefs) as UnlockPreferences;
        if ((parsedPrefs.biometricEnabled || parsedPrefs.pinEnabled) && parsedPrefs.lockOnLaunch) {
          setLocked(true);
        }
      }

      setInitializing(false);
    };

    void bootstrap();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        return;
      }

      if (user && (unlockPreferences.biometricEnabled || unlockPreferences.pinEnabled) && unlockPreferences.lockOnLaunch) {
        setLocked(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [unlockPreferences, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      locked,
      unlockPreferences,
      login: async (email, password) => {
        const response = await loginUser({ email, password });
        await secureStore.set(AUTH_USER_KEY, JSON.stringify(response.user));
        setUser(response.user);
        setLocked(false);
      },
      logout: async () => {
        await secureStore.remove(AUTH_USER_KEY);
        setUser(null);
        setLocked(false);
      },
      enableBiometricUnlock: async () => {
        const supported = await canUseBiometrics();
        if (!supported) {
          return;
        }

        const nextValue = {
          ...unlockPreferences,
          biometricEnabled: true,
        };
        await secureStore.set(UNLOCK_PREFS_KEY, JSON.stringify(nextValue));
        setUnlockPreferences(nextValue);
      },
      savePin: async (pin: string) => {
        const nextValue = {
          ...unlockPreferences,
          pinEnabled: true,
          pinCodeHash: hashPin(pin),
        };
        await secureStore.set(UNLOCK_PREFS_KEY, JSON.stringify(nextValue));
        setUnlockPreferences(nextValue);
      },
      unlockWithBiometric: async () => {
        const result = await requestBiometricUnlock();
        if (result.success) {
          setLocked(false);
          return true;
        }

        return false;
      },
      unlockWithPin: async (pin: string) => {
        if (!unlockPreferences.pinCodeHash || hashPin(pin) !== unlockPreferences.pinCodeHash) {
          return false;
        }

        setLocked(false);
        return true;
      },
    }),
    [initializing, locked, unlockPreferences, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return value;
}
