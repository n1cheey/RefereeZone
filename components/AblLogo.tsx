import React from 'react';

interface AblLogoProps {
  mode?: 'stacked' | 'compact' | 'icon';
  className?: string;
}

const AblLogo: React.FC<AblLogoProps> = ({ mode = 'stacked', className = '' }) => {
  const isIconOnly = mode === 'icon';
  const isCompact = mode === 'compact';

  return (
    <div
      className={`overflow-hidden rounded-[22px] bg-[#57131b] text-white shadow-[0_24px_60px_rgba(87,19,27,0.28)] ${className}`}
    >
      <div
        className={`flex ${
          isIconOnly ? 'h-full items-center justify-center p-2.5' : isCompact ? 'items-center gap-4 p-4' : 'flex-col items-center p-6'
        }`}
      >
        <svg
          viewBox="0 0 160 160"
          aria-hidden="true"
          className={`${isIconOnly ? 'h-full w-full max-h-12 max-w-12' : isCompact ? 'h-20 w-20 flex-none' : 'h-28 w-28'}`}
        >
          <circle cx="80" cy="80" r="55" fill="#E8A044" />
          <path d="M80 25c13 13 21 33 21 55s-8 42-21 55" fill="none" stroke="#6A2A1E" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M80 25C67 38 59 58 59 80s8 42 21 55" fill="none" stroke="#6A2A1E" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M25 80h110" fill="none" stroke="#6A2A1E" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M45 44c14 5 27 14 35 26" fill="none" stroke="#6A2A1E" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M115 44c-14 5-27 14-35 26" fill="none" stroke="#6A2A1E" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M123 101c-17 2-33 11-43 25" fill="none" stroke="#B88233" strokeWidth="10" strokeLinecap="round" opacity="0.95" />
        </svg>

        {!isIconOnly && (
          <div className={`${isCompact ? 'min-w-0 text-left' : 'mt-3 text-center'}`}>
            <div className={`${isCompact ? 'text-4xl' : 'text-6xl'} font-black leading-none tracking-tight`}>ABL</div>
            <div
              className={`${
                isCompact ? 'mt-1 text-sm leading-snug text-white/88' : 'mt-3 text-[15px] leading-tight text-white/88'
              }`}
            >
              <div>Azerbaycan</div>
              <div>Basketbol Liqası</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AblLogo;
