import React, { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Award, Save, Shield, TrendingUp } from 'lucide-react';
import { RankingDashboardData, RankingGameOption, RankingPerformanceEntry, RankingPerformanceProfile, User } from '../types';
import { getRankingAdminData, getRankingDashboard, saveRankingPerformance } from '../services/rankingService';

const scoreOptions = [-1, 0, 1];
const CORRECTION_GAME_ID = '__correction__';
const CORRECTION_GAME_CODE = 'Correction';

interface RankingProps {
  user: User;
  onBack: () => void;
}

const emptyMatchPerformanceForm = {
  gameId: '',
  gameCode: '',
  evaluationDate: '',
  note: '',
  physicalFitness: 0,
  mechanics: 0,
  iot: 0,
  criteriaScore: 0,
  teamworkScore: 0,
  gameControl: 0,
  newPhilosophy: 0,
  communication: 0,
  externalEvaluation: 0,
};

const performanceFields: Array<[keyof Omit<typeof emptyMatchPerformanceForm, 'gameId' | 'gameCode' | 'evaluationDate' | 'note'>, string]> = [
  ['physicalFitness', 'Fiziki hazirliq'],
  ['mechanics', 'Mexanika'],
  ['iot', 'IOT'],
  ['criteriaScore', 'Kriteriya'],
  ['teamworkScore', 'Komanda isi'],
  ['gameControl', 'Oyun kontrolu'],
  ['newPhilosophy', 'Yeni filosofiya'],
  ['communication', 'Unsiyyet'],
  ['externalEvaluation', 'Kənardan qiymətləndirmə'],
];

const formatAverage = (value: number | null | undefined) => Number(value || 0).toFixed(2);

const getMatchAverage = (values: typeof emptyMatchPerformanceForm) => {
  const total = performanceFields.reduce((sum, [key]) => sum + Number(values[key] || 0), 0);
  return Number((total / performanceFields.length).toFixed(2));
};

