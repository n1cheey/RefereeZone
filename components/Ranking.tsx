import React, { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Award, Save, Shield, TrendingUp } from 'lucide-react';
import { RankingDashboardData, RankingPerformanceProfile, User } from '../types';
import { createRankingEvaluation, getRankingAdminData, getRankingDashboard, saveRankingPerformance } from '../services/rankingService';

const scoreOptions = [-1, 0, 1];

interface RankingProps {
  user: User;
  onBack: () => void;
}

const emptyPerformanceForm = {
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

const performanceFields: Array<[keyof typeof emptyPerformanceForm, string]> = [
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

const Ranking: React.FC<RankingProps> = ({ user, onBack }) => {
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
        user.role === 'Instructor' ? getRankingAdminData(user.id) : Promise.resolve(null),
      ]);

      setDashboard(dashboardResponse);
      setAdminData(adminResponse);

      const defaultRefereeId =
        selectedRefereeId ||
        dashboardResponse.currentUserItem?.refereeId ||
        dashboardResponse.leaderboard[0]?.refereeId ||
        '';
      setSelectedRefereeId(defaultRefereeId);

      if (adminResponse && adminResponse.referees.length > 0) {
        const defaultPerformanceRefereeId = performanceRefereeId || adminResponse.referees[0].id;
        setEvaluationForm((prev) => ({
          ...prev,
          refereeId: prev.refereeId || defaultPerformanceRefereeId,
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

  const visiblePerformanceProfiles = useMemo(
    () => adminData?.performanceProfiles || dashboard?.visiblePerformanceProfiles || [],
    [adminData, dashboard],
  );

  const selectedVisiblePerformanceProfile = useMemo(() => {
    if (!selectedRefereeId) {
      return null;
    }

    return visiblePerformanceProfiles.find((item) => item.refereeId === selectedRefereeId) || null;
  }, [selectedRefereeId, visiblePerformanceProfiles]);

  const selectedPerformanceProfile = useMemo(() => {
    if (!adminData || !performanceRefereeId) {
      return null;
    }

    return adminData.performanceProfiles.find((item) => item.refereeId === performanceRefereeId) || null;
  }, [adminData, performanceRefereeId]);

  useEffect(() => {
    if (!selectedPerformanceProfile) {
      setPerformanceForm(emptyPerformanceForm);
      return;
    }

    setPerformanceForm({
      physicalFitness: selectedPerformanceProfile.physicalFitness,
      mechanics: selectedPerformanceProfile.mechanics,
      iot: selectedPerformanceProfile.iot,
      criteriaScore: selectedPerformanceProfile.criteriaScore,
      teamworkScore: selectedPerformanceProfile.teamworkScore,
      gameControl: selectedPerformanceProfile.gameControl,
      newPhilosophy: selectedPerformanceProfile.newPhilosophy,
      communication: selectedPerformanceProfile.communication,
      externalEvaluation: selectedPerformanceProfile.externalEvaluation,
    });
  }, [selectedPerformanceProfile]);

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
      setSuccessMessage('Ranking evaluation saved.');
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
        ...performanceForm,
      });
      await loadData();
      setSuccessMessage('Performance profile saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save performance.');
    } finally {
      setIsSavingPerformance(false);
    }
  };

  if (isLoading || !dashboard) {
    return (
      <Layout title={user.role === 'Staff' ? 'Ranking' : 'My Ranking'} onBack={onBack}>
        <p className="text-sm text-slate-500">Loading ranking data...</p>
      </Layout>
    );
  }

  return (
    <Layout title={user.role === 'Staff' ? 'Ranking' : 'My Ranking'} onBack={onBack}>
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

      {user.role === 'Instructor' && adminData ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-[#581c1c]" />
              <h3 className="text-lg font-bold text-slate-900">Ranking Admin</h3>
            </div>
            <p className="text-sm text-slate-500">
              `AVG` is the average of all performance criteria. If overall scores are equal, the referee with the higher AVG is ranked above.
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
                  onChange={(e) => setEvaluationForm((prev) => ({ ...prev, refereeId: e.target.value }))}
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
                    onChange={(e) => setEvaluationForm((prev) => ({ ...prev, gameCode: e.target.value }))}
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
                    onChange={(e) => setEvaluationForm((prev) => ({ ...prev, evaluationDate: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Score</label>
                <select
                  value={evaluationForm.score}
                  onChange={(e) => setEvaluationForm((prev) => ({ ...prev, score: Number(e.target.value) }))}
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
                  onChange={(e) => setEvaluationForm((prev) => ({ ...prev, note: e.target.value }))}
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
              <h3 className="text-base font-bold text-slate-900">Perfomance Sheet</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referee</label>
                <select
                  required
                  value={performanceRefereeId}
                  onChange={(e) => setPerformanceRefereeId(e.target.value)}
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
                {performanceFields.map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
                    <select
                      value={performanceForm[key]}
                      onChange={(e) => setPerformanceForm((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
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
                {isSavingPerformance ? 'Saving...' : 'Save Performance'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4">Leaderboard</h3>
            <div className="space-y-3">
              {dashboard.leaderboard.map((item) => (
                <button
                  key={item.refereeId}
                  type="button"
                  onClick={() => setSelectedRefereeId(item.refereeId)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    selectedRefereeId === item.refereeId
                      ? 'border-[#581c1c] bg-[#581c1c]/5'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{`#${item.rank} ${item.refereeName}`}</div>
                      <div className="text-sm text-slate-500">{`Total: ${item.totalGameScore} | Performance: ${item.performanceScore} | AVG: ${item.performanceAverage.toFixed(2)}`}</div>
                    </div>
                    <div className="text-lg font-black text-[#581c1c]">{item.overallScore}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
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
        </div>
      ) : (
        <>
          {user.role === 'Referee' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm text-slate-500">Current Position</p>
                  <h3 className="text-4xl font-black text-[#581c1c]">
                    {dashboard.currentUserItem ? `#${dashboard.currentUserItem.rank}` : '-'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">{`Overall Score: ${dashboard.currentUserItem?.overallScore ?? 0} | AVG: ${(dashboard.currentUserItem?.performanceAverage ?? 0).toFixed(2)}`}</p>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold">
                  <TrendingUp size={16} /> Total {dashboard.currentUserItem?.totalGameScore ?? 0}
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboard.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis reversed domain={[1, Math.max(5, dashboard.leaderboard.length || 1)]} hide />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'bold' }}
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

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Leaderboard</h3>
            <div className="space-y-3">
              {dashboard.leaderboard.map((item) => (
                <button
                  key={item.refereeId}
                  type="button"
                  onClick={() => setSelectedRefereeId(item.refereeId)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    selectedRefereeId === item.refereeId
                      ? 'border-[#581c1c] bg-[#581c1c]/5'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{`#${item.rank} ${item.refereeName}`}</div>
                      <div className="text-sm text-slate-500">{`Total: ${item.totalGameScore} | Performance: ${item.performanceScore} | AVG: ${item.performanceAverage.toFixed(2)}`}</div>
                    </div>
                    <div className="text-lg font-black text-[#581c1c]">{item.overallScore}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedVisiblePerformanceProfile && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="text-base font-bold text-slate-900 mb-2">{selectedVisiblePerformanceProfile.refereeName}</h3>
          <div className="mb-4 inline-flex rounded-full bg-[#581c1c]/10 px-3 py-1 text-sm font-bold text-[#581c1c]">
            AVG: {(dashboard.leaderboard.find((item) => item.refereeId === selectedVisiblePerformanceProfile.refereeId)?.performanceAverage ?? 0).toFixed(2)}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {performanceFields.map(([key, label]) => (
              <div key={key} className="rounded-xl bg-slate-50 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-slate-600">{label}</span>
                <span className="text-sm font-bold text-[#581c1c]">{selectedVisiblePerformanceProfile[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {user.role === 'Referee' && (
        <div className="bg-[#581c1c] rounded-2xl p-6 text-white shadow-lg flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <Award size={32} />
          </div>
          <div>
            <h4 className="font-bold">Ranking Summary</h4>
            <p className="text-xs text-white/70">
              Your position is calculated from `Total` game entries plus the `Perfomance` profile entered by instructors.
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Ranking;
