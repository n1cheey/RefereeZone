import React, { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { User, InstructorNomination, RefereeNomination } from '../types';
import { getNominationSlotLabel } from '../slotLabels';
import { formatAutoDeclineCountdown } from '../assignmentCountdown';
import { isPastMatch } from '../matchTiming';
import { Calendar, CheckCircle2, Clock, MapPin, Trash2, XCircle } from 'lucide-react';
import {
  deleteNomination,
  getInstructorNominations,
  getRefereeNominations,
  respondToNomination,
  updateNominationScore,
} from '../services/nominationService';

interface NominationsProps {
  user: User;
  onBack: () => void;
}

const POLL_INTERVAL_MS = 45000;

const splitMatchesByTime = <T extends { matchDate: string; matchTime: string }>(items: T[], now: number) => ({
  upcoming: items.filter((item) => !isPastMatch(item.matchDate, item.matchTime, now)),
  past: items.filter((item) => isPastMatch(item.matchDate, item.matchTime, now)),
});

const Nominations: React.FC<NominationsProps> = ({ user, onBack }) => {
  const [instructorNominations, setInstructorNominations] = useState<InstructorNomination[]>([]);
  const [refereeAssignments, setRefereeAssignments] = useState<RefereeNomination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionAssignmentId, setActionAssignmentId] = useState<string | null>(null);
  const [scoreActionId, setScoreActionId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    const load = async (showLoader: boolean) => {
      if (showLoader) {
        setIsLoading(true);
      }

      try {
        if (user.role === 'Instructor') {
          const [instructorResponse, assignmentResponse] = await Promise.all([
            getInstructorNominations(user.id),
            getRefereeNominations(user.id),
          ]);
          if (isMounted) {
            setInstructorNominations(instructorResponse.nominations);
            setRefereeAssignments(assignmentResponse.nominations);
            setErrorMessage('');
          }
        } else if (user.role === 'Staff') {
          const response = await getInstructorNominations(user.id);
          if (isMounted) {
            setInstructorNominations(response.nominations);
            setRefereeAssignments([]);
            setErrorMessage('');
          }
        } else if (user.role === 'Referee') {
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
      const response = await getInstructorNominations(user.id);
      setInstructorNominations(response.nominations);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete game.');
    }
  };

  const handleSaveScore = async (nomination: InstructorNomination) => {
    const finalScore = (scoreInputs[nomination.id] ?? nomination.finalScore ?? '').trim();
    if (!finalScore) {
      setErrorMessage('Enter the final score first.');
      return;
    }

    setScoreActionId(nomination.id);
    try {
      await updateNominationScore({
        nominationId: nomination.id,
        instructorId: user.id,
        finalScore,
      });

      const [instructorResponse, assignmentResponse] = await Promise.all([
        getInstructorNominations(user.id),
        getRefereeNominations(user.id),
      ]);
      setInstructorNominations(instructorResponse.nominations);
      setRefereeAssignments(assignmentResponse.nominations);
      setScoreInputs((prev) => ({
        ...prev,
        [nomination.id]: finalScore,
      }));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save final score.');
    } finally {
      setScoreActionId(null);
    }
  };

  const renderCrew = (crew: RefereeNomination['crew']) => (
    <div className="mt-4 rounded-xl bg-slate-50 p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Crew</div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {crew.map((official) => (
          <div key={`${official.refereeId}-${official.slotNumber}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-[11px] font-bold uppercase text-slate-500">{getNominationSlotLabel(official.slotNumber)}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{official.refereeName}</div>
            <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
              official.status === 'Accepted'
                ? 'bg-green-100 text-green-700'
                : official.status === 'Declined'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
            }`}>
              {official.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFinalScore = (finalScore: string | null) =>
    finalScore ? (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
        Final score: {finalScore}
      </div>
    ) : null;

  const renderInstructorScoreEditor = (nomination: InstructorNomination) => {
    const isOwner = user.role === 'Instructor' && nomination.createdById === user.id;
    const isPast = isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow);

    if (!isOwner || !isPast) {
      return null;
    }

    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Final Score</div>
        <div className="mt-3 flex flex-col gap-3 md:flex-row">
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
          <button
            onClick={() => handleSaveScore(nomination)}
            disabled={scoreActionId === nomination.id}
            className="rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
            {scoreActionId === nomination.id ? 'Saving...' : 'Save score'}
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
          {user.role === 'Instructor' && nomination.createdById === user.id ? (
            <button
              onClick={() => handleDeleteNomination(nomination.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"
            >
              <Trash2 size={14} />
              Delete
            </button>
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
        {renderInstructorScoreEditor(nomination)}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {nomination.referees.map((referee) => (
            <div key={`${nomination.id}-${referee.slotNumber}`} className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase text-slate-500">{getNominationSlotLabel(referee.slotNumber)}</div>
              <div className="mt-1 font-semibold text-slate-900">{referee.refereeName}</div>
              <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                referee.status === 'Accepted'
                  ? 'bg-green-100 text-green-700'
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
    </div>
  );

  const renderAssignmentCard = (nom: RefereeNomination) => (
    <div key={nom.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-[#581c1c]/5 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
        <span className="text-xs font-bold text-[#581c1c]">{getNominationSlotLabel(nom.slotNumber)}</span>
        <div className="flex items-center gap-2">
          {nom.status === 'Accepted' && <span className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1"><CheckCircle2 size={10} /> Accepted</span>}
          {nom.status === 'Declined' && <span className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1"><XCircle size={10} /> Declined</span>}
          {nom.status === 'Pending' && <span className="text-[10px] font-bold text-amber-600 uppercase">Pending</span>}
          <span className="text-[10px] text-slate-500 uppercase">{nom.nominationId}</span>
        </div>
      </div>
      <div className="p-4">
        {nom.status === 'Pending' ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {formatAutoDeclineCountdown(nom.autoDeclineAt, countdownNow) || 'Auto reject timer unavailable.'}
          </div>
        ) : null}
        <div className="text-lg font-bold text-slate-800 mb-3">{nom.teams}</div>
        <div className="text-xs font-bold uppercase text-[#581c1c] mb-2">{nom.gameCode}</div>
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
        {renderCrew(nom.crew)}

        {nom.status === 'Pending' ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => handleStatusChange(nom.nominationId, 'Accepted', nom.id)}
              disabled={actionAssignmentId === nom.id}
              className="py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-70"
            >
              {actionAssignmentId === nom.id ? 'Saving...' : 'Accept'}
            </button>
            <button
              onClick={() => handleStatusChange(nom.nominationId, 'Declined', nom.id)}
              disabled={actionAssignmentId === nom.id}
              className="py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm disabled:opacity-70"
            >
              {actionAssignmentId === nom.id ? 'Saving...' : 'Decline'}
            </button>
          </div>
        ) : (
          <div className={`mt-4 p-2 rounded-lg text-center text-xs font-bold ${
            nom.status === 'Accepted' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            Assignment {nom.status}
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
    <Layout title="My Nominations" onBack={onBack}>
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading nominations...</p>
      ) : user.role === 'Instructor' || user.role === 'Staff' ? (
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

          {user.role === 'Instructor' && (
            <>
              {renderAssignmentSection(
                'Upcoming Assigned Games',
                assignmentSections.upcoming,
                'No upcoming assigned games.',
              )}
              {renderAssignmentSection(
                'Past Assigned Games',
                assignmentSections.past,
                'No past assigned games.',
              )}
            </>
          )}
        </div>
      ) : user.role === 'Referee' ? (
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
