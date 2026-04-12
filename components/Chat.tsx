import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, MessageSquare, Search, Send, Users } from 'lucide-react';
import { ChatConversationItem, ChatMessage, User } from '../types';
import Layout from './Layout';
import { getRoleLabel, useI18n } from '../i18n';
import {
  getChatBootstrap,
  getChatMessages,
  markChatConversationRead,
  openChatConversation,
  sendChatMessage,
} from '../services/chatService';
import { consumeNavigationIntent } from '../services/navigationIntent';
import { isViewCacheFresh, readViewCache, writeViewCache } from '../services/viewCache';
import { supabase } from '../services/supabaseClient';

interface ChatProps {
  user: User;
  onBack: () => void;
}

const CHAT_BOOTSTRAP_CACHE_MAX_AGE_MS = 20000;
const getChatBootstrapCacheKey = (userId: string) => `chat:bootstrap:${userId}`;
const getChatMessagesCacheKey = (userId: string, conversationId: string) => `chat:messages:${userId}:${conversationId}`;

const sortConversations = (items: ChatConversationItem[]) =>
  [...items].sort((left, right) => {
    const leftTimestamp = new Date(left.lastMessageAt || left.createdAt || 0).getTime();
    const rightTimestamp = new Date(right.lastMessageAt || right.createdAt || 0).getTime();
    return rightTimestamp - leftTimestamp;
  });

const upsertConversation = (items: ChatConversationItem[], nextConversation: ChatConversationItem) =>
  sortConversations([
    nextConversation,
    ...items.filter((item) => item.id !== nextConversation.id),
  ]);

const upsertMessage = (items: ChatMessage[], nextMessage: ChatMessage) =>
  [...items.filter((item) => item.id !== nextMessage.id), nextMessage].sort((left, right) => {
    const leftTimestamp = new Date(left.createdAt || 0).getTime();
    const rightTimestamp = new Date(right.createdAt || 0).getTime();
    return leftTimestamp - rightTimestamp;
  });

const getUserSearchBlob = (member: User) =>
  [member.fullName, member.email, member.licenseNumber, member.role, member.category].join(' ').toLowerCase();

const getUserInitials = (fullName: string) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';

const TYPING_IDLE_TIMEOUT_MS = 1400;
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

