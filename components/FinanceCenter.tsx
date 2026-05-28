import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Calculator,
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  Wallet,
} from 'lucide-react';
import Layout from './Layout';
import { AppView } from '../services/appViews';
import { useSeason } from '../services/seasonContext';
import { getInstructorNominations, getRefereeNominations } from '../services/nominationService';
import { InstructorNomination, RefereeNomination, User } from '../types';
import { isPastMatch } from '../matchTiming';
import { useI18n } from '../i18n';

interface FinanceCenterProps {
  user: User;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

interface FinanceSnapshot {
  totalGames: number;
  completedGames: number;
  missingAssets: number;
  refereeFees: number;
  toFees: number;
  acceptedAssignments: number;
}

const formatCurrency = (value: number) => `AZN ${Math.round(value)}`;

const isOperationalFinanceRole = (role: User['role']) =>
  role === 'Instructor' || role === 'Financialist' || role === 'Staff';

const buildOperationalFinanceSnapshot = (items: InstructorNomination[]) =>
  items.reduce<FinanceSnapshot>(
    (summary, nomination) => {
      const completed = Boolean(nomination.finalScore && nomination.matchProtocolUrl);
      const missingAssets = !nomination.finalScore || !nomination.matchProtocolUrl || !nomination.matchVideoUrl;

      summary.totalGames += 1;
      summary.completedGames += completed ? 1 : 0;
      summary.missingAssets += missingAssets ? 1 : 0;
      summary.refereeFees += nomination.referees.length * (nomination.refereeFee || 0);
      summary.toFees += (nomination.toCrew.length + nomination.statisticCrew.length) * (nomination.toFee || 0);
      summary.acceptedAssignments += nomination.referees.filter((item) => item.status === 'Accepted' || item.status === 'Assigned').length;
      summary.acceptedAssignments += nomination.toCrew.filter((item) => item.status === 'Accepted' || item.status === 'Assigned').length;
      summary.acceptedAssignments += nomination.statisticCrew.filter((item) => item.status === 'Accepted' || item.status === 'Assigned').length;
      return summary;
    },
    {
      totalGames: 0,
      completedGames: 0,
      missingAssets: 0,
      refereeFees: 0,
      toFees: 0,
      acceptedAssignments: 0,
    },
  );

const buildPersonalFinanceSnapshot = (items: RefereeNomination[]) =>
  items.reduce<FinanceSnapshot>(
    (summary, nomination) => {
      const isAccepted = nomination.status === 'Accepted' || nomination.status === 'Assigned';
      if (!isAccepted) {
        return summary;
      }

      summary.totalGames += 1;
      summary.completedGames += isPastMatch(nomination.matchDate, nomination.matchTime, Date.now()) ? 1 : 0;
      summary.missingAssets += !nomination.finalScore ? 1 : 0;
      summary.acceptedAssignments += 1;

      if (nomination.assignmentGroup === 'TO') {
        summary.toFees += nomination.toFee || 0;
      } else {
        summary.refereeFees += nomination.refereeFee || 0;
      }

      return summary;
    },
    {
      totalGames: 0,
      completedGames: 0,
      missingAssets: 0,
      refereeFees: 0,
      toFees: 0,
      acceptedAssignments: 0,
    },
  );

const getMonthRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    startKey: start.toISOString().slice(0, 10),
    nextKey: next.toISOString().slice(0, 10),
    endKey: new Date(next.getTime() - 1).toISOString().slice(0, 10),
    isLastDayOfMonth: date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
  };
};

