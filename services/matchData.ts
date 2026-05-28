import { getMatchTimestamp, isPastMatch } from '../matchTiming';
import { getInstructorDashboard, getInstructorNominations, getRefereeNominations } from './nominationService';
import { UnifiedMatchRecord, User, InstructorNomination, RefereeNomination } from '../types';

export const mapInstructorNominationToUnifiedMatch = (nomination: InstructorNomination): UnifiedMatchRecord => ({
  id: nomination.id,
  nominationId: nomination.id,
  seasonId: nomination.seasonId || null,
  gameCode: nomination.gameCode,
  teams: nomination.teams,
  matchDate: nomination.matchDate,
  matchTime: nomination.matchTime,
  venue: nomination.venue,
  finalScore: nomination.finalScore,
  matchVideoUrl: nomination.matchVideoUrl,
  matchProtocolUrl: nomination.matchProtocolUrl,
  refereeFee: nomination.refereeFee,
  toFee: nomination.toFee,
  source: 'instructor',
  createdAt: nomination.createdAt,
  createdById: nomination.createdById,
  createdByName: nomination.createdByName,
  referees: nomination.referees,
  toCrew: nomination.toCrew,
  statisticCrew: nomination.statisticCrew,
});

export const mapAssignmentNominationToUnifiedMatch = (assignment: RefereeNomination): UnifiedMatchRecord => ({
  id: assignment.id,
  nominationId: assignment.nominationId,
  seasonId: assignment.seasonId || null,
  gameCode: assignment.gameCode,
  teams: assignment.teams,
  matchDate: assignment.matchDate,
  matchTime: assignment.matchTime,
  venue: assignment.venue,
  finalScore: assignment.finalScore,
  matchVideoUrl: assignment.matchVideoUrl,
  matchProtocolUrl: assignment.matchProtocolUrl,
  refereeFee: assignment.refereeFee,
  toFee: assignment.toFee,
  source: 'assignment',
  instructorName: assignment.instructorName,
  assignmentGroup: assignment.assignmentGroup,
  assignmentLabel: assignment.assignmentLabel,
  referees: assignment.crew,
  toCrew: assignment.toCrew,
  statisticCrew: assignment.statisticCrew,
});

export const sortUnifiedMatchesAsc = <T extends { matchDate: string; matchTime: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftTime = getMatchTimestamp(left.matchDate, left.matchTime) ?? 0;
    const rightTime = getMatchTimestamp(right.matchDate, right.matchTime) ?? 0;
    return leftTime - rightTime;
  });

export const sortUnifiedMatchesDesc = <T extends { matchDate: string; matchTime: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftTime = getMatchTimestamp(left.matchDate, left.matchTime) ?? 0;
    const rightTime = getMatchTimestamp(right.matchDate, right.matchTime) ?? 0;
    return rightTime - leftTime;
  });

export const splitUnifiedMatchesByTime = <T extends { matchDate: string; matchTime: string }>(items: T[], now: number) => ({
  upcoming: sortUnifiedMatchesAsc(items.filter((item) => !isPastMatch(item.matchDate, item.matchTime, now))),
  past: sortUnifiedMatchesDesc(items.filter((item) => isPastMatch(item.matchDate, item.matchTime, now))),
});

export const loadUnifiedMatchesForUser = async (user: User, seasonId: string) => {
  if (user.role === 'Instructor' || user.role === 'TO Supervisor') {
    const response = await getInstructorDashboard(user.id, seasonId);
    return response.nominations.map(mapInstructorNominationToUnifiedMatch);
  }

  if (user.role === 'Staff' || user.role === 'Financialist') {
    const response = await getInstructorNominations(user.id, seasonId);
    return response.nominations.map(mapInstructorNominationToUnifiedMatch);
  }

  const response = await getRefereeNominations(user.id, seasonId);
  return response.nominations.map(mapAssignmentNominationToUnifiedMatch);
};

export const loadCalendarMatchesForUser = async (user: User, seasonId: string) => {
  const response = await getInstructorNominations(user.id, seasonId);
  return response.nominations.map(mapInstructorNominationToUnifiedMatch);
};
