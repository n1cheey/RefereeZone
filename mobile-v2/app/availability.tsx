import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMobileAvailabilityOverview } from '@/src/services/modules-service';
import { formatDateLabel } from '@/src/utils/format';

export default function AvailabilityScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const availabilityQuery = useQuery({
    queryKey: ['mobile-availability'],
    queryFn: getMobileAvailabilityOverview,
    enabled: Boolean(user),
  });

  if (!user) return <Redirect href="/login" />;

  const requests = availabilityQuery.data?.myRequests || [];
  const approvals = availabilityQuery.data?.pendingApprovals || [];

  return (
    <ScreenShell user={user} title={t('home.availability')} subtitle={t('home.comingSoon')}>
      {requests.map((item) => (
        <View key={item.id} style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>{item.status}</Text>
          <Text style={sharedStyles.muted}>{formatDateLabel(item.startDate)} → {formatDateLabel(item.endDate)}</Text>
          <Text style={sharedStyles.muted}>{item.reason}</Text>
        </View>
      ))}

      {approvals.map((item) => (
        <View key={`${item.id}-approval`} style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>{item.userName}</Text>
          <Text style={sharedStyles.muted}>{item.userRole}</Text>
          <Text style={sharedStyles.muted}>{formatDateLabel(item.startDate)} → {formatDateLabel(item.endDate)}</Text>
        </View>
      ))}
    </ScreenShell>
  );
}
