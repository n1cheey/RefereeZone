import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PinPad } from '@/src/components/pin-pad';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { theme } from '@/src/theme/theme';

export function AppLockScreen() {
  const { t } = useLanguage();
  const { unlockPreferences, unlockWithBiometric, unlockWithPin } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPinPad, setShowPinPad] = useState(false);
  const [biometricAttempted, setBiometricAttempted] = useState(false);

  useEffect(() => {
    if (!unlockPreferences.biometricEnabled || biometricAttempted) {
      return;
    }

    setBiometricAttempted(true);
    void unlockWithBiometric().then((success) => {
      if (!success && unlockPreferences.pinEnabled) {
        setShowPinPad(true);
      }
    });
  }, [biometricAttempted, unlockPreferences.biometricEnabled, unlockPreferences.pinEnabled, unlockWithBiometric]);

  const handlePinUnlock = async () => {
    const success = await unlockWithPin(pin);
    if (!success) {
      setError('Invalid PIN.');
      setPin('');
      return;
    }

    setError('');
    setPin('');
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('auth.lockedTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.lockedText')}</Text>

        {unlockPreferences.biometricEnabled ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() => void unlockWithBiometric().then((success) => !success && setShowPinPad(true))}
          >
            <Text style={styles.primaryButtonText}>{t('auth.unlockBiometric')}</Text>
          </Pressable>
        ) : null}

        {unlockPreferences.pinEnabled && (!unlockPreferences.biometricEnabled || showPinPad) ? (
          <>
            <PinPad value={pin} onChange={setPin} onSubmit={() => void handlePinUnlock()} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable style={styles.secondaryButton} onPress={() => void handlePinUnlock()}>
              <Text style={styles.secondaryButtonText}>{t('auth.unlockPin')}</Text>
            </Pressable>
          </>
        ) : null}

        {unlockPreferences.pinEnabled && unlockPreferences.biometricEnabled && !showPinPad ? (
          <Pressable style={styles.ghostButton} onPress={() => setShowPinPad(true)}>
            <Text style={styles.ghostButtonText}>{t('auth.unlockPin')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas,
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    padding: 24,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted,
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
    fontWeight: '900',
    fontSize: 15,
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
    fontWeight: '900',
    fontSize: 15,
  },
  ghostButton: {
    minHeight: 48,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
