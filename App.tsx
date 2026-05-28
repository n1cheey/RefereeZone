import React, { Suspense, lazy, startTransition, useEffect, useRef, useState } from 'react';
import { User } from './types';
import Login from './components/Login';
import { I18nProvider, useI18n } from './i18n';
import { SeasonProvider } from './services/seasonContext';
import { AppView } from './services/appViews';
import { canAccessView } from './services/accessControl';
import {
  getCurrentUserProfile,
  isPasswordRecoveryMode,
  isPasswordResetPage,
  logoutUser,
  subscribeToAuthChanges,
} from './services/authService';

const Dashboard = lazy(() => import('./components/Dashboard'));
const MatchCenter = lazy(() => import('./components/MatchCenter'));
const FinanceCenter = lazy(() => import('./components/FinanceCenter'));
const GovernanceCenter = lazy(() => import('./components/GovernanceCenter'));
const EarningsCalculation = lazy(() => import('./components/EarningsCalculation'));
const FinancialCalculations = lazy(() => import('./components/FinancialCalculations'));
const Nominations = lazy(() => import('./components/Nominations'));
const Ranking = lazy(() => import('./components/Ranking'));
const Reports = lazy(() => import('./components/Reports'));
const News = lazy(() => import('./components/News'));
const Members = lazy(() => import('./components/Members'));
const AccessManager = lazy(() => import('./components/AccessManager'));
const Activity = lazy(() => import('./components/Activity'));
const AnnouncementManager = lazy(() => import('./components/AnnouncementManager'));
const Chat = lazy(() => import('./components/Chat'));
const NotificationCenter = lazy(() => import('./components/NotificationCenter'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const Availability = lazy(() => import('./components/Availability'));
const Tests = lazy(() => import('./components/Tests'));

const AUTH_LOADING_TIMEOUT_MS = 4000;
const SESSION_SYNC_COOLDOWN_MS = 60000;
const STORAGE_KEY = 'abl-current-user-cache';
const VIEW_STORAGE_KEY = 'abl-current-view';
const HOME_NAVIGATION_EVENT = 'abl:navigate-home';

const normalizeStoredUser = (value: unknown): User | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<User>;
  if (!candidate.id || !candidate.email || !candidate.fullName || !candidate.role) {
    return null;
  }

  const rawRole = String(candidate.role);
  const normalizedRole = rawRole === 'Stuff' ? 'Staff' : rawRole === 'Table' ? 'TO' : candidate.role;

  return {
    id: String(candidate.id),
    email: String(candidate.email),
    fullName: String(candidate.fullName),
    photoUrl: String(candidate.photoUrl || ''),
    licenseNumber: String(candidate.licenseNumber || 'Pending'),
    role: normalizedRole,
    category: String(candidate.category || normalizedRole),
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

const normalizeStoredView = (value: unknown): AppView => {
  switch (value) {
    case 'dashboard':
    case 'matchCenter':
    case 'financeCenter':
    case 'governanceCenter':
    case 'nominations':
    case 'ranking':
    case 'toRanking':
    case 'reports':
    case 'toReports':
    case 'news':
    case 'announcement':
    case 'chat':
    case 'notifications':
    case 'tests':
    case 'calendar':
    case 'calculation':
    case 'availability':
    case 'members':
    case 'access':
    case 'activity':
    case 'login':
      return value;
    default:
      return 'dashboard';
  }
};

const readCachedView = (hasUser: boolean) => {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    const view = normalizeStoredView(raw);

    if (!hasUser) {
      return 'login';
    }

    return view === 'login' ? 'dashboard' : view;
  } catch {
    return hasUser ? 'dashboard' : 'login';
  }
};

const writeCachedView = (view: AppView) => {
  window.localStorage.setItem(VIEW_STORAGE_KEY, view);
};

const LoadingScreen = ({ label }: { label: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-sm">
      {label}
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { t } = useI18n();
  const recoveryModeRef = useRef(typeof window !== 'undefined' && (isPasswordRecoveryMode() || isPasswordResetPage()));
  const sessionSyncPromiseRef = useRef<Promise<void> | null>(null);
  const lastSessionSyncAtRef = useRef(0);
  const viewHistoryRef = useRef<AppView[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    typeof window === 'undefined' || isPasswordRecoveryMode() || isPasswordResetPage() ? null : readCachedUser(),
  );
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window === 'undefined') {
      return 'login';
    }

    if (isPasswordRecoveryMode() || isPasswordResetPage()) {
      return 'login';
    }

    return readCachedView(Boolean(readCachedUser()));
  });
  const [isAuthLoading, setIsAuthLoading] = useState(() =>
    typeof window === 'undefined' ? true : isPasswordRecoveryMode() || isPasswordResetPage() ? false : !readCachedUser(),
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
        setCurrentView((previousView) => {
          if (!user) {
            writeCachedView('login');
            return 'login';
          }

          const nextView = previousView === 'login' ? readCachedView(true) : previousView;
          writeCachedView(nextView);
          return nextView;
        });
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

    if (!recoveryModeRef.current) {
      loadingTimeoutId = window.setTimeout(() => {
        applyResolvedUser(readCachedUser());
      }, AUTH_LOADING_TIMEOUT_MS);

      if (!readCachedUser()) {
        void syncSession(true).catch((error) => {
          restoreCachedSession(error, 'Failed to restore session');
        });
      }
    } else {
      applyResolvedUser(null);
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

      if (event === 'PASSWORD_RECOVERY') {
        recoveryModeRef.current = true;
        startTransition(() => {
          setCurrentUser(null);
          setCurrentView('login');
          setIsAuthLoading(false);
        });
        return;
      }

      if (!session) {
        if (event === 'SIGNED_OUT') {
          recoveryModeRef.current = false;
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
      if (recoveryModeRef.current) {
        setCurrentUser(null);
        setCurrentView('login');
        setIsAuthLoading(false);
        return;
      }

      if (cachedUser) {
        setCurrentUser(cachedUser);
        setCurrentView(readCachedView(true));
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    writeCachedView(currentView);
  }, [currentView]);

  const handleLogin = (user: User) => {
    writeCachedUser(user);
    writeCachedView('dashboard');
    viewHistoryRef.current = [];
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
    writeCachedView('login');
    viewHistoryRef.current = [];
    startTransition(() => {
      setCurrentUser(null);
      setCurrentView('login');
      setIsAuthLoading(false);
    });

    void logoutUser().catch((error) => {
      console.error('Logout failed', error);
    });
  };

  const navigateTo = (view: AppView, options?: { replace?: boolean }) => {
    startTransition(() => {
      setCurrentView((previousView) => {
        if (!options?.replace && previousView !== view && previousView !== 'login') {
          viewHistoryRef.current.push(previousView);
        }

        return view;
      });
    });
  };

  const navigateBack = () => {
    startTransition(() => {
      setCurrentView((previousView) => {
        while (viewHistoryRef.current.length > 0) {
          const candidate = viewHistoryRef.current.pop();
          if (candidate && candidate !== previousView) {
            return candidate;
          }
        }

        return 'dashboard';
      });
    });
  };

  useEffect(() => {
    const handleHomeNavigation = () => {
      viewHistoryRef.current = [];
      navigateTo('dashboard', { replace: true });
    };

    window.addEventListener(HOME_NAVIGATION_EVENT, handleHomeNavigation);

    return () => {
      window.removeEventListener(HOME_NAVIGATION_EVENT, handleHomeNavigation);
    };
  }, []);

  const renderView = () => {
    if (isAuthLoading) {
      return <LoadingScreen label={t('common.loadingSession')} />;
    }

    if (!currentUser && currentView !== 'login') {
      return null;
    }

    if (currentUser && !canAccessView(currentUser, currentView)) {
      return (
        <Dashboard
          user={currentUser}
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
        />
      );
    }

    switch (currentView) {
      case 'login':
        return <Login onLogin={handleLogin} />;
      case 'dashboard':
      return (
        <Dashboard
            user={currentUser!}
            onNavigate={navigateTo}
            onLogout={handleLogout}
            onUpdateUser={handleUpdateUser}
          />
        );
      case 'matchCenter':
        return currentUser!.role === 'Instructor' || currentUser!.role === 'TO Supervisor'
          ? <MatchCenter user={currentUser!} onBack={navigateBack} onNavigate={navigateTo} />
          : (
            <Dashboard
              user={currentUser!}
              onNavigate={navigateTo}
              onLogout={handleLogout}
              onUpdateUser={handleUpdateUser}
            />
          );
      case 'financeCenter':
        return <FinanceCenter user={currentUser!} onBack={navigateBack} onNavigate={navigateTo} />;
      case 'governanceCenter':
        return <GovernanceCenter user={currentUser!} onBack={navigateBack} onNavigate={navigateTo} />;
      case 'nominations':
        return <Nominations user={currentUser!} onBack={navigateBack} onNavigate={navigateTo} />;
      case 'ranking':
        return (
          <Ranking
            user={currentUser!}
            onBack={navigateBack}
            rankingMode={currentUser!.role === 'TO' || currentUser!.role === 'TO Supervisor' ? 'to' : 'referee'}
          />
        );
      case 'toRanking':
        return (
          <Ranking
            user={currentUser!}
            onBack={navigateBack}
            rankingMode="to"
          />
        );
      case 'reports':
        return <Reports user={currentUser!} onBack={navigateBack} />;
      case 'toReports':
        return <Reports user={currentUser!} onBack={navigateBack} reportMode="to" />;
      case 'news':
        return <News user={currentUser!} onBack={navigateBack} />;
      case 'announcement':
        return <AnnouncementManager user={currentUser!} onBack={navigateBack} />;
        case 'chat':
          return <Chat user={currentUser!} onBack={navigateBack} />;
        case 'notifications':
          return <NotificationCenter user={currentUser!} onBack={navigateBack} onNavigate={navigateTo} />;
        case 'tests':
          return <Tests user={currentUser!} onBack={navigateBack} />;
        case 'calendar':
        return <CalendarView user={currentUser!} onBack={navigateBack} />;
      case 'calculation':
        return currentUser!.role === 'Financialist'
          ? <FinancialCalculations user={currentUser!} onBack={navigateBack} />
          : currentUser!.role === 'Referee' || currentUser!.role === 'TO'
            ? <EarningsCalculation user={currentUser!} onBack={navigateBack} />
            : (
              <Dashboard
                user={currentUser!}
                onNavigate={navigateTo}
                onLogout={handleLogout}
                onUpdateUser={handleUpdateUser}
              />
            );
      case 'availability':
        return currentUser!.role === 'Staff'
          ? (
              <Dashboard
                user={currentUser!}
                onNavigate={navigateTo}
                onLogout={handleLogout}
                onUpdateUser={handleUpdateUser}
              />
            )
          : <Availability user={currentUser!} onBack={navigateBack} />;
      case 'members':
        return <Members user={currentUser!} onBack={navigateBack} onCurrentUserUpdated={handleUpdateUser} />;
      case 'access':
        return <AccessManager user={currentUser!} onBack={navigateBack} />;
      case 'activity':
        return <Activity user={currentUser!} onBack={navigateBack} />;
      default:
        return <Login onLogin={handleLogin} />;
    }
  };

  return <Suspense fallback={<LoadingScreen label={t('common.loadingSession')} />}>{renderView()}</Suspense>;
};

const App: React.FC = () => (
  <I18nProvider>
    <SeasonProvider>
      <AppContent />
    </SeasonProvider>
  </I18nProvider>
);

export default App;
