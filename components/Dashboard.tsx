import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User, InstructorNomination, RefereeDirectoryItem, RefereeNomination, ReplacementNotice } from '../types';
import { getNominationSlotLabel, getTOSlotLabel } from '../slotLabels';
import { formatAutoDeclineCountdown } from '../assignmentCountdown';
import { getMatchTimestamp, isPastMatch } from '../matchTiming';
import Layout from './Layout';
import {
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  Camera,
  Clock,
  FileText,
  History,
  MapPin,
  Newspaper,
  Pencil,
  Plus,
  Shield,
  TrendingUp,
  User as UserIcon,
  Users,
  UserPlus,
  Trash2,
  Youtube,
} from 'lucide-react';
import {
  assignNominationTOs,
  createNomination,
  deleteNomination,
  editNominationOfficials,
  getInstructorDashboard,
  getRefereeNominations,
  replaceNominationReferee,
  respondToNomination,
  updateNominationScore,
} from '../services/nominationService';

interface DashboardProps {
  user: User;
  onNavigate: (view: 'nominations' | 'teyinat' | 'ranking' | 'toRanking' | 'reports' | 'news' | 'members' | 'access' | 'activity') => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const POLL_INTERVAL_MS = 45000;
const BAKU_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Baku',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const splitMatchesByTime = <T extends { matchDate: string; matchTime: string }>(items: T[], now: number) => ({
  upcoming: items.filter((item) => !isPastMatch(item.matchDate, item.matchTime, now)),
  past: items.filter((item) => isPastMatch(item.matchDate, item.matchTime, now)),
});

const isUpcomingMatchDay = (matchDate: string, matchTime: string, now: number) => {
  const matchTimestamp = getMatchTimestamp(matchDate, matchTime);
  if (matchTimestamp === null || matchTimestamp <= now) {
    return false;
  }

  return BAKU_DATE_FORMATTER.format(new Date(now)) === matchDate;
};

