import { apiRequest } from '@/src/services/api-client';
import { User } from '@/src/types/domain';

export interface MobileChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MobileChatConversationDetail {
  id: string;
  otherUser: User;
  lastMessageText: string;
  lastMessageAt: string | null;
  unreadCount: number;
  otherUserLastReadAt?: string | null;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function openMobileChatConversation(otherUserId: string) {
  return apiRequest<{ conversation: MobileChatConversationDetail }>('/api/chat/conversations', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ otherUserId }),
  });
}

export function getMobileChatMessages(conversationId: string) {
  return apiRequest<{ messages: MobileChatMessage[] }>(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`);
}

export function markMobileChatConversationRead(conversationId: string) {
  return apiRequest<{ message: string; result: { conversationId: string; readAt: string } }>(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
    },
  );
}

export function deleteMobileChatConversation(conversationId: string) {
  return apiRequest<{ message: string }>(`/api/chat/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
    headers: JSON_HEADERS,
  });
}

export function sendMobileChatMessage(payload: { conversationId?: string; otherUserId?: string; body: string }) {
  return apiRequest<{
    statusMessage: string;
    conversation: MobileChatConversationDetail;
    chatMessage: MobileChatMessage;
  }>('/api/chat/messages', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}
