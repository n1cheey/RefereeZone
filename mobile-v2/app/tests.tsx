import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMobileTests } from '@/src/services/modules-service';

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

  return (
    <ScreenShell user={user} title={t('home.tests')} subtitle={t('home.comingSoon')}>
      {tests.map((test) => (
        <View key={test.id} style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>{test.title}</Text>
          <Text style={sharedStyles.muted}>{test.description || '—'}</Text>
          <Text style={sharedStyles.muted}>
            {test.audienceRole} · {test.status}
          </Text>
        </View>
      ))}
    </ScreenShell>
  );
}