const FinanceCenter: React.FC<FinanceCenterProps> = ({ user, onBack, onNavigate }) => {
  const { t } = useI18n();
  const { activeSeason } = useSeason();
  const monthRange = getMonthRange();
  const [operationalNominations, setOperationalNominations] = useState<InstructorNomination[]>([]);
  const [personalAssignments, setPersonalAssignments] = useState<RefereeNomination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        if (isOperationalFinanceRole(user.role)) {
          const response = await getInstructorNominations(user.id, activeSeason.id);
          if (!isMounted) {
            return;
          }
          setOperationalNominations(response.nominations);
          setPersonalAssignments([]);
        } else {
          const response = await getRefereeNominations(user.id, activeSeason.id);
          if (!isMounted) {
            return;
          }
          setOperationalNominations([]);
          setPersonalAssignments(response.nominations);
        }
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : t('financeCenter.errorLoad'));
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
  }, [activeSeason.id, user.id, user.role]);

  const financeSnapshot = useMemo<FinanceSnapshot>(() => {
    if (isOperationalFinanceRole(user.role)) {
      return buildOperationalFinanceSnapshot(operationalNominations);
    }

    return buildPersonalFinanceSnapshot(personalAssignments);
  }, [operationalNominations, personalAssignments, user.role]);

  const monthlyFinanceSnapshot = useMemo<FinanceSnapshot>(() => {
    if (isOperationalFinanceRole(user.role)) {
      return buildOperationalFinanceSnapshot(
        operationalNominations.filter(
          (nomination) => nomination.matchDate >= monthRange.startKey && nomination.matchDate < monthRange.nextKey,
        ),
      );
    }

    return buildPersonalFinanceSnapshot(
      personalAssignments.filter(
        (assignment) => assignment.matchDate >= monthRange.startKey && assignment.matchDate < monthRange.nextKey,
      ),
    );
  }, [monthRange.nextKey, monthRange.startKey, operationalNominations, personalAssignments, user.role]);

  const payoutsReady = financeSnapshot.completedGames - financeSnapshot.missingAssets;
  const totalFees = financeSnapshot.refereeFees + financeSnapshot.toFees;
  const monthlyTotalFees = monthlyFinanceSnapshot.refereeFees + monthlyFinanceSnapshot.toFees;

  const commandCards: Array<{
    title: string;
    description: string;
    icon: typeof Calculator;
    view: AppView;
    accent: string;
  }> = isOperationalFinanceRole(user.role)
    ? [
        {
          title: t('financeCenter.cardCalculationTitle'),
          description: t('financeCenter.cardCalculationText'),
          icon: Calculator,
          view: 'calculation',
          accent: 'border-amber-100 bg-amber-50 text-amber-700',
        },
        {
          title: t('financeCenter.cardLedgerTitle'),
          description: t('financeCenter.cardLedgerText'),
          icon: CalendarDays,
          view: 'nominations',
          accent: 'border-blue-100 bg-blue-50 text-blue-700',
        },
      ]
    : [
        {
          title: t('financeCenter.cardMyEarningsTitle'),
          description: t('financeCenter.cardMyEarningsText'),
          icon: Wallet,
          view: 'calculation',
          accent: 'border-amber-100 bg-amber-50 text-amber-700',
        },
        {
          title: t('financeCenter.cardMyGamesTitle'),
          description: t('financeCenter.cardMyGamesText'),
          icon: CalendarDays,
          view: 'nominations',
          accent: 'border-blue-100 bg-blue-50 text-blue-700',
        },
      ];

  const commandCardsGridClass =
    commandCards.length >= 3 ? 'md:grid-cols-3' : commandCards.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1';

  return (
    <Layout title={t('financeCenter.title')} onBack={onBack}>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-[#57131b]/10 bg-[linear-gradient(145deg,#57131b_0%,#6f1d1b_48%,#8f3d19_100%)] p-6 text-white shadow-[0_24px_60px_rgba(87,19,27,0.18)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
              {activeSeason.shortLabel}
            </span>
            <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-100">
              {t('financeCenter.laneBadge')}
            </span>
          </div>
          <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.15fr),minmax(320px,0.85fr)]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/65">{t('financeCenter.heroEyebrow')}</div>
              <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight">
                {t('financeCenter.heroTitle')}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                {t('financeCenter.heroText')}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">{t('financeCenter.exposureLabel')}</div>
                  <div className="mt-3 text-3xl font-black">{formatCurrency(totalFees)}</div>
                </div>
                <div className="rounded-2xl bg-white/15 p-3">
                  <Banknote size={22} />
                </div>
              </div>
              <div className="mt-4 text-sm text-white/80">
                {isOperationalFinanceRole(user.role)
                  ? t('financeCenter.exposureOperationalText', {
                      games: financeSnapshot.totalGames,
                      ready: payoutsReady > 0 ? payoutsReady : 0,
                    })
                  : t('financeCenter.exposurePersonalText', {
                      games: financeSnapshot.totalGames,
                    })}
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        {monthRange.isLastDayOfMonth ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 shadow-sm">
            <div className="font-bold">{t('financeCenter.monthlyCloseTitle')}</div>
            <div className="mt-1 leading-6">{t('financeCenter.monthlyCloseText')}</div>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{t('financeCenter.scopeLabel')}</div>
              <CalendarDays size={18} className="text-slate-400" />
            </div>
            <div className="mt-4 text-3xl font-black text-slate-950">{isLoading ? '...' : financeSnapshot.totalGames}</div>
            <div className="mt-2 text-sm text-slate-500">{t('financeCenter.scopeText')}</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">{t('financeCenter.readyLabel')}</div>
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
            <div className="mt-4 text-3xl font-black text-slate-950">{isLoading ? '...' : Math.max(payoutsReady, 0)}</div>
            <div className="mt-2 text-sm text-slate-600">{t('financeCenter.readyText')}</div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">{t('financeCenter.assignedLabel')}</div>
              <Wallet size={18} className="text-amber-600" />
            </div>
            <div className="mt-4 text-3xl font-black text-slate-950">{isLoading ? '...' : financeSnapshot.acceptedAssignments}</div>
            <div className="mt-2 text-sm text-slate-600">{t('financeCenter.assignedText')}</div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700">{t('financeCenter.missingLabel')}</div>
              <CircleAlert size={18} className="text-rose-600" />
            </div>
            <div className="mt-4 text-3xl font-black text-slate-950">{isLoading ? '...' : financeSnapshot.missingAssets}</div>
            <div className="mt-2 text-sm text-slate-600">{t('financeCenter.missingText')}</div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr),minmax(320px,0.92fr)]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <FileSpreadsheet size={16} className="text-[#57131b]" />
              {t('financeCenter.workstreamsTitle')}
            </div>
            <div className={`mt-4 grid gap-4 ${commandCardsGridClass}`}>
              {commandCards.map((card) => (
                <button
                  key={card.title}
                  onClick={() => onNavigate(card.view)}
                  className="group rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm"
                >
                  <div className={`inline-flex rounded-2xl border p-3 ${card.accent}`}>
                    <card.icon size={20} />
                  </div>
                  <div className="mt-4 text-base font-black text-slate-900">{card.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{card.description}</div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                    {t('financeCenter.openWorkspace')}
                    <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{t('financeCenter.breakdownTitle')}</div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-500">{t('financeCenter.currentMonthTitle')}</div>
                    <div className="mt-1 text-xs font-medium text-slate-400">
                      {t('financeCenter.currentMonthRange', {
                        start: monthRange.startKey,
                        end: monthRange.endKey,
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {t('financeCenter.totalFees')}
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{isLoading ? '...' : formatCurrency(monthlyTotalFees)}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('financeCenter.refereeFees')}</div>
                    <div className="mt-2 text-lg font-black text-slate-950">
                      {isLoading ? '...' : formatCurrency(monthlyFinanceSnapshot.refereeFees)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('financeCenter.toFees')}</div>
                    <div className="mt-2 text-lg font-black text-slate-950">
                      {isLoading ? '...' : formatCurrency(monthlyFinanceSnapshot.toFees)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('financeCenter.scopeLabel')}</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{isLoading ? '...' : monthlyFinanceSnapshot.totalGames}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('financeCenter.readyLabel')}</div>
                    <div className="mt-2 text-lg font-black text-slate-950">
                      {isLoading ? '...' : Math.max(monthlyFinanceSnapshot.completedGames - monthlyFinanceSnapshot.missingAssets, 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-500">{t('financeCenter.seasonTotalTitle')}</div>
                    <div className="mt-1 text-xs font-medium text-slate-400">{activeSeason.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {t('financeCenter.totalFees')}
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{isLoading ? '...' : formatCurrency(totalFees)}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('financeCenter.refereeFees')}</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{isLoading ? '...' : formatCurrency(financeSnapshot.refereeFees)}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('financeCenter.toFees')}</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{isLoading ? '...' : formatCurrency(financeSnapshot.toFees)}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('financeCenter.scopeLabel')}</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{isLoading ? '...' : financeSnapshot.totalGames}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('financeCenter.assignedLabel')}</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{isLoading ? '...' : financeSnapshot.acceptedAssignments}</div>
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

export default FinanceCenter;
