import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMobileTests } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { formatDateTimeLabel } from '@/src/utils/format';

export default function TestsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const testsQuery = useQuery({
    queryKey: ['mobile-tests'],
    queryFn: getMobileTests,
    enabled: Boolean(user),
  });

  if (!user) return <Redirect href="/login" />;

  const tests = testsQuery.data?.tests || [];
  const isSupervisorView = user.role === 'Instructor' || user.role === 'TO Supervisor';

  return (
    <ScreenShell user={user} title={t('home.tests')} subtitle="Exam desk and assigned attempts">
      <View style={[sharedStyles.sectionCard, styles.heroCard]}>
        <Text style={styles.heroTitle}>Exam desk</Text>
        <Text style={sharedStyles.muted}>
          {isSupervisorView
            ? 'Monitor participant attempts, failures and deadlines from mobile.'
            : 'Open assigned exams and keep up with deadlines and retakes.'}
        </Text>
      </View>

      {tests.map((test) => (
        <View key={test.id} style={[sharedStyles.sectionCard, styles.testCard]}>
          <View style={styles.headerRow}>
            <View style={styles.audienceChip}>
              <Text style={styles.audienceChipText}>{test.audienceRole}</Text>
            </View>
            <Text style={styles.statusText}>{test.status}</Text>
          </View>
          <Text style={styles.testTitle}>{test.title}</Text>
          <Text style={styles.testDescription}>{test.description || 'No description.'}</Text>
          {test.deadlineAt ? <Text style={styles.metaText}>Deadline: {formatDateTimeLabel(test.deadlineAt)}</Text> : null}
          {'latestAttempt' in test && test.latestAttempt ? (
            <View style={styles.attemptBox}>
              <Text style={styles.attemptTitle}>Latest attempt</Text>
              <Text style={styles.metaText}>
                {test.latestAttempt.correctAnswers}/{test.latestAttempt.totalQuestions} • {test.latestAttempt.resultStatus || test.latestAttempt.status}
              </Text>
            </View>
          ) : null}
          {'attempts' in test && Array.isArray(test.attempts) && test.attempts.length ? (
            <View style={styles.attemptsWrap}>
              <Text style={styles.attemptTitle}>Attempts & retakes</Text>
              {test.attempts.slice(0, 3).map((attempt) => (
                <Pressable key={attempt.id} style={styles.attemptRow}>
                  <Text style={styles.attemptName}>{attempt.userName}</Text>
                  <Text style={styles.metaText}>
                    {attempt.correctAnswers}/{attempt.totalQuestions} • {attempt.resultStatus || attempt.status}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {!testsQuery.isLoading && !tests.length ? (
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 8,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  testCard: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  audienceChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(91,23,35,0.08)',
  },
  audienceChipText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  statusText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  testTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  testDescription: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  attemptBox: {
    borderRadius: 18,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 12,
    gap: 4,
  },
  attemptsWrap: {
    gap: 8,
  },
  attemptTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  attemptRow: {
    borderRadius: 18,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 12,
    gap: 4,
  },
  attemptName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
});
