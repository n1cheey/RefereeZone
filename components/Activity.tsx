import React, { useEffect, useState } from 'react';
import Layout from './Layout';
import { ActivityEntry, User } from '../types';
import { getRecentActivity } from '../services/activityService';
import { formatLocalizedDateTime, getRoleLabel, useI18n } from '../i18n';

interface ActivityProps {
  user: User;
  onBack: () => void;
}

const Activity: React.FC<ActivityProps> = ({ user, onBack }) => {
  const { language, locale, t } = useI18n();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadActivity = async () => {
      setIsLoading(true);
      try {
        const response = await getRecentActivity();
        if (!isMounted) {
          return;
        }

        setActivity(response.activity);
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : t('activity.loading'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadActivity();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Layout title={t('activity.title')} onBack={onBack}>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-lg font-bold text-slate-900">{t('activity.last24h')}</h2>
        <p className="mt-2 text-sm text-slate-500">{t('activity.help')}</p>

        {user.role !== 'Instructor' && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t('activity.onlyInstructor')}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">{t('activity.loading')}</p>
        ) : activity.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            {t('activity.none')}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {activity.map((item) => (
              <div key={item.userId} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{item.fullName}</div>
                    <div className="text-sm text-slate-500">{item.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex rounded-full bg-[#57131b]/10 px-3 py-1 text-xs font-bold text-[#57131b]">
                      {getRoleLabel(item.role, language)}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">{formatLocalizedDateTime(item.lastSeenAt, locale)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Activity;
