import React, { Suspense, lazy, startTransition, useEffect, useState } from 'react';
import { User } from './types';
import Login from './components/Login';
import { getCurrentUserProfile, logoutUser, subscribeToAuthChanges } from './services/authService';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Nominations = lazy(() => import('./components/Nominations'));
const Ranking = lazy(() => import('./components/Ranking'));
const Reports = lazy(() => import('./components/Reports'));
const News = lazy(() => import('./components/News'));
const Members = lazy(() => import('./components/Members'));
const AccessManager = lazy(() => import('./components/AccessManager'));

type View = 'login' | 'dashboard' | 'nominations' | 'ranking' | 'reports' | 'news' | 'members' | 'access';

const AUTH_LOADING_TIMEOUT_MS = 4000;
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

    const syncSession = async () => {
      try {
        const user = await getCurrentUserProfile();
        applyResolvedUser(user);
      } catch (error) {
        console.error('Failed to restore session', error);
        applyResolvedUser(null);
      }
    };

    loadingTimeoutId = window.setTimeout(() => {
      applyResolvedUser(readCachedUser());
    }, AUTH_LOADING_TIMEOUT_MS);

    void syncSession();

    const {
      data: { subscription },
    } = subscribeToAuthChanges(async (_event, session) => {
      if (!isMounted) {
        return;
      }

      if (!session) {
        applyResolvedUser(null);
        return;
      }

      try {
        const user = await getCurrentUserProfile();
        applyResolvedUser(user);
      } catch (error) {
        console.error('Failed to refresh session after auth change', error);
        applyResolvedUser(readCachedUser());
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
      } else {
        setIsAuthLoading(true);
      }

      void syncSession();
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
