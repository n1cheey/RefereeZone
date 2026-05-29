import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useSeason } from '@/src/providers/season-provider';
import { getMobileReportDetail, saveMobileReport } from '@/src/services/reports-service';
import { theme } from '@/src/theme/theme';

export default function ReportDetailScreen() {
  const { user } = useAuth();
  const { seasonId } = useSeason();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ nominationId: string; refereeId: string; mode?: 'standard' | 'to' }>();

  const reportQuery = useQuery({
    queryKey: ['mobile-report-detail', params.nominationId, params.refereeId, params.mode, seasonId, user?.id],
    queryFn: () => getMobileReportDetail(user!, params.nominationId, params.refereeId, params.mode || 'standard', seasonId),
    enabled: Boolean(user && params.nominationId && params.refereeId),
  });

  const initialDraft = useMemo(() => {
    const detail = reportQuery.data?.report;
    return detail?.refereeReport || detail?.instructorReport || null;
  }, [reportQuery.data]);

  const [feedbackScore, setFeedbackScore] = useState('0');
  const [threePO, setThreePO] = useState('');
  const [criteria, setCriteria] = useState('');
  const [teamwork, setTeamwork] = useState('');
  const [general, setGeneral] = useState('');

  useEffect(() => {
    if (!initialDraft) {
      return;
    }

    setFeedbackScore(String(initialDraft.feedbackScore ?? 0));
    setThreePO(initialDraft.threePO_IOT || '');
    setCriteria(initialDraft.criteria || '');
    setTeamwork(initialDraft.teamwork || '');
    setGeneral(initialDraft.generally || '');
  }, [initialDraft]);

  const saveMutation = useMutation({
    mutationFn: (action: 'Draft' | 'Submitted') =>
      saveMobileReport({
        user: user!,
        nominationId: params.nominationId,
        refereeId: params.refereeId,
        mode: params.mode || 'standard',
        action,
        gameCode: reportQuery.data?.report.item.gameCode,
        teams: reportQuery.data?.report.item.teams,
        matchDate: reportQuery.data?.report.item.matchDate,
        matchTime: reportQuery.data?.report.item.matchTime,
        venue: reportQuery.data?.report.item.venue,
        feedbackScore: Number(feedbackScore || 0),
        threePO_IOT: threePO,
        criteria,
        teamwork,
        generally: general,
        googleDriveUrl: reportQuery.data?.report.item.googleDriveUrl || undefined,
        seasonId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-report-detail', params.nominationId, params.refereeId, params.mode, seasonId, user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['mobile-reports', user?.id, user?.role, seasonId] });
    },
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const detail = reportQuery.data?.report;
  if (!detail) {
    return (
      <ScreenShell user={user} title="Report" subtitle="Loading report...">
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.muted}>Loading...</Text>
        </View>
      </ScreenShell>
    );
  }

  const activeDraft = detail.refereeReport || detail.instructorReport || initialDraft;

  return (
    <ScreenShell user={user} title={detail.item.gameCode} subtitle={detail.item.teams}>
      <ScrollView contentContainerStyle={{ gap: 16 }}>
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>Current report</Text>
          <Text style={sharedStyles.muted}>{detail.item.matchDate} · {detail.item.matchTime}</Text>
          <Text style={sharedStyles.muted}>{detail.item.venue}</Text>
          <Text style={sharedStyles.muted}>Referee: {detail.item.refereeName}</Text>
        </View>

        {activeDraft ? (
          <View style={sharedStyles.sectionCard}>
            <Text style={sharedStyles.sectionTitle}>Saved content</Text>
            <Text style={sharedStyles.muted}>Score: {activeDraft.feedbackScore}</Text>
            <Text style={sharedStyles.muted}>{activeDraft.threePO_IOT || '—'}</Text>
            <Text style={sharedStyles.muted}>{activeDraft.criteria || '—'}</Text>
            <Text style={sharedStyles.muted}>{activeDraft.teamwork || '—'}</Text>
            <Text style={sharedStyles.muted}>{activeDraft.generally || '—'}</Text>
          </View>
        ) : null}

        {detail.canEditCurrentUserReport ? (
          <View style={sharedStyles.sectionCard}>
            <Text style={sharedStyles.sectionTitle}>Edit draft</Text>
            <TextInput style={styles.input} value={feedbackScore} onChangeText={setFeedbackScore} placeholder="Score" keyboardType="numeric" />
            <TextInput style={styles.input} value={threePO} onChangeText={setThreePO} placeholder="Three PO / IOT" multiline />
            <TextInput style={styles.input} value={criteria} onChangeText={setCriteria} placeholder="Criteria" multiline />
            <TextInput style={styles.input} value={teamwork} onChangeText={setTeamwork} placeholder="Teamwork" multiline />
            <TextInput style={styles.input} value={general} onChangeText={setGeneral} placeholder="General summary" multiline />
            <View style={styles.actions}>
              <Pressable style={styles.secondaryButton} onPress={() => void saveMutation.mutate('Draft')}>
                <Text style={styles.secondaryText}>Save draft</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => void saveMutation.mutate('Submitted')}>
                <Text style={styles.primaryText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 50,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
});
