import React, { useEffect, useState } from 'react';
import { Bell, Save } from 'lucide-react';
import Layout from './Layout';
import { AnnouncementItem, User } from '../types';
import { getCurrentAnnouncement, saveAnnouncement } from '../services/announcementService';
import { useI18n } from '../i18n';

interface AnnouncementManagerProps {
  user: User;
  onBack: () => void;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ user, onBack }) => {
  const { locale, t } = useI18n();
  const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await getCurrentAnnouncement(user.id);
        if (!isMounted) {
          return;
        }

        setAnnouncement(response.announcement);
        setMessage(response.announcement?.message || '');
        setErrorMessage('');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load announcement.');
        }
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
  }, [user.id]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await saveAnnouncement({
        userId: user.id,
        message,
      });
      setAnnouncement(response.announcement);
      setMessage(response.announcement.message);
      setSuccessMessage(t('announcement.saved'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save announcement.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Baku',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));

  return (
    <Layout title={t('announcement.title')} onBack={onBack}>
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
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('announcement.title')}</h2>
            <p className="text-sm text-slate-500">{t('announcement.help')}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">{t('announcement.current')}</h3>
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">{t('announcement.loading')}</p>
        ) : !announcement ? (
          <p className="mt-3 text-sm text-slate-500">{t('announcement.none')}</p>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="whitespace-pre-wrap text-sm font-medium text-slate-800">{announcement.message}</div>
            <div className="mt-3 text-xs text-slate-600">
              {t('announcement.expiresAt', { date: formatDateTime(announcement.expiresAt) })}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
          {t('announcement.message')}
        </label>
        <textarea
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t('announcement.placeholder')}
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
        />
        <p className="mt-3 text-xs text-slate-500">{t('announcement.deadlineHelp')}</p>
        <button
          type="submit"
          disabled={isSaving || !message.trim()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
        >
          <Save size={16} />
          {isSaving ? t('common.saving') : t('announcement.save')}
        </button>
      </form>
    </Layout>
  );
};

export default AnnouncementManager;
