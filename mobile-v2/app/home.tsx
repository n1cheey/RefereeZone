import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import {
  getHomeShortcuts,
  getMobileAnnouncement,
  getMobileChatBootstrap,
  getMobileNews,
  getMonthlyStats,
  getMyGames,
} from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { formatCurrency, formatDateLabel, formatDateTimeLabel, formatTimeLabel } from '@/src/utils/format';

const shortcutIconByKey: Record<string, keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap> = {
  announcement: 'megaphone-outline',
  availability: 'calendar-clear-outline',
  tests: 'clipboard-outline',
  calendar: 'calendar-outline',
  finance: 'wallet-outline',
};

const shortcutDescriptionByKey: Record<string, string> = {
  announcement: 'Publish notices',
  availability: 'Leaves and approvals',
  tests: 'Attempts and retakes',
  calendar: 'All season games',
  finance: 'Monthly summary',
};

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, requiresPinSetup, requiresBiometricSetup } = useAuth();

  const gamesQuery = useQuery({
    queryKey: ['mobile-home-games', user?.id],
    queryFn: () => getMyGames(user!, '2026-2027'),
    enabled: Boolean(user),
    staleTime: 30_000,
    retry: 2,
  });

  const chatQuery = useQuery({
    queryKey: ['mobile-home-chat', user?.id],
    queryFn: getMobileChatBootstrap,
    enabled: Boolean(user),
    staleTime: 30_000,
    retry: 2,
  });

  const newsQuery = useQuery({
    queryKey: ['mobile-home-news', user?.id],
    queryFn: getMobileNews,
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: 2,
  });

  const announcementQuery = useQuery({
    queryKey: ['mobile-home-announcement', user?.id],
    queryFn: getMobileAnnouncement,
    enabled: Boolean(user && ['Instructor', 'TO Supervisor', 'Referee', 'TO'].includes(user.role)),
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
  const shortcuts = getHomeShortcuts(user.role);
  const conversations = chatQuery.data?.conversations || [];
  const latestNews = (newsQuery.data?.posts || []).slice(0, 2);
  const showMonthlyStats = ['Referee', 'TO'].includes(user.role);
  const upcomingGames = [...instructorGames, ...games]
    .filter((game) => {
      const date = new Date(`${game.matchDate}T${game.matchTime || '00:00:00'}`);
      return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now() - 60_000;
    })
    .sort((left, right) => {
      const leftTime = new Date(`${left.matchDate}T${left.matchTime || '00:00:00'}`).getTime();
      const rightTime = new Date(`${right.matchDate}T${right.matchTime || '00:00:00'}`).getTime();
      return leftTime - rightTime;
    })
    .slice(0, 3);

  return (
      <ScreenShell
        user={user}
        title=""
        subtitle=""
        refreshing={
          gamesQuery.isRefetching ||
          chatQuery.isRefetching ||
          newsQuery.isRefetching ||
          announcementQuery.isRefetching
        }
        onRefresh={() => {
          void Promise.all([
            gamesQuery.refetch(),
            chatQuery.refetch(),
            newsQuery.refetch(),
            announcementQuery.refetch(),
          ]);
        }}
      >
      <View style={styles.hero}>
        <Avatar photoUrl={user.photoUrl} fullName={user.fullName} size={64} />
        <View style={styles.heroText}>
          <Text style={styles.heroName}>{user.fullName}</Text>
          <Text style={styles.heroRole}>{user.role}</Text>
        </View>
      </View>

      {showMonthlyStats ? (
        <View style={styles.statsRow}>
          <View style={[sharedStyles.sectionCard, styles.statCard, styles.statCardDark]}>
            <Text style={styles.statCaption}>{t('common.monthMatches')}</Text>
            <Text style={styles.statValueLight}>{monthlyStats.matchesCount}</Text>
          </View>
          <View style={[sharedStyles.sectionCard, styles.statCard]}>
            <Text style={styles.statCaption}>{t('common.monthEarnings')}</Text>
            <Text style={styles.statValue}>{formatCurrency(monthlyStats.earnings)}</Text>
          </View>
        </View>
      ) : null}

      {announcementQuery.data?.announcement ? (
        <View style={[sharedStyles.sectionCard, styles.sectionPanel]}>
          <View style={styles.sectionHeader}>
            <Text style={sharedStyles.sectionTitle}>Announcement</Text>
            {(user.role === 'Instructor' || user.role === 'TO Supervisor') ? (
              <Pressable onPress={() => router.push('/announcement')}>
                <Text style={styles.linkText}>Edit</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.announcementText}>{announcementQuery.data.announcement.message}</Text>
          <Text style={styles.announcementMeta}>
            {announcementQuery.data.announcement.createdByName} • {formatDateTimeLabel(announcementQuery.data.announcement.createdAt)}
          </Text>
        </View>
      ) : null}

      {shortcuts.length ? (
        <View style={[sharedStyles.sectionCard, styles.sectionPanel]}>
          <Text style={sharedStyles.sectionTitle}>{t('home.quickActions')}</Text>
          <View style={styles.shortcutsGrid}>
            {shortcuts.map((item) => (
              <Pressable
                key={item.key}
                style={styles.shortcutCard}
                onPress={() => router.push(item.route as never)}
              >
                <View style={styles.shortcutIconWrap}>
                  <Ionicons
                    name={(shortcutIconByKey[item.key] as keyof typeof Ionicons.glyphMap) || 'grid-outline'}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.shortcutTitle}>{t(item.labelKey)}</Text>
                <Text style={styles.shortcutDescription}>{shortcutDescriptionByKey[item.key] || 'Open module'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[sharedStyles.sectionCard, styles.sectionPanel]}>
        <View style={styles.sectionHeader}>
          <Text style={sharedStyles.sectionTitle}>Upcoming games</Text>
          <Pressable onPress={() => router.push('/my-games')}>
            <Text style={styles.linkText}>Open all</Text>
          </Pressable>
        </View>
        {upcomingGames.length ? (
          upcomingGames.map((game) => (
            <Pressable
              key={'nominationId' in game ? game.nominationId : game.id}
              style={styles.upcomingCard}
              onPress={() => router.push('/my-games')}
            >
              <Text style={styles.upcomingCode}>{game.gameCode}</Text>
              <Text style={styles.upcomingTeams}>{game.teams}</Text>
              <Text style={styles.upcomingMeta}>
                {formatDateLabel(game.matchDate)} • {formatTimeLabel(game.matchTime)}
              </Text>
              <Text style={styles.upcomingMeta}>{game.venue}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
        )}
      </View>

      <View style={[sharedStyles.sectionCard, styles.sectionPanel]}>
        <View style={styles.sectionHeader}>
          <Text style={sharedStyles.sectionTitle}>{t('home.chat')}</Text>
          <Pressable onPress={() => router.push('/chat')}>
            <Text style={styles.linkText}>Open all</Text>
          </Pressable>
        </View>
        {conversations.length ? (
          conversations.slice(0, 3).map((conversation) => (
            <Pressable
              key={conversation.id}
              style={styles.previewRow}
              onPress={() => router.push(`/chat/${conversation.id}` as never)}
            >
              <Avatar photoUrl={conversation.otherUser.photoUrl} fullName={conversation.otherUser.fullName} size={44} />
              <View style={styles.previewText}>
                <View style={styles.previewTopLine}>
                  <Text style={styles.previewName}>{conversation.otherUser.fullName}</Text>
                  <Text style={styles.previewTime}>{formatTimeLabel(conversation.lastMessageAt)}</Text>
                </View>
                <Text style={styles.previewMessage} numberOfLines={1}>
                  {conversation.lastMessageText || t('common.noData')}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
        )}
      </View>

      <View style={[sharedStyles.sectionCard, styles.sectionPanel]}>
        <View style={styles.sectionHeader}>
          <Text style={sharedStyles.sectionTitle}>{t('home.news')}</Text>
          <Pressable onPress={() => router.push('/news')}>
            <Text style={styles.linkText}>Open all</Text>
          </Pressable>
        </View>
        {latestNews.length ? (
          latestNews.map((post) => (
            <Pressable key={post.id} style={styles.newsRow} onPress={() => router.push('/news')}>
              <View style={styles.newsBadge}>
                <MaterialCommunityIcons name="newspaper-variant-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.newsText}>
                <Text style={styles.newsMeta}>{post.createdByName} • {formatDateTimeLabel(post.createdAt)}</Text>
                <Text style={styles.newsBody} numberOfLines={2}>
                  {post.commentary}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: 18,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    color: theme.colors.white,
    fontSize: 29,
    fontWeight: '900',
  },
  heroRole: {
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
    minHeight: 112,
    justifyContent: 'space-between',
  },
  statCardDark: {
    backgroundColor: '#2b0e17',
    borderColor: '#2b0e17',
  },
  statCaption: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  statValueLight: {
    color: theme.colors.white,
    fontSize: 26,
    fontWeight: '900',
  },
  sectionPanel: {
    gap: 16,
  },
  announcementText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  announcementMeta: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcutCard: {
    width: '47.5%',
    minHeight: 118,
    borderRadius: 24,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 16,
    gap: 12,
  },
  shortcutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(91,23,35,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  shortcutDescription: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  upcomingCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 14,
    gap: 6,
  },
  upcomingCode: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  upcomingTeams: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  upcomingMeta: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 12,
  },
  previewText: {
    flex: 1,
    gap: 4,
  },
  previewTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  previewName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  previewTime: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  previewMessage: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  newsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 12,
  },
  newsBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(91,23,35,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsText: {
    flex: 1,
    gap: 4,
  },
  newsMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  newsBody: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