const getAssignmentStatusClasses = (status: string) => {
  if (status === 'Accepted') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'Declined') {
    return 'bg-red-100 text-red-700';
  }

  if (status === 'Assigned') {
    return 'bg-blue-100 text-blue-700';
  }

  return 'bg-amber-100 text-amber-700';
};

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate, onLogout, onUpdateUser }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [referees, setReferees] = useState<RefereeDirectoryItem[]>([]);
  const [toOfficials, setTOOfficials] = useState<RefereeDirectoryItem[]>([]);
  const [instructorNominations, setInstructorNominations] = useState<InstructorNomination[]>([]);
  const [refereeAssignments, setRefereeAssignments] = useState<RefereeNomination[]>([]);
  const [replacementNotices, setReplacementNotices] = useState<ReplacementNotice[]>([]);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardMessage, setDashboardMessage] = useState('');
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [actionAssignmentId, setActionAssignmentId] = useState<string | null>(null);
  const [replaceActionKey, setReplaceActionKey] = useState<string | null>(null);
  const [replaceSelections, setReplaceSelections] = useState<Record<string, string>>({});
  const [editingNominationId, setEditingNominationId] = useState<string | null>(null);
  const [editSelections, setEditSelections] = useState<Record<string, string>>({});
  const [editActionNominationId, setEditActionNominationId] = useState<string | null>(null);
  const [toActionNominationId, setTOActionNominationId] = useState<string | null>(null);
  const [toSelections, setTOSelections] = useState<Record<string, string[]>>({});
  const [scoreActionId, setScoreActionId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [videoInputs, setVideoInputs] = useState<Record<string, string>>({});
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
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
  const isInstructor = user.role === 'Instructor';
  const isStaff = user.role === 'Staff';
  const isTOSupervisor = user.role === 'TO Supervisor';
  const isTO = user.role === 'TO';

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    const loadInstructorData = async () => {
      const response = await getInstructorDashboard(user.id);

      if (!isMounted) {
        return;
      }

      setReferees(response.referees);
      setTOOfficials(response.toOfficials);
      setInstructorNominations(response.nominations);
      setRefereeAssignments(response.assignments);
      setReplacementNotices(response.replacementNotices);
    };

    const loadRefereeData = async () => {
      const response = await getRefereeNominations(user.id);

      if (!isMounted) {
        return;
      }

      setRefereeAssignments(response.nominations);
      setReplacementNotices(response.replacementNotices);
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
          if (user.role === 'Instructor' || user.role === 'TO Supervisor') {
            await loadInstructorData();
          } else if (user.role === 'Referee' || user.role === 'TO') {
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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

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
    setTOOfficials(response.toOfficials);
    setInstructorNominations(response.nominations);
    setRefereeAssignments(response.assignments);
    setReplacementNotices(response.replacementNotices);
  };

  const refreshRefereeData = async () => {
    const response = await getRefereeNominations(user.id);
    setRefereeAssignments(response.nominations);
    setReplacementNotices(response.replacementNotices);
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

  const handleStartEditNomination = (nomination: InstructorNomination) => {
    setEditingNominationId(nomination.id);
    setEditSelections({
      referee1: nomination.referees.find((item) => item.slotNumber === 1)?.refereeId || '',
      referee2: nomination.referees.find((item) => item.slotNumber === 2)?.refereeId || '',
      referee3: nomination.referees.find((item) => item.slotNumber === 3)?.refereeId || '',
    });
    setDashboardError('');
    setDashboardMessage('');
  };

  const handleCancelEditNomination = () => {
    setEditingNominationId(null);
    setEditSelections({});
  };

  const handleSaveEditedNomination = async (nominationId: string) => {
    const refereeIds = [editSelections.referee1, editSelections.referee2, editSelections.referee3];

    if (new Set(refereeIds).size !== 3 || refereeIds.some((item) => !item)) {
      setDashboardError('Choose 3 different officials.');
      return;
    }

    setEditActionNominationId(nominationId);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await editNominationOfficials({
        nominationId,
        instructorId: user.id,
        refereeIds,
      });
      await refreshInstructorData();
      handleCancelEditNomination();
      setDashboardMessage('Game crew updated.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to update game crew.');
    } finally {
      setEditActionNominationId(null);
    }
  };

  const getTONominationSelection = (nomination: InstructorNomination) =>
    toSelections[nomination.id] ||
    [1, 2, 3, 4].map((slotNumber) => nomination.toCrew.find((item) => item.slotNumber === slotNumber)?.toId || '');

  const handleSaveTOCrew = async (nominationId: string) => {
    const nomination = instructorNominations.find((item) => item.id === nominationId);
    if (!nomination) {
      return;
    }

    const selectedTOs = getTONominationSelection(nomination);
    if (new Set(selectedTOs.filter(Boolean)).size !== 4 || selectedTOs.some((item) => !item)) {
      setDashboardError('Choose 4 different TO users.');
      return;
    }

    setTOActionNominationId(nominationId);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await assignNominationTOs({
        nominationId,
        toSupervisorId: user.id,
        toIds: selectedTOs,
      });
      await refreshInstructorData();
      setDashboardMessage('TO crew updated.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to update TO crew.');
    } finally {
      setTOActionNominationId(null);
    }
  };

  const navItems = [
    { id: 'nominations' as const, label: isInstructor || isTOSupervisor || isStaff ? 'Nominations' : 'My Nominations', icon: Calendar, iconColor: 'text-blue-500', color: 'bg-blue-50' },
    ...(isInstructor
      ? [
          { id: 'teyinat' as const, label: 'Teyinat', icon: FileText, iconColor: 'text-[#581c1c]', color: 'bg-rose-50' },
          { id: 'activity' as const, label: 'Activity', icon: History, iconColor: 'text-amber-600', color: 'bg-amber-50' },
          { id: 'toRanking' as const, label: 'TO Ranking', icon: TrendingUp, iconColor: 'text-teal-600', color: 'bg-teal-50' },
        ]
      : []),
    { id: 'ranking' as const, label: isInstructor || isTOSupervisor || isStaff ? 'Ranking' : 'My Ranking', icon: TrendingUp, iconColor: 'text-green-500', color: 'bg-green-50' },
    ...(!isTO && !isTOSupervisor ? [{ id: 'reports' as const, label: isStaff ? 'Reports' : 'My Reports', icon: FileText, iconColor: 'text-purple-500', color: 'bg-purple-50' }] : []),
    { id: 'news' as const, label: 'News', icon: Newspaper, iconColor: 'text-orange-500', color: 'bg-orange-50' },
  ];

  const declinedAssignments = instructorNominations.flatMap((nomination) =>
    nomination.createdById === user.id
      ? nomination.referees
      .filter((referee) => referee.status === 'Declined')
      .map((referee) => ({
        nomination,
        referee,
      }))
      : [],
  );

  const getReplacementOptions = (nomination: InstructorNomination, slotNumber: number) => {
    const occupied = new Set(
      nomination.referees.filter((item) => item.slotNumber !== slotNumber).map((item) => item.refereeId),
    );

    return referees.filter((referee) => !occupied.has(referee.id));
  };

  const createdNominationSections = useMemo(
    () => splitMatchesByTime(instructorNominations, countdownNow),
    [instructorNominations, countdownNow],
  );
  const assignmentSections = useMemo(
    () => splitMatchesByTime(refereeAssignments, countdownNow),
    [refereeAssignments, countdownNow],
  );

  const handleSaveScore = async (nomination: InstructorNomination) => {
    const finalScore = (scoreInputs[nomination.id] ?? nomination.finalScore ?? '').trim();
    const matchVideoUrl = (videoInputs[nomination.id] ?? nomination.matchVideoUrl ?? '').trim();
    if (!finalScore && !matchVideoUrl) {
      setDashboardError('Enter the final score or paste a YouTube link first.');
      return;
    }

    setScoreActionId(nomination.id);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await updateNominationScore({
        nominationId: nomination.id,
        instructorId: user.id,
        finalScore,
        matchVideoUrl,
      });
      await refreshInstructorData();
      setScoreInputs((prev) => ({
        ...prev,
        [nomination.id]: finalScore,
      }));
      setVideoInputs((prev) => ({
        ...prev,
        [nomination.id]: matchVideoUrl,
      }));
      setDashboardMessage('Match details saved.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to save match details.');
    } finally {
      setScoreActionId(null);
    }
  };

  const renderFinalScore = (finalScore: string | null) =>
    finalScore ? (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
        Final score: {finalScore}
      </div>
    ) : null;

  const renderMatchVideoButton = (matchVideoUrl: string | null) =>
    matchVideoUrl ? (
      <a
        href={matchVideoUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
      >
        <Youtube size={16} />
        YouTube
      </a>
    ) : null;

  const renderInstructorScoreEditor = (nomination: InstructorNomination) => {
    const isOwner = nomination.createdById === user.id;
    const isPast = isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow);

    if (!isOwner || !isPast) {
      return null;
    }

    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Match Details</div>
        <div className="mt-3 grid gap-3">
          <input
            value={scoreInputs[nomination.id] ?? nomination.finalScore ?? ''}
            onChange={(event) =>
              setScoreInputs((prev) => ({
                ...prev,
                [nomination.id]: event.target.value,
              }))
            }
            placeholder="e.g. 89:76"
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
          />
          <input
            value={videoInputs[nomination.id] ?? nomination.matchVideoUrl ?? ''}
            onChange={(event) =>
              setVideoInputs((prev) => ({
                ...prev,
                [nomination.id]: event.target.value,
              }))
            }
            placeholder="https://www.youtube.com/watch?v=..."
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
          />
          <button
            onClick={() => handleSaveScore(nomination)}
            disabled={scoreActionId === nomination.id}
            className="rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
            {scoreActionId === nomination.id ? 'Saving...' : 'Save match details'}
          </button>
        </div>
      </div>
    );
  };

  const renderCreatedNominationCard = (nomination: InstructorNomination) => (
    <div key={nomination.id} className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase text-[#581c1c]">{nomination.gameCode}</div>
          <h4 className="text-lg font-bold text-slate-900">{nomination.teams}</h4>
          <div className="mt-1 text-xs text-slate-500">Created by: {nomination.createdByName}</div>
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
        {isInstructor && nomination.createdById === user.id ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                editingNominationId === nomination.id ? handleCancelEditNomination() : handleStartEditNomination(nomination)
              }
              className="inline-flex items-center gap-2 self-start rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
            >
              <Pencil size={14} />
              {editingNominationId === nomination.id ? 'Cancel Edit' : 'Edit'}
            </button>
            <button
              onClick={() => handleDeleteNomination(nomination.id)}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white"
            >
              <Trash2 size={14} />
              Delete Game
            </button>
          </div>
        ) : null}
      </div>
      {renderFinalScore(nomination.finalScore)}
      {renderMatchVideoButton(nomination.matchVideoUrl)}
      {renderInstructorScoreEditor(nomination)}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {nomination.referees.map((referee) => {
          const replaceKey = `${nomination.id}-${referee.slotNumber}`;
          const options = getReplacementOptions(nomination, referee.slotNumber);
          const canReplaceSlot = nomination.createdById === user.id && referee.status !== 'Accepted';

          return (
            <div key={replaceKey} className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase text-slate-500">{getNominationSlotLabel(referee.slotNumber)}</div>
              {editingNominationId === nomination.id ? (
                <select
                  value={editSelections[`referee${referee.slotNumber}`] || ''}
                  onChange={(e) =>
                    setEditSelections((prev) => ({ ...prev, [`referee${referee.slotNumber}`]: e.target.value }))
                  }
                  className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
                >
                  <option value="">Select official</option>
                  {getReplacementOptions(nomination, referee.slotNumber)
                    .concat(
                      referees.filter((option) => option.id === referee.refereeId),
                    )
                    .filter((option, index, array) => array.findIndex((item) => item.id === option.id) === index)
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {`${option.fullName} (${option.role})`}
                      </option>
                    ))}
                </select>
              ) : (
                <>
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
                </>
              )}
              {editingNominationId !== nomination.id && canReplaceSlot ? (
                <div className="mt-3 space-y-2">
                  <select
                    value={replaceSelections[replaceKey] || ''}
                    onChange={(e) => setReplaceSelections((prev) => ({ ...prev, [replaceKey]: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
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
                    className="w-full rounded-xl bg-[#581c1c] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {replaceActionKey === replaceKey ? 'Replacing...' : `Replace ${getNominationSlotLabel(referee.slotNumber)}`}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">TO Crew</div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((slotNumber) => {
            const existingAssignment = nomination.toCrew.find((item) => item.slotNumber === slotNumber);
            const currentSelection = getTONominationSelection(nomination)[slotNumber - 1] || '';
            const canAssignTOCrew = isTOSupervisor && !isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow);
            return (
              <div key={`${nomination.id}-to-${slotNumber}`} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-bold uppercase text-slate-500">{getTOSlotLabel(slotNumber)}</div>
                {canAssignTOCrew ? (
                  <select
                    value={currentSelection}
                    onChange={(event) =>
                      setTOSelections((prev) => {
                        const next = [...getTONominationSelection(nomination)];
                        next[slotNumber - 1] = event.target.value;
                        return { ...prev, [nomination.id]: next };
                      })
                    }
                    className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
                  >
                    <option value="">Select TO</option>
                    {toOfficials.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.fullName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <div className="mt-1 font-semibold text-slate-900">{existingAssignment?.toName || 'Not assigned'}</div>
                    {existingAssignment ? (
                      <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getAssignmentStatusClasses(existingAssignment.status)}`}>
                        {existingAssignment.status}
                      </div>
                    ) : null}
                  </>
                )}
                {canAssignTOCrew && existingAssignment ? (
                  <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getAssignmentStatusClasses(existingAssignment.status)}`}>
                    {existingAssignment.status}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {isTOSupervisor && isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow) ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            TO crew can no longer be assigned after the match starts.
          </div>
        ) : null}
        {isTOSupervisor && !isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleSaveTOCrew(nomination.id)}
              disabled={toActionNominationId === nomination.id}
              className="rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
            >
              {toActionNominationId === nomination.id ? 'Saving TO Crew...' : 'Save TO Crew'}
            </button>
          </div>
        )}
      </div>
      {editingNominationId === nomination.id && (
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            onClick={handleCancelEditNomination}
            className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSaveEditedNomination(nomination.id)}
            disabled={editActionNominationId === nomination.id}
            className="rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
            {editActionNominationId === nomination.id ? 'Saving...' : 'Save Crew'}
          </button>
        </div>
      )}
    </div>
  );

  const renderAssignmentCard = (assignment: RefereeNomination) => (
    <div key={assignment.id} className="rounded-xl border border-slate-200 p-4">
      {user.role === 'Referee' && assignment.assignmentGroup === 'Referee' && isUpcomingMatchDay(assignment.matchDate, assignment.matchTime, countdownNow) ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          <div className="font-black uppercase tracking-[0.18em] text-emerald-700">Gameday!</div>
          <div className="mt-1 font-medium">Good luck today. Stay sharp and have a great game.</div>
        </div>
      ) : null}
      {assignment.assignmentGroup === 'Referee' && assignment.status === 'Pending' ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {formatAutoDeclineCountdown(assignment.autoDeclineAt, countdownNow) || 'Auto reject timer unavailable.'}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase text-[#581c1c]">{assignment.gameCode}</div>
          <div className="text-xs font-bold uppercase text-[#581c1c]">{assignment.assignmentLabel}</div>
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
          getAssignmentStatusClasses(assignment.status)
        }`}>
          {assignment.status}
        </div>
      </div>
      {renderFinalScore(assignment.finalScore)}
      {renderMatchVideoButton(assignment.matchVideoUrl)}
      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {assignment.assignmentGroup === 'TO' ? 'Referee Crew' : 'Crew'}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {assignment.crew.map((official) => (
            <div key={`${assignment.id}-${official.refereeId}-${official.slotNumber}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] font-bold uppercase text-slate-500">{getNominationSlotLabel(official.slotNumber)}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{official.refereeName}</div>
            </div>
          ))}
        </div>
      </div>
      {user.role === 'Referee' && assignment.toCrew.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          TO crew will appear after the TO Supervisor assigns officials and they accept the game.
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">TO Crew</div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {[1, 2, 3, 4].map((slotNumber) => {
              const toSlot = assignment.toCrew.find((item) => item.slotNumber === slotNumber);
              return (
                <div key={`${assignment.id}-to-${slotNumber}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[11px] font-bold uppercase text-slate-500">{getTOSlotLabel(slotNumber)}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {toSlot?.toName || (user.role === 'Referee' ? 'Awaiting confirmation' : 'Not assigned')}
                  </div>
                  {toSlot ? (
                    <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${getAssignmentStatusClasses(toSlot.status)}`}>
                      {toSlot.status}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
  );

  return (
      <Layout title={isInstructor ? 'Instructor Panel' : isTOSupervisor ? 'TO Supervisor Panel' : isStaff ? 'Staff Panel' : isTO ? 'TO Dashboard' : 'RefZone Dashboard'} showBack={false} onLogout={onLogout}>
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

      {isInstructor && (
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
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Upcoming Games</div>
                  {createdNominationSections.upcoming.length === 0 ? (
                    <p className="text-sm text-slate-500">No upcoming nominations.</p>
                  ) : (
                    createdNominationSections.upcoming.map(renderCreatedNominationCard)
                  )}
                </div>
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Past Games</div>
                  {createdNominationSections.past.length === 0 ? (
                    <p className="text-sm text-slate-500">No past games yet.</p>
                  ) : (
                    createdNominationSections.past.map(renderCreatedNominationCard)
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isTOSupervisor && (
        <div className="space-y-5 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={18} className="text-[#581c1c]" />
              <h3 className="text-base font-bold text-slate-900">TO Supervisor Controls</h3>
            </div>
            <p className="text-sm text-slate-500">New games appear here automatically. Choose 4 TO officials for each match.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4">Games Awaiting TO Crew</h3>
            {isLoadingAssignments ? (
              <p className="text-sm text-slate-500">Loading games...</p>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Upcoming Games</div>
                  {createdNominationSections.upcoming.length === 0 ? (
                    <p className="text-sm text-slate-500">No upcoming games.</p>
                  ) : (
                    createdNominationSections.upcoming.map(renderCreatedNominationCard)
                  )}
                </div>
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Past Games</div>
                  {createdNominationSections.past.length === 0 ? (
                    <p className="text-sm text-slate-500">No past games yet.</p>
                  ) : (
                    createdNominationSections.past.map(renderCreatedNominationCard)
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(user.role === 'Referee' || isInstructor || isTO) && (
        <div className="space-y-5 mb-8">
          {replacementNotices.length > 0 && !isTO && (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-red-600" />
                <h3 className="text-base font-bold text-slate-900">Replacement Notices</h3>
              </div>
              <div className="space-y-3">
                {replacementNotices.map((notice) => (
                  <div key={notice.id} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <div className="text-sm font-bold text-red-800">
                      You were replaced for {notice.gameCode} as {getNominationSlotLabel(notice.slotNumber)}.
                    </div>
                    <div className="mt-1 text-sm text-red-700">
                      {notice.teams} | {notice.matchDate} at {notice.matchTime}
                    </div>
                    <div className="mt-1 text-xs font-medium text-red-700">
                      New official: {notice.newRefereeName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-[#581c1c]" />
              <h3 className="text-base font-bold text-slate-900">
                {user.role === 'Instructor' ? 'My Game Assignments' : 'Game Assignments'}
              </h3>
            </div>
            {isLoadingAssignments ? (
              <p className="text-sm text-slate-500">Loading assignments...</p>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Upcoming Assigned Games</div>
                  {assignmentSections.upcoming.length === 0 ? (
                    <p className="text-sm text-slate-500">No upcoming games yet.</p>
                  ) : (
                    assignmentSections.upcoming.map(renderAssignmentCard)
                  )}
                </div>
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Past Games</div>
                  {assignmentSections.past.length === 0 ? (
                    <p className="text-sm text-slate-500">No past games yet.</p>
                  ) : (
                    assignmentSections.past.map(renderAssignmentCard)
                  )}
                </div>
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
