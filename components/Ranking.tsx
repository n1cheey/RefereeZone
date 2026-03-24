import React, { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Award, Save, Shield, TrendingUp } from 'lucide-react';
import {
  RankingDashboardData,
  RankingPerformanceEntry,
  RankingPerformanceProfile,
  User,
} from '../types';
import { createRankingEvaluation, getRankingAdminData, getRankingDashboard, saveRankingPerformance } from '../services/rankingService';

const scoreOptions = [-1, 0, 1];

interface RankingProps {
  user: User;
  onBack: () => void;
}

const emptyPerformanceForm = {
  gameCode: '',
  evaluationDate: '',
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

const performanceFields: Array<[keyof Omit<typeof emptyPerformanceForm, 'gameCode' | 'evaluationDate'>, string]> = [
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

const Ranking: React.FC<RankingProps> = ({ user, onBack }) => {
  const isInstructor = user.role === 'Instructor';
  const isStaff = user.role === 'Staff';
  const [dashboard, setDashboard] = useState<RankingDashboardData | null>(null);
  const [adminData, setAdminData] = useState<{
    leaderboard: RankingDashboardData['leaderboard'];
    evaluations: Array<{
      id: string;
      refereeId: string;
      refereeName: string;
      gameCode: string;
      evaluationDate: string;
      score: number;
      note: string;
    }>;
    performanceEntries: RankingPerformanceEntry[];
    performanceProfiles: RankingPerformanceProfile[];
    referees: Array<{ id: string; fullName: string }>;
  } | null>(null);
  const [selectedRefereeId, setSelectedRefereeId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);
  const [isSavingPerformance, setIsSavingPerformance] = useState(false);
  const [evaluationForm, setEvaluationForm] = useState({
    refereeId: '',
    gameCode: '',
    evaluationDate: '',
    score: 0,
    note: '',
  });
  const [performanceRefereeId, setPerformanceRefereeId] = useState('');
  const [performanceForm, setPerformanceForm] = useState(emptyPerformanceForm);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dashboardResponse, adminResponse] = await Promise.all([
        getRankingDashboard(user.id),
        isInstructor ? getRankingAdminData(user.id) : Promise.resolve(null),
      ]);

      setDashboard(dashboardResponse);
      setAdminData(adminResponse);

      const defaultRefereeId =
        selectedRefereeId ||
        dashboardResponse.currentUserItem?.refereeId ||
        dashboardResponse.leaderboard[0]?.refereeId ||
        adminResponse?.referees[0]?.id ||
        '';
      setSelectedRefereeId(defaultRefereeId);

      if (adminResponse && adminResponse.referees.length > 0) {
        const defaultFormRefereeId = evaluationForm.refereeId || adminResponse.referees[0].id;
        const defaultPerformanceRefereeId = performanceRefereeId || adminResponse.referees[0].id;

        setEvaluationForm((prev) => ({
          ...prev,
          refereeId: defaultFormRefereeId,
        }));
        setPerformanceRefereeId(defaultPerformanceRefereeId);
      }

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
  const rankingTitle = isInstructor || isStaff ? 'Ranking' : 'My Ranking';
  const rankingItems = dashboard?.leaderboard || [];
  const rankingDetailsProfiles = adminData?.performanceProfiles || dashboard?.visiblePerformanceProfiles || [];
  const rankingDetailsEntries = adminData?.performanceEntries || dashboard?.performanceEntries || [];

  const selectedVisiblePerformanceProfile = useMemo(() => {
    if (!selectedRefereeId) {
      return null;
    }

    return rankingDetailsProfiles.find((item) => item.refereeId === selectedRefereeId) || null;
  }, [rankingDetailsProfiles, selectedRefereeId]);

  const selectedRefereeEntries = useMemo(
    () =>
      rankingDetailsEntries
        .filter((item) => item.refereeId === selectedRefereeId)
        .sort((left, right) => {
          const dateCompare = right.evaluationDate.localeCompare(left.evaluationDate);
          if (dateCompare !== 0) {
            return dateCompare;
          }

          return right.gameCode.localeCompare(left.gameCode);
        }),
    [rankingDetailsEntries, selectedRefereeId],
  );

  const handleSaveEvaluation = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingEvaluation(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createRankingEvaluation({
        instructorId: user.id,
        refereeId: evaluationForm.refereeId,
        gameCode: evaluationForm.gameCode,
        evaluationDate: evaluationForm.evaluationDate,
        score: evaluationForm.score,
        note: evaluationForm.note,
      });
      await loadData();
      setEvaluationForm((prev) => ({
        ...prev,
        gameCode: '',
        evaluationDate: '',
        score: 0,
        note: '',
      }));
      setSuccessMessage('Ranking total entry saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save evaluation.');
    } finally {
      setIsSavingEvaluation(false);
    }
  };

  const handleSavePerformance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!performanceRefereeId) {
      return;
    }

    setIsSavingPerformance(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await saveRankingPerformance({
        instructorId: user.id,
        refereeId: performanceRefereeId,
        gameCode: performanceForm.gameCode,
        evaluationDate: performanceForm.evaluationDate,
        physicalFitness: performanceForm.physicalFitness,
        mechanics: performanceForm.mechanics,
        iot: performanceForm.iot,
        criteriaScore: performanceForm.criteriaScore,
        teamworkScore: performanceForm.teamworkScore,
        gameControl: performanceForm.gameControl,
        newPhilosophy: performanceForm.newPhilosophy,
        communication: performanceForm.communication,
        externalEvaluation: performanceForm.externalEvaluation,
      });
      await loadData();
      setPerformanceForm(emptyPerformanceForm);
      setSuccessMessage('Match performance saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save performance.');
    } finally {
      setIsSavingPerformance(false);
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
              Ranking is calculated from `Total points` plus the average of all saved `Match Performance` averages.
              If scores are equal, the referee with the higher AVG is placed above.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <form onSubmit={handleSaveEvaluation} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Total Sheet Entry</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referee</label>
                <select
                  required
                  value={evaluationForm.refereeId}
                  onChange={(event) => setEvaluationForm((prev) => ({ ...prev, refereeId: event.target.value }))}
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
                  <input
                    required
                    value={evaluationForm.gameCode}
                    onChange={(event) => setEvaluationForm((prev) => ({ ...prev, gameCode: event.target.value }))}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                    placeholder="ABL-205"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={evaluationForm.evaluationDate}
                    onChange={(event) => setEvaluationForm((prev) => ({ ...prev, evaluationDate: event.target.value }))}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Score</label>
                <select
                  value={evaluationForm.score}
                  onChange={(event) => setEvaluationForm((prev) => ({ ...prev, score: Number(event.target.value) }))}
                  className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] bg-white"
                >
                  {scoreOptions.map((score) => (
                    <option key={score} value={score}>
                      {score}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note</label>
                <textarea
                  rows={3}
                  value={evaluationForm.note}
                  onChange={(event) => setEvaluationForm((prev) => ({ ...prev, note: event.target.value }))}
                  className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingEvaluation}
                className="inline-flex items-center gap-2 rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
              >
                <Save size={16} />
                {isSavingEvaluation ? 'Saving...' : 'Save Total Entry'}
              </button>
            </form>

            <form onSubmit={handleSavePerformance} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Performance Sheet</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referee</label>
                <select
                  required
                  value={performanceRefereeId}
                  onChange={(event) => setPerformanceRefereeId(event.target.value)}
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
                  <input
                    required
                    value={performanceForm.gameCode}
                    onChange={(event) => setPerformanceForm((prev) => ({ ...prev, gameCode: event.target.value }))}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                    placeholder="ABL-205"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={performanceForm.evaluationDate}
                    onChange={(event) => setPerformanceForm((prev) => ({ ...prev, evaluationDate: event.target.value }))}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {performanceFields.map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
                    <select
                      value={performanceForm[key]}
                      onChange={(event) =>
                        setPerformanceForm((prev) => ({ ...prev, [key]: Number(event.target.value) }))
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
              <button
                type="submit"
                disabled={isSavingPerformance}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f39200] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
              >
                <Save size={16} />
                {isSavingPerformance ? 'Saving...' : 'Save Match Performance'}
              </button>
            </form>
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
                <p className="text-sm text-slate-500 mt-2">
                  {`Total points: ${dashboard.currentUserItem.totalGameScore} | AVG performance: ${formatAverage(
                    dashboard.currentUserItem.performanceAverage,
                  )}`}
                </p>
              </div>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold">
                <TrendingUp size={16} /> Overall {formatAverage(dashboard.currentUserItem.overallScore)}
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
            <h3 className="text-base font-bold text-slate-900 mb-4">My Ranking</h3>
            <div className="rounded-xl border border-[#581c1c] bg-[#581c1c]/5 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{`#${dashboard.currentUserItem.rank} ${dashboard.currentUserItem.refereeName}`}</div>
                  <div className="text-sm text-slate-500">{`Total: ${dashboard.currentUserItem.totalGameScore} | AVG: ${formatAverage(
                    dashboard.currentUserItem.performanceAverage,
                  )}`}</div>
                </div>
                <div className="text-lg font-black text-[#581c1c]">{formatAverage(dashboard.currentUserItem.overallScore)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {canViewFullLeaderboard && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
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
                    <div className="text-sm text-slate-500">{`Total: ${item.totalGameScore} | AVG: ${formatAverage(
                      item.performanceAverage,
                    )}`}</div>
                  </div>
                  <div className="text-lg font-black text-[#581c1c]">{formatAverage(item.overallScore)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedVisiblePerformanceProfile && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{selectedVisiblePerformanceProfile.refereeName}</h3>
              <p className="text-sm text-slate-500">
                {canViewFullLeaderboard ? 'Average of all saved match performance sheets.' : 'Your match performance average.'}
              </p>
            </div>
            <div className="inline-flex rounded-full bg-[#581c1c]/10 px-3 py-1 text-sm font-bold text-[#581c1c]">
              AVG: {formatAverage(
                rankingItems.find((item) => item.refereeId === selectedVisiblePerformanceProfile.refereeId)?.performanceAverage,
              )}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {performanceFields.map(([key, label]) => (
              <div key={key} className="rounded-xl bg-slate-50 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-slate-600">{label}</span>
                <span className="text-sm font-bold text-[#581c1c]">{formatAverage(selectedVisiblePerformanceProfile[key])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!selectedRefereeEntries.length && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            {canViewFullLeaderboard ? 'Match Performance History' : 'My Match Performance History'}
          </h3>
          <div className="space-y-4">
            {selectedRefereeEntries.map((entry) => (
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
                <div className="grid gap-3 md:grid-cols-2">
                  {performanceFields.map(([key, label]) => (
                    <div key={`${entry.id}-${key}`} className="rounded-xl bg-white px-4 py-3 flex items-center justify-between border border-slate-200">
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

      {isInstructor && adminData && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">Latest Total Entries</h3>
          <div className="space-y-3">
            {adminData.evaluations.slice(-12).reverse().map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="font-semibold text-slate-900">{`${entry.gameCode} | ${entry.refereeName}`}</div>
                <div className="text-sm text-slate-500">{`${entry.evaluationDate} | score ${entry.score}`}</div>
                {entry.note && <div className="text-sm text-slate-600 mt-1">{entry.note}</div>}
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
              Only your own ranking is visible here. Position changes after each saved match and uses total points plus your average match performance.
            </p>
          </div>
        </div>
      )}

      {isStaff && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm text-slate-500">
            Staff has read-only access to the full ranking and all saved match performance sheets.
          </p>
        </div>
      )}
    </Layout>
  );
};

export default Ranking;
