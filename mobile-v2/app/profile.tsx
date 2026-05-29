import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { theme } from '@/src/theme/theme';

export default function ProfileScreen() {
  const { user, logout, unlockPreferences } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <ScreenShell user={user} title={t('profile.title')} subtitle={t('profile.subtitle')}>
      <View style={sharedStyles.sectionCard}>
        <View style={styles.hero}>
          <Avatar photoUrl={user.photoUrl} fullName={user.fullName} size={68} />
          <View style={styles.textWrap}>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.meta}>{user.role}</Text>
            <Text style={styles.meta}>{user.email}</Text>
          </View>
        </View>
      </View>

      <View style={sharedStyles.sectionCard}>
        <Text style={sharedStyles.sectionTitle}>{t('profile.changeLanguage')}</Text>
        <View style={styles.languageRow}>
          {(['az', 'en', 'ru'] as const).map((code) => {
            const active = language === code;
            return (
              <Pressable
                key={code}
                style={[styles.languagePill, active ? styles.languagePillActive : null]}
                onPress={() => setLanguage(code)}
              >
                <Text style={[styles.languageText, active ? styles.languageTextActive : null]}>{code.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={sharedStyles.sectionCard}>
        <Text style={sharedStyles.sectionTitle}>{t('profile.security')}</Text>
        <Text style={sharedStyles.muted}>{unlockPreferences.pinEnabled ? t('profile.pinEnabled') : 'PIN disabled'}</Text>
        <Text style={sharedStyles.muted}>
          {unlockPreferences.biometricEnabled ? t('profile.biometricEnabled') : 'Biometric disabled'}
        </Text>
      </View>

      <Pressable style={styles.logoutButton} onPress={() => void logout()}>
        <Text style={styles.logoutText}>{t('common.logout')}</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  languagePill: {
    minWidth: 64,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  languagePillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  languageText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  languageTextActive: {
    color: theme.colors.white,
  },
  logoutButton: {
    minHeight: 56,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
});
