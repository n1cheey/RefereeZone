import { Ionicons } from '@expo/vector-icons';
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
      <View style={styles.hero}>
        <Avatar photoUrl={user.photoUrl} fullName={user.fullName} size={78} />
        <View style={styles.heroText}>
          <Text style={styles.heroName}>{user.fullName}</Text>
          <Text style={styles.heroRole}>{user.role}</Text>
          <Text style={styles.heroEmail}>{user.email}</Text>
        </View>
      </View>

      <View style={[sharedStyles.sectionCard, styles.panel]}>
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

      <View style={[sharedStyles.sectionCard, styles.panel]}>
        <Text style={sharedStyles.sectionTitle}>{t('profile.security')}</Text>
        <View style={styles.securityRow}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.colors.primary} />
          <Text style={sharedStyles.muted}>{unlockPreferences.pinEnabled ? t('profile.pinEnabled') : 'PIN disabled'}</Text>
        </View>
        <View style={styles.securityRow}>
          <Ionicons name="finger-print-outline" size={18} color={theme.colors.primary} />
          <Text style={sharedStyles.muted}>
            {unlockPreferences.biometricEnabled ? t('profile.biometricEnabled') : 'Biometric disabled'}
          </Text>
        </View>
      </View>

      <Pressable style={styles.logoutButton} onPress={() => void logout()}>
        <Ionicons name="log-out-outline" size={18} color={theme.colors.white} />
        <Text style={styles.logoutText}>{t('common.logout')}</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: 18,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: '900',
  },
  heroRole: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    fontWeight: '800',
  },
  heroEmail: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
  },
  panel: {
    gap: 14,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  languagePill: {
    minWidth: 72,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvasAlt,
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
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutButton: {
    minHeight: 56,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logoutText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
});

