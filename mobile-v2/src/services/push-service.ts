import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import { Href } from 'expo-router';
import { Platform } from 'react-native';

import { apiRequest } from '@/src/services/api-client';

const PUSH_ALERTS_CHANNEL_ID = 'irefzone-alerts';
const PUSH_CHAT_CHANNEL_ID = 'irefzone-chat';
const PUSH_TOKEN_STORAGE_KEY = 'irefzone_push_registration';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

type StoredPushTokenRegistration = {
  token: string;
  userId: string;
  registeredAt?: string;
};

function canUseRemotePush() {
  return Platform.OS !== 'web' && !isRunningInExpoGo();
}

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || '';
}

async function ensureNotificationPermissions() {
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return Boolean(
    requestedPermissions.granted ||
      requestedPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
  );
}

async function ensureAndroidPushChannels() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(PUSH_ALERTS_CHANNEL_ID, {
    name: 'iRefZone alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync(PUSH_CHAT_CHANNEL_ID, {
    name: 'iRefZone chat',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    sound: 'default',
  });
}

async function readStoredPushRegistration() {
  try {
    const raw = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredPushTokenRegistration;
    if (!parsed?.token || !parsed?.userId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function writeStoredPushRegistration(payload: StoredPushTokenRegistration | null) {
  if (!payload) {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, JSON.stringify(payload));
}

export async function registerDevicePushToken(userId: string) {
  if (!userId || !canUseRemotePush()) {
    return null;
  }

  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  await ensureAndroidPushChannels();

  const projectId = getProjectId();
  if (!projectId) {
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (!token) {
    return null;
  }

  const existingRegistration = await readStoredPushRegistration();
  if (existingRegistration?.token === token && existingRegistration.userId === userId) {
    return token;
  }

  await apiRequest('/api/push-tokens', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      token,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || null,
      deviceType: Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iPhone / iPad' : Platform.OS,
      buildType: isRunningInExpoGo() ? 'Expo Go' : 'Development build',
    }),
  });

  await writeStoredPushRegistration({
    token,
    userId,
    registeredAt: new Date().toISOString(),
  });

  return token;
}

export async function unregisterDevicePushToken() {
  const storedRegistration = await readStoredPushRegistration();
  if (!storedRegistration?.token) {
    return;
  }

  try {
    await apiRequest('/api/push-tokens/unregister', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        token: storedRegistration.token,
      }),
    });
  } finally {
    await writeStoredPushRegistration(null);
  }
}

export function resolvePushNavigationPath(data: Record<string, unknown> | null | undefined): Href | null {
  const kind = String(data?.kind || '').trim();
  const conversationId = String(data?.conversationId || '').trim();

  if (kind === 'chat-message' && conversationId) {
    return `/chat/${conversationId}` as Href;
  }

  if (kind === 'chat-message') {
    return '/chat';
  }

  if (kind.includes('report')) {
    return '/reports';
  }

  if (
    kind === 'new-game-created' ||
    kind === 'assignment' ||
    kind === 'declined-assignment' ||
    kind === 'to-selection' ||
    kind === 'match'
  ) {
    return '/my-games';
  }

  if (kind === 'availability' || kind === 'availability-reviewed') {
    return '/availability';
  }

  if (kind.includes('test')) {
    return '/tests';
  }

  return '/home';
}

