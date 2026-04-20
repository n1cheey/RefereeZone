import React from 'react';
import { getCanonicalTeamName, getTeamLogoUrl, splitMatchTeams } from '../teamLogos';

interface MatchTeamsHeaderProps {
  teams: string;
  className?: string;
  titleClassName?: string;
}

const MatchTeamsHeader: React.FC<MatchTeamsHeaderProps> = ({
  teams,
  className = '',
  titleClassName = 'text-lg font-bold text-slate-900',
}) => {
  const teamItems = splitMatchTeams(teams);

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`.trim()}>
      {teamItems.map((teamName, index) => {
        const displayTeamName = getCanonicalTeamName(teamName);
        const teamLogoUrl = getTeamLogoUrl(displayTeamName);
        return (
          <React.Fragment key={`${displayTeamName}-${index}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                {teamLogoUrl ? (
                  <img src={teamLogoUrl} alt={displayTeamName} className="h-full w-full object-contain" loading="lazy" />
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {displayTeamName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')}
                  </span>
                )}
              </div>
              <h4 className={`${titleClassName} min-w-0`.trim()}>{displayTeamName}</h4>
            </div>
            {index < teamItems.length - 1 ? (
              <span className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">vs</span>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default MatchTeamsHeader;
