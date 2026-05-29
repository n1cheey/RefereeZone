import { Redirect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { useSeason } from '@/src/providers/season-provider';
import { getMobileRanking } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';

export default function RankingScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { seasonId } = useSeason();
  const router = useRouter();

  const rankingQuery = useQuery({
    queryKey: ['mobile-ranking', user?.id, user?.role, seasonId],
    queryFn: () => getMobileRanking(user!, seasonId, { compact: true }),
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: 2,
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const leaderboard = rankingQuery.data?.leaderboard || [];
  const current = rankingQuery.data?.currentUserItem;

  return (
    <ScreenShell
      user={user}
      title={t('ranking.title')}
      subtitle={t('ranking.subtitle')}
      showSeasonSwitcher
      refreshing={rankingQuery.isRefetching}
      onRefresh={() => {
        void rankingQuery.refetch();
      }}
    >
      {current ? (
        <View style={styles.heroCard}>
          <Avatar photoUrl={current.photoUrl} fullName={current.refereeName} size={64} />
          <View style={styles.heroText}>
            <Text style={styles.heroName}>{current.refereeName}</Text>
            <Text style={styles.heroMeta}>Rank #{current.rank}</Text>
          </View>
          <Text style={styles.heroScore}>{current.overallScore.toFixed(2)}</Text>
        </View>
      ) : null}

      {rankingQuery.isError ? (
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>Could not load ranking</Text>
          <Text style={sharedStyles.muted}>
            {rankingQuery.error instanceof Error ? rankingQuery.error.message : 'Please try again in a moment.'}
          </Text>
        </View>
      ) : null}

      {leaderboard.slice(0, 20).map((item, index) => (
        <Pressable key={item.refereeId} style={styles.row} onPress={() => router.push(`/ranking/${item.refereeId}` as never)}>
          <View style={[styles.rankBadge, index < 3 ? styles.rankBadgeTop : null]}>
            <Text style={[styles.rankBadgeText, index < 3 ? styles.rankBadgeTextTop : null]}>#{item.rank}</Text>
          </View>
          <Avatar photoUrl={item.photoUrl} fullName={item.refereeName} size={46} />
          <View style={styles.rowText}>
            <Text style={styles.name}>{item.refereeName}</Text>
            <Text style={styles.meta}>Tap to view performance history</Text>
          </View>
          <Text style={styles.score}>{item.overallScore.toFixed(2)}</Text>
        </Pressable>
      ))}

      {!rankingQuery.isLoading && !rankingQuery.isError && !leaderboard.length ? (
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
        </View>
      ) : null}
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
    fontSize: 22,
    fontWeight: '900',
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '800',
  },
  heroScore: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: 14,
  },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  rankBadgeTop: {
    backgroundColor: theme.colors.warningSoft,
    borderColor: '#f0c67f',
  },
  rankBadgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  rankBadgeTextTop: {
    color: theme.colors.warning,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  score: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
});
