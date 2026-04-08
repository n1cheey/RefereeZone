import React, { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { User, InstructorNomination, RefereeDirectoryItem, RefereeNomination } from '../types';
import { getNominationSlotLabel, getTOSlotLabel } from '../slotLabels';
import { formatAutoDeclineCountdown } from '../assignmentCountdown';
import { isPastMatch } from '../matchTiming';
import { Calendar, CheckCircle2, Clock, FileText, MapPin, Pencil, Trash2, XCircle, Youtube } from 'lucide-react';
import {
  assignNominationTOs,
  deleteNomination,
  editNominationOfficials,
  getInstructorDashboard,
  getInstructorNominations,
  getRefereeNominations,
  respondToNomination,
  updateNominationScore,
} from '../services/nominationService';
import { getAssignmentStatusLabel, useI18n } from '../i18n';

interface NominationsProps {
  user: User;
  onBack: () => void;
}

const POLL_INTERVAL_MS = 45000;

const splitMatchesByTime = <T extends { matchDate: string; matchTime: string }>(items: T[], now: number) => ({
  upcoming: items.filter((item) => !isPastMatch(item.matchDate, item.matchTime, now)),
  past: items.filter((item) => isPastMatch(item.matchDate, item.matchTime, now)),
});

const getAssignmentStatusClasses = (status: string) => {
  if (status === 'Accepted') {
    return 'bg-green-100 text-green-700';
  }

  if (status === 'Declined') {
    return 'bg-red-100 text-red-700';
  }

  if (status === 'Assigned') {
    return 'bg-blue-100 text-blue-700';
  }

  return 'bg-amber-100 text-amber-700';
};

const Nominations: React.FC<NominationsProps> = ({ user, onBack }) => {
  const { language, t } = useI18n();
  const [referees, setReferees] = useState<RefereeDirectoryItem[]>([]);
  const [toOfficials, setTOOfficials] = useState<RefereeDirectoryItem[]>([]);
  const [instructorNominations, setInstructorNominations] = useState<InstructorNomination[]>([]);
  const [refereeAssignments, setRefereeAssignments] = useState<RefereeNomination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionAssignmentId, setActionAssignmentId] = useState<string | null>(null);
  const [editingNominationId, setEditingNominationId] = useState<string | null>(null);
  const [editSelections, setEditSelections] = useState<Record<string, string>>({});
  const [editActionNominationId, setEditActionNominationId] = useState<string | null>(null);
  const [toActionNominationId, setTOActionNominationId] = useState<string | null>(null);
  const [toSelections, setTOSelections] = useState<Record<string, string[]>>({});
  const [scoreActionId, setScoreActionId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [videoInputs, setVideoInputs] = useState<Record<string, string>>({});
  const [protocolInputs, setProtocolInputs] = useState<Record<string, string>>({});
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const isInstructor = user.role === 'Instructor';
  const isStaff = user.role === 'Staff';
  const isTOSupervisor = user.role === 'TO Supervisor';
  const isTO = user.role === 'TO';

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    const load = async (showLoader: boolean) => {
      if (showLoader) {
        setIsLoading(true);
      }

      try {
        if (user.role === 'Instructor' || user.role === 'TO Supervisor') {
          const dashboardResponse = await getInstructorDashboard(user.id);
          if (isMounted) {
            setReferees(dashboardResponse.referees);
            setTOOfficials(dashboardResponse.toOfficials);
            setInstructorNominations(dashboardResponse.nominations);
            setRefereeAssignments(dashboardResponse.assignments);
            setErrorMessage('');
          }
        } else if (user.role === 'Staff') {
          const response = await getInstructorNominations(user.id);
          if (isMounted) {
            setInstructorNominations(response.nominations);
            setRefereeAssignments([]);
            setErrorMessage('');
          }
        } else if (user.role === 'Referee' || user.role === 'TO') {
          const response = await getRefereeNominations(user.id);
          if (isMounted) {
            setRefereeAssignments(response.nominations);
            setErrorMessage('');
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load nominations.');
        }
      } finally {
        if (isMounted && showLoader) {
          setIsLoading(false);
        }
      }
    };

    const startPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          void load(false);
        }
      }, POLL_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void load(false);
        startPolling();
        return;
      }

      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    void load(true);
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

  const instructorSections = useMemo(
    () => splitMatchesByTime(instructorNominations, countdownNow),
    [instructorNominations, countdownNow],
  );
  const assignmentSections = useMemo(
    () => splitMatchesByTime(refereeAssignments, countdownNow),
    [refereeAssignments, countdownNow],
  );

  const handleStatusChange = async (nominationId: string, status: 'Accepted' | 'Declined', assignmentId: string) => {
    setActionAssignmentId(assignmentId);
    try {
      await respondToNomination({
        nominationId,
        refereeId: user.id,
        response: status,
      });
      const response = await getRefereeNominations(user.id);
      setRefereeAssignments(response.nominations);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save response.');
    } finally {
      setActionAssignmentId(null);
    }
  };

  const handleDeleteNomination = async (nominationId: string) => {
    try {
      await deleteNomination({
        nominationId,
        instructorId: user.id,
      });
      const response = await getInstructorDashboard(user.id);
      setReferees(response.referees);
      setTOOfficials(response.toOfficials);
      setInstructorNominations(response.nominations);
      setRefereeAssignments(response.assignments);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete game.');
    }
  };

  const handleSaveScore = async (nomination: InstructorNomination) => {
    const finalScore = (scoreInputs[nomination.id] ?? nomination.finalScore ?? '').trim();
    const matchVideoUrl = (videoInputs[nomination.id] ?? nomination.matchVideoUrl ?? '').trim();
    const matchProtocolUrl = (protocolInputs[nomination.id] ?? nomination.matchProtocolUrl ?? '').trim();
    if (!finalScore && !matchVideoUrl && !matchProtocolUrl) {
      setErrorMessage('Enter the final score, a YouTube link, or a Game Scoresheet link first.');
      return;
    }

    setScoreActionId(nomination.id);
    try {
      await updateNominationScore({
        nominationId: nomination.id,
        instructorId: user.id,
        finalScore,
        matchVideoUrl,
        matchProtocolUrl,
      });

      const response = await getInstructorDashboard(user.id);
      setReferees(response.referees);
      setTOOfficials(response.toOfficials);
      setInstructorNominations(response.nominations);
      setRefereeAssignments(response.assignments);
      setScoreInputs((prev) => ({
        ...prev,
        [nomination.id]: finalScore,
      }));
      setVideoInputs((prev) => ({
        ...prev,
        [nomination.id]: matchVideoUrl,
      }));
      setProtocolInputs((prev) => ({
        ...prev,
        [nomination.id]: matchProtocolUrl,
      }));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save match details.');
    } finally {
      setScoreActionId(null);
    }
  };

  const getReplacementOptions = (nomination: InstructorNomination, slotNumber: number) => {
    const occupied = new Set(
      nomination.referees.filter((item) => item.slotNumber !== slotNumber).map((item) => item.refereeId),
    );

    return referees.filter((referee) => !occupied.has(referee.id));
  };

  const handleStartEditNomination = (nomination: InstructorNomination) => {
    setEditingNominationId(nomination.id);
    setEditSelections({
      referee1: nomination.referees.find((item) => item.slotNumber === 1)?.refereeId || '',
      referee2: nomination.referees.find((item) => item.slotNumber === 2)?.refereeId || '',
      referee3: nomination.referees.find((item) => item.slotNumber === 3)?.refereeId || '',
    });
    setErrorMessage('');
  };

  const handleCancelEditNomination = () => {
    setEditingNominationId(null);
    setEditSelections({});
  };

  const handleSaveEditedNomination = async (nominationId: string) => {
    const refereeIds = [editSelections.referee1, editSelections.referee2, editSelections.referee3];

    if (new Set(refereeIds).size !== 3 || refereeIds.some((item) => !item)) {
      setErrorMessage('Choose 3 different officials.');
      return;
    }

    setEditActionNominationId(nominationId);

    try {
      await editNominationOfficials({
        nominationId,
        instructorId: user.id,
        refereeIds,
      });

      const response = await getInstructorDashboard(user.id);
      setReferees(response.referees);
      setTOOfficials(response.toOfficials);
      setInstructorNominations(response.nominations);
      setRefereeAssignments(response.assignments);
      handleCancelEditNomination();
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update game crew.');
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
      setErrorMessage('Choose 4 different TO users.');
      return;
    }

    setTOActionNominationId(nominationId);

    try {
      await assignNominationTOs({
        nominationId,
        toSupervisorId: user.id,
        toIds: selectedTOs,
      });

      const response = await getInstructorDashboard(user.id);
      setReferees(response.referees);
      setTOOfficials(response.toOfficials);
      setInstructorNominations(response.nominations);
      setRefereeAssignments(response.assignments);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update TO crew.');
    } finally {
      setTOActionNominationId(null);
    }
  };

  const renderCrew = (crew: RefereeNomination['crew']) => (
    <div className="mt-4 rounded-xl bg-slate-50 p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Crew</div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {crew.map((official) => (
          <div key={`${official.refereeId}-${official.slotNumber}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] font-bold uppercase text-slate-500">{getNominationSlotLabel(official.slotNumber, language)}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{official.refereeName}</div>
            <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
              official.status === 'Accepted'
                ? 'bg-green-100 text-green-700'
                : official.status === 'Declined'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
            }`}>
              {getAssignmentStatusLabel(official.status, language)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFinalScore = (finalScore: string | null) =>
    finalScore ? (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
        {t('common.finalScore', { score: finalScore })}
      </div>
    ) : null;

  const renderMatchLinks = (matchVideoUrl: string | null, matchProtocolUrl: string | null) => {
    if (!matchVideoUrl && !matchProtocolUrl) {
      return null;
    }

    const baseButtonClass =
      'inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors';

    return (
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {matchVideoUrl ? (
          <a
            href={matchVideoUrl}
            target="_blank"
            rel="noreferrer"
            className={`${baseButtonClass} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
          >
            <Youtube size={16} />
            {t('common.youtube')}
          </a>
        ) : null}
        {matchProtocolUrl ? (
          <a
            href={matchProtocolUrl}
            target="_blank"
            rel="noreferrer"
            className={`${baseButtonClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
          >
            <FileText size={16} />
            {t('common.gameScoresheet')}
          </a>
        ) : null}
      </div>
    );
  };

  const renderInstructorScoreEditor = (nomination: InstructorNomination) => {
    const isOwner = user.role === 'Instructor' && nomination.createdById === user.id;
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
          <input
            value={protocolInputs[nomination.id] ?? nomination.matchProtocolUrl ?? ''}
            onChange={(event) =>
              setProtocolInputs((prev) => ({
                ...prev,
                [nomination.id]: event.target.value,
              }))
            }
            placeholder="https://drive.google.com/... (game scoresheet)"
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

  const renderInstructorNominationCard = (nomination: InstructorNomination) => (
    <div key={nomination.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-[#581c1c]/5 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
        <span className="text-xs font-bold text-[#581c1c]">Instructor Match</span>
        <span className="text-[10px] text-slate-500 uppercase">{nomination.id}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-slate-800 mb-3">{nomination.teams}</div>
            <div className="text-xs font-bold uppercase text-[#581c1c] mb-2">{nomination.gameCode}</div>
            <div className="text-xs text-slate-500">Created by: {nomination.createdByName}</div>
          </div>
          {isInstructor && nomination.createdById === user.id ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  editingNominationId === nomination.id ? handleCancelEditNomination() : handleStartEditNomination(nomination)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-800"
              >
                <Pencil size={14} />
                {editingNominationId === nomination.id ? 'Cancel Edit' : 'Edit'}
              </button>
              <button
                onClick={() => handleDeleteNomination(nomination.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#f97316]" />
            {nomination.matchDate}
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#f97316]" />
            {nomination.matchTime}
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <MapPin size={14} className="text-[#f97316]" />
            {nomination.venue}
          </div>
        </div>
        {renderFinalScore(nomination.finalScore)}
        {renderMatchLinks(nomination.matchVideoUrl, nomination.matchProtocolUrl)}
        {renderInstructorScoreEditor(nomination)}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {nomination.referees.map((referee) => (
            <div key={`${nomination.id}-${referee.slotNumber}`} className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase text-slate-500">{getNominationSlotLabel(referee.slotNumber, language)}</div>
              {editingNominationId === nomination.id ? (
                <select
                  value={editSelections[`referee${referee.slotNumber}`] || ''}
                  onChange={(event) =>
                    setEditSelections((prev) => ({
                      ...prev,
                      [`referee${referee.slotNumber}`]: event.target.value,
                    }))
                  }
                  className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
                >
                  <option value="">Select official</option>
                  {getReplacementOptions(nomination, referee.slotNumber)
                    .concat(referees.filter((option) => option.id === referee.refereeId))
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
                  <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                    referee.status === 'Accepted'
                      ? 'bg-green-100 text-green-700'
                      : referee.status === 'Declined'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {getAssignmentStatusLabel(referee.status, language)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('common.toCrew')}</div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((slotNumber) => {
              const existingAssignment = nomination.toCrew.find((item) => item.slotNumber === slotNumber);
              const currentSelection = getTONominationSelection(nomination)[slotNumber - 1] || '';
              const canAssignTOCrew = isTOSupervisor && !isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow);
              return (
                <div key={`${nomination.id}-to-${slotNumber}`} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-bold uppercase text-slate-500">{getTOSlotLabel(slotNumber, language)}</div>
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
                        <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${getAssignmentStatusClasses(existingAssignment.status)}`}>
                        {getAssignmentStatusLabel(existingAssignment.status, language)}
                        </div>
                      ) : null}
                    </>
                  )}
                  {canAssignTOCrew && existingAssignment ? (
                    <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${getAssignmentStatusClasses(existingAssignment.status)}`}>
                      {getAssignmentStatusLabel(existingAssignment.status, language)}
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
    </div>
  );

  const renderAssignmentCard = (nom: RefereeNomination) => (
    <div key={nom.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-[#581c1c]/5 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
        <span className="text-xs font-bold text-[#581c1c]">{nom.assignmentLabel}</span>
        <div className="flex items-center gap-2">
          {nom.status === 'Accepted' && <span className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1"><CheckCircle2 size={10} /> {getAssignmentStatusLabel('Accepted', language)}</span>}
          {nom.status === 'Declined' && <span className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1"><XCircle size={10} /> {getAssignmentStatusLabel('Declined', language)}</span>}
          {nom.status === 'Pending' && <span className="text-[10px] font-bold text-amber-600 uppercase">{getAssignmentStatusLabel('Pending', language)}</span>}
          <span className="text-[10px] text-slate-500 uppercase">{nom.nominationId}</span>
        </div>
      </div>
      <div className="p-4">
        {nom.assignmentGroup === 'Referee' && nom.status === 'Pending' ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {formatAutoDeclineCountdown(nom.autoDeclineAt, countdownNow, language) || t('dashboard.autoRejectUnavailable')}
          </div>
        ) : null}
        <div className="text-lg font-bold text-slate-800 mb-3">{nom.teams}</div>
        <div className="text-xs font-bold uppercase text-[#581c1c] mb-2">{nom.gameCode}</div>
        <div className="text-xs font-bold uppercase text-[#581c1c] mb-2">{nom.assignmentLabel}</div>
        <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#f97316]" />
            {nom.matchDate}
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#f97316]" />
            {nom.matchTime}
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <MapPin size={14} className="text-[#f97316]" />
            {nom.venue}
          </div>
          <div className="col-span-2 text-xs uppercase font-semibold tracking-wide text-slate-500">
            Instructor: {nom.instructorName}
          </div>
        </div>
        {renderFinalScore(nom.finalScore)}
        {renderMatchLinks(nom.matchVideoUrl, nom.matchProtocolUrl)}
        {renderCrew(nom.crew)}
        {user.role === 'Referee' && nom.toCrew.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            TO crew will appear after the TO Supervisor assigns officials and they accept the game.
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('common.toCrew')}</div>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              {[1, 2, 3, 4].map((slotNumber) => {
                const toSlot = nom.toCrew.find((item) => item.slotNumber === slotNumber);
                return (
                  <div key={`${nom.id}-to-${slotNumber}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[11px] font-bold uppercase text-slate-500">{getTOSlotLabel(slotNumber, language)}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {toSlot?.toName || (user.role === 'Referee' ? t('common.awaitingConfirmation') : t('common.notAssigned'))}
                    </div>
                    {toSlot ? (
                      <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${getAssignmentStatusClasses(toSlot.status)}`}>
                        {getAssignmentStatusLabel(toSlot.status, language)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {nom.status === 'Pending' ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => handleStatusChange(nom.nominationId, 'Accepted', nom.id)}
              disabled={actionAssignmentId === nom.id}
              className="py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-70"
            >
              {actionAssignmentId === nom.id ? t('common.saving') : t('dashboard.accept')}
            </button>
            <button
              onClick={() => handleStatusChange(nom.nominationId, 'Declined', nom.id)}
              disabled={actionAssignmentId === nom.id}
              className="py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm disabled:opacity-70"
            >
              {actionAssignmentId === nom.id ? t('common.saving') : t('dashboard.decline')}
            </button>
          </div>
        ) : (
          <div className={`mt-4 p-2 rounded-lg text-center text-xs font-bold ${
            nom.status === 'Accepted'
              ? 'bg-green-50 text-green-700'
              : nom.status === 'Assigned'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'
          }`}>
            {`Assignment ${getAssignmentStatusLabel(nom.status, language)}`}
          </div>
        )}
      </div>
    </div>
  );

  const renderInstructorSection = (title: string, items: InstructorNomination[], emptyMessage: string) => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest px-1">{title}</h3>
      {items.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-100 p-4 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        items.map(renderInstructorNominationCard)
      )}
    </div>
  );

  const renderAssignmentSection = (title: string, items: RefereeNomination[], emptyMessage: string) => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest px-1">{title}</h3>
      {items.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-100 p-4 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        items.map(renderAssignmentCard)
      )}
    </div>
  );

  return (
    <Layout title={isInstructor || isStaff || isTOSupervisor ? t('nominations.title') : t('nominations.myTitle')} onBack={onBack}>
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('nominations.loading')}</p>
      ) : isInstructor || isStaff || isTOSupervisor ? (
        <div className="space-y-8">
          {renderInstructorSection(
            'Upcoming Games',
            instructorSections.upcoming,
            'No upcoming nominations.',
          )}
          {renderInstructorSection(
            'Past Games',
            instructorSections.past,
            'No past games yet.',
          )}
        </div>
      ) : user.role === 'Referee' || isTO ? (
        <div className="space-y-8">
          {renderAssignmentSection(
            'Upcoming Games',
            assignmentSections.upcoming,
            'No upcoming games yet.',
          )}
          {renderAssignmentSection(
            'Past Games',
            assignmentSections.past,
            'No past games yet.',
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-slate-100 p-4 text-sm text-slate-500">
          This role does not have nomination actions.
        </div>
      )}
    </Layout>
  );
};

export default Nominations;
