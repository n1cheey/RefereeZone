import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClockPlus,
  Calendar,
  CheckCircle2,
  Clock,
  Clock3,
  FileSpreadsheet,
  FileWarning,
  FileBarChart2,
  MapPin,
  Pencil,
  RadioTower,
  Trophy,
  Users,
  Youtube,
} from 'lucide-react';
import Layout from './Layout';
import MatchTeamsHeader from './MatchTeamsHeader';
import {
  getCanonicalVenueName,
  getDisplayGameCode,
  getDisplayMatchTeams,
  getDisplayPersonName,
} from '../teamLogos';
import { consumeNavigationIntent, setNavigationIntent } from '../services/navigationIntent';
import {
  RankingPerformanceEntry,
  ReportListItem,
  ReportMode,
  TONominationSlot,
  UnifiedMatchRecord,
  User,
} from '../types';
import { useSeason } from '../services/seasonContext';
import { getReports } from '../services/reportsService';
import {
  getRankingAdminData,
  getRankingDashboard,
  getTORankingAdminData,
  getTORankingDashboard,
} from '../services/rankingService';
import { getNominationSlotLabel, getStatisticSlotLabel, getTOSlotLabel } from '../slotLabels';
import { getAssignmentStatusLabel, getReportStatusLabel, useI18n } from '../i18n';
import { readViewCache, writeViewCache } from '../services/viewCache';
import { loadUnifiedMatchesForUser, sortUnifiedMatchesDesc } from '../services/matchData';

interface MatchCenterProps {
  user: User;
  onBack: () => void;
  onNavigate: (view: 'dashboard' | 'nominations' | 'reports') => void;
}

type MatchCenterMatch = UnifiedMatchRecord;

interface MatchCenterCache {
  matches: MatchCenterMatch[];
  standardReports: ReportListItem[];
  toReports: ReportListItem[];
  testReports: ReportListItem[];
  refereePerformanceEntries: RankingPerformanceEntry[];
  toPerformanceEntries: RankingPerformanceEntry[];
}

const getMatchCenterCacheKey = (userId: string, role: User['role'], seasonId: string) => `match-center:${userId}:${role}:${seasonId}`;

const formatFee = (value: number | null | undefined) => (value == null ? 'Not set' : `AZN ${Math.round(value)}`);
const MATCHES_PER_PAGE = 6;

