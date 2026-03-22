
import React, { useState, useEffect } from 'react';
import { User } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Nominations from './components/Nominations';
import Ranking from './components/Ranking';
import Reports from './components/Reports';
import News from './components/News';
import Members from './components/Members';
import AccessManager from './components/AccessManager';

type View = 'login' | 'dashboard' | 'nominations' | 'ranking' | 'reports' | 'news' | 'members' | 'access';
const STORAGE_KEY = 'abl-current-user';
const DEFAULT_PHOTO_URL = 'https://picsum.photos/seed/referee/300/300';

const normalizeStoredUser = (value: unknown): User | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<User>;

  if (!candidate.id || !candidate.email || !candidate.fullName) {
    return null;
  }

  const role = candidate.role ?? 'Referee';

  return {
    id: String(candidate.id),
    email: String(candidate.email),
    fullName: String(candidate.fullName),
    photoUrl: candidate.photoUrl || DEFAULT_PHOTO_URL,
    licenseNumber: candidate.licenseNumber || 'Pending',
    role,
    category: candidate.category || role,
  };
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('login');

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    if (!storedUser) {
      return;
    }

    try {
      const parsedUser = normalizeStoredUser(JSON.parse(storedUser));
      if (parsedUser) {
        setCurrentUser(parsedUser);
        setCurrentView('dashboard');
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setCurrentView('login');
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setCurrentView('dashboard');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
    setCurrentView('login');
  };

  const renderView = () => {
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

  return (
    <div className="h-full">
      {renderView()}
    </div>
  );
};

export default App;
