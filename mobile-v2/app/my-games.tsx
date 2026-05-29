import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Alert, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';

import { Avatar } from '@/src/components/avatar';
import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { TeamBadge } from '@/src/components/team-badge';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { useSeason } from '@/src/providers/season-provider';
import {
  createMobileNomination,
  getMobileRefereeDirectory,
  getMobileReports,
  getMyGames,
  updateMobileMatchDetails,
} from '@/src/services/modules-service';
import { KNOWN_TEAM_OPTIONS, searchTeamOptions, splitTeams } from '@/src/services/team-logos';
import { theme } from '@/src/theme/theme';
import { MobileInstructorNomination, MobileRefereeDirectoryItem, MobileRefereeNomination } from '@/src/types/modules';
import { formatCurrency, formatDateLabel, formatTimeLabel } from '@/src/utils/format';

type ReportMode = 'standard' | 'to';

type ReportLookupItem = {
  nominationId: string;
  refereeId: string;
  refereeReportStatus: string | null;
  instructorReportStatus: string | null;
  reportMode?: ReportMode | null;
};

function getVisibleReportStatus(item: ReportLookupItem | null | undefined) {
  if (!item) {
    return null;
  }

  return item.instructorReportStatus || item.refereeReportStatus || null;
}

function CrewList({
  title,
  members,
  tone,
  reportLookup,
  reportMode,
  onOpenReport,
}: {
  title: string;
  members: { refereeId?: string; refereeName?: string; toId?: string; toName?: string; status: string }[];
  tone: 'ref' | 'to' | 'stat';
  reportLookup?: Map<string, ReportLookupItem>;
  reportMode?: ReportMode;
  onOpenReport?: (memberId: string, mode: ReportMode) => void;
}) {
  const toneColor = tone === 'ref' ? theme.colors.primary : tone === 'to' ? '#1a5f6a' : '#85520f';

  return (
    <View style={styles.crewPanel}>
      <Text style={[styles.crewTitle, { color: toneColor }]}>{title}</Text>
      {members.length ? (
        members.map((member, index) => {
          const memberId = member.refereeId || member.toId || '';
          const memberName = member.refereeName || member.toName || '-';
          const reportItem = memberId ? reportLookup?.get(memberId) || null : null;
          const reportStatus = getVisibleReportStatus(reportItem);
          const canOpenReport = Boolean(reportItem && memberId && onOpenReport && reportMode);

          return (
            <Pressable
              key={`${title}-${memberId || index}`}
              style={[styles.crewRow, canOpenReport ? styles.crewRowClickable : null]}
              disabled={!canOpenReport}
              onPress={() => {
                if (canOpenReport && memberId && reportMode && onOpenReport) {
                  onOpenReport(memberId, reportMode);
                }
              }}
            >
              <View style={styles.crewIdentity}>
                <Text style={styles.crewName}>{memberName}</Text>
                {reportStatus ? (
                  <View style={styles.reportStatusChip}>
                    <Text style={styles.reportStatusChipText}>{reportStatus}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.crewStateWrap}>
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipText}>{member.status}</Text>
                </View>
                {canOpenReport ? <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} /> : null}
              </View>
            </Pressable>
          );
        })
      ) : (
        <Text style={styles.crewEmpty}>No assignments yet</Text>
      )}
    </View>
  );
}

