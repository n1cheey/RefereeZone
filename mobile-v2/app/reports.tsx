import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMobileReports } from '@/src/services/modules-service';
import { formatDateLabel } from '@/src/utils/format';

export default function ReportsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const reportsQuery = useQuery({
    queryKey: ['mobile-reports', user?.id],
    queryFn: () => getMobileReports(user!),
    enabled: Boolean(user),
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const reports = reportsQuery.data?.reports || [];

  return (
    <ScreenShell user={user} title={t('reports.title')} subtitle={t('reports.subtitle')}>
      {reports.map((report) => (
        <View key={`${report.nominationId}-${report.refereeId}`} style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>{report.gameCode}</Text>
          <Text style={sharedStyles.muted}>{report.teams}</Text>
          <Text style={sharedStyles.muted}>{formatDateLabel(report.matchDate)} · {report.matchTime}</Text>
          <Text style={sharedStyles.muted}>
            Ref: {report.refereeReportStatus || '—'} · Instructor: {report.instructorReportStatus || '—'}
          </Text>
        </View>
      ))}
    </ScreenShell>
  );
}
