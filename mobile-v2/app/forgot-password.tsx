import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestPasswordReset } from '@/src/services/auth-service';
import { theme } from '@/src/theme/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.root}>
        <View style={styles.card}>
          <Text style={styles.title}>Forgot password</Text>
          <Text style={styles.subtitle}>Supabase will send a reset link to your e-mail.</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={styles.primaryButton}
            onPress={async () => {
              setSubmitting(true);
              setError('');
              setMessage('');
              try {
                await requestPasswordReset(email);
                setMessage('Password reset e-mail sent.');
              } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : 'Failed to send reset e-mail.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.primaryText}>Send reset link</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.canvas },
  root: { padding: 20 },
  card: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.md, padding: 20, gap: 12 },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, fontSize: 14, lineHeight: 20 },
  input: { minHeight: 54, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.line, paddingHorizontal: 14, backgroundColor: theme.colors.canvasAlt, color: theme.colors.text },
  success: { color: theme.colors.success, fontSize: 13 },
  error: { color: theme.colors.danger, fontSize: 13 },
  primaryButton: { minHeight: 54, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: theme.colors.white, fontSize: 15, fontWeight: '900' },
});
