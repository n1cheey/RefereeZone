import { Redirect, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { deleteMobileChatConversation, openMobileChatConversation } from '@/src/services/chat-service';
import { getMobileChatBootstrap } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';

function formatChatTime(dateValue: string | null) {
  if (!dateValue) {
    return '';
  }

  const date = new Date(dateValue);
  const now = new Date();
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const chatQuery = useQuery({
    queryKey: ['mobile-chat-bootstrap', user?.id],
    queryFn: getMobileChatBootstrap,
    enabled: Boolean(user),
    staleTime: 30_000,
    retry: 2,
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => deleteMobileChatConversation(conversationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-chat-bootstrap', user?.id] });
    },
  });

  const normalizedSearch = search.trim().toLowerCase();
  const conversations = (chatQuery.data?.conversations || []).filter((conversation) => {
    if (!normalizedSearch) {
      return true;
    }

    const blob = `${conversation.otherUser.fullName} ${conversation.otherUser.role} ${conversation.lastMessageText}`.toLowerCase();
    return blob.includes(normalizedSearch);
  });

  const users = useMemo(() => {
    const allUsers = (chatQuery.data?.users || []).filter((item) => item.id !== user?.id);
    if (!normalizedSearch) {
      return allUsers;
    }

    return allUsers.filter((item) => `${item.fullName} ${item.role}`.toLowerCase().includes(normalizedSearch));
  }, [chatQuery.data?.users, normalizedSearch, user?.id]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <ScreenShell user={user} title={t('chat.title')} subtitle={t('chat.subtitle')}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search people or conversations"
          placeholderTextColor={theme.colors.muted}
        />
      </View>

      <View style={[sharedStyles.sectionCard, styles.sectionPanel]}>
        <Text style={sharedStyles.sectionTitle}>Chats</Text>
        {conversations.length ? (
          conversations.map((conversation) => (
            <Pressable
              key={conversation.id}
              style={styles.row}
              onPress={() => router.push(`/chat/${conversation.id}` as never)}
              onLongPress={() =>
                Alert.alert('Delete chat', `Delete chat with ${conversation.otherUser.fullName}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => void deleteConversationMutation.mutate(conversation.id),
                  },
                ])
              }
            >
              <Avatar photoUrl={conversation.otherUser.photoUrl} fullName={conversation.otherUser.fullName} size={54} />
              <View style={styles.content}>
                <View style={styles.topLine}>
                  <Text style={styles.name}>{conversation.otherUser.fullName}</Text>
                  <Text style={styles.time}>{formatChatTime(conversation.lastMessageAt)}</Text>
                </View>
                <Text style={styles.role}>{conversation.otherUser.role}</Text>
                <View style={styles.bottomLine}>
                  <Text style={styles.preview} numberOfLines={1}>
                    {conversation.lastMessageText || t('common.noData')}
                  </Text>
                  {conversation.unreadCount > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
        )}
      </View>

      <View style={[sharedStyles.sectionCard, styles.sectionPanel]}>
        <Text style={sharedStyles.sectionTitle}>People</Text>
        <View style={styles.peopleList}>
          {users.map((person) => (
            <Pressable
              key={person.id}
              style={styles.personRow}
              onPress={async () => {
                const response = await openMobileChatConversation(person.id);
                router.push(`/chat/${response.conversation.id}` as never);
              }}
            >
              <Avatar photoUrl={person.photoUrl} fullName={person.fullName} size={44} />
              <View style={styles.personText}>
                <Text style={styles.personName}>{person.fullName}</Text>
                <Text style={styles.personRole}>{person.role}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 12,
  },
  searchInput: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
  },
  sectionPanel: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 22,
    padding: 14,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
  },
  role: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  time: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preview: {
    color: theme.colors.muted,
    fontSize: 13,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 24,
    minHeight: 24,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  peopleList: {
    gap: 10,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
  },
  personText: {
    flex: 1,
    gap: 2,
  },
  personName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  personRole: {
    color: theme.colors.muted,
    fontSize: 12,
  },
});
