import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';

import { ScreenShell, sharedStyles } from '@/src/components/screen-shell';
import { useAuth } from '@/src/providers/auth-provider';
import { useLanguage } from '@/src/providers/language-provider';
import { getAllMobileGames } from '@/src/services/modules-service';
import { theme } from '@/src/theme/theme';
import { formatDateLabel, formatMonthYearLabel, formatTimeLabel } from '@/src/utils/format';

const pad = (value: number) => String(value).padStart(2, '0');
const toDateKey = (value: Date) => `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;

export default function CalendarScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [monthAnchor, setMonthAnchor] = useState(new Date(2026, 8, 1));
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date(2026, 8, 1)));

  const calendarQuery = useQuery({
    queryKey: ['mobile-calendar-all', user?.id],
    queryFn: () => getAllMobileGames(user!, null),
    enabled: Boolean(user),
  });

  const days = useMemo(() => {
    const games = calendarQuery.data || [];
    const gamesByDate = games.reduce<Record<string, typeof games>>((accumulator, game) => {
      if (!accumulator[game.matchDate]) {
        accumulator[game.matchDate] = [];
      }
      accumulator[game.matchDate].push(game);
      return accumulator;
    }, {});
    const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = toDateKey(date);
      return {
        key,
        date,
        inMonth: date.getMonth() === monthAnchor.getMonth(),
        count: (gamesByDate[key] || []).length,
      };
    });
  }, [calendarQuery.data, monthAnchor]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  const games = calendarQuery.data || [];
  const gamesByDate = games.reduce<Record<string, typeof games>>((accumulator, game) => {
    if (!accumulator[game.matchDate]) {
      accumulator[game.matchDate] = [];
    }
    accumulator[game.matchDate].push(game);
    return accumulator;
  }, {});

  const selectedGames = (gamesByDate[selectedDate] || []).sort((left, right) => left.matchTime.localeCompare(right.matchTime));

  return (
    <ScreenShell user={user} title={t('calendar.title')} subtitle="All games calendar">
      <View style={[sharedStyles.sectionCard, styles.calendarCard]}>
        <View style={styles.monthRow}>
          <Pressable style={styles.monthButton} onPress={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}>
            <Text style={styles.monthButtonText}>Prev</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{formatMonthYearLabel(monthAnchor)}</Text>
          <Pressable style={styles.monthButton} onPress={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}>
            <Text style={styles.monthButtonText}>Next</Text>
          </Pressable>
        </View>

        <View style={styles.weekHeader}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <Text key={day} style={styles.weekHeaderText}>{day}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {days.map((day) => {
            const active = day.key === selectedDate;
            return (
              <Pressable key={day.key} style={[styles.dayCell, active ? styles.dayCellActive : null]} onPress={() => setSelectedDate(day.key)}>
                <Text style={[styles.dayNumber, !day.inMonth ? styles.dayMuted : null, active ? styles.dayNumberActive : null]}>
                  {day.date.getDate()}
                </Text>
                {day.count ? (
                  <Text style={[styles.dayCount, active ? styles.dayCountActive : null]}>{day.count}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[sharedStyles.sectionCard, styles.listCard]}>
        <Text style={sharedStyles.sectionTitle}>Selected date: {selectedDate}</Text>
        {selectedGames.length ? (
          selectedGames.map((game) => (
            <View key={game.id} style={styles.gameRow}>
              <Text style={styles.gameCode}>{game.gameCode}</Text>
              <Text style={styles.gameTeams}>{game.teams}</Text>
              <Text style={styles.gameMeta}>
                {formatDateLabel(game.matchDate)} at {formatTimeLabel(game.matchTime)}
              </Text>
              <Text style={styles.gameMeta}>{game.venue}</Text>
            </View>
          ))
        ) : (
          <Text style={sharedStyles.muted}>{t('common.noData')}</Text>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    gap: 18,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    minWidth: 84,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  monthTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekHeaderText: {
    width: '13%',
    textAlign: 'center',
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCell: {
    width: '12.9%',
    aspectRatio: 0.82,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvasAlt,
  },
  dayCellActive: {
    backgroundColor: theme.colors.primary,
  },
  dayNumber: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  dayNumberActive: {
    color: theme.colors.white,
  },
  dayMuted: {
    color: '#b7afa8',
  },
  dayCount: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  dayCountActive: {
    color: 'rgba(255,255,255,0.78)',
  },
  listCard: {
    gap: 14,
  },
  gameRow: {
    borderRadius: 20,
    backgroundColor: theme.colors.canvasAlt,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: 14,
    gap: 6,
  },
  gameCode: {
    color: theme.colors.primaryAccent,
    fontSize: 12,
    fontWeight: '900',
  },
  gameTeams: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 24,
  },
  gameMeta: {
    color: theme.colors.muted,
    fontSize: 14,
  },
});
