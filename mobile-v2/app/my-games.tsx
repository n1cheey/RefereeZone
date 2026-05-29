import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { TeamBadge } from '@/src/components/team-badge';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getMyGames } from '@/src/services/modules-service';
import { splitTeams } from '@/src/services/team-logos';
import { theme } from '@/src/theme/theme';
import { MobileInstructorNomination, MobileRefereeNomination } from '@/src/types/modules';
import { formatCurrency, formatDateLabel } from '@/src/utils/format';

function CrewBlock({ title, members }: { title: string; members: { refereeName?: string; toName?: string; status: string }[] }) {
  return (
    <View style={styles.crewBlock}>
      <Text style={styles.crewTitle}>{title}</Text>
      {members.length ? (
        members.map((member, index) => (
          <Text key={`${title}-${index}`} style={styles.crewMember}>
            {(member.refereeName || member.toName || '—')} · {member.status}
          </Text>
        ))
      ) : (
        <Text style={styles.crewEmpty}>—</Text>
      )}
    </View>
  );
}

function MatchCard({
  gameCode,
  teams,
  matchDate,
  matchTime,
  venue,
  assignmentLabel,
  status,
  refereeFee,
  toFee,
  crew,
  toCrew,
  statisticCrew,
  createdByName,
  t,
}: {
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  assignmentLabel?: string;
  status?: string;
  refereeFee?: number | null;
  toFee?: number | null;
  crew?: MobileRefereeNomination['crew'] | MobileInstructorNomination['referees'];
  toCrew?: MobileRefereeNomination['toCrew'] | MobileInstructorNomination['toCrew'];
  statisticCrew?: MobileRefereeNomination['statisticCrew'] | MobileInstructorNomination['statisticCrew'];
  createdByName?: string;
  t: (key: string) => string;
}) {
  const [homeTeam, awayTeam] = splitTeams(teams);

  return (
    <View style={sharedStyles.sectionCard}>
      <View style={styles.cardTop}>
        <View style={sharedStyles.pill}>
          <Text style={sharedStyles.pillText}>{gameCode}</Text>
        </View>
        {assignmentLabel ? (
          <View style={[sharedStyles.pill, styles.statusPill]}>
            <Text style={sharedStyles.pillText}>{assignmentLabel}{status ? ` · ${status}` : ''}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.teamRow}>
        <TeamBadge teamName={homeTeam || teams} />
        <Text style={styles.vsText}>vs</Text>
        <TeamBadge teamName={awayTeam || teams} />
      </View>

      <Text style={styles.meta}>{formatDateLabel(matchDate)} · {matchTime}</Text>
      <Text style={styles.meta}>{venue}</Text>
      {createdByName ? <Text style={styles.meta}>{t('games.createdBy')}: {createdByName}</Text> : null}

      <View style={styles.feesRow}>
        {refereeFee !== null && refereeFee !== undefined ? <Text style={styles.feeText}>Ref: {formatCurrency(refereeFee)}</Text> : null}
        {toFee !== null && toFee !== undefined ? <Text style={styles.feeText}>TO: {formatCurrency(toFee)}</Text> : null}
      </View>

      <CrewBlock title={t('games.referees')} members={crew || []} />
      <CrewBlock title={t('games.toCrew')} members={toCrew || []} />
      <CrewBlock title={t('games.statCrew')} members={statisticCrew || []} />
    </View>
  );
}

export default function MyGamesScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const gamesQuery = useQuery({
    queryKey: ['mobile-my-games', user?.id],
    queryFn: () => getMyGames(user!),
    enabled: Boolean(user),
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const instructorGames = gamesQuery.data?.instructorNominations || [];
  const assignmentGames = gamesQuery.data?.assignments || [];

  return (
    <ScreenShell
      user={user}
      title={t('games.title')}
      subtitle={user.role === 'Instructor' || user.role === 'TO Supervisor' ? t('games.instructorView') : t('games.assignmentView')}
    >
      {instructorGames.map((game) => (
        <MatchCard
          key={game.id}
          gameCode={game.gameCode}
          teams={game.teams}
          matchDate={game.matchDate}
          matchTime={game.matchTime}
          venue={game.venue}
          createdByName={game.createdByName}
          crew={game.referees}
          toCrew={game.toCrew}
          statisticCrew={game.statisticCrew}
          t={t}
        />
      ))}

      {assignmentGames.map((game) => (
        <MatchCard
          key={game.nominationId}
          gameCode={game.gameCode}
          teams={game.teams}
          matchDate={game.matchDate}
          matchTime={game.matchTime}
          venue={game.venue}
          assignmentLabel={game.assignmentLabel}
          status={game.status}
          refereeFee={game.refereeFee}
          toFee={game.toFee}
          crew={game.crew}
          toCrew={game.toCrew}
          statisticCrew={game.statisticCrew}
          createdByName={game.instructorName}
          t={t}
        />
      ))}

      {!gamesQuery.isLoading && instructorGames.length === 0 && assignmentGames.length === 0 ? (
        <View style={sharedStyles.sectionCard}>
          <Text style={sharedStyles.muted}>{t('games.empty')}</Text>
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    backgroundColor: theme.colors.warningSoft,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vsText: {
    color: theme.colors.muted,
    fontSize: 16,
    fontWeight: '900',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  feesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  feeText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  crewBlock: {
    gap: 6,
    paddingTop: 6,
  },
  crewTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  crewMember: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  crewEmpty: {
    color: theme.colors.muted,
    fontSize: 13,
  },
});
