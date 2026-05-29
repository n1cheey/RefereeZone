import { Linking, Pressable, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMobileNews } from '@/src/services/modules-service';
import { formatDateTimeLabel } from '@/src/utils/format';

export default function NewsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const newsQuery = useQuery({
    queryKey: ['mobile-news', user?.id],
    queryFn: getMobileNews,
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: 2,
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const posts = newsQuery.data?.posts || [];

  return (
    <ScreenShell user={user} title={t('news.title')} subtitle={t('news.subtitle')}>
      {newsQuery.isError ? (
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>Could not load news</Text>
          <Text style={sharedStyles.muted}>
            {newsQuery.error instanceof Error ? newsQuery.error.message : 'Please try again in a moment.'}
          </Text>
        </View>
      ) : null}

      {posts.map((post) => (
        <View key={post.id} style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>{post.createdByName}</Text>
          <Text style={sharedStyles.muted}>{formatDateTimeLabel(post.createdAt)}</Text>
          <Text style={sharedStyles.muted}>{post.commentary}</Text>
          {post.youtubeUrl ? (
            <Pressable
              onPress={() => void Linking.openURL(post.youtubeUrl)}
              style={{
                alignSelf: 'flex-start',
                minHeight: 44,
                paddingHorizontal: 18,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#7a1f24',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>Open in YouTube</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {!newsQuery.isLoading && !posts.length ? (
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
        </View>
      ) : null}
    </ScreenShell>
  );
}
