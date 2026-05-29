import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/src/providers/auth-provider';
import { getMobileChatBootstrap } from '@/src/services/modules-service';
import {
  getMobileChatMessages,
  markMobileChatConversationRead,
  sendMobileChatMessage,
} from '@/src/services/chat-service';
import { theme } from '@/src/theme/theme';
import { formatTimeLabel } from '@/src/utils/format';

export default function ChatThreadScreen() {
  const { user } = useAuth();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const chatQuery = useQuery({
    queryKey: ['mobile-chat-bootstrap'],
    queryFn: getMobileChatBootstrap,
    enabled: Boolean(user),
  });

  const messagesQuery = useQuery({
    queryKey: ['mobile-chat-messages', conversationId],
    queryFn: () => getMobileChatMessages(conversationId),
    enabled: Boolean(user && conversationId),
    refetchInterval: 7000,
  });

  useEffect(() => {
    if (conversationId) {
      void markMobileChatConversationRead(conversationId);
    }
  }, [conversationId]);

  const sendMutation = useMutation({
    mutationFn: () => sendMobileChatMessage({ conversationId, body: message }),
    onSuccess: async () => {
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: ['mobile-chat-messages', conversationId] });
      await queryClient.invalidateQueries({ queryKey: ['mobile-chat-bootstrap'] });
    },
  });

  const conversation = (chatQuery.data?.conversations || []).find((item) => item.id === conversationId) || null;
  const messages = useMemo(() => messagesQuery.data?.messages || [], [messagesQuery.data?.messages]);
  const otherUserLastReadAt = conversation?.otherUserLastReadAt ? new Date(conversation.otherUserLastReadAt).getTime() : null;

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{conversation?.otherUser.fullName || 'Chat'}</Text>
        <Text style={styles.headerSubtitle}>{conversation?.otherUser.role || ''}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.messages}>
        {messages.map((item) => {
          const mine = item.senderId === user.id;
          const itemTimestamp = item.createdAt ? new Date(item.createdAt).getTime() : null;
          const repliedLater = mine
            ? messages.some(
                (nextItem) =>
                  nextItem.senderId !== user.id &&
                  nextItem.createdAt &&
                  itemTimestamp !== null &&
                  new Date(nextItem.createdAt).getTime() > itemTimestamp,
              )
            : false;
          const seen =
            mine &&
            ((otherUserLastReadAt !== null && itemTimestamp !== null && itemTimestamp <= otherUserLastReadAt) || repliedLater);

          return (
            <View key={item.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : null]}>{item.body}</Text>
              <View style={styles.metaRow}>
                <Text style={[styles.meta, mine ? styles.metaMine : null]}>{formatTimeLabel(item.createdAt)}</Text>
                {mine ? <Text style={[styles.meta, mine ? styles.metaMine : null]}>{seen ? '✓✓' : '✓'}</Text> : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Message"
          placeholderTextColor={theme.colors.muted}
        />
        <Pressable style={styles.sendButton} onPress={() => void sendMutation.mutate()} disabled={!message.trim()}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    backgroundColor: theme.colors.card,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  messages: {
    padding: 16,
    gap: 10,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 6,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  bubbleText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: theme.colors.white,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 11,
    textAlign: 'right',
  },
  metaMine: {
    color: 'rgba(255,255,255,0.78)',
  },
  composer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.card,
  },
  input: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
  },
  sendButton: {
    minWidth: 72,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  sendText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
});