const Chat: React.FC<ChatProps> = ({ user, onBack }) => {
  const { language, locale, t } = useI18n();
  const bootstrapCacheKey = getChatBootstrapCacheKey(user.id);
  const selectedConversationIdRef = useRef<string | null>(null);
  const bootstrapLoadPromiseRef = useRef<Promise<void> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingChannelRef = useRef<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<ChatConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [chatError, setChatError] = useState('');
  const [isLoadingBootstrap, setIsLoadingBootstrap] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isOpeningConversation, setIsOpeningConversation] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [typingConversationId, setTypingConversationId] = useState<string | null>(null);
  const [typingUserName, setTypingUserName] = useState('');

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      getUserSearchBlob(conversation.otherUser).includes(normalizedSearch),
    );
  }, [conversations, searchQuery]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return users.filter((member) => {
      if (member.id === user.id) {
        return false;
      }

      if (normalizedSearch && !getUserSearchBlob(member).includes(normalizedSearch)) {
        return false;
      }

      return true;
    });
  }, [searchQuery, user.id, users]);

  const formatConversationTime = (value: string | null) => {
    if (!value) {
      return '';
    }

    const timestamp = new Date(value);
    const now = new Date();
    const isSameDay = timestamp.toDateString() === now.toDateString();

    return new Intl.DateTimeFormat(locale, isSameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(timestamp);
  };

  const formatLastSeenLabel = (value: string | null | undefined) => {
    if (!value) {
      return '';
    }

    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return '';
    }

    if (Date.now() - timestamp <= ONLINE_THRESHOLD_MS) {
      return t('chat.onlineNow');
    }

    return t('chat.lastSeen', { date: formatConversationTime(value) });
  };

  const currentConversationLastOwnMessage = useMemo(() => {
    if (!selectedConversation) {
      return null;
    }

    return [...messages].reverse().find((message) => message.senderId === user.id) || null;
  }, [messages, selectedConversation, user.id]);

  const currentConversationReadState = useMemo(() => {
    if (!selectedConversation || !currentConversationLastOwnMessage) {
      return '';
    }

    const otherLastReadAt = selectedConversation.otherUserLastReadAt
      ? new Date(selectedConversation.otherUserLastReadAt).getTime()
      : null;
    const messageCreatedAt = currentConversationLastOwnMessage.createdAt
      ? new Date(currentConversationLastOwnMessage.createdAt).getTime()
      : null;

    if (otherLastReadAt && messageCreatedAt && otherLastReadAt >= messageCreatedAt) {
      return t('chat.seenAt', { date: formatConversationTime(selectedConversation.otherUserLastReadAt || null) });
    }

    if (
      selectedConversation.lastMessageSenderId === user.id &&
      selectedConversation.lastMessageAt === currentConversationLastOwnMessage.createdAt
    ) {
      return t('chat.delivered');
    }

    return '';
  }, [currentConversationLastOwnMessage, selectedConversation, t]);

  const writeBootstrapCache = (nextUsers: User[], nextConversations: ChatConversationItem[]) => {
    writeViewCache(bootstrapCacheKey, {
      users: nextUsers,
      conversations: nextConversations,
    });
  };

  const updateConversationList = (updater: (previous: ChatConversationItem[]) => ChatConversationItem[]) => {
    setConversations((previous) => {
      const next = updater(previous);
      writeBootstrapCache(users, next);
      return next;
    });
  };

  const loadBootstrap = async (showLoader: boolean) => {
    if (bootstrapLoadPromiseRef.current) {
      await bootstrapLoadPromiseRef.current;
      return;
    }

    const request = (async () => {
      if (showLoader) {
        setIsLoadingBootstrap(true);
      }

      try {
        const response = await getChatBootstrap();
        const nextConversations = sortConversations(response.conversations);

        setUsers(response.users);
        setConversations(nextConversations);
        writeBootstrapCache(response.users, nextConversations);
        setSelectedConversationId((previous) =>
          previous && nextConversations.some((item) => item.id === previous) ? previous : null,
        );
        setChatError('');
      } catch (error) {
        setChatError(error instanceof Error ? error.message : 'Failed to load chat.');
      } finally {
        if (showLoader) {
          setIsLoadingBootstrap(false);
        }
      }
    })();

    bootstrapLoadPromiseRef.current = request;

    try {
      await request;
    } finally {
      if (bootstrapLoadPromiseRef.current === request) {
        bootstrapLoadPromiseRef.current = null;
      }
    }
  };

  const loadMessages = async (conversationId: string, showLoader: boolean, markAsRead = true) => {
    if (showLoader) {
      setIsLoadingMessages(true);
    }

    try {
      const response = await getChatMessages(conversationId);
      setMessages(response.messages);
      writeViewCache(getChatMessagesCacheKey(user.id, conversationId), response.messages);
      setChatError('');

      if (markAsRead) {
        updateConversationList((previous) =>
          previous.map((item) =>
            item.id === conversationId
              ? { ...item, unreadCount: 0 }
              : item,
          ),
        );

        void markChatConversationRead(conversationId).catch(() => {
          // Keep the local UI responsive even if the read receipt request fails.
        });
      }
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Failed to load chat messages.');
    } finally {
      if (showLoader) {
        setIsLoadingMessages(false);
      }
    }
  };

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!conversations.length) {
      return;
    }

    const intent = consumeNavigationIntent('chat');
    if (!intent?.targetId) {
      return;
    }

    const targetConversation = conversations.find((conversation) => conversation.id === intent.targetId);
    if (targetConversation) {
      setSelectedConversationId(targetConversation.id);
      setDraftMessage('');
      setChatError('');
    }
  }, [conversations]);

  useEffect(() => {
    const cached = readViewCache<{
      users: User[];
      conversations: ChatConversationItem[];
    }>(bootstrapCacheKey);

    if (cached) {
      setUsers(cached.users || []);
      setConversations(sortConversations(cached.conversations || []));
      setIsLoadingBootstrap(false);
    }

    // Always refresh chat participants in the background so a stale empty cache
    // does not hide users for newly added roles or recently registered members.
    void loadBootstrap(!cached && !isViewCacheFresh(bootstrapCacheKey, CHAT_BOOTSTRAP_CACHE_MAX_AGE_MS));
  }, [bootstrapCacheKey]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const cacheKey = getChatMessagesCacheKey(user.id, selectedConversationId);
    const cachedMessages = readViewCache<ChatMessage[]>(cacheKey);
    const hasCachedMessages = Boolean(cachedMessages);

    if (cachedMessages) {
      setMessages(cachedMessages);
    } else {
      setMessages([]);
    }

    void loadMessages(selectedConversationId, !hasCachedMessages);
  }, [selectedConversationId, user.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        () => {
          void loadBootstrap(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
          const activeConversationId = selectedConversationIdRef.current;
          const changedConversationId = String(
            payload.new?.['conversation_id'] || payload.old?.['conversation_id'] || '',
          );

          void loadBootstrap(false);

          if (activeConversationId && changedConversationId === activeConversationId) {
            void loadMessages(activeConversationId, false);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (typingChannelRef.current) {
      void supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }

    if (!selectedConversationId) {
      setTypingConversationId(null);
      setTypingUserName('');
      return;
    }

    const channel: any = supabase.channel(`chat-typing-${selectedConversationId}`);
    channel
      .on('broadcast', { event: 'typing' }, (payload: { payload?: { conversationId?: string; userId?: string; fullName?: string; isTyping?: boolean } }) => {
        const typingPayload = payload.payload;
        if (!typingPayload || typingPayload.userId === user.id) {
          return;
        }

        if (!typingPayload.isTyping) {
          setTypingConversationId((previous) =>
            previous === typingPayload.conversationId ? null : previous,
          );
          setTypingUserName('');
          return;
        }

        setTypingConversationId(String(typingPayload.conversationId || ''));
        setTypingUserName(String(typingPayload.fullName || ''));
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      void supabase.removeChannel(channel);
      if (typingChannelRef.current === channel) {
        typingChannelRef.current = null;
      }
    };
  }, [selectedConversationId, user.id]);

  const sendTypingState = (isTyping: boolean) => {
    if (!typingChannelRef.current || !selectedConversationId) {
      return;
    }

    void typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversationId: selectedConversationId,
        userId: user.id,
        fullName: user.fullName,
        isTyping,
      },
    });
  };

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    if (!draftMessage.trim()) {
      sendTypingState(false);
      return;
    }

    sendTypingState(true);

    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      sendTypingState(false);
      typingTimeoutRef.current = null;
    }, TYPING_IDLE_TIMEOUT_MS);

    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [draftMessage, selectedConversationId]);

  const handleSelectConversation = (conversationId: string) => {
    sendTypingState(false);
    setSelectedConversationId(conversationId);
    setDraftMessage('');
    setChatError('');
  };

  const handleOpenConversation = async (otherUser: User) => {
    const existingConversation = conversations.find((conversation) => conversation.otherUser.id === otherUser.id);
    if (existingConversation) {
      handleSelectConversation(existingConversation.id);
      return;
    }

    setIsOpeningConversation(otherUser.id);
    setChatError('');

    try {
      const response = await openChatConversation(otherUser.id);
      updateConversationList((previous) => upsertConversation(previous, response.conversation));
      setSelectedConversationId(response.conversation.id);
      setMessages([]);
      writeViewCache(getChatMessagesCacheKey(user.id, response.conversation.id), []);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Failed to start chat conversation.');
    } finally {
      setIsOpeningConversation(null);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedDraft = draftMessage.trim();
    if (!trimmedDraft || !selectedConversation) {
      return;
    }

    setIsSendingMessage(true);
    setChatError('');

    try {
      const response = await sendChatMessage({
        conversationId: selectedConversation.id,
        body: trimmedDraft,
      });

      updateConversationList((previous) => upsertConversation(previous, response.conversation));
      setMessages((previous) => {
        const next = upsertMessage(previous, response.chatMessage);
        writeViewCache(getChatMessagesCacheKey(user.id, selectedConversation.id), next);
        return next;
      });
      sendTypingState(false);
      setDraftMessage('');
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Failed to send chat message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const renderUserAvatar = (member: User, sizeClass = 'h-12 w-12') =>
    member.photoUrl ? (
      <img
        src={member.photoUrl}
        alt={member.fullName}
        className={`${sizeClass} rounded-2xl object-cover shadow-sm ring-1 ring-slate-200`}
      />
    ) : (
      <div className={`${sizeClass} flex items-center justify-center rounded-2xl bg-[#57131b] text-sm font-black text-white shadow-sm`}>
        {getUserInitials(member.fullName)}
      </div>
    );

  return (
    <Layout title={t('chat.title')} onBack={onBack}>
      {chatError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {chatError}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[360px,minmax(0,1fr)]">
        <section className={`${selectedConversation ? 'hidden lg:block' : 'block'}`}>
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <MessageSquare size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('chat.title')}</h2>
                <p className="text-sm text-slate-500">{t('chat.conversations')}</p>
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search size={18} className="text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('chat.search')}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="mt-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                <MessageSquare size={14} />
                {t('chat.conversations')}
              </div>

              {isLoadingBootstrap ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  {t('common.loading')}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  {t('chat.noConversations')}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        selectedConversationId === conversation.id
                          ? 'border-cyan-200 bg-cyan-50'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      {renderUserAvatar(conversation.otherUser)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate text-sm font-bold text-slate-900">{conversation.otherUser.fullName}</div>
                          <div className="flex items-center gap-2">
                            {conversation.unreadCount > 0 && (
                              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#57131b] px-2 py-1 text-[11px] font-bold text-white">
                                {conversation.unreadCount}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{formatConversationTime(conversation.lastMessageAt)}</span>
                          </div>
                        </div>
                        <div className="mt-1 truncate text-xs font-medium text-slate-500">
                          {getRoleLabel(conversation.otherUser.role, language)}
                        </div>
                        <div className="mt-1 truncate text-sm text-slate-600">
                          {conversation.lastMessageText || t('chat.startNewChat')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                <Users size={14} />
                {t('chat.allMembers')}
              </div>

              {filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  {t('chat.emptySearch')}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleOpenConversation(member)}
                      disabled={isOpeningConversation === member.id}
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-200 hover:bg-white disabled:opacity-60"
                    >
                      {renderUserAvatar(member, 'h-11 w-11')}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-slate-900">{member.fullName}</div>
                        <div className="truncate text-xs font-medium text-slate-500">{getRoleLabel(member.role, language)}</div>
                        <div className="truncate text-xs text-slate-400">{member.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={`${selectedConversation ? 'block' : 'hidden lg:block'}`}>
          <div className="flex min-h-[70vh] flex-col rounded-3xl border border-slate-100 bg-white shadow-sm">
            {selectedConversation ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <button
                    onClick={() => setSelectedConversationId(null)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 lg:hidden"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  {renderUserAvatar(selectedConversation.otherUser)}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-bold text-slate-900">{selectedConversation.otherUser.fullName}</div>
                    <div className="truncate text-sm text-slate-500">
                      {typingConversationId === selectedConversation.id
                        ? `${typingUserName || getRoleLabel(selectedConversation.otherUser.role, language)} ${t('chat.typing')}`
                        : `${getRoleLabel(selectedConversation.otherUser.role, language)}${
                            selectedConversation.otherUser.lastSeenAt
                              ? ` • ${formatLastSeenLabel(selectedConversation.otherUser.lastSeenAt)}`
                              : ''
                          }`}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
                  {isLoadingMessages ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                      {t('common.loading')}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                      {t('chat.noMessages')}
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage = message.senderId === user.id;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-sm sm:max-w-[70%] ${
                              isOwnMessage
                                ? 'bg-[#57131b] text-white'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</div>
                            <div
                              className={`mt-2 text-[11px] font-medium ${
                                isOwnMessage ? 'text-white/75' : 'text-slate-500'
                              }`}
                            >
                              {formatConversationTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-slate-100 px-5 py-4">
                  {currentConversationReadState ? (
                    <div className="mb-3 text-right text-xs font-medium text-slate-500">
                      {currentConversationReadState}
                    </div>
                  ) : null}
                  <div className="flex items-end gap-3">
                    <label className="min-h-[56px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <textarea
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        placeholder={t('chat.typeMessage')}
                        rows={2}
                        className="max-h-32 min-h-[28px] w-full resize-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={isSendingMessage || !draftMessage.trim()}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#57131b] px-5 text-sm font-bold text-white shadow-lg shadow-[#57131b]/15 disabled:opacity-60"
                    >
                      <Send size={18} />
                      <span className="hidden sm:inline">{isSendingMessage ? t('chat.sending') : t('chat.send')}</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-700">
                  <MessageSquare size={30} />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900">{t('chat.title')}</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{t('chat.selectConversation')}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Chat;
