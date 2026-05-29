import { apiRequest } from '@/src/services/api-client';
import { User, UserRole } from '@/src/types/domain';
import {
  MobileAvailabilityOverview,
  MobileAnnouncementItem,
  MobileAllowedAccess,
  MobileBottomNavItem,
  MobileChatConversation,
  MobileChatUser,
  MobileHomeShortcut,
  MobileInstructorNomination,
  MobileMemberDirectoryItem,
  MobileMonthlyStats,
  MobileRefereeDirectoryItem,
  MobileRefereeNomination,
  MobileRankingResponse,
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
  users: MobileChatUser[];
};

type NewsItem = {
  id: string;
  youtubeUrl: string;
  commentary: string;
  createdAt: string;
  createdByName: string;
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
  photoUrl?: string | null;
  refereeReportStatus: string | null;
  instructorReportStatus: string | null;
  reviewScore: number | null;
  deadlineExceeded?: boolean;
  deadlineMessage?: string | null;
  canAddTime?: boolean;
  reportMode?: 'standard' | 'to' | 'test_to';
  googleDriveUrl?: string | null;
  reportDeadlineAt?: string | null;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export async function getMyGames(user: User, seasonId?: string | null) {
  if (user.role === 'Instructor' || user.role === 'TO Supervisor') {
    const response = await apiRequest<InstructorDashboardResponse>(
      `/api/dashboard/instructor/${encodeURIComponent(user.id)}?instructorId=${encodeURIComponent(user.id)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
    );
    return {
      instructorNominations: response.nominations,
      assignments: [] as MobileRefereeNomination[],
    };
  }

  if (user.role === 'Staff' || user.role === 'Financialist') {
    const response = await apiRequest<InstructorDashboardResponse>(
      `/api/nominations/instructor/${encodeURIComponent(user.id)}?instructorId=${encodeURIComponent(user.id)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
    );
    return {
      instructorNominations: response.nominations,
      assignments: [] as MobileRefereeNomination[],
    };
  }

  if (['Referee', 'TO'].includes(user.role)) {
    const response = await apiRequest<AssignmentDashboardResponse>(
      `/api/nominations/referee/${encodeURIComponent(user.id)}?refereeId=${encodeURIComponent(user.id)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
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

export async function getAllMobileGames(user: User, seasonId?: string | null) {
  const response = await apiRequest<InstructorDashboardResponse>(
    `/api/nominations/instructor/${encodeURIComponent(user.id)}?instructorId=${encodeURIComponent(user.id)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
  );

  return response.nominations;
}

export function getMobileAvailabilityOverview() {
  return apiRequest<MobileAvailabilityOverview>('/api/availability');
}

export function createMobileAvailabilityRequest(payload: { startDate: string; endDate: string; reason: string }) {
  return apiRequest<{ message: string; overview: MobileAvailabilityOverview }>('/api/availability', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

export function reviewMobileAvailabilityRequest(requestId: string, status: 'Approved' | 'Declined') {
  return apiRequest<{ message: string; overview: MobileAvailabilityOverview }>(`/api/availability/${encodeURIComponent(requestId)}/review`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ status }),
  });
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

export function getMobileAnnouncement() {
  return apiRequest<{ announcement: MobileAnnouncementItem | null }>('/api/announcements/current');
}

export function saveMobileAnnouncement(user: User, payload: { messageAz: string; messageEn: string; messageRu: string }) {
  const sourceMessage = payload.messageEn || payload.messageAz || payload.messageRu;
  const sourceLanguage = payload.messageEn ? 'en' : payload.messageAz ? 'az' : 'ru';
  return apiRequest<{ message: string; announcement: MobileAnnouncementItem }>(
    '/api/announcements/current',
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        userId: user.id,
        message: sourceMessage,
        sourceLanguage,
        messageAz: payload.messageAz,
        messageEn: payload.messageEn,
        messageRu: payload.messageRu,
      }),
    },
  );
}

export function getMobileMembers(user: User) {
  return apiRequest<{ members: MobileMemberDirectoryItem[] }>(`/api/members?instructorId=${encodeURIComponent(user.id)}`);
}

export function getMobileMemberDetail(memberId: string) {
  return apiRequest<{ member: MobileMemberDirectoryItem }>(`/api/members/${encodeURIComponent(memberId)}`);
}

export function updateMobileMember(
  user: User,
  payload: {
    memberId: string;
    email: string;
    fullName: string;
    licenseNumber: string;
    photoUrl: string;
  },
) {
  return apiRequest<{ message: string; member: MobileMemberDirectoryItem }>(`/api/members/${encodeURIComponent(payload.memberId)}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      instructorId: user.id,
      memberId: payload.memberId,
      email: payload.email,
      fullName: payload.fullName,
      licenseNumber: payload.licenseNumber,
      photoUrl: payload.photoUrl,
    }),
  });
}

export function deleteMobileMember(user: User, memberId: string) {
  return apiRequest<{ message: string }>(
    `/api/members/${encodeURIComponent(memberId)}?instructorId=${encodeURIComponent(user.id)}`,
    { method: 'DELETE' },
  );
}

export function getMobileAllowedAccess(user: User) {
  return apiRequest<{ accessList: MobileAllowedAccess[] }>(`/api/access?instructorId=${encodeURIComponent(user.id)}`);
}

export function addMobileAllowedAccess(user: User, payload: { email: string; licenseNumber: string; role: UserRole }) {
  return apiRequest<{ message: string; access: MobileAllowedAccess }>('/api/access', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      instructorId: user.id,
      email: payload.email,
      licenseNumber: payload.licenseNumber,
      role: payload.role,
    }),
  });
}

export function deleteMobileAllowedAccess(user: User, accessId: string) {
  return apiRequest<{ message: string }>(`/api/access/${encodeURIComponent(accessId)}?instructorId=${encodeURIComponent(user.id)}`, {
    method: 'DELETE',
  });
}

export function getMobileRanking(user: User, seasonId?: string | null, options?: { compact?: boolean }) {
  const targetPath = user.role === 'TO' || user.role === 'TO Supervisor' ? '/api/rankings/to' : '/api/rankings';
  return apiRequest<MobileRankingResponse>(
    `${targetPath}?userId=${encodeURIComponent(user.id)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}${options?.compact ? '&compact=1' : ''}`,
  );
}

export function getMobileReports(user: User, seasonId?: string | null, modeOverride?: 'standard' | 'to') {
  const mode = modeOverride || (user.role === 'TO' || user.role === 'TO Supervisor' ? 'to' : 'standard');
  return apiRequest<{ reports: ReportsListItem[] }>(
    `/api/mobile/reports?userId=${encodeURIComponent(user.id)}&mode=${mode}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
  );
}

export function getMobileReportOverview(user: User, seasonId?: string | null, modeOverride?: 'standard' | 'to') {
  const mode = modeOverride || (user.role === 'TO' || user.role === 'TO Supervisor' ? 'to' : 'standard');
  return apiRequest<{
    availableReports: ReportsListItem[];
    profiles: { id: string; name: string; photoUrl?: string | null; submittedCount: number; overdueCount: number }[];
  }>(
    `/api/mobile/reports?userId=${encodeURIComponent(user.id)}&mode=${mode}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
  );
}

export function getMobileReportProfile(
  user: User,
  profileId: string,
  seasonId?: string | null,
  modeOverride?: 'standard' | 'to',
) {
  const mode = modeOverride || (user.role === 'TO' || user.role === 'TO Supervisor' ? 'to' : 'standard');
  return apiRequest<{
    submittedReports: ReportsListItem[];
    overdueReports: ReportsListItem[];
    reviewedReports: ReportsListItem[];
  }>(
    `/api/mobile/reports?userId=${encodeURIComponent(user.id)}&mode=${mode}&profileId=${encodeURIComponent(profileId)}${seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : ''}`,
  );
}

export function getMobileRefereeDirectory(user: User) {
  return apiRequest<{ referees: MobileRefereeDirectoryItem[] }>(`/api/referees?instructorId=${encodeURIComponent(user.id)}`);
}

export function createMobileNomination(
  user: User,
  payload: {
    gameCode: string;
    teams: string;
    matchDate: string;
    matchTime: string;
    venue: string;
    refereeIds: string[];
    seasonId?: string | null;
  },
) {
  return apiRequest<{ message: string; nomination: MobileInstructorNomination }>('/api/nominations', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      userId: user.id,
      instructorId: user.id,
      gameCode: payload.gameCode,
      teams: payload.teams,
      matchDate: payload.matchDate,
      matchTime: payload.matchTime,
      venue: payload.venue,
      refereeIds: payload.refereeIds,
      seasonId: payload.seasonId,
    }),
  });
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

export function updateMobileMatchDetails(
  nominationId: string,
  payload: {
    finalScore?: string | null;
    matchVideoUrl?: string | null;
    matchProtocolUrl?: string | null;
    refereeFee?: number | null;
    toFee?: number | null;
  },
) {
  return apiRequest<{ message: string }>(`/api/nominations/${encodeURIComponent(nominationId)}/score`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      finalScore: payload.finalScore || null,
      matchVideoUrl: payload.matchVideoUrl || null,
      matchProtocolUrl: payload.matchProtocolUrl || null,
      refereeFee: payload.refereeFee ?? null,
      toFee: payload.toFee ?? null,
    }),
  });
}

export function getBottomNavItems(role: UserRole): MobileBottomNavItem[] {
  if (role === 'Instructor') {
    return [
      { key: 'home', route: '/home', labelKey: 'home.title' },
      { key: 'games', route: '/my-games', labelKey: 'home.myGames' },
      { key: 'chat', route: '/chat', labelKey: 'home.chat' },
      { key: 'ranking', route: '/ranking', labelKey: 'home.ranking' },
      { key: 'news', route: '/news', labelKey: 'home.news' },
      { key: 'reports', route: '/reports', labelKey: 'home.reports' },
      { key: 'members', route: '/members', labelKey: 'home.members' },
      { key: 'profile', route: '/profile', labelKey: 'home.profile' },
    ];
  }

  if (role === 'Financialist') {
    return [
      { key: 'home', route: '/home', labelKey: 'home.title' },
      { key: 'games', route: '/my-games', labelKey: 'home.myGames' },
      { key: 'chat', route: '/chat', labelKey: 'home.chat' },
      { key: 'finance', route: '/finance', labelKey: 'home.finance' },
      { key: 'profile', route: '/profile', labelKey: 'home.profile' },
    ];
  }

  if (role === 'Staff') {
    return [
      { key: 'home', route: '/home', labelKey: 'home.title' },
      { key: 'games', route: '/my-games', labelKey: 'home.myGames' },
      { key: 'chat', route: '/chat', labelKey: 'home.chat' },
      { key: 'ranking', route: '/ranking', labelKey: 'home.ranking' },
      { key: 'news', route: '/news', labelKey: 'home.news' },
      { key: 'reports', route: '/reports', labelKey: 'home.reports' },
      { key: 'profile', route: '/profile', labelKey: 'home.profile' },
    ];
  }

  return [
    { key: 'home', route: '/home', labelKey: 'home.title' },
    { key: 'games', route: '/my-games', labelKey: 'home.myGames' },
    { key: 'chat', route: '/chat', labelKey: 'home.chat' },
    { key: 'ranking', route: '/ranking', labelKey: 'home.ranking' },
    { key: 'news', route: '/news', labelKey: 'home.news' },
    { key: 'reports', route: '/reports', labelKey: 'home.reports' },
    { key: 'profile', route: '/profile', labelKey: 'home.profile' },
  ];
}

export function getHomeShortcuts(role: UserRole): MobileHomeShortcut[] {
  switch (role) {
    case 'Instructor':
      return [
        { key: 'announcement', route: '/announcement', labelKey: 'home.announcement' },
        { key: 'availability', route: '/availability', labelKey: 'home.availability' },
        { key: 'tests', route: '/tests', labelKey: 'home.tests' },
        { key: 'calendar', route: '/calendar', labelKey: 'home.calendar' },
      ];
    case 'TO Supervisor':
      return [
        { key: 'announcement', route: '/announcement', labelKey: 'home.announcement' },
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

  if (['Referee', 'TO'].includes(user.role)) {
    return {
      matchesCount: acceptedAssignments.length,
      earnings,
    };
  }

  return {
    matchesCount: 0,
    earnings: 0,
  };
}
