import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import {
  getCurrentUserProfile,
  loginUser,
  logoutUser,
  subscribeToAuthChanges,
} from '@/src/services/auth-service';
import { canUseBiometrics, requestBiometricUnlock } from '@/src/services/biometric-service';
import { secureStore } from '@/src/services/secure-store';
import { User, UnlockPreferences } from '@/src/types/domain';
import { hashPin } from '@/src/utils/hash';

const UNLOCK_PREFS_KEY = 'refzone_mobile_v2_unlock_prefs';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  locked: boolean;
  unlockPreferences: UnlockPreferences;
  requiresPinSetup: boolean;
  requiresBiometricSetup: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  enableBiometricUnlock: () => Promise<boolean>;
  savePin: (pin: string) => Promise<void>;
  skipBiometricSetup: () => void;
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
  const [requiresBiometricSetup, setRequiresBiometricSetup] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const storedPrefs = await secureStore.get(UNLOCK_PREFS_KEY);
      const parsedPrefs = storedPrefs ? (JSON.parse(storedPrefs) as UnlockPreferences) : defaultUnlockPreferences;

      if (!isMounted) {
        return;
      }

      setUnlockPreferences(parsedPrefs);

      try {
        const restoredUser = await getCurrentUserProfile();

        if (!isMounted) {
          return;
        }

        setUser(restoredUser);

        if (restoredUser && !parsedPrefs.pinEnabled) {
          setRequiresBiometricSetup(false);
        } else if (restoredUser && parsedPrefs.pinEnabled && !parsedPrefs.biometricEnabled) {
          setRequiresBiometricSetup(false);
        }

        if (
          restoredUser &&
          (parsedPrefs.biometricEnabled || parsedPrefs.pinEnabled) &&
          parsedPrefs.lockOnLaunch
        ) {
          setLocked(true);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setLocked(false);
        }
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    };

    void bootstrap();

    const authSubscription = subscribeToAuthChanges((_event, session) => {
      if (!isMounted) {
        return;
      }

      if (!session) {
        setUser(null);
        setLocked(false);
        setRequiresBiometricSetup(false);
        return;
      }

      void getCurrentUserProfile()
        .then((nextUser) => {
          if (isMounted) {
            setUser(nextUser);
          }
        })
        .catch(() => {
          if (isMounted) {
            setUser(null);
          }
        });
    });

    return () => {
      isMounted = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        return;
      }

      if (user && (unlockPreferences.biometricEnabled || unlockPreferences.pinEnabled) && unlockPreferences.lockOnLaunch) {
        setLocked(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [unlockPreferences, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      locked,
      unlockPreferences,
      requiresPinSetup: Boolean(user && !unlockPreferences.pinEnabled),
      requiresBiometricSetup,
      login: async (email, password) => {
        const response = await loginUser({ email, password });
        setUser(response.user);
        setLocked(false);
        setRequiresBiometricSetup(false);
      },
      logout: async () => {
        await logoutUser();
        await secureStore.remove(UNLOCK_PREFS_KEY);
        setUser(null);
        setLocked(false);
        setUnlockPreferences(defaultUnlockPreferences);
        setRequiresBiometricSetup(false);
      },
      enableBiometricUnlock: async () => {
        const supported = await canUseBiometrics();
        if (!supported) {
          return false;
        }

        const result = await requestBiometricUnlock();
        if (!result.success) {
          return false;
        }

        const nextValue = {
          ...unlockPreferences,
          biometricEnabled: true,
        };
        await secureStore.set(UNLOCK_PREFS_KEY, JSON.stringify(nextValue));
        setUnlockPreferences(nextValue);
        setRequiresBiometricSetup(false);
        return true;
      },
      savePin: async (pin: string) => {
        const nextValue = {
          ...unlockPreferences,
          pinEnabled: true,
          pinCodeHash: hashPin(pin),
        };
        await secureStore.set(UNLOCK_PREFS_KEY, JSON.stringify(nextValue));
        setUnlockPreferences(nextValue);
        setRequiresBiometricSetup(true);
      },
      skipBiometricSetup: () => {
        setRequiresBiometricSetup(false);
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
    [initializing, locked, requiresBiometricSetup, unlockPreferences, user],
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
