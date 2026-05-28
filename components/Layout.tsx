import React from 'react';
import { ChevronLeft, LogOut, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import { useSeason } from '../services/seasonContext';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
  onLogout?: () => void;
  showBack?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onBack, onLogout, showBack = true }) => {
  const { language, setLanguage, t } = useI18n();
  const { activeSeasonId, seasons, setActiveSeasonId } = useSeason();
  const activeSeason = seasons.find((season) => season.id === activeSeasonId) || seasons[0];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff2df_0%,#f7f8fb_24%,#eef2f7_100%)]">
      <header className="sticky top-0 z-50 border-b border-[#57131b]/10 bg-[linear-gradient(135deg,#fffaf4_0%,#ffffff_42%,#f6f8fc_100%)] backdrop-blur-xl shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {showBack ? (
                <button
                  onClick={onBack}
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <ChevronLeft size={22} />
                </button>
              ) : (
                <img
                  src="/img/Header.jpg"
                  alt="ABL header logo"
                  className="h-11 w-auto max-w-[170px] flex-none rounded-xl object-contain shadow-none"
                />
              )}

              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">ABL RefZone</div>
                <h1 className="truncate text-2xl font-black tracking-tight text-slate-950">{title}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                {(['az', 'en', 'ru'] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setLanguage(item)}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition sm:px-3 ${
                      language === item ? 'bg-[#57131b] text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t(`language.${item}`)}
                  </button>
                ))}
              </div>

              {onLogout ? (
                <button
                  onClick={onLogout}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">{t('common.logout')}</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[28px] border border-[#57131b]/10 bg-[linear-gradient(135deg,#57131b_0%,#6f1d1b_44%,#8f3d19_100%)] px-4 py-4 text-white shadow-[0_20px_50px_rgba(87,19,27,0.16)] lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
                  <Sparkles size={14} className="text-[#f7b267]" />
                  {t('workspace.activeWorkspace')}
                </span>
              </div>
              <div className="mt-3 text-2xl font-black tracking-tight">{activeSeason?.label || title}</div>
              <div className="mt-1 text-sm text-white/75">
                {t('workspace.activeWorkspaceText')}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {seasons.map((season) => (
                <button
                  key={season.id}
                  onClick={() => setActiveSeasonId(season.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    activeSeasonId === season.id
                      ? 'border-white bg-white text-[#57131b] shadow-sm'
                      : 'border-white/15 bg-white/10 text-white/85 hover:bg-white/15'
                  }`}
                >
                  {season.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
