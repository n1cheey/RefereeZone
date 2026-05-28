import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { theme } from '@/src/theme/theme';

export default function HomeScreen() {
  const { t } = useLanguage();
  const { user, logout, enableBiometricUnlock, savePin } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>REFZONE MOBILE V2</Text>
          <Text style={styles.title}>{t('home.title')}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{user?.fullName || 'User'}</Text>
          <Text style={styles.sectionText}>{user?.role || 'Role'}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={() => void enableBiometricUnlock()}>
            <Text style={styles.primaryButtonText}>{t('auth.biometricTitle')}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => void savePin('1234')}>
            <Text style={styles.secondaryButtonText}>{t('auth.pinTitle')}</Text>
          </Pressable>
          <Pressable style={styles.logoutButton} onPress={() => void logout()}>
            <Text style={styles.logoutButtonText}>{t('common.logout')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  root: {
    flex: 1,
    padding: 20,
    gap: 18,
  },
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: 24,
    gap: 10,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    color: theme.colors.white,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: 20,
    gap: 8,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionText: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: theme.radius.sm,
    backgroundColor: '#ece5de',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  logoutButton: {
    minHeight: 54,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  logoutButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
});
