import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, ShieldCheck, XCircle } from 'lucide-react';
import { AvailabilityOverview, AvailabilityRequest, User } from '../types';
import Layout from './Layout';
import { useI18n } from '../i18n';
import {
  createAvailabilityRequest,
  getAvailabilityOverview,
  reviewAvailabilityRequest,
} from '../services/availabilityService';
import { consumeNavigationIntent } from '../services/navigationIntent';
import { isViewCacheFresh, readViewCache, writeViewCache } from '../services/viewCache';

interface AvailabilityProps {
  user: User;
  onBack: () => void;
}

const AVAILABILITY_CACHE_MAX_AGE_MS = 20000;
const POLL_INTERVAL_MS = 45000;
const getAvailabilityCacheKey = (userId: string, role: User['role']) => `availability:${userId}:${role}`;

const STATUS_TONE: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Declined: 'bg-red-100 text-red-700',
};

const Availability: React.FC<AvailabilityProps> = ({ user, onBack }) => {
  const { locale, t } = useI18n();
  const cacheKey = getAvailabilityCacheKey(user.id, user.role);
  const [overview, setOverview] = useState<AvailabilityOverview>({
    myRequests: [],
    pendingApprovals: [],
    upcomingApproved: [],
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      startDate: today,
      endDate: today,
      reason: '',
    };
  });
  const isApprover = user.role === 'Instructor' || user.role === 'TO Supervisor';

  useEffect(() => {
    if (user.role === 'Staff') {
      onBack();
    }
  }, [onBack, user.role]);

  if (user.role === 'Staff') {
    return null;
  }

  const applyOverview = (nextOverview: AvailabilityOverview) => {
    setOverview(nextOverview);
    writeViewCache(cacheKey, nextOverview);
  };

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;
    const cached = readViewCache<AvailabilityOverview>(cacheKey);
    const hasFreshCache = isViewCacheFresh(cacheKey, AVAILABILITY_CACHE_MAX_AGE_MS);

    if (cached) {
      setOverview(cached);
      setIsLoading(false);
    }

    const load = async (showLoader: boolean) => {
      if (showLoader) {
        setIsLoading(true);
      }

      try {
        const response = await getAvailabilityOverview();
        if (!isMounted) {
          return;
        }

        applyOverview(response);
        setErrorMessage('');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load availability.');
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

    if (!hasFreshCache) {
      void load(!cached);
    }
    startPolling();

    return () => {
      isMounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [cacheKey]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const intent = consumeNavigationIntent('availability');
    if (!intent?.targetId) {
      return;
    }

    setHighlightedRequestId(intent.targetId);
    window.setTimeout(() => {
      document
        .querySelector(`[data-availability-id="${intent.targetId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    const clearTimer = window.setTimeout(() => {
      setHighlightedRequestId((previous) => (previous === intent.targetId ? null : previous));
    }, 4000);

    return () => {
      window.clearTimeout(clearTimer);
    };
  }, [overview.myRequests, overview.pendingApprovals, isLoading]);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));

  const pendingMyRequests = useMemo(
    () => overview.myRequests.filter((request) => request.status === 'Pending'),
    [overview.myRequests],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await createAvailabilityRequest(form);
      applyOverview(response.overview);
      setSuccessMessage(response.message);
      setForm((previous) => ({
        startDate: previous.startDate,
        endDate: previous.endDate,
        reason: '',
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save availability request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (requestId: string, status: 'Approved' | 'Declined') => {
    setReviewingRequestId(requestId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await reviewAvailabilityRequest(requestId, status);
      applyOverview(response.overview);
      setSuccessMessage(response.message);
      setHighlightedRequestId(requestId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to review availability request.');
    } finally {
      setReviewingRequestId(null);
    }
  };

  const renderRequestCard = (request: AvailabilityRequest, showReviewerActions = false) => (
    <div
      key={request.id}
      data-availability-id={request.id}
      className={`rounded-2xl border p-4 transition ${
        highlightedRequestId === request.id
          ? 'border-sky-300 bg-sky-50 shadow-sm'
          : 'border-slate-100 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900">{request.userName}</div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{request.userRole}</div>
        </div>
        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[request.status] || 'bg-slate-100 text-slate-700'}`}>
          {t(`availability.status${request.status}`)}
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-sky-600" />
          <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock3 size={15} className="text-amber-500" />
          <span>{t('availability.requestedOn', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.createdAt)) })}</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
        {request.reason}
      </div>

      {request.reviewedAt ? (
        <div className="mt-3 text-xs text-slate-500">
          {t('availability.reviewedBy', {
            name: request.reviewedByName || '-',
            date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.reviewedAt)),
          })}
        </div>
      ) : null}

      {showReviewerActions ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => handleReview(request.id, 'Approved')}
            disabled={reviewingRequestId === request.id}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
            <CheckCircle2 size={16} />
            {t('availability.approve')}
          </button>
          <button
            onClick={() => handleReview(request.id, 'Declined')}
            disabled={reviewingRequestId === request.id}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-70"
          >
            <XCircle size={16} />
            {t('availability.decline')}
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <Layout title={t('availability.title')} onBack={onBack}>
      {errorMessage ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr),minmax(0,1.05fr)]">
        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <CalendarDays size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('availability.requestTitle')}</h2>
                <p className="text-sm text-slate-500">{t('availability.requestHelp')}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t('availability.startDate')}</div>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm((previous) => ({ ...previous, startDate: event.target.value }))}
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#57131b]"
                    required
                  />
                </label>
                <label className="block">
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t('availability.endDate')}</div>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm((previous) => ({ ...previous, endDate: event.target.value }))}
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#57131b]"
                    required
                  />
                </label>
              </div>
              <label className="block">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t('availability.reason')}</div>
                <textarea
                  value={form.reason}
                  onChange={(event) => setForm((previous) => ({ ...previous, reason: event.target.value }))}
                  rows={5}
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#57131b]"
                  placeholder={t('availability.reasonPlaceholder')}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#57131b] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#57131b]/15 disabled:opacity-70"
              >
                <ShieldCheck size={16} />
                {isSubmitting ? t('availability.submitting') : t('availability.submit')}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{t('availability.myRequests')}</h2>
            {isLoading ? (
              <div className="mt-4 text-sm text-slate-500">{t('common.loading')}</div>
            ) : overview.myRequests.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                {t('availability.noRequests')}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {overview.myRequests.map((request) => renderRequestCard(request))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{t('availability.reminders')}</h2>
            <div className="mt-4 space-y-3">
              {pendingMyRequests.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  {t('availability.pendingReminder', { count: pendingMyRequests.length })}
                </div>
              ) : null}
              {overview.upcomingApproved.length > 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  {t('availability.approvedReminder', { count: overview.upcomingApproved.length })}
                </div>
              ) : null}
              {pendingMyRequests.length === 0 && overview.upcomingApproved.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  {t('availability.noReminders')}
                </div>
              ) : null}
            </div>
          </div>

          {isApprover ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">{t('availability.pendingApprovals')}</h2>
              {isLoading ? (
                <div className="mt-4 text-sm text-slate-500">{t('common.loading')}</div>
              ) : overview.pendingApprovals.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  {t('availability.noPendingApprovals')}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {overview.pendingApprovals.map((request) => renderRequestCard(request, true))}
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </Layout>
  );
};

export default Availability;
