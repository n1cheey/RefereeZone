import { Linking, Pressable, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMobileNews } from '@/src/services/modules-service';
import { formatDateLabel } from '@/src/utils/format';

export default function NewsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const newsQuery = useQuery({
    queryKey: ['mobile-news'],
    queryFn: getMobileNews,
    enabled: Boolean(user),
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const posts = newsQuery.data?.posts || [];

  return (
    <ScreenShell user={user} title={t('news.title')} subtitle={t('news.subtitle')}>
      {posts.map((post) => (
        <View key={post.id} style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>{post.createdByName}</Text>
          <Text style={sharedStyles.muted}>{formatDateLabel(post.createdAt)}</Text>
          <Text style={sharedStyles.muted}>{post.commentary}</Text>
          {post.youtubeUrl ? (
            <Pressable onPress={() => void Linking.openURL(post.youtubeUrl)}>
              <Text style={sharedStyles.pillText}>{t('common.open')}</Text>
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
