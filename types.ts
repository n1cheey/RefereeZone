
export type LeagueSeasonId = '2025-2026' | '2026-2027';
export type LeagueSeasonStatus = 'archive' | 'active' | 'upcoming';

export interface LeagueSeason {
  id: LeagueSeasonId;
  label: string;
  shortLabel: string;
  status: LeagueSeasonStatus;
  description: string;
}

export type UserRole = 'Instructor' | 'TO' | 'TO Supervisor' | 'Referee' | 'Staff' | 'Financialist';
export type AssignmentStatus = 'Pending' | 'Accepted' | 'Declined' | 'Assigned';
export type ReportStatus = 'Draft' | 'Submitted' | 'Reviewed';
export type ReportMode = 'standard' | 'to' | 'test_to';

export interface User {
  id: string;
  email: string;
  fullName: string;
  photoUrl: string;
  licenseNumber: string;
  role: UserRole;
  category: string;
  lastSeenAt?: string | null;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface RefereeDirectoryItem {
  id: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  role: UserRole;
  unavailableRanges?: AvailabilityDateRange[];
}

export interface AvailabilityDateRange {
  startDate: string;
  endDate: string;
}

export interface AllowedAccessItem {
  id: string;
  email: string;
  displayName: string;
  licenseNumber: string;
  role: UserRole;
}

export interface NominationSlot {
  slotNumber: number;
  refereeId: string;
  refereeName: string;
  status: AssignmentStatus;
  respondedAt: string | null;
}

export interface TONominationSlot {
  slotNumber: number;
  toId: string;
  toName: string;
  status: AssignmentStatus;
  respondedAt: string | null;
}

export interface LocalizedTextValue {
  az?: string | null;
  en?: string | null;
  ru?: string | null;
}

export interface InstructorNomination {
  id: string;
  seasonId?: LeagueSeasonId | null;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  finalScore: string | null;
  matchVideoUrl: string | null;
  matchProtocolUrl: string | null;
  refereeFee: number | null;
  toFee: number | null;
  createdAt: string;
  createdById: string;
  createdByName: string;
  referees: NominationSlot[];
  toCrew: TONominationSlot[];
  statisticCrew: TONominationSlot[];
}

export interface RefereeNomination {
  id: string;
  nominationId: string;
  seasonId?: LeagueSeasonId | null;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  finalScore: string | null;
  matchVideoUrl: string | null;
  matchProtocolUrl: string | null;
  refereeFee: number | null;
  toFee: number | null;
  slotNumber: number;
  status: AssignmentStatus;
  respondedAt: string | null;
  autoDeclineAt: string | null;
  instructorName: string;
  assignmentGroup: 'Referee' | 'TO';
  assignmentLabel: string;
  crew: NominationSlot[];
  toCrew: TONominationSlot[];
  statisticCrew: TONominationSlot[];
}

export interface UnifiedMatchRecord {
  id: string;
  nominationId: string;
  seasonId?: LeagueSeasonId | null;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  finalScore: string | null;
  matchVideoUrl: string | null;
  matchProtocolUrl: string | null;
  refereeFee: number | null;
  toFee: number | null;
  source: 'instructor' | 'assignment';
  createdAt?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  instructorName?: string | null;
  assignmentGroup?: 'Referee' | 'TO';
  assignmentLabel?: string | null;
  referees: NominationSlot[];
  toCrew: TONominationSlot[];
  statisticCrew: TONominationSlot[];
}

export interface ReplacementNotice {
  id: string;
  nominationId: string;
  seasonId?: LeagueSeasonId | null;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  slotNumber: number;
  newRefereeName: string;
  createdAt: string;
}

export interface ReportEntry {
  id: string;
  authorRole: 'Referee' | 'Instructor';
  status: ReportStatus;
  feedbackScore: number;
  threePO_IOT: string;
  criteria: string;
  teamwork: string;
  generally: string;
  googleDriveUrl?: string;
  visibleToRefereeIds?: string[];
  updatedAt: string;
}

export interface ReportListItem {
  nominationId: string;
  refereeId: string;
  seasonId?: LeagueSeasonId | null;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  refereeName: string;
  slotNumber: number;
  refereeReportStatus: ReportStatus | null;
  instructorReportStatus: ReportStatus | null;
  reviewScore: number | null;
  deadlineExceeded: boolean;
  deadlineMessage: string | null;
  reportDeadlineAt: string | null;
  canAddTime: boolean;
  reportMode: ReportMode;
  googleDriveUrl: string | null;
  visibleToRefereeIds: string[];
}

export interface ReportVisibilityOption {
  id: string;
  fullName: string;
  slotNumber: number;
}

export interface ReportDetail {
  item: ReportListItem;
  refereeReport: ReportEntry | null;
  instructorReport: ReportEntry | null;
  canEditCurrentUserReport: boolean;
  deadlineExceeded: boolean;
  deadlineMessage: string | null;
  reportDeadlineAt: string | null;
  canAddTime: boolean;
  visibilityOptions: ReportVisibilityOption[];
}

export interface Nomination {
  id: string;
  matchDate: string;
  matchTime: string;
  teams: string;
  venue: string;
  role: 'Crew Chief' | 'Umpire 1' | 'Umpire 2';
  status: 'Pending' | 'Accepted' | 'Rejected';
}

export interface RankingPoint {
  date: string;
  gameCode: string;
  rank: number;
  average?: number;
}

export interface RankingEvaluation {
  id: string;
  seasonId?: LeagueSeasonId | null;
  refereeId: string;
  refereeName: string;
  gameCode: string;
  evaluationDate: string;
  score: number;
  note: string;
}

export interface RankingGameOption {
  id: string;
  gameCode: string;
  matchDate: string;
  teams: string;
}

export interface RankingPerformanceProfile {
  refereeId: string;
  refereeName: string;
  physicalFitness: number;
  mechanics: number;
  iot: number;
  criteriaScore: number;
  teamworkScore: number;
  gameControl: number;
  newPhilosophy: number;
  communication: number;
  externalEvaluation: number;
}

export interface RankingPerformanceEntry {
  id: string;
  seasonId?: LeagueSeasonId | null;
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
}

export interface RankingLeaderboardItem {
  refereeId: string;
  refereeName: string;
  photoUrl: string;
  totalGameScore: number;
  performanceScore: number;
  performanceAverage: number;
  overallScore: number;
  rank: number;
}

export interface RankingDashboardData {
  leaderboard: RankingLeaderboardItem[];
  history: RankingPoint[];
  refereeHistories: Record<string, RankingPoint[]>;
  currentUserItem: RankingLeaderboardItem | null;
  performanceProfile: RankingPerformanceProfile | null;
  visiblePerformanceProfiles: RankingPerformanceProfile[];
  performanceEntries: RankingPerformanceEntry[];
  totalReferees: number;
  canViewFullLeaderboard: boolean;
}

export interface Report {
  id: string;
  gameId: string;
  date: string;
  status: 'Draft' | 'Submitted' | 'Reviewed';
  feedbackScore: number;
  threePO_IOT: string;
  criteria: string;
  teamwork: string;
  generally: string;
}

export interface NewsItem {
  id: string;
  youtubeUrl: string;
  commentary: string;
  createdAt: string;
  createdByName: string;
}

export interface AnnouncementItem {
  id: string;
  audienceRole: 'Referee' | 'TO';
  message: string;
  messageAz: string;
  messageEn: string;
  messageRu: string;
  createdAt: string;
  expiresAt: string;
  createdById: string;
  createdByName: string;
}

export interface ActivityEntry {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  lastSeenAt: string;
}

export interface ChatConversationItem {
  id: string;
  otherUser: User;
  lastMessageText: string;
  lastMessageAt: string | null;
  lastMessageSenderId?: string | null;
  unreadCount: number;
  createdAt: string | null;
  otherUserLastReadAt?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export type AvailabilityStatus = 'Pending' | 'Approved' | 'Declined';

export interface AvailabilityRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  approverRole: 'Instructor' | 'TO Supervisor';
  startDate: string;
  endDate: string;
  reason: string;
  status: AvailabilityStatus;
  reviewedById: string | null;
  reviewedByName: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityOverview {
  myRequests: AvailabilityRequest[];
  pendingApprovals: AvailabilityRequest[];
  upcomingApproved: AvailabilityRequest[];
}

export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';
export type NotificationKind =
  | 'announcement'
  | 'assignment_pending'
  | 'report_due'
  | 'report_overdue'
  | 'report_review_pending'
  | 'availability_pending'
  | 'availability_upcoming';

export interface NotificationCenterItem {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  description: string;
  dueAt: string | null;
  targetView?: 'announcement' | 'availability' | 'nominations' | 'reports' | 'calendar';
  targetId?: string | null;
  targetDate?: string | null;
}

export type TestAudienceRole = 'Referee' | 'TO' | 'Both';
export type TestQuestionType = 'single' | 'multiple';
export type TestAttemptStatus = 'NotStarted' | 'InProgress' | 'Completed';
export type TestResultStatus = 'SUCCESS' | 'FAILED';
export type TestLanguage = 'en' | 'az' | 'ru';
export type TestPublishStatus = 'Draft' | 'Published';
export type TestAssignmentMode = 'AllEligible' | 'SelectedUsers';

export interface TestQuestionOptionDraft {
  id?: string;
  label: string;
  isCorrect: boolean;
}

export interface TestQuestionDraft {
  id?: string;
  promptEn: string;
  promptAz: string;
  promptRu: string;
  type: TestQuestionType;
  correctAnswer?: 'Yes' | 'No';
  options: TestQuestionOptionDraft[];
}

export interface TestSummary {
  id: string;
  title: string;
  description: string;
  audienceRole: TestAudienceRole;
  status: TestPublishStatus;
  assignmentMode: TestAssignmentMode;
  questionBankSize: number;
  questionCount: number;
  questionTimeLimitSeconds: number;
  passThreshold: number;
  deadlineAt: string | null;
  createdAt: string;
  createdById: string;
  createdByName: string;
}

export interface TestAttemptSummary {
  id: string;
  testId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  startedAt: string;
  completedAt: string | null;
  totalDurationSeconds: number | null;
  correctAnswers: number;
  totalQuestions: number;
  resultStatus: TestResultStatus | null;
  status: TestAttemptStatus;
  retakeAllowed: boolean;
}

export interface UserTestSummary extends TestSummary {
  latestAttempt: TestAttemptSummary | null;
}

export interface TestAdminSummary extends TestSummary {
  attempts: TestAttemptSummary[];
  questions?: TestQuestionDraft[];
  selectedUserIds?: string[];
}

export interface TestQuestionOption {
  id: string;
  label: string;
}

export interface TestQuestionView {
  id: string;
  type: TestQuestionType;
  prompt: string;
  options: TestQuestionOption[];
}

export interface TestSessionState {
  attemptId: string;
  testId: string;
  title: string;
  description: string;
  status: TestAttemptStatus;
  resultStatus: TestResultStatus | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  remainingSeconds: number;
  questionTimeLimitSeconds: number;
  question: TestQuestionView | null;
  completedAt: string | null;
  correctAnswers: number | null;
}

export interface TestResultView {
  attemptId: string;
  testId: string;
  title: string;
  correctAnswers: number;
  totalQuestions: number;
  passThreshold: number;
  resultStatus: TestResultStatus;
  completedAt: string;
  totalDurationSeconds: number;
}
