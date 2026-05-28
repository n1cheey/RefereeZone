import React from 'react';
import {
  ArrowRight,
  Bell,
  Calendar,
  ClipboardCheck,
  LucideIcon,
  MessageSquare,
  Shield,
  Sparkles,
} from 'lucide-react';
import { LeagueSeason, UserRole } from '../types';
import { AppView } from '../services/appViews';
import { useI18n } from '../i18n';

export interface OperationsModuleCard {
  id: string;
  title: string;
  description: string;
  view: AppView;
  icon: LucideIcon;
  tone: string;
  badgeLabel?: string;
  statusLabel: string;
}

interface OperationsCommandCenterProps {
  activeSeason: LeagueSeason;
  userRole: UserRole;
  pendingActions: number;
  unreadMessages: number;
  todayGames: number;
  nextGameLabel: string | null;
  modules: OperationsModuleCard[];
  onNavigate: (view: AppView) => void;
  controlPanel?: React.ReactNode;
  compactMatchesPanel?: React.ReactNode;
}

const OperationsCommandCenter: React.FC<OperationsCommandCenterProps> = ({
  activeSeason,
  userRole,
  pendingActions,
  unreadMessages,
  todayGames,
  nextGameLabel,
  modules,
  onNavigate,
  controlPanel,
  compactMatchesPanel,
}) => {
  const { t } = useI18n();
  const spotlightModules = modules.slice(0, 3);
  const supportModules = modules.slice(3);

  return (
    <section className="mb-8 overflow-hidden rounded-[32px] border border-[#6d1b1f]/10 bg-[linear-gradient(145deg,#fff9f4_0%,#fffdfb_38%,#f7f8fc_100%)] shadow-[0_24px_60px_rgba(87,19,27,0.10)]">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1.1fr),minmax(380px,0.9fr)]">
        <div className="border-b border-[#6d1b1f]/10 px-6 py-6 xl:border-b-0 xl:border-r xl:px-8 xl:py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#6d1b1f]/10 bg-[#57131b] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                {t('workspace.seasonCommand')}
              </span>
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">
                {activeSeason.shortLabel}
              </span>
            </div>
            {controlPanel ? <div className="flex items-center gap-2 self-start sm:self-auto">{controlPanel}</div> : null}
          </div>

          <div className="mt-5 max-w-3xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8e6570]">{t('workspace.federationHub')}</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {t('workspace.heroTitle')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
              {t('workspace.heroText')}
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700">{t('workspace.pending')}</div>
                <Bell size={18} className="text-rose-500" />
              </div>
              <div className="mt-3 text-3xl font-black leading-none text-slate-950">{pendingActions}</div>
              <div className="mt-1 text-sm text-slate-600">{t('workspace.pendingForRole', { role: userRole })}</div>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700">{t('workspace.liveChat')}</div>
                <MessageSquare size={18} className="text-cyan-500" />
              </div>
              <div className="mt-3 text-3xl font-black leading-none text-slate-950">{unreadMessages}</div>
              <div className="mt-1 text-sm text-slate-600">{t('workspace.unreadConversations')}</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">{t('workspace.today')}</div>
                <Calendar size={18} className="text-emerald-500" />
              </div>
              <div className="mt-3 text-3xl font-black leading-none text-slate-950">{todayGames}</div>
              <div className="mt-1 text-sm text-slate-600">{nextGameLabel || t('workspace.noImmediateGameWindow')}</div>
            </div>
          </div>

          {compactMatchesPanel ? (
            <div className="mt-4 rounded-[28px] border border-[#6d1b1f]/10 bg-white/90 p-4 shadow-sm">
              {compactMatchesPanel}
            </div>
          ) : null}

          <div className="mt-6 rounded-[28px] border border-[#6d1b1f]/10 bg-white/85 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8e6570]">
              <Shield size={16} className="text-[#57131b]" />
              {t('workspace.coreWorkspaces')}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {spotlightModules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => onNavigate(module.view)}
                  className={`rounded-[24px] border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${module.tone}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex rounded-2xl bg-white/80 p-3 shadow-sm">
                      <module.icon size={20} />
                    </div>
                    <span className="rounded-full border border-current/15 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                      {module.statusLabel}
                    </span>
                  </div>
                  <div className="mt-4 text-base font-black text-slate-900">{module.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{module.description}</div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                    {t('workspace.openModule')}
                    <ArrowRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-6 xl:px-8 xl:py-8">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#8e6570]">
            <Sparkles size={16} className="text-[#f39200]" />
            {t('workspace.priorityQueue')}
          </div>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('workspace.priorityTitle')}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t('workspace.priorityText')}
          </p>

          {supportModules.length > 0 ? (
            <div className="mt-5 space-y-3">
              {supportModules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => onNavigate(module.view)}
                  className="flex w-full items-start gap-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className={`inline-flex rounded-2xl p-3 ${module.tone}`}>
                    <module.icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-black text-slate-900">{module.title}</div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                        {module.statusLabel}
                      </span>
                      {module.badgeLabel ? (
                        <span className="rounded-full bg-[#57131b] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                          {module.badgeLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{module.description}</div>
                  </div>
                  <ArrowRight size={18} className="mt-1 flex-none text-slate-300" />
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[28px] border border-dashed border-slate-200 bg-white/70 px-5 py-5 text-sm text-slate-500">
              {t('workspace.noSecondaryWorkspaces')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default OperationsCommandCenter;
