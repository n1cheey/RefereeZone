import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { theme } from '@/src/theme/theme';

const MODULES = [
  { route: '/my-games', key: 'home.myGames' },
  { route: '/calendar', key: 'home.calendar' },
  { route: '/chat', key: 'home.chat' },
  { route: '/notifications', key: 'home.notifications' },
  { route: '/reports', key: 'home.reports' },
  { route: '/tests', key: 'home.tests' },
  { route: '/availability', key: 'home.availability' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, logout, requiresPinSetup, requiresBiometricSetup } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (requiresPinSetup) {
    return <Redirect href="/pin-setup" />;
  }

  if (requiresBiometricSetup) {
    return <Redirect href="/biometric-setup" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>iRefZone</Text>
          <Text style={styles.title}>{user.fullName}</Text>
          <Text style={styles.subtitle}>{user.role}</Text>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>{user.email}</Text>
          <Text style={styles.profileSubtitle}>{user.licenseNumber || user.category}</Text>
        </View>

        <View style={styles.grid}>
          {MODULES.map((module) => (
            <Pressable key={module.route} style={styles.moduleCard} onPress={() => router.push(module.route as never)}>
              <Text style={styles.moduleTitle}>{t(module.key)}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutButton} onPress={() => void logout()}>
          <Text style={styles.logoutButtonText}>{t('common.logout')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.canvas },
  root: { flex: 1, padding: 20, gap: 16 },
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 8,
  },
  eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: theme.colors.white, fontSize: 30, lineHeight: 34, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.84)', fontSize: 15, lineHeight: 22 },
  profileCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: 20,
    gap: 8,
  },
  profileTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '900' },
  profileSubtitle: { color: theme.colors.muted, fontSize: 15 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCard: {
    width: '47%',
    minHeight: 92,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: 16,
    justifyContent: 'center',
  },
  moduleTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  logoutButton: {
    minHeight: 54,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
  },
  logoutButtonText: { color: theme.colors.text, fontSize: 15, fontWeight: '900' },
});
