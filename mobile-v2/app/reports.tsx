import { Redirect, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { useSeason } from '@/src/providers/season-provider';
import { getMobileReports } from '@/src/services/modules-service';
import { extendMobileReportDeadline } from '@/src/services/reports-service';
import { theme } from '@/src/theme/theme';
import { formatDateLabel, formatDateTimeLabel, formatTimeLabel } from '@/src/utils/format';

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  Reviewed: { bg: '#dff8ef', fg: '#2f7b62' },
  Submitted: { bg: '#e0ebff', fg: '#4b5f8e' },
  Draft: { bg: '#fff0de', fg: '#9f6d20' },
  'No Report': { bg: '#fff6d8', fg: '#b08218' },
};

export default function ReportsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { seasonId } = useSeason();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [mode, setMode] = useState<'standard' | 'to'>(user?.role === 'TO' || user?.role === 'TO Supervisor' ? 'to' : 'standard');

  const reportsQuery = useQuery({
    queryKey: ['mobile-reports', user?.id, user?.role, seasonId, mode],
    queryFn: () => getMobileReports(user!, seasonId, mode),
    enabled: Boolean(user),
  });

  const extendMutation = useMutation({
    mutationFn: ({ nominationId, refereeId }: { nominationId: string; refereeId: string }) =>
      extendMobileReportDeadline(user!, nominationId, refereeId, mode),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-reports', user?.id, user?.role, seasonId, mode] });
    },
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role === 'Financialist') {
    return <Redirect href="/home" />;
  }

  const reports = reportsQuery.data?.reports || [];
  const readyCount = reports.filter((report) => !report.refereeReportStatus || report.refereeReportStatus === 'Draft').length;
  const draftsCount = reports.filter((report) => report.refereeReportStatus === 'Draft' || report.instructorReportStatus === 'Draft').length;
  const submittedCount = reports.filter((report) => report.refereeReportStatus === 'Submitted' || report.instructorReportStatus === 'Submitted').length;
  const reviewedCount = reports.filter((report) => report.instructorReportStatus === 'Reviewed').length;
  const showModeToggle = user.role === 'Instructor' || user.role === 'Staff';

  return (
    <ScreenShell user={user} title={t('reports.title')} subtitle={t('reports.subtitle')} showSeasonSwitcher>
      {showModeToggle ? (
        <View style={styles.modeToggle}>
          {(['standard', 'to'] as const).map((item) => {
            const active = mode === item;
            return (
              <Pressable key={item} style={[styles.modeButton, active ? styles.modeButtonActive : null]} onPress={() => setMode(item)}>
                <Text style={[styles.modeButtonText, active ? styles.modeButtonTextActive : null]}>{item === 'standard' ? 'Standard' : 'TO'}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={[sharedStyles.sectionCard, styles.summaryCard]}>
        <Text style={styles.summaryEyebrow}>ABL REPORT DESK</Text>
        <Text style={styles.summaryTitle}>Track review flow, overdue reports and matches that need action.</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{readyCount}</Text>
            <Text style={styles.metricLabel}>Ready to start</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{draftsCount}</Text>
            <Text style={styles.metricLabel}>Working drafts</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{submittedCount}</Text>
            <Text style={styles.metricLabel}>Submitted</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{reviewedCount}</Text>
            <Text style={styles.metricLabel}>Reviewed</Text>
          </View>
        </View>
        <Text style={styles.summaryWarning}>
          {reports.filter((report) => report.deadlineExceeded).length} reports already passed the deadline window.
        </Text>
      </View>

      {reports.map((report) => {
        const visibleStatus =
          user.role === 'Instructor' || user.role === 'Staff' || user.role === 'TO Supervisor'
            ? report.instructorReportStatus || report.refereeReportStatus || 'No Report'
            : report.refereeReportStatus || report.instructorReportStatus || 'No Report';
        const tone = STATUS_TONE[visibleStatus] || { bg: theme.colors.canvasAlt, fg: theme.colors.primary };

        return (
          <Pressable
            key={`${report.nominationId}-${report.refereeId}`}
            style={[sharedStyles.sectionCard, styles.reportCard]}
            onPress={() =>
              router.push(
                `/reports/${report.nominationId}/${report.refereeId}?mode=${user.role === 'TO' || user.role === 'TO Supervisor' ? 'to' : mode}` as never,
              )
            }
          >
            <View style={styles.reportTopRow}>
              <Text style={styles.gameCode}>{report.gameCode}</Text>
              {report.canAddTime ? (
                <Pressable style={styles.addTimeButton} onPress={() => void extendMutation.mutate({ nominationId: report.nominationId, refereeId: report.refereeId })}>
                  <Text style={styles.addTimeButtonText}>Add Time</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.reportMainRow}>
              <View style={styles.reportMainText}>
                <Text style={styles.teams}>{report.teams}</Text>
                <Text style={styles.meta}>
                  {formatDateLabel(report.matchDate)} | {report.refereeName}
                </Text>
                {report.reviewScore !== null ? <Text style={styles.scoreText}>Instructor score: {report.reviewScore}</Text> : null}
                {report.reportDeadlineAt ? (
                  <Text style={styles.deadlineText}>Report deadline: {formatDateTimeLabel(report.reportDeadlineAt)}</Text>
                ) : null}
                <Text style={styles.meta}>{formatTimeLabel(report.matchTime)} • {report.venue}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                <Text style={[styles.statusPillText, { color: tone.fg }]}>{visibleStatus.toUpperCase()}</Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      {!reportsQuery.isLoading && !reports.length ? (
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  modeToggle: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 10,
  },
  modeButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  modeButtonText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  modeButtonTextActive: {
    color: theme.colors.white,
  },
  summaryCard: {
    gap: 16,
  },
  summaryEyebrow: {
    color: '#d59b2d',
    fontSize: 12,
    fontWeight: '900',
  },
  summaryTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricBox: {
    width: '47.5%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    padding: 16,
    gap: 8,
  },
  metricValue: {
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: '900',
  },
  metricLabel: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryWarning: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  reportCard: {
    gap: 14,
  },
  reportTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  gameCode: {
    color: '#d59b2d',
    fontSize: 12,
    fontWeight: '900',
  },
  addTimeButton: {
    minWidth: 102,
    minHeight: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
  },
  addTimeButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  reportMainRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  reportMainText: {
    flex: 1,
    gap: 8,
  },
  teams: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  scoreText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  deadlineText: {
    color: theme.colors.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  statusPill: {
    minWidth: 118,
    minHeight: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
