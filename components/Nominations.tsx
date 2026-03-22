import React, { useEffect, useState } from 'react';
import Layout from './Layout';
import { User, InstructorNomination, RefereeNomination } from '../types';
import { getNominationSlotLabel } from '../slotLabels';
import { Calendar, CheckCircle2, Clock, MapPin, Trash2, XCircle } from 'lucide-react';
import { deleteNomination, getInstructorNominations, getRefereeNominations, respondToNomination } from '../services/nominationService';

interface NominationsProps {
  user: User;
  onBack: () => void;
}

const Nominations: React.FC<NominationsProps> = ({ user, onBack }) => {
  const [instructorNominations, setInstructorNominations] = useState<InstructorNomination[]>([]);
  const [refereeAssignments, setRefereeAssignments] = useState<RefereeNomination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionAssignmentId, setActionAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        if (user.role === 'Instructor') {
          const [instructorResponse, assignmentResponse] = await Promise.all([
            getInstructorNominations(user.id),
            getRefereeNominations(user.id),
          ]);
          if (isMounted) {
            setInstructorNominations(instructorResponse.nominations);
            setRefereeAssignments(assignmentResponse.nominations);
          }
        } else if (user.role === 'Referee') {
          const response = await getRefereeNominations(user.id);
          if (isMounted) {
            setRefereeAssignments(response.nominations);
          }
        }
        if (isMounted) {
          setErrorMessage('');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load nominations.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [user.id, user.role]);

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

  return (
    <Layout title="My Nominations" onBack={onBack}>
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading nominations...</p>
      ) : user.role === 'Instructor' ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest px-1">Created Games</h3>
          {instructorNominations.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-100 p-4 text-sm text-slate-500">
              No nominations created yet.
            </div>
          ) : (
            instructorNominations.map((nomination) => (
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
                    </div>
                    <button
                      onClick={() => handleDeleteNomination(nomination.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
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
            ))
          )}

          <h3 className="pt-4 text-sm font-semibold text-slate-400 uppercase tracking-widest px-1">Assigned Games</h3>
          {refereeAssignments.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-100 p-4 text-sm text-slate-500">
              No game assignments yet.
            </div>
          ) : (
            refereeAssignments.map((nom) => (
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
                  </div>

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
            ))
          )}
        </div>
      ) : user.role === 'Referee' ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest px-1">Upcoming Games</h3>
          {refereeAssignments.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-100 p-4 text-sm text-slate-500">
              No assignments yet.
            </div>
          ) : (
            refereeAssignments.map((nom) => (
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
                  </div>

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
            ))
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
