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
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  createdByName: string;
  referees: MobileNominationSlot[];
  toCrew: MobileTONominationSlot[];
  statisticCrew: MobileTONominationSlot[];
}

export interface MobileRefereeNomination {
  nominationId: string;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
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

export interface MobileChatConversation {
  id: string;
  lastMessageText: string;
  lastMessageAt: string | null;
  unreadCount: number;
  otherUser: {
    id: string;
    fullName: string;
    role: UserRole;
  };
}

export interface MobileMonthlyStats {
  matchesCount: number;
  earnings: number;
}

export type MobileBottomRoute =
  | '/my-games'
  | '/chat'
  | '/reports'
  | '/ranking'
  | '/news'
  | '/members'
  | '/profile'
  | '/finance';

export type MobileHomeRoute = '/availability' | '/tests' | '/calendar' | '/finance';

export interface MobileBottomNavItem {
  key: string;
  route: MobileBottomRoute;
  labelKey: string;
}

export interface MobileHomeShortcut {
  key: string;
  route: MobileHomeRoute;
  labelKey: string;
}
