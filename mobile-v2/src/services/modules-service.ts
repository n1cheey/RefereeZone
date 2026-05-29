import { apiRequest } from '@/src/services/api-client';
import { User, UserRole } from '@/src/types/domain';
import {
  MobileAvailabilityOverview,
  MobileBottomNavItem,
  MobileChatConversation,
  MobileHomeShortcut,
  MobileInstructorNomination,
  MobileMonthlyStats,
  MobileRefereeNomination,
  MobileUserTestSummary,
} from '@/src/types/modules';

type InstructorDashboardResponse = {
  nominations: MobileInstructorNomination[];
};

type AssignmentDashboardResponse = {
  nominations: MobileRefereeNomination[];
};

type TestsListResponse = {
  tests: MobileUserTestSummary[];
};

type ChatBootstrapResponse = {
  conversations: MobileChatConversation[];
};

type NewsItem = {
  id: string;
  youtubeUrl: string;
  commentary: string;
  createdAt: string;
  createdByName: string;
};

type MemberDirectoryItem = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  licenseNumber: string;
  photoUrl: string;
};

type RankingLeaderboardItem = {
  refereeId: string;
  refereeName: string;
  photoUrl: string;
  overallScore: number;
  rank: number;
};

type RankingDashboardResponse = {
  leaderboard: RankingLeaderboardItem[];
  currentUserItem: RankingLeaderboardItem | null;
  totalReferees: number;
};

type ReportsListItem = {
  nominationId: string;
  refereeId: string;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  refereeName: string;
  refereeReportStatus: string | null;
  instructorReportStatus: string | null;
  reviewScore: number | null;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export async function getMyGames(user: User) {
  if (user.role === 'Instructor' || user.role === 'TO Supervisor') {
    const response = await apiRequest<InstructorDashboardResponse>(
      `/api/dashboard/instructor/${encodeURIComponent(user.id)}?instructorId=${encodeURIComponent(user.id)}`,
    );
    return {
      instructorNominations: response.nominations,
      assignments: [] as MobileRefereeNomination[],
    };
  }

  if (['Referee', 'TO', 'TO Supervisor', 'Staff', 'Financialist'].includes(user.role)) {
    const response = await apiRequest<AssignmentDashboardResponse>(
      `/api/nominations/referee/${encodeURIComponent(user.id)}?refereeId=${encodeURIComponent(user.id)}`,
    );
    return {
      instructorNominations: [] as MobileInstructorNomination[],
      assignments: response.nominations,
    };
  }

  return {
    instructorNominations: [] as MobileInstructorNomination[],
    assignments: [] as MobileRefereeNomination[],
  };
}

export function getMobileAvailabilityOverview() {
  return apiRequest<MobileAvailabilityOverview>('/api/availability');
}

export function getMobileTests() {
  return apiRequest<TestsListResponse>('/api/tests');
}

export function getMobileChatBootstrap() {
  return apiRequest<ChatBootstrapResponse>('/api/chat/bootstrap');
}

export function getMobileNews() {
  return apiRequest<{ posts: NewsItem[] }>('/api/news');
}

export function getMobileMembers(user: User) {
  return apiRequest<{ members: MemberDirectoryItem[] }>(`/api/members?instructorId=${encodeURIComponent(user.id)}`);
}

export function getMobileRanking(user: User) {
  const targetPath = user.role === 'TO' || user.role === 'TO Supervisor' ? '/api/rankings/to' : '/api/rankings';
  return apiRequest<RankingDashboardResponse>(`${targetPath}?userId=${encodeURIComponent(user.id)}`);
}

export function getMobileReports(user: User) {
  return apiRequest<{ reports: ReportsListItem[] }>(`/api/reports?userId=${encodeURIComponent(user.id)}&mode=standard`);
}

export function getFinancialistSummary(startDate: string, endDate: string) {
  return apiRequest<{
    summary: {
      rangeStart: string;
      rangeEnd: string;
      refereeTotal: number;
      toTotal: number;
      nominationsCount: number;
    };
  }>('/api/mobile/finance-summary', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ startDate, endDate }),
  });
}

