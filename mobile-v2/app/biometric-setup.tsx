import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { theme } from '@/src/theme/theme';

export default function BiometricSetupScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, requiresPinSetup, requiresBiometricSetup, enableBiometricUnlock, skipBiometricSetup } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (requiresPinSetup) {
    return <Redirect href="/pin-setup" />;
  }

  if (!requiresBiometricSetup) {
    return <Redirect href="/home" />;
  }

  const handleEnable = async () => {
    const success = await enableBiometricUnlock();
    if (!success) {
      return;
    }

    router.replace('/home');
  };

  const handleSkip = () => {
    skipBiometricSetup();
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>iRefZone</Text>
          <Text style={styles.title}>{t('auth.biometricSetupTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.biometricSetupText')}</Text>
        </View>

        <View style={styles.card}>
          <Pressable style={styles.primaryButton} onPress={() => void handleEnable()}>
            <Text style={styles.primaryButtonText}>{t('auth.biometricEnable')}</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleSkip}>
            <Text style={styles.secondaryButtonText}>{t('auth.biometricSkip')}</Text>
          </Pressable>
        </View>
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
  title: { color: theme.colors.white, fontSize: 26, lineHeight: 30, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.84)', fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    padding: 22,
    gap: 12,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: theme.colors.white, fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
  secondaryButton: {
    minHeight: 58,
    borderRadius: theme.radius.sm,
    backgroundColor: '#ece5de',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: theme.colors.primary, fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
});
