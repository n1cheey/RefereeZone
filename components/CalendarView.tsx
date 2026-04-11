import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Shield } from 'lucide-react';
import { InstructorNomination, RefereeNomination, User } from '../types';
import Layout from './Layout';
import { useI18n } from '../i18n';
import {
  getInstructorDashboard,
  getInstructorNominations,
  getRefereeNominations,
} from '../services/nominationService';
import { consumeNavigationIntent } from '../services/navigationIntent';
import { getMatchTimestamp, isPastMatch } from '../matchTiming';
import { isViewCacheFresh, readViewCache, writeViewCache } from '../services/viewCache';

interface CalendarViewProps {
  user: User;
  onBack: () => void;
}

interface CalendarMatchItem {
  id: string;
  gameCode: string;
  teams: string;
  matchDate: string;
  matchTime: string;
  venue: string;
  assignmentLabel: string | null;
}

const CALENDAR_CACHE_MAX_AGE_MS = 20000;
const getCalendarCacheKey = (userId: string) => `calendar:view:${userId}`;

const padNumber = (value: number) => String(value).padStart(2, '0');

const toDateKey = (value: Date) =>
  `${value.getFullYear()}-${padNumber(value.getMonth() + 1)}-${padNumber(value.getDate())}`;

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

const sortMatchesAsc = <T extends { matchDate: string; matchTime: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftTime = getMatchTimestamp(left.matchDate, left.matchTime) ?? 0;
    const rightTime = getMatchTimestamp(right.matchDate, right.matchTime) ?? 0;
    return leftTime - rightTime;
  });

const mapInstructorNomination = (nomination: InstructorNomination): CalendarMatchItem => ({
  id: nomination.id,
  gameCode: nomination.gameCode,
  teams: nomination.teams,
  matchDate: nomination.matchDate,
  matchTime: nomination.matchTime,
  venue: nomination.venue,
  assignmentLabel: null,
});

const mapAssignmentNomination = (nomination: RefereeNomination): CalendarMatchItem => ({
  id: nomination.nominationId,
  gameCode: nomination.gameCode,
  teams: nomination.teams,
  matchDate: nomination.matchDate,
  matchTime: nomination.matchTime,
  venue: nomination.venue,
  assignmentLabel: nomination.assignmentLabel,
});

