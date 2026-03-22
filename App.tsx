
import React, { useEffect, useState } from 'react';
import { User } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Nominations from './components/Nominations';
import Ranking from './components/Ranking';
import Reports from './components/Reports';
import News from './components/News';
import Members from './components/Members';
import AccessManager from './components/AccessManager';
import { getCurrentUserProfile, logoutUser, subscribeToAuthChanges } from './services/authService';

type View = 'login' | 'dashboard' | 'nominations' | 'ranking' | 'reports' | 'news' | 'members' | 'access';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('login');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const user = await getCurrentUserProfile();

      if (!isMounted) {
        return;
      }

      setCurrentUser(user);
      setCurrentView(user ? 'dashboard' : 'login');
      setIsAuthLoading(false);
    };

    void syncSession();

    const {
      data: { subscription },
    } = subscribeToAuthChanges(async (_event, session) => {
      if (!isMounted) {
        return;
      }

      if (!session) {
        setCurrentUser(null);
        setCurrentView('login');
        setIsAuthLoading(false);
        return;
      }

      const user = await getCurrentUserProfile();
      if (!isMounted) {
        return;
      }

      setCurrentUser(user);
      setCurrentView(user ? 'dashboard' : 'login');
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setCurrentView('login');
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setCurrentUser(null);
      setCurrentView('login');
      setIsAuthLoading(false);
    }
  };

  const renderView = () => {
    if (isAuthLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-sm">
            Loading session...
          </div>
        </div>
      );
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
            onNavigate={(view: any) => setCurrentView(view)} 
            onLogout={() => {
              void handleLogout();
            }}
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

  return (
    <div className="h-full">
      {renderView()}
    </div>
  );
};

export default App;
