import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { theme } from '@/src/theme/theme';

export default function CalendarScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('home.calendar')}</Text>
          <Text style={styles.subtitle}>{t('home.comingSoon')}</Text>
        </View>
        <Pressable style={styles.button} onPress={() => router.replace('/home')}>
          <Text style={styles.buttonText}>{t('common.backHome')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.canvas },
  root: { flex: 1, padding: 20, gap: 16 },
  card: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radius.lg, padding: 22, gap: 8 },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, fontSize: 15, lineHeight: 22 },
  button: { minHeight: 54, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: theme.colors.white, fontSize: 15, fontWeight: '900' },
});