const getMatchStartAt = (matchDate: string, matchTime: string) => {
  const normalizedTime = (matchTime || '00:00:00').slice(0, 8);
  const parsed = new Date(`${matchDate}T${normalizedTime}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
};

const hasReportContent = (item: ReportListItem | undefined) => Boolean(item?.refereeReportStatus || item?.instructorReportStatus);
const hasOwnReportStarted = (item: ReportListItem | undefined) => Boolean(item?.refereeReportStatus);
const shouldShowOverdueAddTime = (item: ReportListItem | undefined) => Boolean(item?.deadlineExceeded && !item?.refereeReportStatus);
const shouldRenderReportIndicator = (item: ReportListItem | undefined, status: string) =>
  shouldShowOverdueAddTime(item) || hasOwnReportStarted(item) || status === 'Reviewed';

const getReportDisplayStatus = (item: ReportListItem | undefined) =>
  item?.instructorReportStatus || item?.refereeReportStatus || 'No Report';

const getReportStatusIcon = (status: string) => {
  if (status === 'Reviewed') {
    return <CheckCircle2 size={14} className="text-emerald-600" />;
  }

  if (status === 'Submitted' || status === 'Draft') {
    return <Clock3 size={14} className="text-sky-600" />;
  }

  return <FileWarning size={14} className="text-amber-600" />;
};

const renderReportActionIcon = (
  reportItem: ReportListItem | undefined,
  reportStatus: string,
) => {
  if (shouldShowOverdueAddTime(reportItem)) {
    return <AlarmClockPlus size={14} className="text-red-600" />;
  }

  return getReportStatusIcon(reportStatus);
};

const getReportActionShell = (reportItem: ReportListItem | undefined, reportStatus: string) => {
  if (shouldShowOverdueAddTime(reportItem)) {
    return 'border-red-200 bg-red-50';
  }

  return getReportStatusIconShell(reportStatus);
};

const getReportStatusIconShell = (status: string) => {
  if (status === 'Reviewed') {
    return 'border-emerald-200 bg-emerald-50';
  }

  if (status === 'Submitted' || status === 'Draft') {
    return 'border-sky-200 bg-sky-50';
  }

  return 'border-amber-200 bg-amber-50';
};

const MatchCenter: React.FC<MatchCenterProps> = ({ user, onBack, onNavigate }) => {
  const { activeSeasonId, activeSeason } = useSeason();
  const { language } = useI18n();
  const [matches, setMatches] = useState<MatchCenterMatch[]>([]);
  const [selectedNominationId, setSelectedNominationId] = useState('');
  const [standardReports, setStandardReports] = useState<ReportListItem[]>([]);
  const [toReports, setTOReports] = useState<ReportListItem[]>([]);
  const [testReports, setTestReports] = useState<ReportListItem[]>([]);
  const [refereePerformanceEntries, setRefereePerformanceEntries] = useState<RankingPerformanceEntry[]>([]);
  const [toPerformanceEntries, setTOPerformanceEntries] = useState<RankingPerformanceEntry[]>([]);
  const [matchesPage, setMatchesPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    const cacheKey = getMatchCenterCacheKey(user.id, user.role, activeSeasonId);
    const intent = consumeNavigationIntent('matchCenter');
    const requestedNominationId = intent?.targetId || '';
    const cached = readViewCache<MatchCenterCache>(cacheKey);

    if (cached) {
      setMatches(cached.matches);
      setStandardReports(cached.standardReports);
      setTOReports(cached.toReports);
      setTestReports(cached.testReports);
      setRefereePerformanceEntries(cached.refereePerformanceEntries);
      setTOPerformanceEntries(cached.toPerformanceEntries);
      const firstMatch = cached.matches[0];
      setSelectedNominationId(
        requestedNominationId ||
          cached.matches.find((item) => item.nominationId === requestedNominationId)?.nominationId ||
          firstMatch?.nominationId ||
          '',
      );
      setIsLoading(false);
    }

    const safeLoadReports = async (mode: ReportMode) => {
      try {
        const response = await getReports(user.id, mode, activeSeasonId);
        return response.reports;
      } catch {
        return [];
      }
    };

    const load = async () => {
      if (!cached) {
        setIsLoading(true);
      }

      try {
        const loadedMatches = await loadUnifiedMatchesForUser(user, activeSeasonId);

        const [
          nextStandardReports,
          nextTOReports,
          nextTestReports,
          rankingRefereeEntries,
          rankingTOEntries,
        ] = await Promise.all([
          user.role === 'Instructor' || user.role === 'Staff' || user.role === 'Referee'
            ? safeLoadReports('standard')
            : Promise.resolve([]),
          user.role === 'Instructor' || user.role === 'TO Supervisor' || user.role === 'TO'
            ? safeLoadReports('to')
            : Promise.resolve([]),
          user.role === 'Instructor' ? safeLoadReports('test_to') : Promise.resolve([]),
          (async () => {
            try {
              if (user.role === 'Instructor' || user.role === 'Staff') {
                const response = await getRankingAdminData(user.id, activeSeasonId);
                return response.performanceEntries;
              }
              if (user.role === 'Referee') {
                const response = await getRankingDashboard(user.id, activeSeasonId);
                return response.performanceEntries;
              }
              return [];
            } catch {
              return [];
            }
          })(),
          (async () => {
            try {
              if (user.role === 'Instructor' || user.role === 'TO Supervisor') {
                const response = await getTORankingAdminData(user.id, activeSeasonId);
                return response.performanceEntries;
              }
              if (user.role === 'TO') {
                const response = await getTORankingDashboard(user.id, activeSeasonId);
                return response.performanceEntries;
              }
              return [];
            } catch {
              return [];
            }
          })(),
        ]);

        if (!isMounted) {
          return;
        }

        const sortedMatches = sortUnifiedMatchesDesc(loadedMatches);
        const nextSelectedNominationId =
          sortedMatches.find((item) => item.nominationId === requestedNominationId)?.nominationId ||
          sortedMatches[0]?.nominationId ||
          '';
        const nextSelectedIndex = sortedMatches.findIndex((item) => item.nominationId === nextSelectedNominationId);

        setMatches(sortedMatches);
        setSelectedNominationId(nextSelectedNominationId);
        setMatchesPage(nextSelectedIndex >= 0 ? Math.floor(nextSelectedIndex / MATCHES_PER_PAGE) : 0);
        setStandardReports(nextStandardReports);
        setTOReports(nextTOReports);
        setTestReports(nextTestReports);
        setRefereePerformanceEntries(rankingRefereeEntries);
        setTOPerformanceEntries(rankingTOEntries);
        setErrorMessage('');
        writeViewCache<MatchCenterCache>(cacheKey, {
          matches: sortedMatches,
          standardReports: nextStandardReports,
          toReports: nextTOReports,
          testReports: nextTestReports,
          refereePerformanceEntries: rankingRefereeEntries,
          toPerformanceEntries: rankingTOEntries,
        });
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load match center.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [activeSeasonId, user.id, user.role]);

  const selectedMatch = useMemo(
    () => matches.find((item) => item.nominationId === selectedNominationId) || matches[0] || null,
    [matches, selectedNominationId],
  );
  const totalMatchPages = Math.max(1, Math.ceil(matches.length / MATCHES_PER_PAGE));
  const visibleMatches = useMemo(
    () => matches.slice(matchesPage * MATCHES_PER_PAGE, matchesPage * MATCHES_PER_PAGE + MATCHES_PER_PAGE),
    [matches, matchesPage],
  );

  const reportSummary = useMemo(() => {
    if (!selectedMatch) {
      return { standard: [], to: [], test: [] };
    }

    const selectedGameCode = getDisplayGameCode(selectedMatch.gameCode);
    const belongsToSelectedMatch = (item: ReportListItem) =>
      item.nominationId === selectedMatch.nominationId || getDisplayGameCode(item.gameCode) === selectedGameCode;

    return {
      standard: standardReports.filter(belongsToSelectedMatch),
      to: toReports.filter(belongsToSelectedMatch),
      test: testReports.filter(belongsToSelectedMatch),
    };
  }, [selectedMatch, standardReports, testReports, toReports]);

  const refereeRankingEntriesForMatch = useMemo(
    () => (selectedMatch ? refereePerformanceEntries.filter((item) => item.gameCode === selectedMatch.gameCode) : []),
    [refereePerformanceEntries, selectedMatch],
  );
  const toRankingEntriesForMatch = useMemo(
    () => (selectedMatch ? toPerformanceEntries.filter((item) => item.gameCode === selectedMatch.gameCode) : []),
    [selectedMatch, toPerformanceEntries],
  );

  const hasMatchStarted = useMemo(() => {
    if (!selectedMatch) {
      return false;
    }

    const matchStartAt = getMatchStartAt(selectedMatch.matchDate, selectedMatch.matchTime);
    return matchStartAt != null && matchStartAt <= Date.now();
  }, [selectedMatch]);

  const standardReportMap = useMemo(
    () => new Map(reportSummary.standard.map((item) => [item.refereeId, item])),
    [reportSummary.standard],
  );
  const toReportMap = useMemo(() => new Map(reportSummary.to.map((item) => [item.refereeId, item])), [reportSummary.to]);

  const renderStatusChip = (status: string) => (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
      {getAssignmentStatusLabel(status, language)}
    </span>
  );

  const openMatchReport = (mode: ReportMode, nominationId: string, refereeId: string) => {
    setNavigationIntent({
      view: 'reports',
      targetId: nominationId,
      targetRefereeId: refereeId,
      reportMode: mode,
    });
    onNavigate('reports');
  };

  const openMatchEdit = (nominationId: string) => {
    setNavigationIntent({
      view: 'nominations',
      targetId: nominationId,
      targetAction: 'edit',
    });
    onNavigate('nominations');
  };

  if (isLoading) {
    return (
      <Layout title="Match Center" onBack={onBack}>
        <p className="text-sm text-slate-500">Loading game overview...</p>
      </Layout>
    );
  }

  if (!selectedMatch) {
    return (
      <Layout title="Match Center" onBack={onBack}>
        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        ) : null}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No games were found for this season.
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Match Center" onBack={onBack}>
      {errorMessage ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      <div className="mb-6 grid gap-4 xl:items-start xl:grid-cols-[320px,minmax(0,1fr)]">
        <aside className="self-start rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Season Games</div>
          <div className="mt-3 text-lg font-black text-slate-900">{activeSeason.label}</div>
            <div className="mt-4 space-y-2">
            {visibleMatches.map((match) => (
              <button
                key={match.nominationId}
                onClick={() => setSelectedNominationId(match.nominationId)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedMatch.nominationId === match.nominationId ? 'border-[#57131b] bg-[#57131b]/5' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="rz-game-code text-xs uppercase text-[#57131b]">{getDisplayGameCode(match.gameCode)}</div>
                <div className="mt-1 font-bold text-slate-900">{getDisplayMatchTeams(match.teams)}</div>
                <div className="mt-1 text-sm text-slate-500">{`${match.matchDate} | ${match.matchTime}`}</div>
              </button>
            ))}
          </div>
          {totalMatchPages > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <button
                type="button"
                onClick={() => setMatchesPage((prev) => Math.max(0, prev - 1))}
                disabled={matchesPage === 0}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {matchesPage + 1} / {totalMatchPages}
              </div>
              <button
                type="button"
                onClick={() => setMatchesPage((prev) => Math.min(totalMatchPages - 1, prev + 1))}
                disabled={matchesPage >= totalMatchPages - 1}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </aside>

        <section className="space-y-4">
          <div className="overflow-hidden rounded-[30px] border border-[#57131b]/10 bg-[linear-gradient(145deg,#fff9f4_0%,#fffefc_40%,#f7f9fc_100%)] shadow-[0_24px_60px_rgba(87,19,27,0.10)]">
            <div className="border-b border-[#57131b]/10 px-6 py-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-[#57131b] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                  Game Overview
                </span>
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">
                  {activeSeason.shortLabel}
                </span>
                {selectedMatch.assignmentLabel ? (
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800">
                    {selectedMatch.assignmentLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <div className="rz-game-code text-xs uppercase tracking-[0.18em] text-[#8e6570]">{getDisplayGameCode(selectedMatch.gameCode)}</div>
                <MatchTeamsHeader teams={selectedMatch.teams} className="mt-2" titleClassName="text-2xl font-black text-slate-950 sm:text-3xl" />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {selectedMatch.matchVideoUrl ? (
                      <a
                        href={selectedMatch.matchVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open match video"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#57131b]/15 bg-white text-[#57131b] transition hover:border-[#57131b]/30 hover:bg-[#57131b]/5"
                      >
                        <Youtube size={18} />
                      </a>
                    ) : null}
                    {selectedMatch.matchProtocolUrl ? (
                      <a
                        href={selectedMatch.matchProtocolUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open scoresheet"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        <FileSpreadsheet size={18} />
                      </a>
                    ) : null}
                  </div>
                  {(user.role === 'Instructor' || user.role === 'Staff') && selectedMatch.source === 'instructor' ? (
                    <button
                      type="button"
                      onClick={() => openMatchEdit(selectedMatch.nominationId)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#57131b]/15 bg-white px-4 py-3 text-sm font-bold text-[#57131b] transition hover:border-[#57131b]/30 hover:bg-[#57131b]/5"
                    >
                      <Pencil size={16} />
                      Edit Match
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <Calendar size={16} className="text-[#f97316]" />
                    {selectedMatch.matchDate}
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <Clock size={16} className="text-[#f97316]" />
                    {selectedMatch.matchTime}
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <MapPin size={16} className="text-[#f97316]" />
                    {getCanonicalVenueName(selectedMatch.venue)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 px-6 py-5 md:grid-cols-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Final Score</div>
                <div className="mt-3 text-2xl font-black text-slate-950">{selectedMatch.finalScore || 'Pending'}</div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">Ref Fee</div>
                <div className="mt-3 text-2xl font-black text-slate-950">{formatFee(selectedMatch.refereeFee)}</div>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">TO Fee</div>
                <div className="mt-3 text-2xl font-black text-slate-950">{formatFee(selectedMatch.toFee)}</div>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">Operator</div>
                <div className="rz-ui-text mt-3 text-sm font-bold text-slate-950">
                  {getDisplayPersonName(selectedMatch.createdByName || selectedMatch.instructorName || 'League Office')}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
            <div className="space-y-4">
              <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-[#57131b]" />
                  <h3 className="text-base font-black text-slate-900">Referee Crew</h3>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {selectedMatch.referees.map((official) => {
                    const reportItem = standardReportMap.get(official.refereeId);
                    const reportStatus = getReportDisplayStatus(reportItem);
                    const canOpenReport = hasReportContent(reportItem);
                    const shouldShowIndicator = shouldRenderReportIndicator(reportItem, reportStatus);

                    return (
                    <div key={`${selectedMatch.nominationId}-${official.slotNumber}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{getNominationSlotLabel(official.slotNumber, language)}</div>
                      <div className="mt-2 flex items-start justify-between gap-3">
                        {canOpenReport ? (
                          <button
                            type="button"
                            onClick={() => openMatchReport('standard', selectedMatch.nominationId, official.refereeId)}
                            className="rz-ui-text text-left text-sm font-black text-slate-950 transition hover:text-[#57131b] hover:underline"
                          >
                            {getDisplayPersonName('refereeName' in official ? official.refereeName : '')}
                          </button>
                        ) : (
                          <div className="rz-ui-text text-sm font-black text-slate-950">{getDisplayPersonName('refereeName' in official ? official.refereeName : '')}</div>
                        )}
                        {shouldShowIndicator && canOpenReport ? (
                          <button
                            type="button"
                            onClick={() => openMatchReport('standard', selectedMatch.nominationId, official.refereeId)}
                            title={
                              shouldShowOverdueAddTime(reportItem)
                                ? reportItem.deadlineMessage || 'Report deadline exceeded'
                                : `Report: ${getReportStatusLabel(reportStatus, language)}`
                            }
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition hover:scale-[1.03] ${getReportActionShell(reportItem, reportStatus)}`}
                          >
                            {renderReportActionIcon(reportItem, reportStatus)}
                          </button>
                        ) : shouldShowIndicator ? (
                          <span
                            title={`Report: ${getReportStatusLabel(reportStatus, language)}`}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${getReportActionShell(reportItem, reportStatus)}`}
                          >
                            {renderReportActionIcon(reportItem, reportStatus)}
                          </span>
                        ) : null}
                      </div>
                      {!hasMatchStarted || official.status !== 'Accepted' ? <div className="mt-2">{renderStatusChip(official.status)}</div> : null}
                    </div>
                  )})}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <RadioTower size={18} className="text-[#57131b]" />
                  <h3 className="text-base font-black text-slate-900">Table Crew</h3>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">TO Crew</div>
                    <div className="mt-3 space-y-2">
                      {[1, 2, 3, 4].map((slotNumber) => {
                        const toSlot = selectedMatch.toCrew.find((item) => item.slotNumber === slotNumber);
                        const reportItem = toSlot ? toReportMap.get(toSlot.toId) : undefined;
                        const reportStatus = getReportDisplayStatus(reportItem);
                        const canOpenReport = Boolean(toSlot) && hasReportContent(reportItem);
                        const shouldShowIndicator = shouldRenderReportIndicator(reportItem, reportStatus);
                        return (
                          <div key={`${selectedMatch.nominationId}-to-${slotNumber}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{getTOSlotLabel(slotNumber, language)}</div>
                            <div className="mt-1 flex items-start justify-between gap-3">
                              {toSlot ? (
                                canOpenReport ? (
                                  <button
                                    type="button"
                                    onClick={() => openMatchReport('to', selectedMatch.nominationId, toSlot.toId)}
                                    className="rz-ui-text text-left text-sm font-bold text-slate-900 transition hover:text-[#57131b] hover:underline"
                                  >
                                    {getDisplayPersonName(toSlot.toName)}
                                  </button>
                                ) : (
                                  <div className="rz-ui-text text-sm font-bold text-slate-900">{getDisplayPersonName(toSlot.toName)}</div>
                                )
                              ) : (
                                <div className="rz-ui-text text-sm font-bold text-slate-900">Not assigned</div>
                              )}
                              {toSlot && shouldShowIndicator ? (
                                canOpenReport ? (
                                  <button
                                    type="button"
                                    onClick={() => openMatchReport('to', selectedMatch.nominationId, toSlot.toId)}
                                    title={
                                      shouldShowOverdueAddTime(reportItem)
                                        ? reportItem.deadlineMessage || 'Report deadline exceeded'
                                        : `Report: ${getReportStatusLabel(reportStatus, language)}`
                                    }
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition hover:scale-[1.03] ${getReportActionShell(reportItem, reportStatus)}`}
                                  >
                                    {renderReportActionIcon(reportItem, reportStatus)}
                                  </button>
                                ) : (
                                  <span
                                    title={`Report: ${getReportStatusLabel(reportStatus, language)}`}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${getReportActionShell(reportItem, reportStatus)}`}
                                  >
                                    {renderReportActionIcon(reportItem, reportStatus)}
                                  </span>
                                )
                              ) : null}
                            </div>
                            {toSlot && (!hasMatchStarted || toSlot.status !== 'Accepted') ? <div className="mt-2">{renderStatusChip(toSlot.status)}</div> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Statistic Crew</div>
                    <div className="mt-3 space-y-2">
                      {[1, 2, 3].map((slotNumber) => {
                        const statSlot = selectedMatch.statisticCrew.find((item) => item.slotNumber === slotNumber);
                        const reportItem = statSlot ? toReportMap.get(statSlot.toId) : undefined;
                        const reportStatus = getReportDisplayStatus(reportItem);
                        const canOpenReport = Boolean(statSlot) && hasReportContent(reportItem);
                        const shouldShowIndicator = shouldRenderReportIndicator(reportItem, reportStatus);
                        return (
                          <div key={`${selectedMatch.nominationId}-stat-${slotNumber}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{getStatisticSlotLabel(slotNumber, language)}</div>
                            <div className="mt-1 flex items-start justify-between gap-3">
                              {statSlot ? (
                                canOpenReport ? (
                                  <button
                                    type="button"
                                    onClick={() => openMatchReport('to', selectedMatch.nominationId, statSlot.toId)}
                                    className="rz-ui-text text-left text-sm font-bold text-slate-900 transition hover:text-[#57131b] hover:underline"
                                  >
                                    {getDisplayPersonName(statSlot.toName)}
                                  </button>
                                ) : (
                                  <div className="rz-ui-text text-sm font-bold text-slate-900">{getDisplayPersonName(statSlot.toName)}</div>
                                )
                              ) : (
                                <div className="rz-ui-text text-sm font-bold text-slate-900">Not assigned</div>
                              )}
                              {statSlot && shouldShowIndicator ? (
                                canOpenReport ? (
                                  <button
                                    type="button"
                                    onClick={() => openMatchReport('to', selectedMatch.nominationId, statSlot.toId)}
                                    title={
                                      shouldShowOverdueAddTime(reportItem)
                                        ? reportItem.deadlineMessage || 'Report deadline exceeded'
                                        : `Report: ${getReportStatusLabel(reportStatus, language)}`
                                    }
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition hover:scale-[1.03] ${getReportActionShell(reportItem, reportStatus)}`}
                                  >
                                    {renderReportActionIcon(reportItem, reportStatus)}
                                  </button>
                                ) : (
                                  <span
                                    title={`Report: ${getReportStatusLabel(reportStatus, language)}`}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${getReportActionShell(reportItem, reportStatus)}`}
                                  >
                                    {renderReportActionIcon(reportItem, reportStatus)}
                                  </span>
                                )
                              ) : null}
                            </div>
                            {statSlot && (!hasMatchStarted || statSlot.status !== 'Accepted') ? <div className="mt-2">{renderStatusChip(statSlot.status)}</div> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-[#57131b]" />
                  <h3 className="text-base font-black text-slate-900">Performance Intelligence</h3>
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Referee Performance Sheets</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{refereeRankingEntriesForMatch.length}</div>
                    <div className="rz-ui-text mt-2 text-sm text-slate-600">
                      {refereeRankingEntriesForMatch.length > 0
                        ? refereeRankingEntriesForMatch.slice(0, 2).map((item) => `${getDisplayPersonName(item.refereeName)} | AVG ${item.matchAverage.toFixed(2)}`).join(' | ')
                        : 'No referee performance data has been saved for this game yet.'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">TO Performance Sheets</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{toRankingEntriesForMatch.length}</div>
                    <div className="rz-ui-text mt-2 text-sm text-slate-600">
                      {toRankingEntriesForMatch.length > 0
                        ? toRankingEntriesForMatch.slice(0, 2).map((item) => `${getDisplayPersonName(item.refereeName)} | AVG ${item.matchAverage.toFixed(2)}`).join(' | ')
                        : 'No TO performance data has been saved for this game yet.'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default MatchCenter;
