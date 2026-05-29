import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMyGames } from '@/src/services/modules-service';
import { formatDateLabel } from '@/src/utils/format';

export default function CalendarScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const gamesQuery = useQuery({
    queryKey: ['mobile-calendar', user?.id],
    queryFn: () => getMyGames(user!),
    enabled: Boolean(user),
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const assignmentGames = gamesQuery.data?.assignments || [];
  const instructorGames = gamesQuery.data?.instructorNominations || [];
  const allItems = [
    ...instructorGames.map((game) => ({ key: game.id, date: game.matchDate, teams: game.teams, gameCode: game.gameCode })),
    ...assignmentGames.map((game) => ({
      key: game.nominationId,
      date: game.matchDate,
      teams: game.teams,
      gameCode: game.gameCode,
    })),
  ].sort((left, right) => left.date.localeCompare(right.date));

  return (
    <ScreenShell user={user} title={t('calendar.title')} subtitle={t('calendar.subtitle')}>
      {allItems.map((item) => (
        <View key={item.key} style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.sectionTitle}>{item.gameCode}</Text>
          <Text style={sharedStyles.muted}>{item.teams}</Text>
          <Text style={sharedStyles.muted}>{formatDateLabel(item.date)}</Text>
        </View>
      ))}
    </ScreenShell>
  );
}
