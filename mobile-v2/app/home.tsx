import { Redirect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import {
  getHomeShortcuts,
  getMobileChatBootstrap,
  getMobileTests,
  getMonthlyStats,
  getMyGames,
} from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { formatCurrency } from '@/src/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, requiresPinSetup, requiresBiometricSetup } = useAuth();

  const gamesQuery = useQuery({
    queryKey: ['mobile-home-games', user?.id],
    queryFn: () => getMyGames(user!),
    enabled: Boolean(user),
  });

  const testsQuery = useQuery({
    queryKey: ['mobile-home-tests'],
    queryFn: getMobileTests,
    enabled: Boolean(user && ['Instructor', 'TO Supervisor', 'Referee', 'TO'].includes(user.role)),
  });

  const chatQuery = useQuery({
    queryKey: ['mobile-home-chat'],
    queryFn: getMobileChatBootstrap,
    enabled: Boolean(user),
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (requiresPinSetup) {
    return <Redirect href="/pin-setup" />;
  }

  if (requiresBiometricSetup) {
    return <Redirect href="/biometric-setup" />;
  }

  const games = gamesQuery.data?.assignments || [];
  const instructorGames = gamesQuery.data?.instructorNominations || [];
  const monthlyStats = getMonthlyStats(user, games);
  const currentMonthManagedGames = instructorGames.filter((game) => {
    const matchDate = new Date(`${game.matchDate}T00:00:00`);
    const now = new Date();
    return matchDate.getFullYear() === now.getFullYear() && matchDate.getMonth() === now.getMonth();
  }).length;
  const shortcuts = getHomeShortcuts(user.role);
  const unreadChatCount = (chatQuery.data?.conversations || []).reduce((sum, item) => sum + (item.unreadCount || 0), 0);
  const testsCount = testsQuery.data?.tests.length || 0;

  return (
    <ScreenShell user={user} title={t('home.title')} subtitle={t('home.subtitle')}>
      <View style={styles.profileHero}>
        <Avatar photoUrl={user.photoUrl} fullName={user.fullName} size={68} />
        <View style={styles.profileTextWrap}>
          <Text style={styles.profileName}>{user.fullName}</Text>
          <Text style={styles.profileRole}>{user.role}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[sharedStyles.sectionCard, styles.statCard]}>
          <Text style={styles.statLabel}>
            {user.role === 'Instructor' ? t('common.monthManaged') : t('common.monthMatches')}
          </Text>
          <Text style={styles.statValue}>
            {user.role === 'Instructor' || user.role === 'TO Supervisor' ? currentMonthManagedGames : monthlyStats.matchesCount}
          </Text>
        </View>
        <View style={[sharedStyles.sectionCard, styles.statCard]}>
          <Text style={styles.statLabel}>{t('common.monthEarnings')}</Text>
          <Text style={styles.statValue}>{formatCurrency(monthlyStats.earnings)}</Text>
        </View>
      </View>

      <View style={sharedStyles.sectionCard}>
        <Text style={sharedStyles.sectionTitle}>{t('home.quickActions')}</Text>
        <View style={styles.shortcutsGrid}>
          {shortcuts.map((item) => (
            <Pressable
              key={item.key}
              style={styles.shortcutCard}
              onPress={() => router.push(item.route as never)}
            >
              <Text style={styles.shortcutTitle}>{t(item.labelKey)}</Text>
              <Text style={styles.shortcutMeta}>
                {item.key === 'tests'
                  ? `${testsCount}`
                  : item.key === 'calendar'
                    ? `${games.length + instructorGames.length}`
                    : item.key === 'finance'
                      ? formatCurrency(monthlyStats.earnings)
                      : t('common.open')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={sharedStyles.sectionCard}>
        <Text style={sharedStyles.sectionTitle}>{t('home.chat')}</Text>
        <Text style={sharedStyles.muted}>
          {unreadChatCount > 0 ? `${unreadChatCount} unread` : t('common.noData')}
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: 18,
  },
  profileTextWrap: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '900',
  },
  profileRole: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 15,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minHeight: 122,
    justifyContent: 'space-between',
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcutCard: {
    width: '47%',
    minHeight: 92,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    padding: 14,
    justifyContent: 'space-between',
  },
  shortcutTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  shortcutMeta: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
