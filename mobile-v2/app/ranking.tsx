import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMobileRanking } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';

export default function RankingScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const rankingQuery = useQuery({
    queryKey: ['mobile-ranking', user?.id, user?.role],
    queryFn: () => getMobileRanking(user!),
    enabled: Boolean(user),
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const leaderboard = rankingQuery.data?.leaderboard || [];
  const current = rankingQuery.data?.currentUserItem;

  return (
    <ScreenShell user={user} title={t('ranking.title')} subtitle={t('ranking.subtitle')}>
      {current ? (
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>{current.refereeName}</Text>
          <Text style={sharedStyles.muted}>#{current.rank} · {current.overallScore.toFixed(1)}</Text>
        </View>
      ) : null}

      {leaderboard.slice(0, 12).map((item) => (
        <View key={item.refereeId} style={styles.row}>
          <View style={styles.left}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <Avatar photoUrl={item.photoUrl} fullName={item.refereeName} size={44} />
            <Text style={styles.name}>{item.refereeName}</Text>
          </View>
          <Text style={styles.score}>{item.overallScore.toFixed(1)}</Text>
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rank: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '900',
    width: 34,
  },
  name: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  score: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
});