export function getBottomNavItems(role: UserRole): MobileBottomNavItem[] {
  if (role === 'Instructor') {
    return [
      { key: 'games', route: '/my-games', labelKey: 'home.myGames' },
      { key: 'chat', route: '/chat', labelKey: 'home.chat' },
      { key: 'reports', route: '/reports', labelKey: 'home.reports' },
      { key: 'ranking', route: '/ranking', labelKey: 'home.ranking' },
      { key: 'news', route: '/news', labelKey: 'home.news' },
      { key: 'members', route: '/members', labelKey: 'home.members' },
      { key: 'profile', route: '/profile', labelKey: 'home.profile' },
    ];
  }

  if (role === 'Financialist') {
    return [
      { key: 'games', route: '/my-games', labelKey: 'home.myGames' },
      { key: 'chat', route: '/chat', labelKey: 'home.chat' },
      { key: 'finance', route: '/finance', labelKey: 'home.finance' },
      { key: 'profile', route: '/profile', labelKey: 'home.profile' },
    ];
  }

  if (role === 'Staff') {
    return [
      { key: 'games', route: '/my-games', labelKey: 'home.myGames' },
      { key: 'chat', route: '/chat', labelKey: 'home.chat' },
      { key: 'reports', route: '/reports', labelKey: 'home.reports' },
      { key: 'ranking', route: '/ranking', labelKey: 'home.ranking' },
      { key: 'news', route: '/news', labelKey: 'home.news' },
      { key: 'profile', route: '/profile', labelKey: 'home.profile' },
    ];
  }

  return [
    { key: 'games', route: '/my-games', labelKey: 'home.myGames' },
    { key: 'chat', route: '/chat', labelKey: 'home.chat' },
    { key: 'reports', route: '/reports', labelKey: 'home.reports' },
    { key: 'ranking', route: '/ranking', labelKey: 'home.ranking' },
    { key: 'news', route: '/news', labelKey: 'home.news' },
    { key: 'profile', route: '/profile', labelKey: 'home.profile' },
  ];
}

export function getHomeShortcuts(role: UserRole): MobileHomeShortcut[] {
  switch (role) {
    case 'Instructor':
      return [
        { key: 'availability', route: '/availability', labelKey: 'home.availability' },
        { key: 'tests', route: '/tests', labelKey: 'home.tests' },
        { key: 'calendar', route: '/calendar', labelKey: 'home.calendar' },
      ];
    case 'TO Supervisor':
      return [
        { key: 'availability', route: '/availability', labelKey: 'home.availability' },
        { key: 'tests', route: '/tests', labelKey: 'home.tests' },
        { key: 'calendar', route: '/calendar', labelKey: 'home.calendar' },
      ];
    case 'Referee':
    case 'TO':
      return [
        { key: 'tests', route: '/tests', labelKey: 'home.tests' },
        { key: 'calendar', route: '/calendar', labelKey: 'home.calendar' },
        { key: 'finance', route: '/finance', labelKey: 'home.finance' },
      ];
    case 'Staff':
      return [{ key: 'calendar', route: '/calendar', labelKey: 'home.calendar' }];
    case 'Financialist':
      return [{ key: 'finance', route: '/finance', labelKey: 'home.finance' }];
    default:
      return [];
  }
}

export function getMonthlyStats(user: User, assignments: MobileRefereeNomination[] = []): MobileMonthlyStats {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const currentMonthAssignments = assignments.filter((assignment) => {
    const matchDate = new Date(`${assignment.matchDate}T00:00:00`);
    return matchDate.getFullYear() === year && matchDate.getMonth() === month;
  });

  const acceptedAssignments = currentMonthAssignments.filter((assignment) =>
    ['Accepted', 'Completed', 'Submitted', 'Reviewed'].includes(String(assignment.status)),
  );

  const earnings = acceptedAssignments.reduce((sum, assignment) => {
    const fee = assignment.assignmentGroup === 'TO' ? assignment.toFee || 0 : assignment.refereeFee || 0;
    return sum + fee;
  }, 0);

  if (['Referee', 'TO', 'TO Supervisor', 'Staff', 'Financialist'].includes(user.role)) {
    return {
      matchesCount: acceptedAssignments.length,
      earnings,
    };
  }

  return {
    matchesCount: currentMonthAssignments.length,
    earnings: 0,
  };
}
