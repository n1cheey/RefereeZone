import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Download, MapPin } from 'lucide-react';
import Layout from './Layout';
import MatchTeamsHeader from './MatchTeamsHeader';
import { getNominationSlotLabel } from '../slotLabels';
import { exportTeyinatPdf, TeyinatGroup } from '../services/teyinatPdf';
import { getInstructorNominations } from '../services/nominationService';
import { InstructorNomination, User } from '../types';
import { useI18n } from '../i18n';

interface TeyinatProps {
  user: User;
  onBack: () => void;
}

const MAX_SELECTED_GAMES = 6;
const MAX_GROUP_GAMES = 3;

const Teyinat: React.FC<TeyinatProps> = ({ user, onBack }) => {
  const { language, t } = useI18n();
  const [nominations, setNominations] = useState<InstructorNomination[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupSelections, setGroupSelections] = useState<Record<string, TeyinatGroup>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await getInstructorNominations(user.id);
        if (!isMounted) {
          return;
        }

        setNominations(response.nominations);
        setGroupSelections((current) => {
          const next = { ...current };
          response.nominations.forEach((nomination) => {
            if (!next[nomination.id]) {
              next[nomination.id] = 'B';
            }
          });
          return next;
        });
        setErrorMessage('');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load games.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (user.role === 'Instructor') {
      void load();
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(false);
    return () => {
      isMounted = false;
    };
  }, [user.id, user.role]);

  const selectedNominations = useMemo(
    () =>
      nominations
        .filter((nomination) => selectedIds.includes(nomination.id))
        .map((nomination) => ({
          nomination,
          group: groupSelections[nomination.id] || 'B',
        })),
    [groupSelections, nominations, selectedIds],
  );

  const toggleSelection = (nominationId: string) => {
    setErrorMessage('');
    setSuccessMessage('');

    setSelectedIds((current) => {
      if (current.includes(nominationId)) {
        return current.filter((item) => item !== nominationId);
      }

      if (current.length >= MAX_SELECTED_GAMES) {
        setErrorMessage('You can choose up to 6 games for one Teyinat file.');
        return current;
      }

      return [...current, nominationId];
    });
  };

  const handleExport = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedNominations.length) {
      setErrorMessage('Choose at least one game.');
      return;
    }

    const groupACount = selectedNominations.filter((item) => item.group === 'A').length;
    const groupBCount = selectedNominations.filter((item) => item.group === 'B').length;
    if (groupACount > MAX_GROUP_GAMES || groupBCount > MAX_GROUP_GAMES) {
      setErrorMessage('The original Word template supports up to 3 games in Group A and 3 games in Group B.');
      return;
    }

    setIsExporting(true);

    try {
      await exportTeyinatPdf(selectedNominations);
      setSuccessMessage('Teyinat PDF generated.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate Teyinat PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  if (user.role !== 'Instructor') {
    return (
      <Layout title={t('teyinat.title')} onBack={onBack}>
        <div className="rounded-xl bg-white border border-slate-100 p-4 text-sm text-slate-500">
          {t('teyinat.onlyInstructor')}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('teyinat.title')} onBack={onBack}>
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

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('teyinat.exportTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {t('teyinat.exportHelp')}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="rounded-full bg-[#581c1c]/8 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#581c1c]">
              {t('teyinat.selectedCount', { count: selectedIds.length, max: MAX_SELECTED_GAMES })}
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#581c1c]/15 disabled:opacity-60"
            >
              <Download size={16} />
              {isExporting ? t('teyinat.generating') : t('teyinat.downloadPdf')}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('teyinat.loadingGames')}</p>
      ) : nominations.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-100 p-4 text-sm text-slate-500">
          {t('teyinat.none')}
        </div>
      ) : (
        <div className="space-y-4">
          {nominations.map((nomination) => {
            const isSelected = selectedIds.includes(nomination.id);
            const selectionDisabled = !isSelected && selectedIds.length >= MAX_SELECTED_GAMES;

            return (
              <label
                key={nomination.id}
                className={`block rounded-2xl border p-5 shadow-sm transition ${
                  isSelected
                    ? 'border-[#581c1c] bg-[#581c1c]/[0.04]'
                    : 'border-slate-100 bg-white'
                } ${selectionDisabled ? 'opacity-60' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={selectionDisabled}
                      onChange={() => toggleSelection(nomination.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#581c1c] focus:ring-[#581c1c]"
                    />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-[#581c1c]">{nomination.gameCode}</div>
                      <MatchTeamsHeader teams={nomination.teams} className="mt-1" titleClassName="text-lg font-bold text-slate-900" />
                      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-[#f97316]" />
                          {nomination.matchDate}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-[#f97316]" />
                          {nomination.matchTime}
                        </div>
                        <div className="flex items-center gap-2 md:col-span-3 lg:col-span-1">
                          <MapPin size={14} className="text-[#f97316]" />
                          {nomination.venue}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('teyinat.group')}</span>
                        <select
                          value={groupSelections[nomination.id] || 'B'}
                          onChange={(event) =>
                            setGroupSelections((current) => ({
                              ...current,
                              [nomination.id]: event.target.value as TeyinatGroup,
                            }))
                          }
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#581c1c]"
                        >
                          <option value="B">{t('teyinat.groupB')}</option>
                          <option value="A">{t('teyinat.groupA')}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3 lg:min-w-[520px]">
                    {nomination.referees
                      .slice()
                      .sort((left, right) => left.slotNumber - right.slotNumber)
                      .map((referee) => (
                        <div key={`${nomination.id}-${referee.slotNumber}`} className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-bold uppercase text-slate-500">
                            {getNominationSlotLabel(referee.slotNumber, language)}
                          </div>
                          <div className="mt-1 font-semibold text-slate-900">{referee.refereeName}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default Teyinat;