const CalendarView: React.FC<CalendarViewProps> = ({ user, onBack }) => {
  const { locale, t } = useI18n();
  const cacheKey = getCalendarCacheKey(user.id);
  const [matches, setMatches] = useState<CalendarMatchItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    let isMounted = true;
    const cached = readViewCache<CalendarMatchItem[]>(cacheKey);
    const hasFreshCache = isViewCacheFresh(cacheKey, CALENDAR_CACHE_MAX_AGE_MS);

    if (cached) {
      setMatches(sortMatchesAsc(cached));
      setIsLoading(false);
    }

    const loadCalendar = async () => {
      if (!cached) {
        setIsLoading(true);
      }

      try {
        let nextMatches: CalendarMatchItem[] = [];

        if (user.role === 'Instructor' || user.role === 'TO Supervisor') {
          const response = await getInstructorDashboard(user.id);
          nextMatches = response.nominations.map(mapInstructorNomination);
        } else if (user.role === 'Staff') {
          const response = await getInstructorNominations(user.id);
          nextMatches = response.nominations.map(mapInstructorNomination);
        } else {
          const response = await getRefereeNominations(user.id);
          nextMatches = response.nominations.map(mapAssignmentNomination);
        }

        if (!isMounted) {
          return;
        }

        const sortedMatches = sortMatchesAsc(nextMatches);
        setMatches(sortedMatches);
        writeViewCache(cacheKey, sortedMatches);
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Failed to load calendar.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!hasFreshCache) {
      void loadCalendar();
    }

    return () => {
      isMounted = false;
    };
  }, [cacheKey, user.id, user.role]);

  useEffect(() => {
    const intent = consumeNavigationIntent('calendar');
    if (!intent?.targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(intent.targetDate)) {
      return;
    }

    const nextDate = new Date(`${intent.targetDate}T00:00:00`);
    setSelectedDate(intent.targetDate);
    setMonthAnchor(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  }, []);

  const matchesByDate = useMemo(() => {
    return matches.reduce<Record<string, CalendarMatchItem[]>>((accumulator, match) => {
      if (!accumulator[match.matchDate]) {
        accumulator[match.matchDate] = [];
      }
      accumulator[match.matchDate].push(match);
      return accumulator;
    }, {});
  }, [matches]);

  const monthMatches = useMemo(
    () =>
      sortMatchesAsc(
        matches.filter((match) => {
          const timestamp = getMatchTimestamp(match.matchDate, match.matchTime);
          if (timestamp === null) {
            return false;
          }

          return isSameMonth(new Date(timestamp), monthAnchor);
        }),
      ),
    [matches, monthAnchor],
  );

  useEffect(() => {
    const selectedDateValue = new Date(`${selectedDate}T00:00:00`);
    if (isSameMonth(selectedDateValue, monthAnchor)) {
      return;
    }

    if (monthMatches.length > 0) {
      setSelectedDate(monthMatches[0].matchDate);
      return;
    }

    setSelectedDate(toDateKey(monthAnchor));
  }, [monthAnchor, monthMatches, selectedDate]);

  const selectedDateMatches = useMemo(
    () => sortMatchesAsc(matchesByDate[selectedDate] || []),
    [matchesByDate, selectedDate],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
      }).format(monthAnchor),
    [locale, monthAnchor],
  );

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const mondayReference = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(mondayReference);
      day.setDate(mondayReference.getDate() + index);
      return formatter.format(day);
    });
  }, [locale]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const mondayAlignedOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - mondayAlignedOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const current = new Date(gridStart);
      current.setDate(gridStart.getDate() + index);
      const dateKey = toDateKey(current);
      const dayMatches = matchesByDate[dateKey] || [];

      return {
        date: current,
        dateKey,
        isCurrentMonth: isSameMonth(current, monthAnchor),
        isToday: dateKey === toDateKey(new Date()),
        isSelected: dateKey === selectedDate,
        count: dayMatches.length,
      };
    });
  }, [matchesByDate, monthAnchor, selectedDate]);

  const formatSelectedDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));

  return (
    <Layout title={t('calendar.title')} onBack={onBack}>
      {errorMessage ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr),minmax(320px,0.9fr)]">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <CalendarDays size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('calendar.monthView')}</h2>
                <p className="text-sm text-slate-500">{monthLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setMonthAnchor((previous) => new Date(previous.getFullYear(), previous.getMonth() - 1, 1))}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-white"
                aria-label="Previous month"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setMonthAnchor((previous) => new Date(previous.getFullYear(), previous.getMonth() + 1, 1))}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-white"
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => (
              <button
                key={day.dateKey}
                onClick={() => setSelectedDate(day.dateKey)}
                className={`min-h-[84px] rounded-2xl border px-2 py-2 text-left transition sm:min-h-[96px] sm:px-3 ${
                  day.isSelected
                    ? 'border-sky-300 bg-sky-50 shadow-sm'
                    : day.isCurrentMonth
                      ? 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
                      : 'border-slate-100 bg-slate-50/40 text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-sm font-bold sm:text-base ${
                      day.isToday
                        ? 'text-sky-700'
                        : day.isCurrentMonth
                          ? 'text-slate-900'
                          : 'text-slate-300'
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                  {day.count > 0 ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#57131b] px-2 py-1 text-[11px] font-bold text-white">
                      {day.count}
                    </span>
                  ) : null}
                </div>
                {day.count > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {Array.from({ length: Math.min(day.count, 3) }).map((_, index) => (
                      <span key={`${day.dateKey}-${index}`} className="h-2 w-2 rounded-full bg-amber-400" />
                    ))}
                  </div>
                ) : null}
              </button>
            ))}
          </div>

          {!isLoading && monthMatches.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              {t('calendar.noGamesInMonth')}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <CalendarDays size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('calendar.selectedDate')}</h2>
              <p className="text-sm text-slate-500">{formatSelectedDate(selectedDate)}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              {t('common.loading')}
            </div>
          ) : selectedDateMatches.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              {t('calendar.noGames')}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {selectedDateMatches.map((match) => {
                const isPast = isPastMatch(match.matchDate, match.matchTime);
                return (
                  <div
                    key={`${match.id}-${match.gameCode}-${match.assignmentLabel || 'all'}`}
                    className={`rounded-2xl border p-4 ${
                      isPast ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                          {match.gameCode}
                        </div>
                        <div className="mt-1 text-base font-bold text-slate-900">{match.teams}</div>
                      </div>
                      <div
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          isPast ? 'bg-white text-slate-600' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isPast ? t('calendar.past') : t('calendar.upcoming')}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock size={15} className="text-amber-500" />
                        <span>{match.matchTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={15} className="text-rose-500" />
                        <span>{match.venue}</span>
                      </div>
                      {match.assignmentLabel ? (
                        <div className="flex items-center gap-2">
                          <Shield size={15} className="text-sky-600" />
                          <span>{match.assignmentLabel}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default CalendarView;
