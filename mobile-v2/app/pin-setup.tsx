import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinPad } from '@/src/components/pin-pad';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { theme } from '@/src/theme/theme';

export default function PinSetupScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, requiresPinSetup, savePin } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!requiresPinSetup) {
    return <Redirect href="/biometric-setup" />;
  }

  const handleCreateSubmit = (candidatePin = pin) => {
    if (candidatePin.length < 4) {
      setError(t('auth.pinTooShort'));
      setPin('');
      return;
    }

    setError('');
    setPin(candidatePin);
    setStep('confirm');
  };

  const handleConfirmSubmit = async (candidateConfirmPin = confirmPin) => {
    if (candidateConfirmPin !== pin) {
      setError(t('auth.pinMismatch'));
      setConfirmPin('');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await savePin(pin);
      router.replace('/biometric-setup');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('auth.pinSaveFailed'));
      setConfirmPin('');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setStep('create');
    setConfirmPin('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>iRefZone</Text>
          <Text style={styles.title}>{t('auth.pinSetupTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.pinSetupText')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{step === 'create' ? t('auth.pinTitle') : t('auth.pinConfirmLabel')}</Text>
          <PinPad
            value={step === 'create' ? pin : confirmPin}
            onChange={step === 'create' ? setPin : setConfirmPin}
            onSubmit={(nextValue) => void (step === 'create' ? handleCreateSubmit(nextValue) : handleConfirmSubmit(nextValue))}
            disabled={saving}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {step === 'confirm' ? (
            <Pressable style={styles.secondaryButton} onPress={handleBack}>
              <Text style={styles.secondaryButtonText}>{t('common.backHome')}</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.primaryButton}
            onPress={() => void (step === 'create' ? handleCreateSubmit() : handleConfirmSubmit())}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>{saving ? t('common.loading') : t('common.continue')}</Text>
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
  label: { color: theme.colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
  errorText: { color: theme.colors.danger, fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  primaryButton: {
    minHeight: 58,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: theme.colors.white, fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
  secondaryButton: {
    minHeight: 54,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  secondaryButtonText: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
});
