import { User, UserRole } from '../types';
import { AppView } from './appViews';

export type AccessFeature =
  | 'matchCenter'
  | 'financeCenter'
  | 'governanceCenter'
  | 'nominations'
  | 'ranking'
  | 'toRanking'
  | 'reports'
  | 'news'
  | 'announcement'
  | 'chat'
  | 'tests'
  | 'calendar'
  | 'calculation'
  | 'availability'
  | 'members'
  | 'access'
  | 'activity'
  | 'notifications';

const ALL_ROLES: UserRole[] = ['Instructor', 'TO', 'TO Supervisor', 'Referee', 'Staff', 'Financialist'];

const featureRoles: Record<AccessFeature, UserRole[]> = {
  matchCenter: ['Instructor', 'TO Supervisor'],
  financeCenter: ['Instructor', 'TO Supervisor', 'Referee', 'TO', 'Financialist'],
  governanceCenter: ['Instructor', 'Staff'],
  nominations: ALL_ROLES,
  ranking: ['Instructor', 'Staff', 'Referee'],
  toRanking: ['Instructor', 'TO Supervisor', 'TO'],
  reports: ['Instructor', 'TO Supervisor', 'Referee', 'TO', 'Staff'],
  news: ALL_ROLES,
  announcement: ['Instructor'],
  chat: ALL_ROLES,
  tests: ['Instructor', 'TO Supervisor', 'Referee', 'TO'],
  calendar: ['Instructor', 'TO Supervisor', 'Referee', 'TO', 'Staff'],
  calculation: ['Financialist', 'Referee', 'TO'],
  availability: ['Instructor', 'TO Supervisor', 'Referee', 'TO'],
  members: ['Instructor', 'Staff'],
  access: ['Instructor'],
  activity: ['Instructor'],
  notifications: ['Instructor', 'TO', 'TO Supervisor', 'Referee', 'Financialist'],
};

const viewFeatureMap: Partial<Record<AppView, AccessFeature>> = {
  matchCenter: 'matchCenter',
  financeCenter: 'financeCenter',
  governanceCenter: 'governanceCenter',
  nominations: 'nominations',
  ranking: 'ranking',
  toRanking: 'toRanking',
  reports: 'reports',
  toReports: 'reports',
  news: 'news',
  announcement: 'announcement',
  chat: 'chat',
  tests: 'tests',
  calendar: 'calendar',
  calculation: 'calculation',
  availability: 'availability',
  members: 'members',
  access: 'access',
  activity: 'activity',
  notifications: 'notifications',
};

export interface UserPermissions {
  isInstructor: boolean;
  isTO: boolean;
  isTOSupervisor: boolean;
  isReferee: boolean;
  isStaff: boolean;
  isFinancialist: boolean;
  canOpenMatchCenter: boolean;
  canOpenCalendar: boolean;
  canUseAvailability: boolean;
  canOpenCalculation: boolean;
  canOpenTests: boolean;
  canOpenNotifications: boolean;
}

export const hasFeatureAccess = (user: Pick<User, 'role'> | null | undefined, feature: AccessFeature) => {
  if (!user) {
    return false;
  }

  return featureRoles[feature].includes(user.role);
};

export const canAccessView = (user: Pick<User, 'role'> | null | undefined, view: AppView) => {
  if (!user) {
    return view === 'login';
  }

  if (view === 'login' || view === 'dashboard') {
    return true;
  }

  const feature = viewFeatureMap[view];
  return feature ? hasFeatureAccess(user, feature) : true;
};

export const getUserPermissions = (user: Pick<User, 'role'>): UserPermissions => ({
  isInstructor: user.role === 'Instructor',
  isTO: user.role === 'TO',
  isTOSupervisor: user.role === 'TO Supervisor',
  isReferee: user.role === 'Referee',
  isStaff: user.role === 'Staff',
  isFinancialist: user.role === 'Financialist',
  canOpenMatchCenter: hasFeatureAccess(user, 'matchCenter'),
  canOpenCalendar: hasFeatureAccess(user, 'calendar'),
  canUseAvailability: hasFeatureAccess(user, 'availability'),
  canOpenCalculation: hasFeatureAccess(user, 'calculation'),
  canOpenTests: hasFeatureAccess(user, 'tests'),
  canOpenNotifications: hasFeatureAccess(user, 'notifications'),
});
