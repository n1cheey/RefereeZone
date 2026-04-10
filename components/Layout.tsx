
import React from 'react';
import { ChevronLeft, LogOut } from 'lucide-react';
import headerLogo from '../img/header.jpeg';
import { useI18n } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
  onLogout?: () => void;
  showBack?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onBack, onLogout, showBack = true }) => {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="min-h-screen bg-[#57131b]">
      <header className="sticky top-0 z-50 border-b border-[#6b1b24] bg-[#57131b] text-white shadow-[0_18px_35px_rgba(42,10,14,0.28)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            {showBack ? (
              <button
                onClick={onBack}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/16 sm:h-10 sm:w-10"
              >
                <ChevronLeft size={22} />
              </button>
            ) : (
              <img
                src={headerLogo}
                alt="ABL header logo"
                className="h-10 w-auto flex-none rounded-lg object-contain shadow-none sm:h-14"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="hidden text-[11px] font-bold uppercase tracking-[0.28em] text-white/70 sm:block">ABL RefZone</div>
              <h1 className="truncate text-base font-black tracking-tight text-white sm:text-xl">{title}</h1>
            </div>
          </div>
          <div className="flex flex-none items-center gap-1.5 sm:gap-2">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 p-1">
              {(['az', 'en', 'ru'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setLanguage(item)}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition sm:px-3 ${
                    language === item ? 'bg-white text-[#57131b]' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {t(`language.${item}`)}
                </button>
              ))}
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold transition hover:bg-white/16"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="min-h-[calc(100vh-69px)] bg-[radial-gradient(circle_at_top,#f9e9d4_0%,#f4f6fa_28%,#eef2f7_100%)] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
