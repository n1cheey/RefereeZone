import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { TeamBadge } from '@/src/components/team-badge';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { useSeason } from '@/src/providers/season-provider';
import { getMyGames, updateMobileMatchDetails } from '@/src/services/modules-service';
import { splitTeams } from '@/src/services/team-logos';
import { theme } from '@/src/theme/theme';
import { MobileInstructorNomination, MobileRefereeNomination } from '@/src/types/modules';
import { formatCurrency, formatDateLabel, formatTimeLabel } from '@/src/utils/format';

function CrewList({
  title,
  members,
  tone,
}: {
  title: string;
  members: { refereeName?: string; toName?: string; status: string }[];
  tone: 'ref' | 'to' | 'stat';
}) {
  const toneColor = tone === 'ref' ? theme.colors.primary : tone === 'to' ? '#1a5f6a' : '#85520f';

  return (
    <View style={styles.crewPanel}>
      <Text style={[styles.crewTitle, { color: toneColor }]}>{title}</Text>
      {members.length ? (
        members.map((member, index) => (
          <View key={`${title}-${index}`} style={styles.crewRow}>
            <Text style={styles.crewName}>{member.refereeName || member.toName || '—'}</Text>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{member.status}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.crewEmpty}>No assignments yet</Text>
      )}
    </View>
  );
}

function MatchCard({
  game,
  assignmentLabel,
  status,
  t,
  canEditMedia,
  onSaveMedia,
}: {
  game: MobileInstructorNomination | MobileRefereeNomination;
  assignmentLabel?: string;
  status?: string;
  t: (key: string) => string;
  canEditMedia: boolean;
  onSaveMedia: (payload: { matchVideoUrl: string; matchProtocolUrl: string }) => Promise<void>;
}) {
  const [homeTeam, awayTeam] = splitTeams(game.teams);
  const [editing, setEditing] = useState(false);
  const [videoUrl, setVideoUrl] = useState(game.matchVideoUrl || '');
  const [protocolUrl, setProtocolUrl] = useState(game.matchProtocolUrl || '');

  return (
    <View style={[sharedStyles.sectionCard, styles.matchCard]}>
      <View style={styles.headerRow}>
        <View style={styles.gameCodeChip}>
          <Text style={styles.gameCodeText}>{game.gameCode}</Text>
        </View>
        {assignmentLabel ? (
          <View style={styles.assignmentChip}>
            <Text style={styles.assignmentChipText}>{assignmentLabel}{status ? ` • ${status}` : ''}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.teamsCard}>
        <TeamBadge teamName={homeTeam || game.teams} />
        <View style={styles.centerMeta}>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.centerDate}>{formatDateLabel(game.matchDate)}</Text>
        </View>
        <TeamBadge teamName={awayTeam || game.teams} />
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.metaText}>{formatTimeLabel(game.matchTime)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.metaText}>{game.venue}</Text>
        </View>
      </View>

      {(game.refereeFee !== null && game.refereeFee !== undefined) || (game.toFee !== null && game.toFee !== undefined) ? (
        <View style={styles.feesBar}>
          {game.refereeFee !== null && game.refereeFee !== undefined ? (
            <Text style={styles.feeText}>Referee fee: {formatCurrency(game.refereeFee)}</Text>
          ) : null}
          {game.toFee !== null && game.toFee !== undefined ? <Text style={styles.feeText}>TO fee: {formatCurrency(game.toFee)}</Text> : null}
        </View>
      ) : null}

      <View style={styles.mediaRow}>
        {game.matchVideoUrl ? (
          <Pressable style={styles.mediaButton} onPress={() => void Linking.openURL(game.matchVideoUrl!)}>
            <Text style={styles.mediaButtonText}>YouTube</Text>
          </Pressable>
        ) : null}
        {game.matchProtocolUrl ? (
          <Pressable style={styles.mediaButton} onPress={() => void Linking.openURL(game.matchProtocolUrl!)}>
            <Text style={styles.mediaButtonText}>Protocol</Text>
          </Pressable>
        ) : null}
        {canEditMedia ? (
          <Pressable style={[styles.mediaButton, styles.mediaButtonGhost]} onPress={() => setEditing((value) => !value)}>
            <Text style={[styles.mediaButtonText, styles.mediaButtonGhostText]}>{editing ? 'Close edit' : 'Edit media'}</Text>
          </Pressable>
        ) : null}
      </View>

      {editing ? (
        <View style={styles.editPanel}>
          <TextInput
            style={styles.input}
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="YouTube replay URL"
            placeholderTextColor={theme.colors.muted}
          />
          <TextInput
            style={styles.input}
            value={protocolUrl}
            onChangeText={setProtocolUrl}
            placeholder="Protocol URL"
            placeholderTextColor={theme.colors.muted}
          />
          <Pressable
            style={styles.saveButton}
            onPress={() => {
              void onSaveMedia({ matchVideoUrl: videoUrl, matchProtocolUrl: protocolUrl }).then(() => setEditing(false));
            }}
          >
            <Text style={styles.saveButtonText}>Save media</Text>
          </Pressable>
        </View>
      ) : null}

      <CrewList title={t('games.referees')} members={('referees' in game ? game.referees : game.crew) || []} tone="ref" />
      <CrewList title={t('games.toCrew')} members={game.toCrew || []} tone="to" />
      <CrewList title={t('games.statCrew')} members={game.statisticCrew || []} tone="stat" />
    </View>
  );
}