const Ranking: React.FC<RankingProps> = ({ user, onBack }) => {
  const isInstructor = user.role === 'Instructor';
  const isStaff = user.role === 'Staff';
  const rankingTitle = isInstructor || isStaff ? 'Ranking' : 'My Ranking';

  const [dashboard, setDashboard] = useState<RankingDashboardData | null>(null);
  const [adminData, setAdminData] = useState<{
    performanceEntries: RankingPerformanceEntry[];
    performanceProfiles: RankingPerformanceProfile[];
    games: RankingGameOption[];
    referees: Array<{ id: string; fullName: string }>;
  } | null>(null);
  const [selectedRefereeId, setSelectedRefereeId] = useState('');
  const [matchPerformanceRefereeId, setMatchPerformanceRefereeId] = useState('');
  const [matchPerformanceForm, setMatchPerformanceForm] = useState(emptyMatchPerformanceForm);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingMatchPerformance, setIsSavingMatchPerformance] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dashboardResponse, adminResponse] = await Promise.all([
        getRankingDashboard(user.id),
        isInstructor ? getRankingAdminData(user.id) : Promise.resolve(null),
      ]);

      setDashboard(dashboardResponse);
      setAdminData(
        adminResponse
          ? {
              performanceEntries: adminResponse.performanceEntries,
              performanceProfiles: adminResponse.performanceProfiles,
              games: adminResponse.games,
              referees: adminResponse.referees,
            }
          : null,
      );

      const defaultSelectedRefereeId =
        selectedRefereeId ||
        dashboardResponse.currentUserItem?.refereeId ||
        dashboardResponse.leaderboard[0]?.refereeId ||
        adminResponse?.referees[0]?.id ||
        '';
      const defaultMatchRefereeId = matchPerformanceRefereeId || adminResponse?.referees[0]?.id || defaultSelectedRefereeId;

      setSelectedRefereeId(defaultSelectedRefereeId);
      setMatchPerformanceRefereeId(defaultMatchRefereeId);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load rankings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user.id, user.role]);

  const canViewFullLeaderboard = dashboard?.canViewFullLeaderboard || false;
  const rankingItems = dashboard?.leaderboard || [];
  const performanceProfiles = adminData?.performanceProfiles || dashboard?.visiblePerformanceProfiles || [];
  const performanceEntries = adminData?.performanceEntries || dashboard?.performanceEntries || [];
  const rankingGames = adminData?.games || [];

  const selectedProfile = useMemo(
    () => performanceProfiles.find((item) => item.refereeId === selectedRefereeId) || null,
    [performanceProfiles, selectedRefereeId],
  );
  const selectedLeaderboardItem = useMemo(
    () => rankingItems.find((item) => item.refereeId === selectedRefereeId) || dashboard?.currentUserItem || null,
    [dashboard?.currentUserItem, rankingItems, selectedRefereeId],
  );
  const selectedEntries = useMemo(
    () =>
      performanceEntries
        .filter((item) => item.refereeId === selectedRefereeId)
        .sort((left, right) => {
          const dateCompare = right.evaluationDate.localeCompare(left.evaluationDate);
          if (dateCompare !== 0) {
            return dateCompare;
          }

          return right.gameCode.localeCompare(left.gameCode);
        }),
    [performanceEntries, selectedRefereeId],
  );
  const selectedHistory = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    if (!canViewFullLeaderboard) {
      return dashboard.history || [];
    }

    return dashboard.refereeHistories?.[selectedRefereeId] || [];
  }, [canViewFullLeaderboard, dashboard, selectedRefereeId]);
  const matchPerformanceTotal = useMemo(() => {
    const currentLeaderboardItem = rankingItems.find((item) => item.refereeId === matchPerformanceRefereeId);
    return currentLeaderboardItem?.performanceAverage ?? 0;
  }, [matchPerformanceRefereeId, rankingItems]);
  const selectedMatchPerformanceGame = useMemo(
    () => rankingGames.find((game) => game.id === matchPerformanceForm.gameId) || null,
    [matchPerformanceForm.gameId, rankingGames],
  );
  const isCorrectionSelection = matchPerformanceForm.gameId === CORRECTION_GAME_ID;

  const handleSaveMatchPerformance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!matchPerformanceRefereeId) {
      return;
    }

    setIsSavingMatchPerformance(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await saveRankingPerformance({
        instructorId: user.id,
        refereeId: matchPerformanceRefereeId,
        gameCode: matchPerformanceForm.gameCode,
        evaluationDate: matchPerformanceForm.evaluationDate,
        note: matchPerformanceForm.note,
        physicalFitness: matchPerformanceForm.physicalFitness,
        mechanics: matchPerformanceForm.mechanics,
        iot: matchPerformanceForm.iot,
        criteriaScore: matchPerformanceForm.criteriaScore,
        teamworkScore: matchPerformanceForm.teamworkScore,
        gameControl: matchPerformanceForm.gameControl,
        newPhilosophy: matchPerformanceForm.newPhilosophy,
        communication: matchPerformanceForm.communication,
        externalEvaluation: matchPerformanceForm.externalEvaluation,
      });
      await loadData();
      setMatchPerformanceForm(emptyMatchPerformanceForm);
      setSuccessMessage('Match performance saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save performance.');
    } finally {
      setIsSavingMatchPerformance(false);
    }
  };

  if (isLoading || !dashboard) {
    return (
      <Layout title={rankingTitle} onBack={onBack}>
        <p className="text-sm text-slate-500">Loading ranking data...</p>
      </Layout>
    );
  }

  return (
    <Layout title={rankingTitle} onBack={onBack}>
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {isInstructor && adminData && (
        <div className="space-y-6 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-[#581c1c]" />
              <h3 className="text-lg font-bold text-slate-900">Ranking Admin</h3>
            </div>
            <p className="text-sm text-slate-500">
              `Match Performance Sheet` saves one game. `Total Performance Sheet` is calculated automatically from all
              saved matches. `AVG` = match criteria sum / 9, then average of all match averages for that referee.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <form onSubmit={handleSaveMatchPerformance} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Match Performance Sheet</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referee</label>
                <select
                  required
                  value={matchPerformanceRefereeId}
                  onChange={(event) => setMatchPerformanceRefereeId(event.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] bg-white"
                >
                  <option value="">Select referee</option>
                  {adminData.referees.map((referee) => (
                    <option key={referee.id} value={referee.id}>
                      {referee.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Game Number</label>
                  <select
                    required
                    value={matchPerformanceForm.gameId}
                    onChange={(event) => {
                      if (event.target.value === CORRECTION_GAME_ID) {
                        setMatchPerformanceForm((prev) => ({
                          ...prev,
                          gameId: CORRECTION_GAME_ID,
                          gameCode: CORRECTION_GAME_CODE,
                          evaluationDate: '',
                        }));
                        return;
                      }

                      const nextGame = rankingGames.find((game) => game.id === event.target.value);
                      setMatchPerformanceForm((prev) => ({
                        ...prev,
                        gameId: event.target.value,
                        gameCode: nextGame?.gameCode || '',
                        evaluationDate: nextGame?.matchDate || '',
                      }));
                    }}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] bg-white"
                  >
                    <option value="">Select existing game</option>
                    <option value={CORRECTION_GAME_ID}>{CORRECTION_GAME_CODE}</option>
                    {rankingGames.map((game) => (
                      <option key={game.id} value={game.id}>
                        {`${game.gameCode} • ${game.teams} • ${game.matchDate}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={matchPerformanceForm.evaluationDate}
                    readOnly={!isCorrectionSelection}
                    onChange={(event) =>
                      setMatchPerformanceForm((prev) => ({ ...prev, evaluationDate: event.target.value }))
                    }
                    className={`block w-full rounded-xl border border-slate-200 px-4 py-3 ${
                      isCorrectionSelection ? 'bg-white outline-none focus:ring-2 focus:ring-[#581c1c]' : 'bg-slate-50 text-slate-700'
                    }`}
                  />
                </div>
              </div>
              {selectedMatchPerformanceGame && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {selectedMatchPerformanceGame.teams}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total</label>
                <input
                  readOnly
                  value={formatAverage(matchPerformanceTotal)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {performanceFields.map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
                    <select
                      value={matchPerformanceForm[key]}
                      onChange={(event) =>
                        setMatchPerformanceForm((prev) => ({ ...prev, [key]: Number(event.target.value) }))
                      }
                      className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] bg-white"
                    >
                      {scoreOptions.map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note</label>
                <textarea
                  rows={3}
                  value={matchPerformanceForm.note}
                  onChange={(event) => setMatchPerformanceForm((prev) => ({ ...prev, note: event.target.value }))}
                  className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] resize-none"
                />
              </div>
              <div className="inline-flex rounded-full bg-[#f39200]/10 px-3 py-1 text-sm font-bold text-[#f39200]">
                Current match average: {formatAverage(getMatchAverage(matchPerformanceForm))}
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isSavingMatchPerformance}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
                >
                  <Save size={16} />
                  {isSavingMatchPerformance ? 'Saving...' : 'Save Match Performance'}
                </button>
              </div>
            </form>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Total Performance Sheet</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referee</label>
                <select
                  required
                  value={selectedRefereeId}
                  onChange={(event) => setSelectedRefereeId(event.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] bg-white"
                >
                  <option value="">Select referee</option>
                  {adminData.referees.map((referee) => (
                    <option key={referee.id} value={referee.id}>
                      {referee.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total</label>
                <input
                  readOnly
                  value={formatAverage(selectedLeaderboardItem?.performanceAverage)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {performanceFields.map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
                    <input
                      readOnly
                      value={formatAverage(selectedProfile?.[key])}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!canViewFullLeaderboard && dashboard.currentUserItem && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <p className="text-sm text-slate-500">Current Position</p>
                <h3 className="text-4xl font-black text-[#581c1c]">{`#${dashboard.currentUserItem.rank}`}</h3>
                <p className="text-sm text-slate-500 mt-2">{`AVG performance: ${formatAverage(
                  dashboard.currentUserItem.performanceAverage,
                )}`}</p>
              </div>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold">
                <TrendingUp size={16} /> Total {formatAverage(dashboard.currentUserItem.overallScore)}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="gameCode" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis reversed domain={[1, Math.max(5, dashboard.totalReferees || 1)]} hide />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number) => [`#${value}`, 'Rank']}
                    labelFormatter={(label: string, payload) => {
                      const point = payload?.[0]?.payload as { date?: string; gameCode?: string } | undefined;
                      return point ? `${point.gameCode || label} • ${point.date || ''}` : label;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rank"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 6, fill: '#f97316' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4">Total Performance Sheet</h3>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total</label>
              <input
                readOnly
                value={formatAverage(dashboard.currentUserItem.performanceAverage)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {performanceFields.map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
                  <input
                    readOnly
                    value={formatAverage(dashboard.performanceProfile?.[key])}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {canViewFullLeaderboard && (
        <div className="space-y-6 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4">Full Ranking</h3>
            <div className="space-y-3">
              {rankingItems.map((item) => (
                <button
                  key={item.refereeId}
                  type="button"
                  onClick={() => setSelectedRefereeId(item.refereeId)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    selectedRefereeId === item.refereeId ? 'border-[#581c1c] bg-[#581c1c]/5' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{`#${item.rank} ${item.refereeName}`}</div>
                      <div className="text-sm text-slate-500">{`AVG: ${formatAverage(item.performanceAverage)}`}</div>
                    </div>
                    <div className="text-lg font-black text-[#581c1c]">{formatAverage(item.overallScore)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedLeaderboardItem && selectedHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-start gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-500">Selected Referee Position Trend</p>
                  <h3 className="text-3xl font-black text-[#581c1c]">{selectedLeaderboardItem.refereeName}</h3>
                  <p className="text-sm text-slate-500 mt-2">{`Current rank: #${selectedLeaderboardItem.rank}`}</p>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold">
                  <TrendingUp size={16} /> AVG {formatAverage(selectedLeaderboardItem.performanceAverage)}
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="gameCode" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis reversed domain={[1, Math.max(5, dashboard.totalReferees || 1)]} hide />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'bold' }}
                      formatter={(value: number) => [`#${value}`, 'Rank']}
                      labelFormatter={(label: string, payload) => {
                        const point = payload?.[0]?.payload as { date?: string; gameCode?: string } | undefined;
                        return point ? `${point.gameCode || label} • ${point.date || ''}` : label;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rank"
                      stroke="#f97316"
                      strokeWidth={3}
                      dot={{ r: 6, fill: '#f97316' }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedEntries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            {canViewFullLeaderboard ? 'Match Performance History' : 'My Match Performance History'}
          </h3>
          <div className="space-y-4">
            {selectedEntries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="font-semibold text-slate-900">{entry.gameCode}</div>
                    <div className="text-sm text-slate-500">{entry.evaluationDate}</div>
                  </div>
                  <div className="inline-flex rounded-full bg-[#f39200]/10 px-3 py-1 text-sm font-bold text-[#f39200]">
                    Match AVG: {formatAverage(entry.matchAverage)}
                  </div>
                </div>
                {entry.note && <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{entry.note}</div>}
                <div className="grid gap-3 md:grid-cols-2">
                  {performanceFields.map(([key, label]) => (
                    <div key={`${entry.id}-${key}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-slate-600">{label}</span>
                      <span className="text-sm font-bold text-[#581c1c]">{entry[key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!canViewFullLeaderboard && (
        <div className="bg-[#581c1c] rounded-2xl p-6 text-white shadow-lg flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <Award size={32} />
          </div>
          <div>
            <h4 className="font-bold">Ranking Summary</h4>
            <p className="text-xs text-white/70">
              Only your own ranking is visible here. Position changes after each saved match performance sheet.
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Ranking;
