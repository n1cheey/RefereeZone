import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { theme } from '@/src/theme/theme';

export function AppLockScreen() {
  const { t } = useLanguage();
  const { unlockPreferences, unlockWithBiometric, unlockWithPin } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handlePinUnlock = async () => {
    const success = await unlockWithPin(pin);
    if (!success) {
      setError('Invalid PIN.');
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
          <Pressable style={styles.primaryButton} onPress={() => void unlockWithBiometric()}>
            <Text style={styles.primaryButtonText}>{t('auth.unlockBiometric')}</Text>
          </Pressable>
        ) : null}

        {unlockPreferences.pinEnabled ? (
          <>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder={t('auth.pinPlaceholder')}
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              keyboardType="number-pad"
              style={styles.input}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable style={styles.secondaryButton} onPress={() => void handlePinUnlock()}>
              <Text style={styles.secondaryButtonText}>{t('auth.unlockPin')}</Text>
            </Pressable>
          </>
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
  input: {
    backgroundColor: theme.colors.canvasAlt,
    borderColor: theme.colors.line,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.colors.text,
    fontSize: 16,
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
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