export default function MyGamesScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { seasonId } = useSeason();
  const queryClient = useQueryClient();

  const gamesQuery = useQuery({
    queryKey: ['mobile-my-games', user?.id, seasonId],
    queryFn: () => getMyGames(user!, seasonId),
    enabled: Boolean(user),
  });

  const saveMatchMutation = useMutation({
    mutationFn: ({ nominationId, matchVideoUrl, matchProtocolUrl }: { nominationId: string; matchVideoUrl: string; matchProtocolUrl: string }) =>
      updateMobileMatchDetails(nominationId, {
        matchVideoUrl,
        matchProtocolUrl,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-games', user?.id, seasonId] });
    },
  });

  if (!user) {
    return <Redirect href="/login" />;
  }

  const instructorGames = gamesQuery.data?.instructorNominations || [];
  const assignmentGames = gamesQuery.data?.assignments || [];
  const canEditMedia = user.role === 'Instructor' || user.role === 'TO Supervisor';

  return (
    <ScreenShell
      user={user}
      title={t('games.title')}
      subtitle={user.role === 'Instructor' || user.role === 'TO Supervisor' ? t('games.instructorView') : t('games.assignmentView')}
      showSeasonSwitcher
    >
      {instructorGames.map((game) => (
        <MatchCard
          key={game.id}
          game={game}
          canEditMedia={canEditMedia}
          onSaveMedia={(payload) => saveMatchMutation.mutateAsync({ nominationId: game.id, ...payload }).then(() => undefined)}
          t={t}
        />
      ))}

      {assignmentGames.map((game) => (
        <MatchCard
          key={game.nominationId}
          game={game}
          assignmentLabel={game.assignmentLabel}
          status={game.status}
          canEditMedia={false}
          onSaveMedia={async () => {}}
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
  matchCard: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  gameCodeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(91,23,35,0.08)',
  },
  gameCodeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  assignmentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.warningSoft,
  },
  assignmentChipText: {
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: '900',
  },
  teamsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 24,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 16,
  },
  centerMeta: {
    alignItems: 'center',
    gap: 4,
  },
  vsText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  centerDate: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  metaGrid: {
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: 14,
    flex: 1,
  },
  feesBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 2,
  },
  feeText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  mediaButtonText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  mediaButtonGhost: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  mediaButtonGhostText: {
    color: theme.colors.text,
  },
  editPanel: {
    gap: 10,
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 14,
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryAccent,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  crewPanel: {
    borderRadius: 20,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 14,
    gap: 10,
  },
  crewTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  crewName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  statusChipText: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  crewEmpty: {
    color: theme.colors.muted,
    fontSize: 13,
  },
});
