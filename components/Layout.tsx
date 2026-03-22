
import React from 'react';
import { ChevronLeft, LogOut } from 'lucide-react';
import AblLogo from './AblLogo';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
  onLogout?: () => void;
  showBack?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onBack, onLogout, showBack = true }) => {
  return (
    <div className="min-h-screen bg-[#57131b]">
      <header className="sticky top-0 z-50 border-b border-[#6b1b24] bg-[#57131b] text-white shadow-[0_18px_35px_rgba(42,10,14,0.28)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {showBack ? (
              <button
                onClick={onBack}
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/16"
              >
                <ChevronLeft size={22} />
              </button>
            ) : (
              <AblLogo mode="icon" className="h-11 w-11 flex-none rounded-2xl shadow-none" />
            )}
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/70">ABL RefZone</div>
              <h1 className="truncate text-lg font-black tracking-tight text-white sm:text-xl">{title}</h1>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-bold transition hover:bg-white/16"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </header>
      <main className="min-h-[calc(100vh-69px)] bg-[radial-gradient(circle_at_top,#f9e9d4_0%,#f4f6fa_28%,#eef2f7_100%)] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
