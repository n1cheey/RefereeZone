import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { missingEnvMessages } from '@/src/config/env';
import { COUNTRY_OPTIONS, DISCIPLINE_OPTIONS } from '@/src/constants/login-options';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { canUseBiometrics } from '@/src/services/biometric-service';
import { theme } from '@/src/theme/theme';
import { AppLanguage, CountryCode, DisciplineCode } from '@/src/types/domain';

export default function LoginScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { user, login, initializing, enableBiometricUnlock, savePin } = useAuth();
  const [country, setCountry] = useState<CountryCode>('az');
  const [discipline, setDiscipline] = useState<DisciplineCode>('basketball');
  const [countryOpen, setCountryOpen] = useState(false);
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricSupported, setBiometricSupported] = useState<boolean | null>(null);

  useEffect(() => {
    void canUseBiometrics().then(setBiometricSupported).catch(() => setBiometricSupported(false));
  }, []);

  if (user) {
    return <Redirect href="/home" />;
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      await login(email, password);

      if (pin.trim().length >= 4) {
        await savePin(pin.trim());
      }

      if (biometricSupported) {
        await enableBiometricUnlock();
      }

      router.replace('/home');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentCountry = COUNTRY_OPTIONS.find((item) => item.code === country) || COUNTRY_OPTIONS[0];
  const currentDiscipline = DISCIPLINE_OPTIONS.find((item) => item.code === discipline) || DISCIPLINE_OPTIONS[0];
  const disabled = submitting || initializing;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: 'height', default: undefined })}
        style={styles.keyboardRoot}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>{t('auth.welcomeEyebrow')}</Text>
            <Text style={styles.heroTitle}>{t('auth.welcomeTitle')}</Text>
            <Text style={styles.heroSubtitle}>{t('auth.welcomeText')}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.languageRow}>
              {(['az', 'en', 'ru'] as AppLanguage[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setLanguage(item)}
                  style={[styles.languagePill, language === item && styles.languagePillActive]}
                >
                  <Text style={[styles.languagePillText, language === item && styles.languagePillTextActive]}>
                    {item.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.accessLabel')}</Text>
              <View style={styles.selectorRow}>
                <Pressable
                  onPress={() => {
                    setCountryOpen((value) => !value);
                    setDisciplineOpen(false);
                  }}
                  style={[styles.countrySelector, countryOpen && styles.selectorActive]}
                >
                  <Text style={styles.selectorFlag}>{currentCountry.flag}</Text>
                  <Text style={styles.selectorChevron}>{countryOpen ? '▲' : '▼'}</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setDisciplineOpen((value) => !value);
                    setCountryOpen(false);
                  }}
                  style={[styles.disciplineSelector, disciplineOpen && styles.selectorActive]}
                >
                  <Text style={styles.disciplineSelectorText}>{currentDiscipline.label[language]}</Text>
                  <Text style={styles.selectorChevron}>{disciplineOpen ? '▲' : '▼'}</Text>
                </Pressable>
              </View>

              {countryOpen ? (
                <View style={styles.optionSheet}>
                  <Text style={styles.optionSheetTitle}>{t('auth.selectCountry')}</Text>
                  {COUNTRY_OPTIONS.map((item) => (
                    <Pressable
                      key={item.code}
                      onPress={() => {
                        setCountry(item.code);
                        setCountryOpen(false);
                      }}
                      style={[styles.optionRow, country === item.code && styles.optionRowActive]}
                    >
                      <Text style={styles.optionFlag}>{item.flag}</Text>
                      <Text style={[styles.optionText, country === item.code && styles.optionTextActive]}>
                        {item.name[language]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {disciplineOpen ? (
                <View style={styles.optionSheet}>
                  <Text style={styles.optionSheetTitle}>{t('auth.selectDiscipline')}</Text>
                  {DISCIPLINE_OPTIONS.map((item) => (
                    <Pressable
                      key={item.code}
                      onPress={() => {
                        setDiscipline(item.code);
                        setDisciplineOpen(false);
                      }}
                      style={[styles.optionRow, discipline === item.code && styles.optionRowActive]}
                    >
                      <Text style={[styles.optionText, discipline === item.code && styles.optionTextActive]}>
                        {item.label[language]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.emailLabel')}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="name@example.com"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.passwordLabel')}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                secureTextEntry
                placeholder="********"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.pinTitle')}</Text>
              <TextInput
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                placeholder="1234"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <Text style={styles.helperText}>{t('auth.pinText')}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>{t('auth.biometricTitle')}</Text>
              <Text style={styles.infoText}>
                {biometricSupported === false ? 'Biometrics are not available on this device.' : t('auth.biometricText')}
              </Text>
            </View>

            {missingEnvMessages.length > 0 ? (
              <View style={styles.warningBox}>
                {missingEnvMessages.map((message) => (
                  <Text key={message} style={styles.warningText}>
                    {message}
                  </Text>
                ))}
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable disabled={disabled} style={styles.primaryButton} onPress={() => void handleSubmit()}>
              {submitting || initializing ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('auth.loginButton')}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  keyboardRoot: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 8,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: theme.colors.white,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    padding: 22,
    gap: 16,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  languagePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.canvasAlt,
  },
  languagePillActive: {
    backgroundColor: theme.colors.primary,
  },
  languagePillText: {
    color: theme.colors.text,
    fontWeight: '900',
    fontSize: 12,
  },
  languagePillTextActive: {
    color: theme.colors.white,
  },
  field: {
    gap: 8,
  },
  label: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  countrySelector: {
    width: 92,
    minHeight: 56,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disciplineSelector: {
    flex: 1,
    minHeight: 56,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  selectorActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#efe7de',
  },
  selectorFlag: {
    fontSize: 26,
  },
  selectorChevron: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  disciplineSelectorText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  optionSheet: {
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 12,
    gap: 8,
  },
  optionSheetTitle: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optionRow: {
    minHeight: 52,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  optionFlag: {
    fontSize: 22,
  },
  optionText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  optionTextActive: {
    color: theme.colors.white,
  },
  input: {
    minHeight: 56,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    color: theme.colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  helperText: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  infoBox: {
    borderRadius: theme.radius.sm,
    backgroundColor: '#f7efe6',
    padding: 16,
    gap: 6,
  },
  infoTitle: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  infoText: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  warningBox: {
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.warningSoft,
    padding: 14,
    gap: 4,
  },
  warningText: {
    color: theme.colors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dangerSoft,
    padding: 14,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
