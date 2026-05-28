import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Bell,
  MessageSquare,
  Newspaper,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import Layout from './Layout';
import { AppView } from '../services/appViews';
import { useSeason } from '../services/seasonContext';
import { getAllowedAccess, getMembers } from '../services/adminService';
import { getRecentActivity } from '../services/activityService';
import { getCurrentAnnouncement } from '../services/announcementService';
import { getNewsPosts } from '../services/newsService';
import { getChatBootstrap } from '../services/chatService';
import { ActivityEntry, AllowedAccessItem, User } from '../types';

interface GovernanceCenterProps {
  user: User;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

const GovernanceCenter: React.FC<GovernanceCenterProps> = ({ user, onBack, onNavigate }) => {
  const { activeSeason } = useSeason();
  const [memberCount, setMemberCount] = useState(0);
  const [accessList, setAccessList] = useState<AllowedAccessItem[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [announcementState, setAnnouncementState] = useState<'live' | 'empty'>('empty');
  const [newsCount, setNewsCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);

      const results = await Promise.allSettled([
        getMembers(user.id),
        getAllowedAccess(user.id),
        getRecentActivity(),
        getCurrentAnnouncement(user.id),
        getNewsPosts(),
        getChatBootstrap(),
      ]);

      if (!isMounted) {
        return;
      }

      const [membersResult, accessResult, activityResult, announcementResult, newsResult, chatResult] = results;

      if (membersResult.status === 'fulfilled') {
        setMemberCount(membersResult.value.members.length);
      }

      if (accessResult.status === 'fulfilled') {
        setAccessList(accessResult.value.accessList);
      }

      if (activityResult.status === 'fulfilled') {
        setActivity(activityResult.value.activity);
      }

      if (announcementResult.status === 'fulfilled') {
        setAnnouncementState(announcementResult.value.announcement ? 'live' : 'empty');
      }

      if (newsResult.status === 'fulfilled') {
        setNewsCount(newsResult.value.posts.length);
      }

      if (chatResult.status === 'fulfilled') {
        setConversationCount(chatResult.value.conversations.length);
      }

      const failedResults = results.filter((result) => result.status === 'rejected');
      setErrorMessage(
        failedResults.length > 0
          ? 'Some governance feeds are limited for this role, but the core control lanes are ready.'
          : '',
      );
      setIsLoading(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const activeUsersLast24h = useMemo(() => activity.length, [activity]);

  const governanceTracks: Array<{
    title: string;
    description: string;
    icon: typeof Users;
    view: AppView;
    tone: string;
  }> = [
    {
      title: 'Member Governance',
      description: 'Manage referee, TO, and staff profiles as the official roster for the season workspace.',
      icon: Users,
      view: 'members',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
    },
    {
      title: 'Access Control',
      description: 'Grant role-specific access and keep onboarding aligned with the federation governance model.',
      icon: UserPlus,
      view: 'access',
      tone: 'border-blue-100 bg-blue-50 text-blue-700',
    },
    {
      title: 'Activity Monitor',
      description: 'Track who was active, which roles were online, and how the workspace is being used.',
      icon: Activity,
      view: 'activity',
      tone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Announcement Desk',
      description: 'Publish live season notices and keep operational messages visible across the platform.',
      icon: Bell,
      view: 'announcement',
      tone: 'border-amber-100 bg-amber-50 text-amber-700',
    },
    {
      title: 'News Channel',
      description: 'Manage league-facing media, learning links, and communication context for the officiating group.',
      icon: Newspaper,
      view: 'news',
      tone: 'border-rose-100 bg-rose-50 text-rose-700',
    },
    {
      title: 'Communications',
      description: 'Coordinate crew discussions, direct messages, and league operations from one channel layer.',
      icon: MessageSquare,
      view: 'chat',
      tone: 'border-cyan-100 bg-cyan-50 text-cyan-700',
    },
  ];

  return (
    <Layout title="Governance Center" onBack={onBack}>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_45%,#eef2ff_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">
              {activeSeason.shortLabel}
            </span>
            <span className="rounded-full border border-[#57131b]/10 bg-[#57131b]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#57131b]">
              Federation governance
            </span>
          </div>
          <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.1fr),minmax(320px,0.9fr)]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">People, Access, Control</div>
              <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-slate-950">
                Governance lanes for members, permissions, announcements, and operating signal.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                This center pulls the administration layer together so the active season is not just running games, but managing people,
                access, communications, and accountability as one platform.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Live state</div>
                  <div className="mt-3 text-2xl font-black text-slate-950">
                    {isLoading ? 'Loading...' : announcementState === 'live' ? 'Announcement active' : 'No live alert'}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#57131b]/5 p-3 text-[#57131b]">
                  <Shield size={22} />
                </div>
              </div>
              <div className="mt-4 text-sm leading-6 text-slate-600">
                {announcementState === 'live'
                  ? 'The league currently has an active announcement pushed into the workspace.'
                  : 'The governance lane is ready for new live season announcements and updates.'}
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{errorMessage}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Members</div>
              <Users size={18} className="text-slate-400" />
            </div>
            <div className="mt-4 text-3xl font-black text-slate-950">{isLoading ? '...' : memberCount}</div>
            <div className="mt-2 text-sm text-slate-500">profiles visible inside the governance roster</div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">Access</div>
              <UserPlus size={18} className="text-blue-600" />
            </div>
            <div className="mt-4 text-3xl font-black text-slate-950">{isLoading ? '...' : accessList.length}</div>
            <div className="mt-2 text-sm text-slate-600">whitelisted records ready for onboarding and role access</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Activity</div>
              <Activity size={18} className="text-emerald-600" />
            </div>
            <div className="mt-4 text-3xl font-black text-slate-950">{isLoading ? '...' : activeUsersLast24h}</div>
            <div className="mt-2 text-sm text-slate-600">users seen in the recent activity feed</div>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700">Signal</div>
              <MessageSquare size={18} className="text-cyan-600" />
            </div>
            <div className="mt-4 text-3xl font-black text-slate-950">{isLoading ? '...' : conversationCount}</div>
            <div className="mt-2 text-sm text-slate-600">{isLoading ? '...' : `${newsCount} news posts, ${conversationCount} chat lanes`}</div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr),minmax(320px,0.95fr)]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <Shield size={16} className="text-[#57131b]" />
              Governance Workstreams
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {governanceTracks.map((track) => (
                <button
                  key={track.title}
                  onClick={() => onNavigate(track.view)}
                  className="group rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm"
                >
                  <div className={`inline-flex rounded-2xl border p-3 ${track.tone}`}>
                    <track.icon size={20} />
                  </div>
                  <div className="mt-4 text-base font-black text-slate-900">{track.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{track.description}</div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                    Open lane
                    <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Control Snapshot</div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-500">Most recent live notice</div>
                <div className="mt-2 text-2xl font-black text-slate-950">
                  {isLoading ? '...' : announcementState === 'live' ? 'Announcement published' : 'Awaiting update'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-500">Communication footprint</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{isLoading ? '...' : `${newsCount} / ${conversationCount}`}</div>
                <div className="mt-2 text-sm text-slate-500">news posts / active conversations</div>
              </div>
              <div className="rounded-2xl border border-dashed border-[#57131b]/20 bg-[#57131b]/[0.03] px-4 py-4 text-sm leading-6 text-slate-600">
                Use this center as the federation control room for people data, permissions, live notices, and operational communication
                quality across the season.
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default GovernanceCenter;
