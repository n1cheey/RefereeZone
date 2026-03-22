
import React from 'react';
import { ChevronLeft, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
  onLogout?: () => void;
  showBack?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onBack, onLogout, showBack = true }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[#581c1c] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft size={22} />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 overflow-hidden">
               {/* Small logo representation */}
               <div className="w-full h-full rounded-full bg-[#f39200] relative overflow-hidden border border-[#581c1c]">
                  <div className="absolute w-full h-[1px] bg-[#581c1c] top-1/2 -translate-y-1/2"></div>
                  <div className="absolute h-full w-[1px] bg-[#581c1c] left-1/2 -translate-x-1/2"></div>
               </div>
            </div>
          )}
          <h1 className="text-lg font-black tracking-tight uppercase">{title}</h1>
        </div>
        {onLogout && (
          <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center">
            <LogOut size={18} />
          </button>
        )}
      </header>
      <main className="flex-1 p-4 overflow-y-auto pb-10 bg-slate-50">
        {children}
      </main>
    </div>
  );
};

export default Layout;
