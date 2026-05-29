import { Redirect, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { useSeason } from '@/src/providers/season-provider';
import { getMobileReportOverview, getMobileReports, getMobileReportProfile } from '@/src/services/modules-service';
import { extendMobileReportDeadline } from '@/src/services/reports-service';
import { theme } from '@/src/theme/theme';
import { formatDateLabel, formatDateTimeLabel, formatTimeLabel } from '@/src/utils/format';

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  Reviewed: { bg: '#dff8ef', fg: '#2f7b62' },
  Submitted: { bg: '#e0ebff', fg: '#4b5f8e' },
  Draft: { bg: '#fff0de', fg: '#9f6d20' },
  'No Report': { bg: '#fff6d8', fg: '#b08218' },
};

const getVisibleStatus = (report: any, role: string) =>
  role === 'Instructor' || role === 'Staff' || role === 'TO Supervisor'
    ? report.instructorReportStatus || report.refereeReportStatus || 'No Report'
    : report.refereeReportStatus || report.instructorReportStatus || 'No Report';

export default function ReportsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { seasonId } = useSeason();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [mode, setMode] = useState<'standard' | 'to'>(user?.role === 'TO' || user?.role === 'TO Supervisor' ? 'to' : 'standard');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const showModeToggle = user?.role === 'Instructor' || user?.role === 'Staff';
  const usesProfileOverview =
    ((user?.role === 'Instructor' || user?.role === 'Staff') && (mode === 'standard' || mode === 'to')) ||
    (user?.role === 'TO Supervisor' && mode === 'to');

  const reportsQuery = useQuery({
    queryKey: ['mobile-reports', user?.id, user?.role, seasonId, mode],
    queryFn: () => getMobileReports(user!, seasonId, mode),
    enabled: Boolean(user) && !usesProfileOverview,
    staleTime: 30_000,
    retry: 2,
  });

  const reportOverviewQuery = useQuery({
    queryKey: ['mobile-reports-overview', user?.id, user?.role, seasonId, mode],
    queryFn: () => getMobileReportOverview(user!, seasonId, mode),
    enabled: Boolean(user) && usesProfileOverview && !selectedProfileId,
    staleTime: 30_000,
    retry: 2,
  });

  const reportProfileQuery = useQuery({
    queryKey: ['mobile-reports-profile', user?.id, user?.role, seasonId, mode, selectedProfileId],
    queryFn: () => getMobileReportProfile(user!, selectedProfileId!, seasonId, mode),
    enabled: Boolean(user) && usesProfileOverview && Boolean(selectedProfileId),
    staleTime: 30_000,
    retry: 2,
  });

  const extendMutation = useMutation({
    mutationFn: ({ nominationId, refereeId }: { nominationId: string; refereeId: string }) =>
      extendMobileReportDeadline(user!, nominationId, refereeId, mode),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mobile-reports', user?.id, user?.role, seasonId, mode] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-reports-overview', user?.id, user?.role, seasonId, mode] }),
        queryClient.invalidateQueries({ queryKey: ['mobile-reports-profile', user?.id, user?.role, seasonId, mode, selectedProfileId] }),
      ]);
    },
  });

  const reports = useMemo(() => reportsQuery.data?.reports || [], [reportsQuery.data?.reports]);
  const availableReports = reportOverviewQuery.data?.availableReports || [];
  const profiles = reportOverviewQuery.data?.profiles || [];
  const selectedSubmitted = reportProfileQuery.data?.submittedReports || [];
  const selectedOverdue = reportProfileQuery.data?.overdueReports || [];
  const selectedReviewed = reportProfileQuery.data?.reviewedReports || [];
  const activeError = reportProfileQuery.error || reportOverviewQuery.error || reportsQuery.error;
  const activeLoading =
    reportsQuery.isLoading ||
    reportOverviewQuery.isLoading ||
    reportProfileQuery.isLoading;
  const activeRefetching =
    reportsQuery.isRefetching ||
    reportOverviewQuery.isRefetching ||
    reportProfileQuery.isRefetching;

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role === 'Financialist') {
    return <Redirect href="/home" />;
  }

  const renderReportCard = (report: any, allowAddTime = false) => {
    const visibleStatus = getVisibleStatus(report, user.role);
    const tone = STATUS_TONE[visibleStatus] || { bg: theme.colors.canvasAlt, fg: theme.colors.primary };

    return (
      <Pressable
        key={`${report.nominationId}-${report.refereeId}-${report.reportMode}`}
        style={[sharedStyles.sectionCard, styles.reportCard]}
        onPress={() =>
          router.push(
            `/reports/${report.nominationId}/${report.refereeId}?mode=${user.role === 'TO' || user.role === 'TO Supervisor' ? 'to' : mode}` as never,
          )
        }
      >
        <View style={styles.reportTopRow}>
          <Text style={styles.gameCode}>{report.gameCode}</Text>
          <View style={styles.topActions}>
            {allowAddTime ? (
              <Pressable
                style={styles.addTimeButton}
                onPress={(event) => {
                  event.stopPropagation();
                  void extendMutation.mutate({ nominationId: report.nominationId, refereeId: report.refereeId });
                }}
              >
                <Text style={styles.addTimeButtonText}>Add Time</Text>
              </Pressable>
            ) : null}
            <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
              <Text style={[styles.statusPillText, { color: tone.fg }]}>{visibleStatus.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.teams}>{report.teams}</Text>
        <Text style={styles.meta}>{formatDateLabel(report.matchDate)}</Text>
        <Text style={styles.meta}>{report.refereeName}</Text>
        <Text style={styles.meta}>
          {formatTimeLabel(report.matchTime)} - {report.venue}
        </Text>
        {report.reviewScore !== null ? <Text style={styles.scoreText}>Score: {report.reviewScore}</Text> : null}
        {report.reportDeadlineAt ? <Text style={styles.deadlineText}>Deadline: {formatDateTimeLabel(report.reportDeadlineAt)}</Text> : null}
        {report.deadlineMessage ? <Text style={styles.warningText}>{report.deadlineMessage}</Text> : null}
      </Pressable>
    );
  };

  return (
    <ScreenShell
      user={user}
      title={t('reports.title')}
      subtitle={t('reports.subtitle')}
      showSeasonSwitcher
      refreshing={activeRefetching}
      onRefresh={() => {
        if (usesProfileOverview) {
          if (selectedProfileId) {
            void reportProfileQuery.refetch();
            return;
          }
          void reportOverviewQuery.refetch();
          return;
        }

        void reportsQuery.refetch();
      }}
    >
      {showModeToggle ? (
        <View style={styles.modeToggle}>
          {(['standard', 'to'] as const).map((item) => {
            const active = mode === item;
            return (
              <Pressable
                key={item}
                style={[styles.modeButton, active ? styles.modeButtonActive : null]}
                onPress={() => {
                  setSelectedProfileId(null);
                  setMode(item);
                }}
              >
                <Text style={[styles.modeButtonText, active ? styles.modeButtonTextActive : null]}>{item === 'standard' ? 'Standard' : 'TO'}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {activeLoading ? (
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.muted}>Loading reports...</Text>
        </View>
      ) : null}

      {activeError ? (
        <View style={[sharedStyles.sectionCard, styles.errorCard]}>
          <Text style={styles.errorTitle}>Could not load reports right now.</Text>
          <Text style={sharedStyles.muted}>
            {activeError instanceof Error ? activeError.message : 'Please try again in a moment.'}
          </Text>
        </View>
      ) : null}

      {usesProfileOverview ? (
        selectedProfileId ? (
          <View style={styles.cardsColumn}>
            <Pressable style={styles.backToProfiles} onPress={() => setSelectedProfileId(null)}>
              <Text style={styles.backToProfilesText}>Back to profiles</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>Submitted reports</Text>
            {selectedSubmitted.length ? selectedSubmitted.map((report) => renderReportCard(report)) : <View style={sharedStyles.sectionCard}><Text style={sharedStyles.muted}>No submitted reports.</Text></View>}

            <Text style={styles.sectionLabel}>Deadline passed</Text>
            {selectedOverdue.length ? selectedOverdue.map((report) => renderReportCard(report, true)) : <View style={sharedStyles.sectionCard}><Text style={sharedStyles.muted}>No overdue reports.</Text></View>}

            <Text style={styles.sectionLabel}>Reviewed reports</Text>
            {selectedReviewed.length ? selectedReviewed.map((report) => renderReportCard(report)) : <View style={sharedStyles.sectionCard}><Text style={sharedStyles.muted}>No reviewed reports.</Text></View>}
          </View>
        ) : (
          <View style={styles.cardsColumn}>
            <Text style={styles.sectionLabel}>Available reports</Text>
            {availableReports.length ? availableReports.map((report) => renderReportCard(report)) : <View style={sharedStyles.sectionCard}><Text style={sharedStyles.muted}>No submitted reports waiting for review.</Text></View>}

            <Text style={styles.sectionLabel}>{mode === 'to' ? 'TO profiles' : 'Referee profiles'}</Text>
            {profiles.length ? (
              profiles.map((profile) => (
                <Pressable key={profile.id} style={[sharedStyles.sectionCard, styles.profileCard]} onPress={() => setSelectedProfileId(profile.id)}>
                  <Avatar photoUrl={profile.photoUrl || ''} fullName={profile.name} size={52} />
                  <View style={styles.profileText}>
                    <Text style={styles.profileName}>{profile.name}</Text>
                    <View style={styles.profileCounts}>
                      <Text style={styles.profileCount}>Submitted: {profile.submittedCount}</Text>
                      <Text style={styles.profileCount}>Deadlines: {profile.overdueCount}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={sharedStyles.sectionCard}>
                <Text style={sharedStyles.muted}>No profiles found.</Text>
              </View>
            )}
          </View>
        )
      ) : (
        <View style={styles.cardsColumn}>
          {!activeLoading && !reports.length ? (
            <View style={sharedStyles.sectionCard}>
              <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
            </View>
          ) : null}
          {reports.map((report) => renderReportCard(report, Boolean(report.canAddTime)))}
        </View>
      )}
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
    minHeight: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  modeButtonText: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  modeButtonTextActive: {
    color: theme.colors.white,
  },
  errorCard: {
    borderColor: '#f3c4c4',
    backgroundColor: '#fff2f2',
  },
  errorTitle: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  cardsColumn: {
    gap: 14,
  },
  sectionLabel: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  reportCard: {
    gap: 10,
  },
  reportTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  topActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  gameCode: {
    color: '#d59b2d',
    fontSize: 12,
    fontWeight: '900',
  },
  addTimeButton: {
    minWidth: 98,
    minHeight: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
  },
  addTimeButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  statusPill: {
    minWidth: 118,
    minHeight: 40,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '900',
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
  warningText: {
    color: '#9f6d20',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileText: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  profileCounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profileCount: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  backToProfiles: {
    alignSelf: 'flex-start',
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  backToProfilesText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
});
