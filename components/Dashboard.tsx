import React, { useEffect, useRef, useState } from 'react';
import { User, InstructorNomination, RefereeDirectoryItem, RefereeNomination } from '../types';
import { getNominationSlotLabel } from '../slotLabels';
import Layout from './Layout';
import {
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  Camera,
  Clock,
  FileText,
  MapPin,
  Newspaper,
  Plus,
  Shield,
  TrendingUp,
  User as UserIcon,
  Users,
  UserPlus,
  Trash2,
} from 'lucide-react';
import {
  createNomination,
  deleteNomination,
  getInstructorDashboard,
  getRefereeNominations,
  replaceNominationReferee,
  respondToNomination,
} from '../services/nominationService';

interface DashboardProps {
  user: User;
  onNavigate: (view: 'nominations' | 'teyinat' | 'ranking' | 'reports' | 'news' | 'members' | 'access') => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const POLL_INTERVAL_MS = 45000;

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate, onLogout, onUpdateUser }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [referees, setReferees] = useState<RefereeDirectoryItem[]>([]);
  const [instructorNominations, setInstructorNominations] = useState<InstructorNomination[]>([]);
  const [refereeAssignments, setRefereeAssignments] = useState<RefereeNomination[]>([]);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardMessage, setDashboardMessage] = useState('');
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [actionAssignmentId, setActionAssignmentId] = useState<string | null>(null);
  const [replaceActionKey, setReplaceActionKey] = useState<string | null>(null);
  const [replaceSelections, setReplaceSelections] = useState<Record<string, string>>({});
  const dashboardLoadPromiseRef = useRef<Promise<void> | null>(null);
  const [form, setForm] = useState({
    gameCode: '',
    teams: '',
    matchDate: '',
    matchTime: '',
    venue: '',
    referee1: '',
    referee2: '',
    referee3: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    const loadInstructorData = async () => {
      const response = await getInstructorDashboard(user.id);

      if (!isMounted) {
        return;
      }

      setReferees(response.referees);
      setInstructorNominations(response.nominations);
      setRefereeAssignments(response.assignments);
    };

    const loadRefereeData = async () => {
      const response = await getRefereeNominations(user.id);

      if (!isMounted) {
        return;
      }

      setRefereeAssignments(response.nominations);
    };

    const loadData = async (showLoader: boolean) => {
      if (dashboardLoadPromiseRef.current) {
        await dashboardLoadPromiseRef.current;
        return;
      }

      const request = (async () => {
        if (showLoader) {
          setIsLoadingAssignments(true);
        }

        try {
          if (user.role === 'Instructor') {
            await loadInstructorData();
          } else if (user.role === 'Referee') {
            await loadRefereeData();
          }
          if (isMounted) {
            setDashboardError('');
          }
        } catch (error) {
          if (isMounted) {
            setDashboardError(error instanceof Error ? error.message : 'Failed to load dashboard data.');
          }
        } finally {
          if (isMounted && showLoader) {
            setIsLoadingAssignments(false);
          }
        }
      })();

      dashboardLoadPromiseRef.current = request;

      try {
        await request;
      } finally {
        if (dashboardLoadPromiseRef.current === request) {
          dashboardLoadPromiseRef.current = null;
        }
      }
    };

    const startPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          void loadData(false);
        }
      }, POLL_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadData(false);
        startPolling();
        return;
      }

      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    void loadData(true);
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user.id, user.role]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({
          ...user,
          photoUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateFormField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      gameCode: '',
      teams: '',
      matchDate: '',
      matchTime: '',
      venue: '',
      referee1: '',
      referee2: '',
      referee3: '',
    });
  };

  const refreshInstructorData = async () => {
    const response = await getInstructorDashboard(user.id);
    setReferees(response.referees);
    setInstructorNominations(response.nominations);
    setRefereeAssignments(response.assignments);
  };

  const refreshRefereeData = async () => {
    const response = await getRefereeNominations(user.id);
    setRefereeAssignments(response.nominations);
  };

  const handleCreateNomination = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setDashboardError('');
    setDashboardMessage('');

    const refereeIds = [form.referee1, form.referee2, form.referee3];
    if (new Set(refereeIds).size !== 3 || refereeIds.some((item) => !item)) {
      setDashboardError('Choose 3 different officials.');
      setIsSubmittingCreate(false);
      return;
    }

    try {
      await createNomination({
        instructorId: user.id,
        gameCode: form.gameCode,
        teams: form.teams,
        matchDate: form.matchDate,
        matchTime: form.matchTime,
        venue: form.venue,
        refereeIds,
      });

      await refreshInstructorData();
      resetForm();
      setShowCreateForm(false);
      setDashboardMessage('Nomination created.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to create nomination.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleNominationResponse = async (nominationId: string, response: 'Accepted' | 'Declined', assignmentId: string) => {
    setActionAssignmentId(assignmentId);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await respondToNomination({
        nominationId,
        refereeId: user.id,
        response,
      });
      await refreshRefereeData();
      setDashboardMessage(`Game ${response.toLowerCase()}.`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to save response.');
    } finally {
      setActionAssignmentId(null);
    }
  };

  const handleReplaceReferee = async (nominationId: string, slotNumber: number) => {
    const key = `${nominationId}-${slotNumber}`;
    const newRefereeId = replaceSelections[key];

    if (!newRefereeId) {
      setDashboardError('Choose a replacement referee first.');
      return;
    }

    setReplaceActionKey(key);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await replaceNominationReferee({
        nominationId,
        slotNumber,
        instructorId: user.id,
        refereeId: newRefereeId,
      });
      await refreshInstructorData();
      setReplaceSelections((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setDashboardMessage('Replacement referee assigned.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to replace referee.');
    } finally {
      setReplaceActionKey(null);
    }
  };

  const handleDeleteNomination = async (nominationId: string) => {
    setDashboardError('');
    setDashboardMessage('');

    try {
      await deleteNomination({
        nominationId,
        instructorId: user.id,
      });
      await refreshInstructorData();
      setDashboardMessage('Game deleted.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to delete game.');
    }
  };

  const navItems = [
    { id: 'nominations' as const, label: 'My Nominations', icon: Calendar, iconColor: 'text-blue-500', color: 'bg-blue-50' },
    ...(user.role === 'Instructor'
      ? [{ id: 'teyinat' as const, label: 'Teyinat', icon: FileText, iconColor: 'text-[#581c1c]', color: 'bg-rose-50' }]
      : []),
    { id: 'ranking' as const, label: 'My Ranking', icon: TrendingUp, iconColor: 'text-green-500', color: 'bg-green-50' },
    { id: 'reports' as const, label: 'My Reports', icon: FileText, iconColor: 'text-purple-500', color: 'bg-purple-50' },
    { id: 'news' as const, label: 'News', icon: Newspaper, iconColor: 'text-orange-500', color: 'bg-orange-50' },
  ];

  const declinedAssignments = instructorNominations.flatMap((nomination) =>
    nomination.referees
      .filter((referee) => referee.status === 'Declined')
      .map((referee) => ({
        nomination,
        referee,
      })),
  );

  const getReplacementOptions = (nomination: InstructorNomination, slotNumber: number) => {
    const occupied = new Set(
      nomination.referees.filter((item) => item.slotNumber !== slotNumber).map((item) => item.refereeId),
    );

    return referees.filter((referee) => !occupied.has(referee.id));
  };

  return (
    <Layout title={user.role === 'Instructor' ? 'Instructor Panel' : 'RefZone Dashboard'} showBack={false} onLogout={onLogout}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer group" onClick={handlePhotoClick}>
            <img
              src={user.photoUrl}
              alt={user.fullName}
              className="w-20 h-20 rounded-2xl object-cover shadow-md ring-2 ring-[#f97316]/20 group-hover:opacity-80 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white drop-shadow-md" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#f97316] p-1.5 rounded-lg shadow-sm">
              <Award size={16} className="text-white" />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{user.fullName}</h2>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <UserIcon size={14} /> License: {user.licenseNumber}
            </p>
            <div className="mt-1 inline-block px-2 py-0.5 bg-[#581c1c] text-white text-[10px] uppercase font-bold rounded">
              {user.role}
            </div>
          </div>
        </div>
      </div>

      {dashboardError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {dashboardError}
        </div>
      )}

      {dashboardMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {dashboardMessage}
        </div>
      )}

      {user.role === 'Instructor' && (
        <div className="space-y-5 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield size={18} className="text-[#581c1c]" />
                Instructor Controls
              </h3>
              <p className="text-sm text-slate-500">Create nominations, edit members and manage registration access.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={() => onNavigate('members')}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-800"
              >
                <Users size={16} />
                All Members
              </button>
              <button
                onClick={() => onNavigate('access')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f39200] px-4 py-3 text-sm font-bold text-white"
              >
                <UserPlus size={16} />
                Add Access
              </button>
              <button
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#581c1c]/15"
              >
                <Plus size={16} />
                Create Nomination
              </button>
            </div>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateNomination} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Game Number</label>
                  <input
                    required
                    value={form.gameCode}
                    onChange={(e) => updateFormField('gameCode', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                    placeholder="ABL-205"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Game</label>
                  <input
                    required
                    value={form.teams}
                    onChange={(e) => updateFormField('teams', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                    placeholder="Sabah vs Ganja"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.matchDate}
                    onChange={(e) => updateFormField('matchDate', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={form.matchTime}
                    onChange={(e) => updateFormField('matchTime', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Venue</label>
                  <input
                    required
                    value={form.venue}
                    onChange={(e) => updateFormField('venue', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                    placeholder="Sarhadchi Arena"
                  />
                </div>
                {[1, 2, 3].map((slot) => (
                  <div key={slot}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{getNominationSlotLabel(slot)}</label>
                    <select
                      required
                      value={form[`referee${slot}` as keyof typeof form]}
                      onChange={(e) => updateFormField(`referee${slot}` as keyof typeof form, e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] bg-white"
                    >
                      <option value="">Select official</option>
                      {referees.map((referee) => (
                        <option key={referee.id} value={referee.id}>
                          {`${referee.fullName} (${referee.role})`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="rounded-xl bg-[#f39200] px-5 py-3 text-sm font-bold text-white disabled:opacity-70"
                >
                  {isSubmittingCreate ? 'Creating...' : 'Save Nomination'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-[#581c1c]" />
              <h3 className="text-base font-bold text-slate-900">Instructor Notifications</h3>
            </div>
            {declinedAssignments.length === 0 ? (
              <p className="text-sm text-slate-500">No referee has declined a game yet.</p>
            ) : (
              <div className="space-y-4">
                {declinedAssignments.map(({ nomination, referee }) => {
                  const replaceKey = `${nomination.id}-${referee.slotNumber}`;
                  const options = getReplacementOptions(nomination, referee.slotNumber);
                  return (
                    <div key={replaceKey} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
                        <div className="flex-1 space-y-3">
                          <p className="text-sm font-semibold text-amber-900">
                            {referee.refereeName} Declined Game
                          </p>
                          <div className="grid gap-2 text-sm text-amber-900 md:grid-cols-2">
                            <div>{nomination.gameCode}</div>
                            <div>{nomination.teams}</div>
                            <div>{nomination.matchDate} at {nomination.matchTime}</div>
                            <div className="md:col-span-2">{nomination.venue}</div>
                          </div>
                          <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <select
                              value={replaceSelections[replaceKey] || ''}
                              onChange={(e) => setReplaceSelections((prev) => ({ ...prev, [replaceKey]: e.target.value }))}
                              className="min-w-64 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="">Select replacement official</option>
                              {options.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {`${option.fullName} (${option.role})`}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleReplaceReferee(nomination.id, referee.slotNumber)}
                              disabled={replaceActionKey === replaceKey || options.length === 0}
                              className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                            >
                              {replaceActionKey === replaceKey ? 'Replacing...' : `Replace ${getNominationSlotLabel(referee.slotNumber)}`}
                            </button>
                          </div>
                          {options.length === 0 && (
                            <p className="text-xs text-amber-700">No free referee is available for this slot.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4">Created Nominations</h3>
            {isLoadingAssignments ? (
              <p className="text-sm text-slate-500">Loading nominations...</p>
            ) : instructorNominations.length === 0 ? (
              <p className="text-sm text-slate-500">No nominations created yet.</p>
            ) : (
              <div className="space-y-4">
                {instructorNominations.map((nomination) => (
                  <div key={nomination.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase text-[#581c1c]">{nomination.gameCode}</div>
                        <h4 className="text-lg font-bold text-slate-900">{nomination.teams}</h4>
                        <div className="grid gap-2 mt-2 text-sm text-slate-600 md:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-[#f97316]" />
                            {nomination.matchDate}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-[#f97316]" />
                            {nomination.matchTime}
                          </div>
                          <div className="flex items-center gap-2 md:col-span-2">
                            <MapPin size={14} className="text-[#f97316]" />
                            {nomination.venue}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteNomination(nomination.id)}
                        className="inline-flex items-center gap-2 self-start rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white"
                      >
                        <Trash2 size={14} />
                        Delete Game
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {nomination.referees.map((referee) => (
                        <div key={`${nomination.id}-${referee.slotNumber}`} className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-bold uppercase text-slate-500">{getNominationSlotLabel(referee.slotNumber)}</div>
                          <div className="mt-1 font-semibold text-slate-900">{referee.refereeName}</div>
                          <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            referee.status === 'Accepted'
                              ? 'bg-emerald-100 text-emerald-700'
                              : referee.status === 'Declined'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {referee.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {(user.role === 'Referee' || user.role === 'Instructor') && (
        <div className="space-y-5 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-[#581c1c]" />
              <h3 className="text-base font-bold text-slate-900">
                {user.role === 'Instructor' ? 'My Game Assignments' : 'Upcoming Game'}
              </h3>
            </div>
            {isLoadingAssignments ? (
              <p className="text-sm text-slate-500">Loading assignments...</p>
            ) : refereeAssignments.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming games yet.</p>
            ) : (
              <div className="space-y-4">
                {refereeAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase text-[#581c1c]">{assignment.gameCode}</div>
                        <div className="text-xs font-bold uppercase text-[#581c1c]">{getNominationSlotLabel(assignment.slotNumber)}</div>
                        <h4 className="text-lg font-bold text-slate-900 mt-1">{assignment.teams}</h4>
                        <div className="grid gap-2 mt-3 text-sm text-slate-600 md:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-[#f97316]" />
                            {assignment.matchDate}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-[#f97316]" />
                            {assignment.matchTime}
                          </div>
                          <div className="flex items-center gap-2 md:col-span-2">
                            <MapPin size={14} className="text-[#f97316]" />
                            {assignment.venue}
                          </div>
                          <div className="md:col-span-2 text-xs uppercase font-semibold tracking-wide text-slate-500">
                            Instructor: {assignment.instructorName}
                          </div>
                        </div>
                      </div>
                      <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        assignment.status === 'Accepted'
                          ? 'bg-emerald-100 text-emerald-700'
                          : assignment.status === 'Declined'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {assignment.status}
                      </div>
                    </div>
                    {assignment.status === 'Pending' && (
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                          onClick={() => handleNominationResponse(assignment.nominationId, 'Accepted', assignment.id)}
                          disabled={actionAssignmentId === assignment.id}
                          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
                        >
                          {actionAssignmentId === assignment.id ? 'Saving...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleNominationResponse(assignment.nominationId, 'Declined', assignment.id)}
                          disabled={actionAssignmentId === assignment.id}
                          className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-70"
                        >
                          {actionAssignmentId === assignment.id ? 'Saving...' : 'Decline'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`${item.color} rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-transform active:scale-95 shadow-sm min-h-36`}
          >
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <item.icon size={28} className={item.iconColor} />
            </div>
            <span className="text-sm font-bold text-slate-700">{item.label}</span>
          </button>
        ))}
      </div>
    </Layout>
  );
};

export default Dashboard;
