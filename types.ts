
export type UserRole = 'Instructor' | 'TO' | 'TO Supervisor' | 'Referee' | 'Staff';
export type AssignmentStatus = 'Pending' | 'Accepted' | 'Declined' | 'Assigned';
export type ReportStatus = 'Draft' | 'Submitted' | 'Reviewed';

export interface User {
  id: string;
  email: string;
  fullName: string;
  photoUrl: string;
  licenseNumber: string;
  role: UserRole;
  category: string;
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

export interface InstructorNomination {
  id: string;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  finalScore: string | null;
  matchVideoUrl: string | null;
  createdAt: string;
  createdById: string;
  createdByName: string;
  referees: NominationSlot[];
  toCrew: TONominationSlot[];
}

export interface RefereeNomination {
  id: string;
  nominationId: string;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  finalScore: string | null;
  matchVideoUrl: string | null;
  slotNumber: number;
  status: AssignmentStatus;
  respondedAt: string | null;
  autoDeclineAt: string | null;
  instructorName: string;
  assignmentGroup: 'Referee' | 'TO';
  assignmentLabel: string;
  crew: NominationSlot[];
  toCrew: TONominationSlot[];
}

export interface ReplacementNotice {
  id: string;
  nominationId: string;
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
  updatedAt: string;
}

export interface ReportListItem {
  nominationId: string;
  refereeId: string;
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
}

export interface RankingEvaluation {
  id: string;
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
  refereeId: string;
  refereeName: string;
  gameCode: string;
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

export interface ActivityEntry {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  lastSeenAt: string;
}
