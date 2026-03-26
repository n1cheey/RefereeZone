import React, { useEffect, useState } from 'react';
import Layout from './Layout';
import { ActivityEntry, User } from '../types';
import { getRecentActivity } from '../services/activityService';

interface ActivityProps {
  user: User;
  onBack: () => void;
}

const formatLastSeen = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Baku',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const Activity: React.FC<ActivityProps> = ({ user, onBack }) => {
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

        setErrorMessage(error instanceof Error ? error.message : 'Failed to load activity.');
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
    <Layout title="Activity" onBack={onBack}>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-lg font-bold text-slate-900">Last 24 Hours</h2>
        <p className="mt-2 text-sm text-slate-500">Shows who entered the system during the last 24 hours.</p>

        {user.role !== 'Instructor' && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Only Instructor can open this page.
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading activity...</p>
        ) : activity.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            No users in the last 24 hours yet.
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
                      {item.role}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">{formatLastSeen(item.lastSeenAt)}</div>
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
