import { UserRole } from '@/src/types/domain';

export interface MobileNominationSlot {
  slotNumber: number;
  refereeId: string;
  refereeName: string;
  status: string;
}

export interface MobileTONominationSlot {
  slotNumber: number;
  toId: string;
  toName: string;
  status: string;
}

export interface MobileInstructorNomination {
  id: string;
  seasonId?: string | null;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  createdByName: string;
  matchVideoUrl?: string | null;
  matchProtocolUrl?: string | null;
  finalScore?: string | null;
  refereeFee?: number | null;
  toFee?: number | null;
  referees: MobileNominationSlot[];
  toCrew: MobileTONominationSlot[];
  statisticCrew: MobileTONominationSlot[];
}

export interface MobileRefereeNomination {
  nominationId: string;
  seasonId?: string | null;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  matchVideoUrl?: string | null;
  matchProtocolUrl?: string | null;
  finalScore?: string | null;
  status: string;
  assignmentLabel: string;
  assignmentGroup: 'Referee' | 'TO';
  instructorName: string;
  refereeFee?: number | null;
  toFee?: number | null;
  crew?: MobileNominationSlot[];
  toCrew?: MobileTONominationSlot[];
  statisticCrew?: MobileTONominationSlot[];
}

export interface MobileAvailabilityRequest {
  id: string;
  userName: string;
  userRole: UserRole;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Declined';
}

export interface MobileAvailabilityOverview {
  myRequests: MobileAvailabilityRequest[];
  pendingApprovals: MobileAvailabilityRequest[];
  upcomingApproved: MobileAvailabilityRequest[];
}

export interface MobileTestAttempt {
  id: string;
  userId: string;
  userName: string;
  status: 'NotStarted' | 'InProgress' | 'Completed';
  resultStatus: 'SUCCESS' | 'FAILED' | null;
  correctAnswers: number;
  totalQuestions: number;
}

export interface MobileUserTestSummary {
  id: string;
  title: string;
  description: string;
  audienceRole: 'Referee' | 'TO' | 'Both';
  status: 'Draft' | 'Published';
  deadlineAt: string | null;
  createdByName: string;
  latestAttempt?: MobileTestAttempt | null;
  attempts?: MobileTestAttempt[];
}

export interface MobileAnnouncementItem {
  id: string;
  audienceRole: 'Referee' | 'TO';
  message: string;
  messageAz: string;
  messageEn: string;
  messageRu: string;
  createdAt: string;
  expiresAt: string;
  createdByName: string;
}

export interface MobileChatConversation {
  id: string;
  lastMessageText: string;
  lastMessageAt: string | null;
  unreadCount: number;
  otherUserLastReadAt?: string | null;
  otherUser: {
    id: string;
    fullName: string;
    role: UserRole;
    photoUrl: string;
  };
}

export interface MobileChatUser {
  id: string;
  fullName: string;
  role: UserRole;
  photoUrl: string;
}

export interface MobileAllowedAccess {
  id: string;
  email: string;
  displayName: string;
  licenseNumber: string;
  role: UserRole;
}

export interface MobileMonthlyStats {
  matchesCount: number;
  earnings: number;
}

export interface MobileMemberDirectoryItem {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  licenseNumber: string;
  photoUrl: string;
}

export interface MobileRankingLeaderboardItem {
  refereeId: string;
  refereeName: string;
  photoUrl: string;
  overallScore: number;
  rank: number;
  performanceAverage?: number;
  totalGameScore?: number;
}

export interface MobileRankingPerformanceProfile {
  refereeId: string;
  refereeName: string;
  physicalFitness?: number;
  mechanics?: number;
  iot?: number;
  criteriaScore?: number;
  teamworkScore?: number;
  gameControl?: number;
  newPhilosophy?: number;
  communication?: number;
  externalEvaluation?: number;
}

export interface MobileRankingPerformanceEntry {
  id: string;
  seasonId?: string | null;
  refereeId: string;
  refereeName: string;
  gameCode: string;
  teams: string;
  evaluationDate: string;
  note: string;
  physicalFitness: number;
  mechanics: number;
  iot: number;
  criteriaScore: number;
  teamworkScore: number;
  gameControl: number;
  newPhilosophy: number;
  communication: number;
  externalEvaluation: number;
  matchAverage: number;
  createdAt?: string | null;
}

export interface MobileRankingResponse {
  leaderboard: MobileRankingLeaderboardItem[];
  currentUserItem: MobileRankingLeaderboardItem | null;
  totalReferees: number;
  history: unknown[];
  refereeHistories: Record<string, unknown[]>;
  performanceProfile: MobileRankingPerformanceProfile | null;
  visiblePerformanceProfiles: MobileRankingPerformanceProfile[];
  performanceEntries: MobileRankingPerformanceEntry[];
  canViewFullLeaderboard: boolean;
}

export type MobileBottomRoute =
  | '/home'
  | '/my-games'
  | '/chat'
  | '/reports'
  | '/ranking'
  | '/news'
  | '/members'
  | '/profile'
  | '/finance';

export type MobileHomeRoute = '/availability' | '/tests' | '/calendar' | '/finance';
export type MobileAdminRoute = '/announcement';

export interface MobileBottomNavItem {
  key: string;
  route: MobileBottomRoute;
  labelKey: string;
}

export interface MobileHomeShortcut {
  key: string;
  route: MobileHomeRoute | MobileAdminRoute;
  labelKey: string;
}
