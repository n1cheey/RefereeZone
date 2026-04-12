import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, CalendarDays, User as UserIcon, Wallet } from 'lucide-react';
import { User, RefereeNomination } from '../types';
import Layout from './Layout';
import { getRoleLabel, useI18n } from '../i18n';
import { getRefereeNominations } from '../services/nominationService';
import { isPastMatch } from '../matchTiming';

interface EarningsCalculationProps {
  user: User;
  onBack: () => void;
}

const EARNINGS_ANIMATION_MS = 1200;
const BAKU_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Baku',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getCurrentBakuDateString = () => BAKU_DATE_FORMATTER.format(new Date());

const formatFee = (value: number | null | undefined) => `AZN ${Math.round(value || 0)}`;

const EarningsCalculation: React.FC<EarningsCalculationProps> = ({ user, onBack }) => {
  const { language, t } = useI18n();
  const [assignments, setAssignments] = useState<RefereeNomination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState(() => {
    const today = getCurrentBakuDateString();
    return {
      startDate: `${today.slice(0, 8)}01`,
      endDate: today,
    };
  });
  const [calculatedMatchesCount, setCalculatedMatchesCount] = useState(0);
  const [calculatedEarningsTotal, setCalculatedEarningsTotal] = useState(0);
  const [displayedCalculatedEarnings, setDisplayedCalculatedEarnings] = useState(0);
  const [isCalculatedEarningsAnimating, setIsCalculatedEarningsAnimating] = useState(false);
  const [calculationError, setCalculationError] = useState('');
  const animationFrameRef = useRef<number | null>(null);
  const animatedValueRef = useRef(0);
  const countdownNow = useMemo(() => Date.now(), []);
  const workedAssignmentStatuses = useMemo(() => new Set(['Accepted', 'Assigned']), []);

  useEffect(() => {
    let isMounted = true;

    const loadAssignments = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await getRefereeNominations(user.id);
        if (!isMounted) {
          return;
        }

        setAssignments(response.nominations || []);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        console.error('Failed to load calculation assignments', loadError);
        setError('Request failed.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAssignments();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  useEffect(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const startValue = animatedValueRef.current;
    const targetValue = calculatedEarningsTotal;

    if (Math.abs(targetValue - startValue) < 0.01) {
      animatedValueRef.current = targetValue;
      setDisplayedCalculatedEarnings(targetValue);
      setIsCalculatedEarningsAnimating(false);
      return;
    }

    setIsCalculatedEarningsAnimating(true);
    const animationStartedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - animationStartedAt;
      const progress = Math.min(elapsed / EARNINGS_ANIMATION_MS, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (targetValue - startValue) * easedProgress;

      animatedValueRef.current = nextValue;
      setDisplayedCalculatedEarnings(nextValue);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      animatedValueRef.current = targetValue;
      setDisplayedCalculatedEarnings(targetValue);
      setIsCalculatedEarningsAnimating(false);
      animationFrameRef.current = null;
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [calculatedEarningsTotal]);

  const handleCalculate = () => {
    const { startDate, endDate } = range;
    if (!startDate || !endDate) {
      setCalculationError(t('dashboard.calculationSelectDates'));
      return;
    }

    if (startDate > endDate) {
      setCalculationError(t('dashboard.calculationInvalidRange'));
      return;
    }

    const relevantAssignments = assignments.filter((assignment) => {
      const matchesRole = user.role === 'TO' ? assignment.assignmentGroup === 'TO' : assignment.assignmentGroup === 'Referee';
      const fee = user.role === 'TO' ? assignment.toFee : assignment.refereeFee;

      return (
        matchesRole &&
        fee !== null &&
        workedAssignmentStatuses.has(assignment.status) &&
        isPastMatch(assignment.matchDate, assignment.matchTime, countdownNow) &&
        assignment.matchDate >= startDate &&
        assignment.matchDate <= endDate
      );
    });

    setCalculationError('');
    setCalculatedMatchesCount(relevantAssignments.length);
    setCalculatedEarningsTotal(
      relevantAssignments.reduce(
        (sum, assignment) => sum + (user.role === 'TO' ? assignment.toFee || 0 : assignment.refereeFee || 0),
        0,
      ),
    );
  };

  return (
    <Layout title={t('dashboard.calculation')} onBack={onBack}>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <img
              src={user.photoUrl}
              alt={user.fullName}
              className="h-20 w-20 rounded-2xl object-cover shadow-md ring-2 ring-[#f97316]/20"
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-slate-800">{user.fullName}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                <UserIcon size={14} /> {t('common.license')}: {user.licenseNumber}
              </p>
              <div className="mt-2 inline-block rounded bg-[#581c1c] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {getRoleLabel(user.role, language)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <Calculator size={16} className="text-[#581c1c]" />
            {t('dashboard.calculation')}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <CalendarDays size={14} />
                {t('availability.startDate')}
              </div>
              <input
                type="date"
                value={range.startDate}
                onChange={(event) =>
                  setRange((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
                className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
              />
            </label>
            <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <CalendarDays size={14} />
                {t('availability.endDate')}
              </div>
              <input
                type="date"
                value={range.endDate}
                onChange={(event) =>
                  setRange((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
                className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleCalculate}
            disabled={isLoading}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6b2222] disabled:opacity-70"
          >
            {t('dashboard.calculate')}
          </button>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}
          {calculationError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {calculationError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {t('dashboard.calculationMatches')}
              </div>
              <div className="mt-2 text-3xl font-black leading-none text-slate-900">
                {isLoading ? '...' : calculatedMatchesCount}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                <Wallet size={14} />
                {t('dashboard.calculationEarnings')}
              </div>
              <div
                className={`mt-2 text-3xl font-black leading-none transition-all duration-300 ${
                  isCalculatedEarningsAnimating
                    ? 'scale-[1.03] text-emerald-700 drop-shadow-[0_0_10px_rgba(16,185,129,0.18)]'
                    : 'text-slate-900'
                }`}
              >
                {isLoading ? '...' : formatFee(displayedCalculatedEarnings)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EarningsCalculation;
