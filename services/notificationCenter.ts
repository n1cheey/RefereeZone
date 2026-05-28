import { Language } from '../i18n';
import { NotificationCenterItem, User } from '../types';
import { hasFeatureAccess } from './accessControl';
import { getCurrentAnnouncement } from './announcementService';
import { getAvailabilityOverview } from './availabilityService';
import { getRefereeNominations } from './nominationService';
import { getReports } from './reportsService';
import { getAnnouncementMessage } from './localizedText';

const DAY_MS = 24 * 60 * 60 * 1000;

const getTimeToDeadline = (value: string | null) => {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return timestamp - Date.now();
};

const getRoleReportModes = (user: User) => {
  if (user.role === 'Instructor') {
    return ['standard', 'to', 'test_to'] as const;
  }

  if (user.role === 'TO Supervisor') {
    return ['to'] as const;
  }

  if (user.role === 'TO') {
    return ['to'] as const;
  }

  if (user.role === 'Referee' || user.role === 'Staff') {
    return ['standard'] as const;
  }

  return [] as const;
};

const createAnnouncementNotification = async (user: User, language: Language): Promise<NotificationCenterItem | null> => {
  try {
    const response = await getCurrentAnnouncement(user.id);
    if (!response.announcement) {
      return null;
    }

    return {
      id: `announcement:${response.announcement.id}`,
      kind: 'announcement',
      severity: 'info',
      title: 'Active announcement',
      description: getAnnouncementMessage(response.announcement, language),
      dueAt: response.announcement.expiresAt,
      targetView: hasFeatureAccess(user, 'announcement') ? 'announcement' : undefined,
    };
  } catch {
    return null;
  }
};

const createAvailabilityNotifications = async (user: User): Promise<NotificationCenterItem[]> => {
  if (!hasFeatureAccess(user, 'availability')) {
    return [];
  }

  try {
    const overview = await getAvailabilityOverview();
    const items: NotificationCenterItem[] = [];

    if (overview.pendingApprovals.length > 0) {
      items.push({
        id: 'availability:pending-approvals',
        kind: 'availability_pending',
        severity: 'warning',
        title: 'Availability approvals are waiting',
        description: `${overview.pendingApprovals.length} request(s) still need review.`,
        dueAt: overview.pendingApprovals[0]?.startDate || null,
        targetView: 'availability',
      });
    }

    if (overview.upcomingApproved.length > 0) {
      items.push({
        id: 'availability:upcoming-approved',
        kind: 'availability_upcoming',
        severity: 'info',
        title: 'Upcoming approved availability',
        description: `${overview.upcomingApproved.length} approved leave period(s) are coming up.`,
        dueAt: overview.upcomingApproved[0]?.startDate || null,
        targetView: 'availability',
      });
    }

    return items;
  } catch {
    return [];
  }
};

const createAssignmentNotifications = async (user: User, seasonId: string): Promise<NotificationCenterItem[]> => {
  if (!['Referee', 'TO'].includes(user.role)) {
    return [];
  }

  try {
    const response = await getRefereeNominations(user.id, seasonId);
    return response.nominations
      .filter((assignment) => assignment.status === 'Pending' && assignment.autoDeclineAt)
      .map<NotificationCenterItem>((assignment) => ({
        id: `assignment-pending:${assignment.nominationId}:${assignment.id}`,
        kind: 'assignment_pending',
        severity: 'warning',
        title: 'Assignment response is waiting',
        description: `${assignment.gameCode} still needs your accept or decline response.`,
        dueAt: assignment.autoDeclineAt,
        targetView: 'nominations',
        targetId: assignment.nominationId,
        targetDate: assignment.matchDate,
      }));
  } catch {
    return [];
  }
};

const createReportNotifications = async (user: User, seasonId: string): Promise<NotificationCenterItem[]> => {
  const modes = getRoleReportModes(user);
  if (!modes.length) {
    return [];
  }

  try {
    const reportGroups = await Promise.all(modes.map((mode) => getReports(user.id, mode, seasonId).catch(() => ({ reports: [] }))));
    const reports = reportGroups.flatMap((group) => group.reports);

    if (user.role === 'Instructor' || user.role === 'TO Supervisor') {
      return reports
        .filter((report) => report.refereeReportStatus === 'Submitted' && report.instructorReportStatus !== 'Reviewed')
        .map<NotificationCenterItem>((report) => ({
          id: `report-review:${report.nominationId}:${report.refereeId}:${report.reportMode}`,
          kind: 'report_review_pending',
          severity: 'warning',
          title: 'A submitted report needs review',
          description: `${report.gameCode} was submitted and is waiting for supervisor review.`,
          dueAt: report.reportDeadlineAt,
          targetView: 'reports',
          targetId: report.nominationId,
          targetDate: report.matchDate,
        }));
    }

    return reports
      .filter((report) => !report.refereeReportStatus)
      .flatMap((report) => {
        const distanceToDeadline = getTimeToDeadline(report.reportDeadlineAt);
        if (distanceToDeadline === null) {
          return [];
        }

        if (distanceToDeadline <= 0) {
          return [
            {
              id: `report-overdue:${report.nominationId}:${report.refereeId}:${report.reportMode}`,
              kind: 'report_overdue',
              severity: 'critical',
              title: 'Report deadline has passed',
              description: `${report.gameCode} still needs your report.`,
              dueAt: report.reportDeadlineAt,
              targetView: 'reports',
              targetId: report.nominationId,
              targetDate: report.matchDate,
            },
          ];
        }

        if (distanceToDeadline <= DAY_MS) {
          return [
            {
              id: `report-due:${report.nominationId}:${report.refereeId}:${report.reportMode}`,
              kind: 'report_due',
              severity: 'warning',
              title: 'Report deadline is close',
              description: `${report.gameCode} needs your report soon.`,
              dueAt: report.reportDeadlineAt,
              targetView: 'reports',
              targetId: report.nominationId,
              targetDate: report.matchDate,
            },
          ];
        }

        return [];
      });
  } catch {
    return [];
  }
};

const compareNotifications = (left: NotificationCenterItem, right: NotificationCenterItem) => {
  const severityRank = {
    critical: 0,
    warning: 1,
    info: 2,
    success: 3,
  } as const;

  if (severityRank[left.severity] !== severityRank[right.severity]) {
    return severityRank[left.severity] - severityRank[right.severity];
  }

  const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  return leftTime - rightTime;
};

export const getNotificationCenterItems = async (user: User, seasonId: string, language: Language) => {
  const [announcementItem, availabilityItems, assignmentItems, reportItems] = await Promise.all([
    createAnnouncementNotification(user, language),
    createAvailabilityNotifications(user),
    createAssignmentNotifications(user, seasonId),
    createReportNotifications(user, seasonId),
  ]);

  return [announcementItem, ...availabilityItems, ...assignmentItems, ...reportItems]
    .filter((item): item is NotificationCenterItem => Boolean(item))
    .sort(compareNotifications);
};
