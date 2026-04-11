import { ChatConversationItem, ChatMessage, User } from '../types';
import { apiRequest } from './apiClient';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export function getChatBootstrap() {
  return apiRequest<{
    users: User[];
    conversations: ChatConversationItem[];
  }>('/api/chat/bootstrap');
}

export function openChatConversation(otherUserId: string) {
  return apiRequest<{ conversation: ChatConversationItem }>(
    '/api/chat/conversations',
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ otherUserId }),
    },
  );
}

export function getChatMessages(conversationId: string) {
  return apiRequest<{ messages: ChatMessage[] }>(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`);
}

export function markChatConversationRead(conversationId: string) {
  return apiRequest<{ message: string; result: { conversationId: string; readAt: string } }>(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
    },
  );
}

export function sendChatMessage(payload: { conversationId?: string; otherUserId?: string; body: string }) {
  return apiRequest<{
    statusMessage: string;
    conversation: ChatConversationItem;
    chatMessage: ChatMessage;
  }>(
    '/api/chat/messages',
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
}
