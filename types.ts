
export type UserRole = 'Instructor' | 'Table' | 'Referee' | 'Stuff';
export type AssignmentStatus = 'Pending' | 'Accepted' | 'Declined';
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

export interface InstructorNomination {
  id: string;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  createdAt: string;
  referees: NominationSlot[];
}

export interface RefereeNomination {
  id: string;
  nominationId: string;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  slotNumber: number;
  status: AssignmentStatus;
  respondedAt: string | null;
  instructorName: string;
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
}

export interface ReportDetail {
  item: ReportListItem;
  refereeReport: ReportEntry | null;
  instructorReport: ReportEntry | null;
  canEditCurrentUserReport: boolean;
  deadlineExceeded: boolean;
  deadlineMessage: string | null;
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
}

export interface RankingLeaderboardItem {
  refereeId: string;
  refereeName: string;
  totalGameScore: number;
  performanceScore: number;
  overallScore: number;
  rank: number;
}

export interface RankingDashboardData {
  leaderboard: RankingLeaderboardItem[];
  history: RankingPoint[];
  currentUserItem: RankingLeaderboardItem | null;
  performanceProfile: RankingPerformanceProfile | null;
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
  title: string;
  summary: string;
  date: string;
  imageUrl: string;
}
