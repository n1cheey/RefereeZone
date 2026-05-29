import { Redirect, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useSeason } from '@/src/providers/season-provider';
import { getMobileRanking } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { MobileRankingPerformanceProfile } from '@/src/types/modules';
import { formatDateLabel } from '@/src/utils/format';

const CATEGORY_LABELS: { key: keyof MobileRankingPerformanceProfile; label: string }[] = [
  { key: 'physicalFitness', label: 'Physical' },
  { key: 'mechanics', label: 'Mechanics' },
  { key: 'iot', label: 'IOT' },
  { key: 'criteriaScore', label: 'Criteria' },
  { key: 'teamworkScore', label: 'Teamwork' },
  { key: 'gameControl', label: 'Game control' },
  { key: 'newPhilosophy', label: 'Philosophy' },
  { key: 'communication', label: 'Communication' },
  { key: 'externalEvaluation', label: 'External' },
];

export default function RankingDetailScreen() {
  const { user } = useAuth();
  const { seasonId } = useSeason();
  const { refereeId } = useLocalSearchParams<{ refereeId: string }>();

  const rankingQuery = useQuery({
    queryKey: ['mobile-ranking-detail', user?.id, user?.role, seasonId],
    queryFn: () => getMobileRanking(user!, seasonId),
    enabled: Boolean(user),
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const leaderboardItem = (rankingQuery.data?.leaderboard || []).find((item) => item.refereeId === refereeId) || null;
  const profile =
    rankingQuery.data?.visiblePerformanceProfiles?.find((item) => item.refereeId === refereeId) ||
    rankingQuery.data?.performanceProfile ||
    null;
  const history = (rankingQuery.data?.performanceEntries || [])
    .filter((entry) => entry.refereeId === refereeId)
    .sort((left, right) => {
      const dateCompare = String(right.evaluationDate || '').localeCompare(String(left.evaluationDate || ''));
      if (dateCompare !== 0) return dateCompare;
      return String(right.gameCode || '').localeCompare(String(left.gameCode || ''));
    });

  const chartEntries = history.slice(0, 8).reverse();
  const chartMax = Math.max(...chartEntries.map((entry) => Number(entry.matchAverage || 0)), 1);
  const averageScore = history.length
    ? history.reduce((sum, entry) => sum + Number(entry.matchAverage || 0), 0) / history.length
    : Number(leaderboardItem?.overallScore || 0);

  return (
    <ScreenShell
      user={user}
      title={leaderboardItem?.refereeName || 'Ranking'}
      subtitle={`Season ${seasonId}`}
      showSeasonSwitcher
    >
      {leaderboardItem ? (
        <View style={styles.heroCard}>
          <Avatar photoUrl={leaderboardItem.photoUrl} fullName={leaderboardItem.refereeName} size={72} />
          <View style={styles.heroText}>
            <Text style={styles.heroName}>{leaderboardItem.refereeName}</Text>
            <Text style={styles.heroMeta}>Rank #{leaderboardItem.rank}</Text>
            <Text style={styles.heroSubtext}>{history.length} rated matches this season</Text>
          </View>
          <View style={styles.heroScoreWrap}>
            <Text style={styles.heroScoreLabel}>Avg</Text>
            <Text style={styles.heroScore}>{Number(leaderboardItem.overallScore || 0).toFixed(2)}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.statGrid}>
        <View style={[sharedStyles.sectionCard, styles.statCard]}>
          <Text style={styles.statValue}>{history.length}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={[sharedStyles.sectionCard, styles.statCard]}>
          <Text style={styles.statValue}>{averageScore.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
      </View>

      <View style={sharedStyles.sectionCard}>
        <Text style={sharedStyles.sectionTitle}>Performance chart</Text>
        {chartEntries.length ? (
          <View style={styles.chartWrap}>
            <View style={styles.chartRow}>
              {chartEntries.map((entry, index) => {
                const score = Number(entry.matchAverage || 0);
                const height = Math.max(18, (score / chartMax) * 120);
                return (
                  <View key={`${entry.id}-${index}`} style={styles.chartColumn}>
                    <Text style={styles.chartValue}>{score.toFixed(1)}</Text>
                    <View style={styles.chartTrack}>
                      <View style={[styles.chartBar, { height }]} />
                    </View>
                    <Text style={styles.chartLabel}>{entry.gameCode.replace(/^ABL\//, '')}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <Text style={sharedStyles.muted}>No rating matches yet for this season.</Text>
        )}
      </View>

      {profile ? (
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>Category averages</Text>
          <View style={styles.categoryGrid}>
            {CATEGORY_LABELS.map((item) => {
              const value = Number(profile[item.key] || 0);
              return (
                <View key={item.key} style={styles.categoryCard}>
                  <Text style={styles.categoryValue}>{value.toFixed(2)}</Text>
                  <Text style={styles.categoryLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={sharedStyles.sectionCard}>
        <Text style={sharedStyles.sectionTitle}>Match history</Text>
        {history.length ? (
          history.map((entry) => (
            <View key={entry.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.gameCodePill}>
                  <Text style={styles.gameCodeText}>{entry.gameCode}</Text>
                </View>
                <View style={styles.historyScoreWrap}>
                  <Text style={styles.historyScoreValue}>{Number(entry.matchAverage || 0).toFixed(2)}</Text>
                </View>
              </View>
              <Text style={styles.historyTeams}>{entry.teams || 'Teams unavailable'}</Text>
              <Text style={styles.historyMeta}>{formatDateLabel(entry.evaluationDate)}</Text>
              <View style={styles.historyMetrics}>
                <Text style={styles.historyMetric}>Criteria {entry.criteriaScore.toFixed(1)}</Text>
                <Text style={styles.historyMetric}>Control {entry.gameControl.toFixed(1)}</Text>
                <Text style={styles.historyMetric}>Communication {entry.communication.toFixed(1)}</Text>
              </View>
              {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={sharedStyles.muted}>No match history found for this official in the selected season.</Text>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: '900',
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '800',
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
  },
  heroScoreWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  heroScoreLabel: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    fontWeight: '800',
  },
  heroScore: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '900',
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statValue: {
    color: theme.colors.primary,
    fontSize: 30,
    fontWeight: '900',
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  chartWrap: {
    paddingTop: 4,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    minHeight: 170,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  chartValue: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  chartTrack: {
    width: '100%',
    minHeight: 124,
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 3,
    paddingBottom: 3,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  chartBar: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  chartLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '31%',
    minWidth: 92,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  categoryValue: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  categoryLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  historyCard: {
    gap: 10,
    padding: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  gameCodePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f4edf2',
  },
  gameCodeText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  historyScoreWrap: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.successSoft,
  },
  historyScoreValue: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '900',
  },
  historyTeams: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  historyMeta: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  historyMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyMetric: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyNote: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
