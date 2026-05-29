import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/providers/auth-provider';
import { registerUser } from '@/src/services/auth-service';
import { theme } from '@/src/theme/theme';
import { UserRole } from '@/src/types/domain';

export default function RegisterScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Referee');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (user) {
    return <Redirect href="/home" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.root}>
        <View style={styles.card}>
          <Text style={styles.title}>Register</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full name" />
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" autoCapitalize="none" secureTextEntry />
          <View style={styles.roleRow}>
            {(['Referee', 'TO', 'TO Supervisor', 'Staff', 'Financialist'] as UserRole[]).map((item) => (
              <Pressable key={item} style={[styles.roleChip, role === item ? styles.roleChipActive : null]} onPress={() => setRole(item)}>
                <Text style={[styles.roleText, role === item ? styles.roleTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={styles.primaryButton}
            onPress={async () => {
              setSubmitting(true);
              setError('');
              try {
                await registerUser({ fullName, email, password, role });
                router.replace('/pin-setup');
              } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : 'Registration failed.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.primaryText}>Create account</Text>}
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
  input: { minHeight: 54, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.line, paddingHorizontal: 14, backgroundColor: theme.colors.canvasAlt, color: theme.colors.text },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.card },
  roleChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  roleText: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  roleTextActive: { color: theme.colors.white },
  error: { color: theme.colors.danger, fontSize: 13 },
  primaryButton: { minHeight: 54, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: theme.colors.white, fontSize: 15, fontWeight: '900' },
});
