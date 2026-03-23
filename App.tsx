import React, { Suspense, lazy, startTransition, useEffect, useRef, useState } from 'react';
import { User } from './types';
import Login from './components/Login';
import { getCurrentUserProfile, logoutUser, subscribeToAuthChanges } from './services/authService';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Nominations = lazy(() => import('./components/Nominations'));
const Teyinat = lazy(() => import('./components/Teyinat'));
const Ranking = lazy(() => import('./components/Ranking'));
const Reports = lazy(() => import('./components/Reports'));
const News = lazy(() => import('./components/News'));
const Members = lazy(() => import('./components/Members'));
const AccessManager = lazy(() => import('./components/AccessManager'));

type View = 'login' | 'dashboard' | 'nominations' | 'teyinat' | 'ranking' | 'reports' | 'news' | 'members' | 'access';

const AUTH_LOADING_TIMEOUT_MS = 4000;
const SESSION_SYNC_COOLDOWN_MS = 60000;
const STORAGE_KEY = 'abl-current-user-cache';

const normalizeStoredUser = (value: unknown): User | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<User>;
  if (!candidate.id || !candidate.email || !candidate.fullName || !candidate.role) {
    return null;
  }

  return {
    id: String(candidate.id),
    email: String(candidate.email),
    fullName: String(candidate.fullName),
    photoUrl: String(candidate.photoUrl || ''),
    licenseNumber: String(candidate.licenseNumber || 'Pending'),
    role: candidate.role,
    category: String(candidate.category || candidate.role),
  };
};

const readCachedUser = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeStoredUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (user: User | null) => {
  if (!user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

const LoadingScreen = ({ label }: { label: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-sm">
      {label}
    </div>
  </div>
);

const App: React.FC = () => {
  const sessionSyncPromiseRef = useRef<Promise<void> | null>(null);
  const lastSessionSyncAtRef = useRef(0);
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    typeof window === 'undefined' ? null : readCachedUser(),
  );
  const [currentView, setCurrentView] = useState<View>(() =>
    typeof window === 'undefined' ? 'login' : readCachedUser() ? 'dashboard' : 'login',
  );
  const [isAuthLoading, setIsAuthLoading] = useState(() =>
    typeof window === 'undefined' ? true : !readCachedUser(),
  );

  useEffect(() => {
    let isMounted = true;
    let loadingTimeoutId: number | null = null;

    const applyResolvedUser = (user: User | null) => {
      if (!isMounted) {
        return;
      }

      if (loadingTimeoutId !== null) {
        window.clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
      }

      writeCachedUser(user);

      startTransition(() => {
        setCurrentUser(user);
        setCurrentView(user ? 'dashboard' : 'login');
        setIsAuthLoading(false);
      });
    };

    const restoreCachedSession = (error: unknown, context: string) => {
      console.error(context, error);
      applyResolvedUser(readCachedUser());
    };

    const syncSession = async (force = false) => {
      const cachedUser = readCachedUser();
      const now = Date.now();

      if (!force && cachedUser && now - lastSessionSyncAtRef.current < SESSION_SYNC_COOLDOWN_MS) {
        return;
      }

      if (sessionSyncPromiseRef.current) {
        return sessionSyncPromiseRef.current;
      }

      const request = (async () => {
        lastSessionSyncAtRef.current = now;
        const user = await getCurrentUserProfile();
        applyResolvedUser(user);
      })();

      sessionSyncPromiseRef.current = request;

      try {
        await request;
      } finally {
        if (sessionSyncPromiseRef.current === request) {
          sessionSyncPromiseRef.current = null;
        }
      }
    };

    loadingTimeoutId = window.setTimeout(() => {
      applyResolvedUser(readCachedUser());
    }, AUTH_LOADING_TIMEOUT_MS);

    if (!readCachedUser()) {
      void syncSession(true).catch((error) => {
        restoreCachedSession(error, 'Failed to restore session');
      });
    }

    const refreshSessionAfterAuthChange = (force = false) => {
      window.setTimeout(() => {
        if (!isMounted) {
          return;
        }

        void syncSession(force).catch((error) => {
          restoreCachedSession(error, 'Failed to refresh session after auth change');
        });
      }, 0);
    };

    const {
      data: { subscription },
    } = subscribeToAuthChanges((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (!session) {
        if (event === 'SIGNED_OUT') {
          applyResolvedUser(null);
          return;
        }

        refreshSessionAfterAuthChange();
        return;
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        refreshSessionAfterAuthChange(true);
      }
    });

    const handlePageShow = () => {
      if (!isMounted) {
        return;
      }

      const cachedUser = readCachedUser();
      if (cachedUser) {
        setCurrentUser(cachedUser);
        setCurrentView('dashboard');
        setIsAuthLoading(false);
        return;
      }

      setIsAuthLoading(true);
      void syncSession(true).catch((error) => {
        restoreCachedSession(error, 'Failed to restore session after pageshow');
      });
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      isMounted = false;
      if (loadingTimeoutId !== null) {
        window.clearTimeout(loadingTimeoutId);
      }
      window.removeEventListener('pageshow', handlePageShow);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setCurrentView('login');
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
    writeCachedUser(user);
    startTransition(() => {
      setCurrentUser(user);
      setCurrentView('dashboard');
      setIsAuthLoading(false);
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    writeCachedUser(updatedUser);
    startTransition(() => {
      setCurrentUser(updatedUser);
    });
  };

  const handleLogout = () => {
    writeCachedUser(null);
    startTransition(() => {
      setCurrentUser(null);
      setCurrentView('login');
      setIsAuthLoading(false);
    });

    void logoutUser().catch((error) => {
      console.error('Logout failed', error);
    });
  };

  const renderView = () => {
    if (isAuthLoading) {
      return <LoadingScreen label="Loading session..." />;
    }

    if (!currentUser && currentView !== 'login') {
      return null;
    }

    switch (currentView) {
      case 'login':
        return <Login onLogin={handleLogin} />;
      case 'dashboard':
        return (
          <Dashboard
            user={currentUser!}
            onNavigate={(view: View) => setCurrentView(view)}
            onLogout={handleLogout}
            onUpdateUser={handleUpdateUser}
          />
        );
      case 'nominations':
        return <Nominations user={currentUser!} onBack={() => setCurrentView('dashboard')} />;
      case 'teyinat':
        return <Teyinat user={currentUser!} onBack={() => setCurrentView('dashboard')} />;
      case 'ranking':
        return <Ranking user={currentUser!} onBack={() => setCurrentView('dashboard')} />;
      case 'reports':
        return <Reports user={currentUser!} onBack={() => setCurrentView('dashboard')} />;
      case 'news':
        return <News onBack={() => setCurrentView('dashboard')} />;
      case 'members':
        return <Members user={currentUser!} onBack={() => setCurrentView('dashboard')} onCurrentUserUpdated={handleUpdateUser} />;
      case 'access':
        return <AccessManager user={currentUser!} onBack={() => setCurrentView('dashboard')} />;
      default:
        return <Login onLogin={handleLogin} />;
    }
  };

  return <Suspense fallback={<LoadingScreen label="Loading page..." />}>{renderView()}</Suspense>;
};

export default App;
