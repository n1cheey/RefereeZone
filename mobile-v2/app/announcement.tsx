import { Redirect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMobileAnnouncement, saveMobileAnnouncement } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { formatDateTimeLabel } from '@/src/utils/format';

export default function AnnouncementScreen() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [draftAz, setDraftAz] = useState('');
  const [draftEn, setDraftEn] = useState('');
  const [draftRu, setDraftRu] = useState('');

  const announcementQuery = useQuery({
    queryKey: ['mobile-announcement', user?.id],
    queryFn: getMobileAnnouncement,
    enabled: Boolean(user && (user.role === 'Instructor' || user.role === 'TO Supervisor')),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveMobileAnnouncement(user!, {
        messageAz: draftAz,
        messageEn: draftEn,
        messageRu: draftRu,
      }),
    onSuccess: async (response) => {
      setDraftAz(response.announcement.messageAz || '');
      setDraftEn(response.announcement.messageEn || '');
      setDraftRu(response.announcement.messageRu || '');
      await queryClient.invalidateQueries({ queryKey: ['mobile-announcement', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['mobile-home-announcement', user?.id] });
    },
  });

  const activeMessage = useMemo(() => {
    const announcement = announcementQuery.data?.announcement;
    if (!announcement) {
      return null;
    }

    if (language === 'az') return announcement.messageAz || announcement.message;
    if (language === 'ru') return announcement.messageRu || announcement.message;
    return announcement.messageEn || announcement.message;
  }, [announcementQuery.data?.announcement, language]);

  useEffect(() => {
    const announcement = announcementQuery.data?.announcement;
    if (!announcement) {
      return;
    }

    setDraftAz(announcement.messageAz || '');
    setDraftEn(announcement.messageEn || '');
    setDraftRu(announcement.messageRu || '');
  }, [announcementQuery.data?.announcement]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'Instructor' && user.role !== 'TO Supervisor') {
    return <Redirect href="/home" />;
  }

  const currentAnnouncement = announcementQuery.data?.announcement || null;

  return (
    <ScreenShell user={user} title="Announcement" subtitle="Manage the active notice" showSeasonSwitcher={false}>
      <View style={[sharedStyles.sectionCard, styles.panel]}>
        <Text style={sharedStyles.sectionTitle}>Current announcement</Text>
        {currentAnnouncement ? (
          <>
            <Text style={styles.currentText}>{activeMessage}</Text>
            <Text style={styles.meta}>
              {currentAnnouncement.createdByName} • {formatDateTimeLabel(currentAnnouncement.createdAt)}
            </Text>
            <Text style={styles.meta}>Audience: {currentAnnouncement.audienceRole === 'TO' ? 'TO only' : 'All officials'}</Text>
          </>
        ) : (
          <Text style={sharedStyles.muted}>No active announcement right now.</Text>
        )}
      </View>

      <View style={[sharedStyles.sectionCard, styles.panel]}>
        <Text style={sharedStyles.sectionTitle}>Edit translations</Text>

        <Text style={styles.label}>AZ</Text>
        <TextInput
          style={styles.textarea}
          multiline
          textAlignVertical="top"
          placeholder="Azərbaycan mətni"
          placeholderTextColor={theme.colors.muted}
          value={draftAz}
          onChangeText={setDraftAz}
        />

        <Text style={styles.label}>EN</Text>
        <TextInput
          style={styles.textarea}
          multiline
          textAlignVertical="top"
          placeholder="English text"
          placeholderTextColor={theme.colors.muted}
          value={draftEn}
          onChangeText={setDraftEn}
        />

        <Text style={styles.label}>RU</Text>
        <TextInput
          style={styles.textarea}
          multiline
          textAlignVertical="top"
          placeholder="Русский текст"
          placeholderTextColor={theme.colors.muted}
          value={draftRu}
          onChangeText={setDraftRu}
        />

        {saveMutation.error ? <Text style={styles.errorText}>{(saveMutation.error as Error).message}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={() => void saveMutation.mutate()}>
          <Text style={styles.primaryButtonText}>{saveMutation.isPending ? 'Saving…' : 'Save announcement'}</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 14,
  },
  currentText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  textarea: {
    minHeight: 108,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 15,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
});
