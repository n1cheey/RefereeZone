import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import Layout from './Layout';
import { NotificationCenterItem, User } from '../types';
import { useI18n } from '../i18n';
import { useSeason } from '../services/seasonContext';
import { getNotificationCenterItems } from '../services/notificationCenter';
import { setNavigationIntent } from '../services/navigationIntent';

interface NotificationCenterProps {
  user: User;
  onBack: () => void;
  onNavigate: (view: 'dashboard' | 'announcement' | 'availability' | 'nominations' | 'reports' | 'calendar') => void;
}

const severityStyles: Record<NotificationCenterItem['severity'], string> = {
  critical: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-sky-200 bg-sky-50',
  success: 'border-emerald-200 bg-emerald-50',
};

const severityIcons: Record<NotificationCenterItem['severity'], JSX.Element> = {
  critical: <AlertTriangle size={18} className="text-red-600" />,
  warning: <CalendarClock size={18} className="text-amber-600" />,
  info: <Info size={18} className="text-sky-600" />,
  success: <CheckCircle2 size={18} className="text-emerald-600" />,
};

const formatDateTime = (locale: string, value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ user, onBack, onNavigate }) => {
  const { locale, language, t } = useI18n();
  const { activeSeasonId } = useSeason();
  const [items, setItems] = useState<NotificationCenterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const nextItems = await getNotificationCenterItems(user, activeSeasonId, language);
        if (!isMounted) {
          return;
        }
        setItems(nextItems);
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load notifications.');
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
  }, [activeSeasonId, language, user]);

  const summary = useMemo(
    () => ({
      critical: items.filter((item) => item.severity === 'critical').length,
      warning: items.filter((item) => item.severity === 'warning').length,
      total: items.length,
    }),
    [items],
  );

  const handleOpenItem = (item: NotificationCenterItem) => {
    if (!item.targetView) {
      return;
    }

    if (item.targetId || item.targetDate) {
      setNavigationIntent({
        view: item.targetView,
        targetId: item.targetId || undefined,
        targetDate: item.targetDate || undefined,
      });
    }

    onNavigate(item.targetView);
  };

  return (
    <Layout title={t('notifications.title')} onBack={onBack}>
      {errorMessage ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{t('notifications.eyebrow')}</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{t('notifications.heroTitle')}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{t('notifications.heroText')}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{t('notifications.total')}</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{summary.total}</div>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-600">{t('notifications.critical')}</div>
              <div className="mt-2 text-3xl font-black text-red-700">{summary.critical}</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">{t('notifications.warning')}</div>
              <div className="mt-2 text-3xl font-black text-amber-800">{summary.warning}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">{t('notifications.feedTitle')}</h2>
            <p className="text-sm text-slate-500">{t('notifications.feedText')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {t('notifications.loading')}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-10 text-center text-sm font-medium text-emerald-700">
            {t('notifications.empty')}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {items.map((item) => {
              const dueLabel = formatDateTime(locale, item.dueAt);

              return (
                <button
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  disabled={!item.targetView}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${severityStyles[item.severity]} ${
                    item.targetView ? 'hover:shadow-sm' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-white/70">
                      {severityIcons[item.severity]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-950">{item.title}</div>
                          <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.description}</div>
                        </div>
                        {item.targetView ? (
                          <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            {t('notifications.open')}
                            <ChevronRight size={14} />
                          </div>
                        ) : null}
                      </div>
                      {dueLabel ? (
                        <div className="mt-3 text-xs font-medium text-slate-500">
                          {t('notifications.dueAt', { date: dueLabel })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default NotificationCenter;
