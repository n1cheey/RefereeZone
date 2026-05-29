import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getFinancialistSummary, getMonthlyStats, getMyGames } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { formatCurrency } from '@/src/utils/format';

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toIso = (value: Date) => value.toISOString().slice(0, 10);
  return { start: toIso(start), end: toIso(end) };
};

export default function FinanceScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const defaultRange = getCurrentMonthRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  const gamesQuery = useQuery({
    queryKey: ['mobile-finance-games', user?.id],
    queryFn: () => getMyGames(user!),
    enabled: Boolean(user && user.role !== 'Financialist'),
  });

  const financeQuery = useQuery({
    queryKey: ['mobile-finance-summary', startDate, endDate],
    queryFn: () => getFinancialistSummary(startDate, endDate),
    enabled: Boolean(user && user.role === 'Financialist'),
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role === 'Financialist') {
    const summary = financeQuery.data?.summary;

    return (
      <ScreenShell user={user} title={t('finance.title')} subtitle={t('finance.subtitle')}>
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>{t('common.currentMonth')}</Text>
          <Text style={sharedStyles.muted}>{t('finance.rangeHelp')}</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{t('common.from')}</Text>
              <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>{t('common.to')}</Text>
              <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} />
            </View>
          </View>
          <Pressable style={styles.refreshButton} onPress={() => void financeQuery.refetch()}>
            <Text style={styles.refreshText}>{t('common.retry')}</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={[sharedStyles.sectionCard, styles.summaryCard]}>
            <Text style={styles.summaryLabel}>{t('finance.refereeTotal')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary?.refereeTotal || 0)}</Text>
          </View>
          <View style={[sharedStyles.sectionCard, styles.summaryCard]}>
            <Text style={styles.summaryLabel}>{t('finance.toTotal')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary?.toTotal || 0)}</Text>
          </View>
        </View>
      </ScreenShell>
    );
  }

  const stats = getMonthlyStats(user, gamesQuery.data?.assignments || []);

  return (
    <ScreenShell user={user} title={t('finance.title')} subtitle={t('finance.subtitle')}>
      <View style={sharedStyles.sectionCard}>
        <Text style={styles.summaryLabel}>{t('finance.personalTotal')}</Text>
        <Text style={styles.summaryValue}>{formatCurrency(stats.earnings)}</Text>
      </View>
      <View style={sharedStyles.sectionCard}>
        <Text style={styles.summaryLabel}>{t('common.monthMatches')}</Text>
        <Text style={styles.summaryValue}>{stats.matchesCount}</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrap: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  refreshButton: {
    marginTop: 6,
    minHeight: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minHeight: 128,
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
});