function RefereeSelect({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: MobileRefereeDirectoryItem[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const current = options.find((item) => item.id === value) || null;
  const filteredOptions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return options;
    }

    return options.filter((item) => {
      const haystack = `${item.fullName} ${item.licenseNumber || ''} ${item.email || ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, search]);

  return (
    <View style={styles.selectWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={styles.selectButton} onPress={() => setOpen((state) => !state)}>
        {current ? (
          <View style={styles.selectValueRow}>
            <Avatar photoUrl={current.photoUrl} fullName={current.fullName} size={34} />
            <Text style={styles.selectValueText}>{current.fullName}</Text>
          </View>
        ) : (
          <Text style={styles.selectPlaceholder}>Choose referee</Text>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.primary} />
      </Pressable>
      {open ? (
        <View style={styles.selectDropdown}>
          <TextInput
            style={styles.selectSearchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search referee"
            placeholderTextColor={theme.colors.muted}
          />
          <View style={styles.selectList}>
            {filteredOptions.map((option) => (
              <Pressable
                key={option.id}
                style={styles.selectOption}
                onPress={() => {
                  onSelect(option.id);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <Avatar photoUrl={option.photoUrl} fullName={option.fullName} size={34} />
                <View style={styles.selectOptionText}>
                  <Text style={styles.selectOptionName}>{option.fullName}</Text>
                  <Text style={styles.selectOptionMeta}>{option.licenseNumber}</Text>
                </View>
              </Pressable>
            ))}
            {!filteredOptions.length ? <Text style={styles.selectEmptyText}>No referees found.</Text> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function TeamSelect({
  label,
  value,
  onSelect,
  exclude,
}: {
  label: string;
  value: string;
  onSelect: (value: string) => void;
  exclude?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filteredOptions = useMemo(() => {
    const excluded = new Set((exclude || []).map((item) => item.trim()).filter(Boolean));
    const source = search.trim() ? searchTeamOptions(search) : KNOWN_TEAM_OPTIONS;
    return source.filter((item) => !excluded.has(item));
  }, [exclude, search]);

  return (
    <View style={styles.selectWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={styles.selectButton} onPress={() => setOpen((state) => !state)}>
        <Text style={value ? styles.selectValueText : styles.selectPlaceholder}>{value || 'Choose team'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.primary} />
      </Pressable>
      {open ? (
        <View style={styles.selectDropdown}>
          <TextInput
            style={styles.selectSearchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search team"
            placeholderTextColor={theme.colors.muted}
          />
          <View style={styles.selectList}>
            {filteredOptions.map((item) => (
              <Pressable
                key={item}
                style={styles.teamOption}
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <TeamBadge teamName={item} />
              </Pressable>
            ))}
            {!filteredOptions.length ? <Text style={styles.selectEmptyText}>No teams found.</Text> : null}
          </View>
        </View>
      ) : null}
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
  refereeReports,
  toReports,
  onOpenReport,
}: {
  game: MobileInstructorNomination | MobileRefereeNomination;
  assignmentLabel?: string;
  status?: string;
  t: (key: string) => string;
  canEditMedia: boolean;
  onSaveMedia: (payload: { matchVideoUrl: string; matchProtocolUrl: string }) => Promise<void>;
  refereeReports?: Map<string, ReportLookupItem>;
  toReports?: Map<string, ReportLookupItem>;
  onOpenReport?: (memberId: string, mode: ReportMode) => void;
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
          <Text style={styles.centerTime}>{formatTimeLabel(game.matchTime)}</Text>
        </View>
        <TeamBadge teamName={awayTeam || game.teams} />
      </View>

      <View style={styles.metaGrid}>
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

      <CrewList
        title={t('games.referees')}
        members={('referees' in game ? game.referees : game.crew) || []}
        tone="ref"
        reportLookup={refereeReports}
        reportMode="standard"
        onOpenReport={onOpenReport}
      />
      <CrewList
        title={t('games.toCrew')}
        members={game.toCrew || []}
        tone="to"
        reportLookup={toReports}
        reportMode="to"
        onOpenReport={onOpenReport}
      />
      <CrewList
        title={t('games.statCrew')}
        members={game.statisticCrew || []}
        tone="stat"
        reportLookup={toReports}
        reportMode="to"
        onOpenReport={onOpenReport}
      />
    </View>
  );
}

export default function MyGamesScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { seasonId } = useSeason();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [matchDateValue, setMatchDateValue] = useState<Date | null>(null);
  const [matchTimeValue, setMatchTimeValue] = useState<Date | null>(null);
  const [venue, setVenue] = useState('');
  const [slot1, setSlot1] = useState('');
  const [slot2, setSlot2] = useState('');
  const [slot3, setSlot3] = useState('');
  const [iosPickerMode, setIosPickerMode] = useState<'date' | 'time' | null>(null);

  const gamesQuery = useQuery({
    queryKey: ['mobile-my-games', user?.id, seasonId],
    queryFn: () => getMyGames(user!, seasonId),
    enabled: Boolean(user),
    staleTime: 30_000,
    retry: 2,
  });

  const refereeDirectoryQuery = useQuery({
    queryKey: ['mobile-referee-directory', user?.id],
    queryFn: () => getMobileRefereeDirectory(user!),
    enabled: Boolean(user?.role === 'Instructor'),
    staleTime: 60_000,
    retry: 2,
  });

  const standardReportsQuery = useQuery({
    queryKey: ['mobile-game-reports-standard', user?.id, seasonId],
    queryFn: () => getMobileReports(user!, seasonId, 'standard'),
    enabled: Boolean(user && (user.role === 'Instructor' || user.role === 'Staff')),
    staleTime: 30_000,
    retry: 2,
  });

  const toReportsQuery = useQuery({
    queryKey: ['mobile-game-reports-to', user?.id, seasonId],
    queryFn: () => getMobileReports(user!, seasonId, 'to'),
    enabled: Boolean(user && (user.role === 'Instructor' || user.role === 'TO Supervisor')),
    staleTime: 30_000,
    retry: 2,
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

  const createMatchMutation = useMutation({
    mutationFn: () =>
      createMobileNomination(user!, {
        gameCode,
        teams: `${homeTeam.trim()} - ${awayTeam.trim()}`,
        matchDate,
        matchTime,
        venue,
        refereeIds: [slot1, slot2, slot3].filter(Boolean),
        seasonId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile-my-games', user?.id, seasonId] });
      setShowCreateForm(false);
      setGameCode('');
      setHomeTeam('');
      setAwayTeam('');
      setMatchDate('');
      setMatchTime('');
      setMatchDateValue(null);
      setMatchTimeValue(null);
      setVenue('');
      setSlot1('');
      setSlot2('');
      setSlot3('');
      Alert.alert('Match created', 'The game was created and the assigned referees will receive notifications.');
    },
    onError: (error) => {
      Alert.alert('Could not create match', error instanceof Error ? error.message : 'Please try again.');
    },
  });

  const instructorGames = gamesQuery.data?.instructorNominations || [];
  const assignmentGames = gamesQuery.data?.assignments || [];
  const canEditMedia = user?.role === 'Instructor' || user?.role === 'TO Supervisor';
  const refereeOptions = refereeDirectoryQuery.data?.referees || [];

  const buildReportMap = (items: ReportLookupItem[] = []) =>
    items.reduce<Map<string, ReportLookupItem>>((map, item) => {
      map.set(`${item.nominationId}:${item.refereeId}`, item);
      return map;
    }, new Map());

  const standardReportMap = useMemo(
    () => buildReportMap((standardReportsQuery.data?.reports || []) as ReportLookupItem[]),
    [standardReportsQuery.data?.reports],
  );
  const toReportMap = useMemo(
    () => buildReportMap((toReportsQuery.data?.reports || []) as ReportLookupItem[]),
    [toReportsQuery.data?.reports],
  );

  if (!user) {
    return <Redirect href="/login" />;
  }

  const openNativeDatePicker = () => {
    const currentValue = matchDateValue || new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: currentValue,
        onChange: (_, selectedDate) => {
          if (!selectedDate) {
            return;
          }
          setMatchDateValue(selectedDate);
          setMatchDate(selectedDate.toISOString().slice(0, 10));
        },
      });
      return;
    }

    setIosPickerMode('date');
  };

  const openNativeTimePicker = () => {
    const currentValue = matchTimeValue || new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'time',
        is24Hour: true,
        value: currentValue,
        onChange: (_, selectedDate) => {
          if (!selectedDate) {
            return;
          }
          setMatchTimeValue(selectedDate);
          const hours = String(selectedDate.getHours()).padStart(2, '0');
          const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
          setMatchTime(`${hours}:${minutes}`);
        },
      });
      return;
    }

    setIosPickerMode('time');
  };

  const handleCreateMatch = () => {
    if (!gameCode.trim() || !homeTeam.trim() || !awayTeam.trim() || !matchDate.trim() || !matchTime.trim() || !venue.trim()) {
      Alert.alert('Missing fields', 'Fill in game code, teams, date, time and venue.');
      return;
    }

    if (homeTeam.trim() === awayTeam.trim()) {
      Alert.alert('Teams must be different', 'Choose two different teams.');
      return;
    }

    const refereeIds = [slot1, slot2, slot3].filter(Boolean);
    if (refereeIds.length !== 3) {
      Alert.alert('Referee crew required', 'Choose all three referee slots before creating the game.');
      return;
    }

    if (new Set(refereeIds).size !== refereeIds.length) {
      Alert.alert('Duplicate referee', 'Each referee slot must contain a different person.');
      return;
    }

    createMatchMutation.mutate();
  };

  const handleRefresh = () => {
    void Promise.all([
      gamesQuery.refetch(),
      refereeDirectoryQuery.refetch(),
      standardReportsQuery.refetch(),
      toReportsQuery.refetch(),
    ]);
  };

  return (
    <ScreenShell
      user={user}
      title={t('games.title')}
      subtitle={user.role === 'Instructor' || user.role === 'TO Supervisor' ? t('games.instructorView') : t('games.assignmentView')}
      showSeasonSwitcher
      refreshing={
        gamesQuery.isRefetching ||
        refereeDirectoryQuery.isRefetching ||
        standardReportsQuery.isRefetching ||
        toReportsQuery.isRefetching
      }
      onRefresh={handleRefresh}
    >
      {user.role === 'Instructor' ? (
        <View style={[sharedStyles.sectionCard, styles.createPanel]}>
          <View style={styles.createHeader}>
            <Text style={sharedStyles.sectionTitle}>Create match</Text>
            <Pressable style={styles.createToggleButton} onPress={() => setShowCreateForm((state) => !state)}>
              <Text style={styles.createToggleButtonText}>{showCreateForm ? 'Close' : 'New match'}</Text>
            </Pressable>
          </View>

          {showCreateForm ? (
            <View style={styles.createForm}>
              <TextInput style={styles.input} value={gameCode} onChangeText={setGameCode} placeholder="Game code" placeholderTextColor={theme.colors.muted} />
              <TeamSelect label="Home team" value={homeTeam} onSelect={setHomeTeam} exclude={[awayTeam]} />
              <TeamSelect label="Away team" value={awayTeam} onSelect={setAwayTeam} exclude={[homeTeam]} />
              <Pressable style={styles.selectButton} onPress={openNativeDatePicker}>
                <Text style={matchDate ? styles.selectValueText : styles.selectPlaceholder}>
                  {matchDate ? formatDateLabel(matchDate) : 'Choose match date'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
              </Pressable>
              <Pressable style={styles.selectButton} onPress={openNativeTimePicker}>
                <Text style={matchTime ? styles.selectValueText : styles.selectPlaceholder}>
                  {matchTime || 'Choose match time'}
                </Text>
                <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
              </Pressable>
              <TextInput style={styles.input} value={venue} onChangeText={setVenue} placeholder="Venue" placeholderTextColor={theme.colors.muted} />
              <RefereeSelect label="Referee 1" value={slot1} options={refereeOptions} onSelect={setSlot1} />
              <RefereeSelect label="Referee 2" value={slot2} options={refereeOptions.filter((item) => item.id !== slot1)} onSelect={setSlot2} />
              <RefereeSelect label="Referee 3" value={slot3} options={refereeOptions.filter((item) => item.id !== slot1 && item.id !== slot2)} onSelect={setSlot3} />
              <Pressable style={styles.saveButton} onPress={handleCreateMatch}>
                <Text style={styles.saveButtonText}>{createMatchMutation.isPending ? 'Creating...' : 'Create and send'}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {instructorGames.map((game) => (
        <MatchCard
          key={game.id}
          game={game}
          canEditMedia={canEditMedia}
          onSaveMedia={(payload) => saveMatchMutation.mutateAsync({ nominationId: game.id, ...payload }).then(() => undefined)}
          refereeReports={buildReportMap(
            (game.referees || []).map((member) => standardReportMap.get(`${game.id}:${member.refereeId}`)).filter(Boolean) as ReportLookupItem[],
          )}
          toReports={buildReportMap(
            [...(game.toCrew || []), ...(game.statisticCrew || [])]
              .map((member) => toReportMap.get(`${game.id}:${member.toId}`))
              .filter(Boolean) as ReportLookupItem[],
          )}
          onOpenReport={(memberId, mode) => router.push(`/reports/${game.id}/${memberId}?mode=${mode}` as never)}
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

      {Platform.OS === 'ios' && iosPickerMode ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setIosPickerMode(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{iosPickerMode === 'date' ? 'Choose date' : 'Choose time'}</Text>
                <Pressable onPress={() => setIosPickerMode(null)}>
                  <Text style={styles.modalDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                mode={iosPickerMode}
                value={iosPickerMode === 'date' ? matchDateValue || new Date() : matchTimeValue || new Date()}
                display="spinner"
                is24Hour
                onChange={(_, selectedDate) => {
                  if (!selectedDate) {
                    return;
                  }

                  if (iosPickerMode === 'date') {
                    setMatchDateValue(selectedDate);
                    setMatchDate(selectedDate.toISOString().slice(0, 10));
                    return;
                  }

                  setMatchTimeValue(selectedDate);
                  const hours = String(selectedDate.getHours()).padStart(2, '0');
                  const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
                  setMatchTime(`${hours}:${minutes}`);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  createPanel: {
    gap: 14,
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  createToggleButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createToggleButtonText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  createForm: {
    gap: 10,
  },
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
  centerTime: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
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
  selectWrap: {
    gap: 6,
  },
  inputLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  selectButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectValueText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  selectPlaceholder: {
    color: theme.colors.muted,
    fontSize: 14,
    flex: 1,
  },
  selectDropdown: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.card,
    overflow: 'hidden',
    gap: 10,
    padding: 10,
  },
  selectSearchInput: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    paddingHorizontal: 12,
    color: theme.colors.text,
    fontSize: 14,
  },
  selectList: {
    maxHeight: 240,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.canvasAlt,
  },
  teamOption: {
    paddingVertical: 4,
  },
  selectOptionText: {
    flex: 1,
    gap: 2,
  },
  selectOptionName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  selectOptionMeta: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  selectEmptyText: {
    color: theme.colors.muted,
    fontSize: 13,
    paddingVertical: 12,
    textAlign: 'center',
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
    paddingVertical: 2,
  },
  crewRowClickable: {
    borderRadius: 14,
    backgroundColor: 'rgba(91,23,35,0.04)',
    paddingHorizontal: 8,
  },
  crewIdentity: {
    flex: 1,
    gap: 6,
  },
  crewName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  reportStatusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.successSoft,
  },
  reportStatusChipText: {
    color: theme.colors.success,
    fontSize: 10,
    fontWeight: '900',
  },
  crewStateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,16,18,0.28)',
  },
  modalSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  modalDone: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
});
