import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMobileChatBootstrap } from '@/src/services/modules-service';
import { formatDateLabel } from '@/src/utils/format';

export default function ChatScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const chatQuery = useQuery({
    queryKey: ['mobile-chat'],
    queryFn: getMobileChatBootstrap,
    enabled: Boolean(user),
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const conversations = chatQuery.data?.conversations || [];

  return (
    <ScreenShell user={user} title={t('chat.title')} subtitle={t('chat.subtitle')}>
      {conversations.map((conversation) => (
        <View key={conversation.id} style={sharedStyles.sectionCard}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Avatar fullName={conversation.otherUser.fullName} size={46} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={sharedStyles.sectionTitle}>{conversation.otherUser.fullName}</Text>
              <Text style={sharedStyles.muted}>{conversation.otherUser.role}</Text>
            </View>
            <Text style={sharedStyles.pillText}>{conversation.unreadCount}</Text>
          </View>
          <Text style={sharedStyles.muted}>{conversation.lastMessageText || t('common.noData')}</Text>
          <Text style={sharedStyles.muted}>
            {conversation.lastMessageAt ? formatDateLabel(conversation.lastMessageAt.slice(0, 10)) : '—'}
          </Text>
        </View>
      ))}
    </ScreenShell>
  );
}
