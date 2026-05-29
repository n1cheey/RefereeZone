import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnnouncementItem, AvailabilityOverview, ChatConversationItem, User, InstructorNomination, RefereeDirectoryItem, RefereeNomination, ReplacementNotice } from '../types';
import { getNominationSlotLabel, getStatisticSlotLabel, getTOSlotLabel } from '../slotLabels';
import { formatAutoDeclineCountdown } from '../assignmentCountdown';
import { getMatchTimestamp, isPastMatch } from '../matchTiming';
import Layout from './Layout';
import MatchTeamsHeader from './MatchTeamsHeader';
import { formatMatchTeams, getCanonicalVenueName, getDisplayGameCode, getDisplayMatchTeams, getDisplayPersonName, splitMatchTeams, TEAM_OPTIONS } from '../teamLogos';
import {
  AlertTriangle,
  Award,
  Bell,
  Calculator,
  Calendar,
  CalendarDays,
  Camera,
  Clock,
  FileText,
  History,
  MapPin,
  MessageSquare,
  Newspaper,
  Pencil,
  Plus,
  Shield,
  TrendingUp,
  User as UserIcon,
  Users,
  UserPlus,
  Trash2,
  Youtube,
} from 'lucide-react';
import {
  assignNominationTOs,
  assignNominationStatistics,
  createNomination,
  deleteNomination,
  editNominationOfficials,
  getInstructorDashboard,
  getInstructorNominations,
  getRefereeNominations,
  replaceNominationReferee,
  respondToNomination,
  updateNominationScore,
} from '../services/nominationService';
import { getAvailabilityOverview } from '../services/availabilityService';
import { getChatBootstrap } from '../services/chatService';
import { getOfficialUnavailabilityRange, isOfficialUnavailableOnMatchDate } from '../services/officialAvailability';
import { setNavigationIntent } from '../services/navigationIntent';
import { readViewCache, writeViewCache } from '../services/viewCache';
import { getAssignmentStatusLabel, getRoleLabel, useI18n } from '../i18n';
import { supabase } from '../services/supabaseClient';
import { useSeason } from '../services/seasonContext';
import { getUserPermissions } from '../services/accessControl';
import { getAnnouncementMessage } from '../services/localizedText';
import OperationsCommandCenter, { OperationsModuleCard } from './OperationsCommandCenter';
import { AppView } from '../services/appViews';

interface DashboardProps {
  user: User;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const POLL_INTERVAL_MS = 45000;
const MONTHLY_EARNINGS_ANIMATION_MS = 1400;
const getDashboardCacheKey = (userId: string, role: User['role'], seasonId: string) => `dashboard:${userId}:${role}:${seasonId}`;
const getNominationsCacheKey = (userId: string, role: User['role'], seasonId: string) => `nominations:${userId}:${role}:${seasonId}`;
const getChatDashboardCacheKey = (userId: string) => `chat:bootstrap:${userId}`;
const getAvailabilityCacheKey = (userId: string, role: User['role']) => `availability:${userId}:${role}`;
const TO_CREW_SLOT_NUMBERS = [1, 2, 3, 4];
const STATISTIC_CREW_SLOT_NUMBERS = [1, 2, 3];
const REQUIRED_STATISTIC_CREW_SLOT_NUMBERS = [1, 2];
const STATISTIC_SUPERVISOR_LICENSE = 'Stat Supervisor';
const BAKU_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Baku',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const getBakuDateParts = (value: number | Date) => {
  const parts = BAKU_DATE_FORMATTER.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === 'year')?.value || '0000';
  const month = parts.find((part) => part.type === 'month')?.value || '00';
  const day = parts.find((part) => part.type === 'day')?.value || '00';
  return { year, month, day };
};

const sortMatchesDesc = <T extends { matchDate: string; matchTime: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftTime = getMatchTimestamp(left.matchDate, left.matchTime) ?? 0;
    const rightTime = getMatchTimestamp(right.matchDate, right.matchTime) ?? 0;
    return rightTime - leftTime;
  });

const sortMatchesAsc = <T extends { matchDate: string; matchTime: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftTime = getMatchTimestamp(left.matchDate, left.matchTime) ?? 0;
    const rightTime = getMatchTimestamp(right.matchDate, right.matchTime) ?? 0;
    return leftTime - rightTime;
  });

const splitMatchesByTime = <T extends { matchDate: string; matchTime: string }>(items: T[], now: number) => ({
  upcoming: sortMatchesAsc(items.filter((item) => !isPastMatch(item.matchDate, item.matchTime, now))),
  past: sortMatchesDesc(items.filter((item) => isPastMatch(item.matchDate, item.matchTime, now))),
});

const sortChatConversations = (items: ChatConversationItem[]) =>
  [...items].sort((left, right) => {
    const leftTimestamp = new Date(left.lastMessageAt || left.createdAt || 0).getTime();
    const rightTimestamp = new Date(right.lastMessageAt || right.createdAt || 0).getTime();
    return rightTimestamp - leftTimestamp;
  });

const isUpcomingMatchDay = (matchDate: string, matchTime: string, now: number) => {
  const matchTimestamp = getMatchTimestamp(matchDate, matchTime);
  if (matchTimestamp === null || matchTimestamp <= now) {
    return false;
  }

  return BAKU_DATE_FORMATTER.format(new Date(now)) === matchDate;
};

const getAssignmentStatusClasses = (status: string) => {
  if (status === 'Accepted') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'Declined') {
    return 'bg-red-100 text-red-700';
  }

  if (status === 'Assigned') {
    return 'bg-blue-100 text-blue-700';
  }

  return 'bg-amber-100 text-amber-700';
};

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate, onLogout, onUpdateUser }) => {
  const { language, locale, t } = useI18n();
  const { activeSeasonId, activeSeason, appStage } = useSeason();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [referees, setReferees] = useState<RefereeDirectoryItem[]>([]);
  const [toOfficials, setTOOfficials] = useState<RefereeDirectoryItem[]>([]);
  const [instructorNominations, setInstructorNominations] = useState<InstructorNomination[]>([]);
  const [refereeAssignments, setRefereeAssignments] = useState<RefereeNomination[]>([]);
  const [replacementNotices, setReplacementNotices] = useState<ReplacementNotice[]>([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState<AnnouncementItem | null>(null);
  const [chatConversations, setChatConversations] = useState<ChatConversationItem[]>([]);
  const [availabilityOverview, setAvailabilityOverview] = useState<AvailabilityOverview>({
    myRequests: [],
    pendingApprovals: [],
    upcomingApproved: [],
  });
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardMessage, setDashboardMessage] = useState('');
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [actionAssignmentId, setActionAssignmentId] = useState<string | null>(null);
  const [replaceActionKey, setReplaceActionKey] = useState<string | null>(null);
  const [replaceSelections, setReplaceSelections] = useState<Record<string, string>>({});
  const [editingNominationId, setEditingNominationId] = useState<string | null>(null);
  const [editSelections, setEditSelections] = useState<Record<string, string>>({});
  const [editActionNominationId, setEditActionNominationId] = useState<string | null>(null);
  const [toActionNominationId, setTOActionNominationId] = useState<string | null>(null);
  const [toSelections, setTOSelections] = useState<Record<string, string[]>>({});
  const [statisticActionNominationId, setStatisticActionNominationId] = useState<string | null>(null);
  const [statisticSelections, setStatisticSelections] = useState<Record<string, string[]>>({});
  const [scoreActionId, setScoreActionId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [videoInputs, setVideoInputs] = useState<Record<string, string>>({});
  const [protocolInputs, setProtocolInputs] = useState<Record<string, string>>({});
  const [refereeFeeInputs, setRefereeFeeInputs] = useState<Record<string, string>>({});
  const [toFeeInputs, setTOFeeInputs] = useState<Record<string, string>>({});
  const [displayedMonthlyEarnings, setDisplayedMonthlyEarnings] = useState(0);
  const [isMonthlyEarningsAnimating, setIsMonthlyEarningsAnimating] = useState(false);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const dashboardLoadPromiseRef = useRef<Promise<void> | null>(null);
  const monthlyEarningsAnimationFrameRef = useRef<number | null>(null);
  const animatedMonthlyEarningsRef = useRef(0);
  const [form, setForm] = useState({
    gameCode: '',
    team1: '',
    team2: '',
    matchDate: '',
    matchTime: '',
    venue: '',
    referee1: '',
    referee2: '',
    referee3: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createNominationFormRef = useRef<HTMLFormElement>(null);
  const createNominationCodeInputRef = useRef<HTMLInputElement>(null);
  const permissions = getUserPermissions(user);
  const isInstructor = permissions.isInstructor;
  const isStaff = permissions.isStaff;
  const isFinancialist = permissions.isFinancialist;
  const isTOSupervisor = permissions.isTOSupervisor;
  const canOpenMatchCenter = permissions.canOpenMatchCenter;
  const isStatisticSupervisor = isTOSupervisor && user.licenseNumber === STATISTIC_SUPERVISOR_LICENSE;
  const isTO = permissions.isTO;
  const canUseEarningsCalculator = permissions.isReferee || permissions.isTO;
  const canOpenCalendar = permissions.canOpenCalendar;
  const canOpenCalculation = permissions.canOpenCalculation;
  const canUseAvailability = permissions.canUseAvailability;
  const dashboardCacheKey = getDashboardCacheKey(user.id, user.role, activeSeasonId);
  const nominationsCacheKey = getNominationsCacheKey(user.id, user.role, activeSeasonId);
  const chatDashboardCacheKey = getChatDashboardCacheKey(user.id);
  const availabilityCacheKey = getAvailabilityCacheKey(user.id, user.role);

  useEffect(() => {
    if (!canUseAvailability) {
      setAvailabilityOverview({
        myRequests: [],
        pendingApprovals: [],
        upcomingApproved: [],
      });
      return;
    }

    let isMounted = true;
    let intervalId: number | null = null;

    const applyCachedData = () => {
      const cached = readViewCache<{
        referees: RefereeDirectoryItem[];
        toOfficials: RefereeDirectoryItem[];
        nominations: InstructorNomination[];
        assignments: RefereeNomination[];
        replacementNotices: ReplacementNotice[];
        activeAnnouncement: AnnouncementItem | null;
      }>(dashboardCacheKey);

      if (cached) {
        setReferees(cached.referees || []);
        setTOOfficials(cached.toOfficials || []);
        setInstructorNominations(cached.nominations || []);
        setRefereeAssignments(cached.assignments || []);
        setReplacementNotices(cached.replacementNotices || []);
        setActiveAnnouncement(cached.activeAnnouncement || null);
        setIsLoadingAssignments(false);
        return true;
      }

      const cachedNominations = readViewCache<{
        referees: RefereeDirectoryItem[];
        toOfficials: RefereeDirectoryItem[];
        nominations: InstructorNomination[];
        assignments: RefereeNomination[];
      }>(nominationsCacheKey);

      if (!cachedNominations) {
        return false;
      }

      setReferees(cachedNominations.referees || []);
      setTOOfficials(cachedNominations.toOfficials || []);
      setInstructorNominations(cachedNominations.nominations || []);
      setRefereeAssignments(cachedNominations.assignments || []);
      setIsLoadingAssignments(false);
      return true;
    };

    const loadInstructorData = async () => {
      const nominationsResponse = await getInstructorNominations(user.id, activeSeasonId);

      if (!isMounted) {
        return;
      }

      setInstructorNominations(nominationsResponse.nominations);
      writeViewCache(dashboardCacheKey, {
        referees,
        toOfficials,
        nominations: nominationsResponse.nominations,
        assignments: refereeAssignments,
        replacementNotices,
        activeAnnouncement,
      });
      writeViewCache(nominationsCacheKey, {
        referees,
        toOfficials,
        nominations: nominationsResponse.nominations,
        assignments: refereeAssignments,
      });

      void (async () => {
        try {
          const response = await getInstructorDashboard(user.id, activeSeasonId);
          if (!isMounted) {
            return;
          }

          setReferees(response.referees);
          setTOOfficials(response.toOfficials);
          setInstructorNominations(response.nominations);
          setRefereeAssignments(response.assignments);
          setReplacementNotices(response.replacementNotices);
          setActiveAnnouncement(response.activeAnnouncement || null);
          writeViewCache(dashboardCacheKey, {
            referees: response.referees,
            toOfficials: response.toOfficials,
            nominations: response.nominations,
            assignments: response.assignments,
            replacementNotices: response.replacementNotices,
            activeAnnouncement: response.activeAnnouncement || null,
          });
          writeViewCache(nominationsCacheKey, {
            referees: response.referees,
            toOfficials: response.toOfficials,
            nominations: response.nominations,
            assignments: response.assignments,
          });
        } catch {
          // Keep the fast dashboard state if the heavier hydration step fails.
        }
      })();
    };

    const loadRefereeData = async () => {
      const response = await getRefereeNominations(user.id, activeSeasonId);

      if (!isMounted) {
        return;
      }

      setRefereeAssignments(response.nominations);
      setReplacementNotices(response.replacementNotices);
      setActiveAnnouncement(response.activeAnnouncement || null);
      writeViewCache(dashboardCacheKey, {
        referees: [],
        toOfficials: [],
        nominations: [],
        assignments: response.nominations,
        replacementNotices: response.replacementNotices,
        activeAnnouncement: response.activeAnnouncement || null,
      });
      writeViewCache(nominationsCacheKey, {
        referees: [],
        toOfficials: [],
        nominations: [],
        assignments: response.nominations,
      });
    };

    const loadData = async (showLoader: boolean) => {
      if (dashboardLoadPromiseRef.current) {
        await dashboardLoadPromiseRef.current;
        return;
      }

      const request = (async () => {
        if (showLoader) {
          setIsLoadingAssignments(true);
        }

        try {
          if (user.role === 'Instructor' || user.role === 'TO Supervisor') {
            await loadInstructorData();
          } else if (user.role === 'Referee' || user.role === 'TO') {
            await loadRefereeData();
          }
          if (isMounted) {
            setDashboardError('');
          }
        } catch (error) {
          if (isMounted) {
            if (!hasCachedData) {
              setDashboardError(error instanceof Error ? error.message : 'Failed to load dashboard data.');
            }
          }
        } finally {
          if (isMounted && showLoader) {
            setIsLoadingAssignments(false);
          }
        }
      })();

      dashboardLoadPromiseRef.current = request;

      try {
        await request;
      } finally {
        if (dashboardLoadPromiseRef.current === request) {
          dashboardLoadPromiseRef.current = null;
        }
      }
    };

    const startPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          void loadData(false);
        }
      }, POLL_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadData(false);
        startPolling();
        return;
      }

      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const hasCachedData = applyCachedData();
    void loadData(!hasCachedData);
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dashboardCacheKey, nominationsCacheKey, user.id, user.role]);

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    const applyCachedChat = () => {
      const cached = readViewCache<{ conversations: ChatConversationItem[] }>(chatDashboardCacheKey);
      if (!cached) {
        return false;
      }

      setChatConversations(sortChatConversations(cached.conversations || []));
      return true;
    };

    const loadChatData = async () => {
      try {
        const response = await getChatBootstrap();
        if (!isMounted) {
          return;
        }

        const nextConversations = sortChatConversations(response.conversations);
        setChatConversations(nextConversations);
        writeViewCache(chatDashboardCacheKey, {
          conversations: nextConversations,
        });
      } catch (error) {
        console.error('Failed to load dashboard chat data', error);
      }
    };

    const startPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          void loadChatData();
        }
      }, POLL_INTERVAL_MS);
    };

    const hasCachedChat = applyCachedChat();
    void loadChatData();
    if (!hasCachedChat) {
      setChatConversations([]);
    }
    startPolling();

    const channel = supabase
      .channel(`dashboard-chat-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        () => {
          void loadChatData();
        },
      )
      .subscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadChatData();
        startPolling();
        return;
      }

      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [chatDashboardCacheKey, user.id]);

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    const applyCachedAvailability = () => {
      const cached = readViewCache<AvailabilityOverview>(availabilityCacheKey);
      if (!cached) {
        return false;
      }

      setAvailabilityOverview(cached);
      return true;
    };

    const loadAvailability = async () => {
      try {
        const response = await getAvailabilityOverview();
        if (!isMounted) {
          return;
        }

        setAvailabilityOverview(response);
        writeViewCache(availabilityCacheKey, response);
      } catch (error) {
        console.error('Failed to load availability overview', error);
      }
    };

    const startPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          void loadAvailability();
        }
      }, POLL_INTERVAL_MS);
    };

    applyCachedAvailability();
    void loadAvailability();
    startPolling();

    return () => {
      isMounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [availabilityCacheKey, canUseAvailability]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({
          ...user,
          photoUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateFormField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      gameCode: '',
      team1: '',
      team2: '',
      matchDate: '',
      matchTime: '',
      venue: '',
      referee1: '',
      referee2: '',
      referee3: '',
    });
  };

  const refreshInstructorData = async () => {
    const response = await getInstructorDashboard(user.id, activeSeasonId);
    setReferees(response.referees);
    setTOOfficials(response.toOfficials);
    setInstructorNominations(response.nominations);
    setRefereeAssignments(response.assignments);
    setReplacementNotices(response.replacementNotices);
    setActiveAnnouncement(response.activeAnnouncement || null);
    writeViewCache(dashboardCacheKey, {
      referees: response.referees,
      toOfficials: response.toOfficials,
      nominations: response.nominations,
      assignments: response.assignments,
      replacementNotices: response.replacementNotices,
      activeAnnouncement: response.activeAnnouncement || null,
    });
    writeViewCache(nominationsCacheKey, {
      referees: response.referees,
      toOfficials: response.toOfficials,
      nominations: response.nominations,
      assignments: response.assignments,
    });
  };

  const refreshRefereeData = async () => {
    const response = await getRefereeNominations(user.id, activeSeasonId);
    setRefereeAssignments(response.nominations);
    setReplacementNotices(response.replacementNotices);
    setActiveAnnouncement(response.activeAnnouncement || null);
    writeViewCache(dashboardCacheKey, {
      referees: [],
      toOfficials: [],
      nominations: [],
      assignments: response.nominations,
      replacementNotices: response.replacementNotices,
      activeAnnouncement: response.activeAnnouncement || null,
    });
    writeViewCache(nominationsCacheKey, {
      referees: [],
      toOfficials: [],
      nominations: [],
      assignments: response.nominations,
    });
  };

  const handleCreateNomination = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setDashboardError('');
    setDashboardMessage('');

    const refereeIds = [form.referee1, form.referee2, form.referee3];
    if (new Set(refereeIds).size !== 3 || refereeIds.some((item) => !item)) {
      setDashboardError('Choose 3 different officials.');
      setIsSubmittingCreate(false);
      return;
    }

    try {
      const teams = formatMatchTeams(form.team1, form.team2);
      if (!teams || form.team1 === form.team2) {
        setDashboardError('Choose two different teams.');
        setIsSubmittingCreate(false);
        return;
      }

      await createNomination({
        instructorId: user.id,
        gameCode: form.gameCode,
        teams,
        matchDate: form.matchDate,
        matchTime: form.matchTime,
        venue: form.venue,
        refereeIds,
        seasonId: activeSeasonId,
      });

      await refreshInstructorData();
      resetForm();
      setShowCreateForm(false);
      setDashboardMessage('Nomination created.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to create nomination.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenCreateNomination = () => {
    setShowCreateForm((previous) => {
      const nextValue = !previous;

      if (!previous) {
        window.setTimeout(() => {
          createNominationFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          createNominationCodeInputRef.current?.focus();
        }, 0);
      }

      return nextValue;
    });
  };

  const handleNominationResponse = async (nominationId: string, response: 'Accepted' | 'Declined', assignmentId: string) => {
    setActionAssignmentId(assignmentId);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await respondToNomination({
        nominationId,
        refereeId: user.id,
        response,
      });
      await refreshRefereeData();
      setDashboardMessage(`Game ${response.toLowerCase()}.`);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to save response.');
    } finally {
      setActionAssignmentId(null);
    }
  };

  const handleReplaceReferee = async (nominationId: string, slotNumber: number) => {
    const key = `${nominationId}-${slotNumber}`;
    const newRefereeId = replaceSelections[key];

    if (!newRefereeId) {
      setDashboardError('Choose a replacement referee first.');
      return;
    }

    setReplaceActionKey(key);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await replaceNominationReferee({
        nominationId,
        slotNumber,
        instructorId: user.id,
        refereeId: newRefereeId,
      });
      await refreshInstructorData();
      setReplaceSelections((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setDashboardMessage('Replacement referee assigned.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to replace referee.');
    } finally {
      setReplaceActionKey(null);
    }
  };

  const handleDeleteNomination = async (nominationId: string) => {
    setDashboardError('');
    setDashboardMessage('');

    try {
      await deleteNomination({
        nominationId,
        instructorId: user.id,
      });
      await refreshInstructorData();
      setDashboardMessage('Game deleted.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to delete game.');
    }
  };

  const handleStartEditNomination = (nomination: InstructorNomination) => {
    const [team1 = '', team2 = ''] = splitMatchTeams(nomination.teams);
    setEditingNominationId(nomination.id);
    setEditSelections({
      team1,
      team2,
      matchDate: nomination.matchDate,
      matchTime: nomination.matchTime,
      venue: nomination.venue,
      referee1: nomination.referees.find((item) => item.slotNumber === 1)?.refereeId || '',
      referee2: nomination.referees.find((item) => item.slotNumber === 2)?.refereeId || '',
      referee3: nomination.referees.find((item) => item.slotNumber === 3)?.refereeId || '',
    });
    setDashboardError('');
    setDashboardMessage('');
  };

  const handleCancelEditNomination = () => {
    setEditingNominationId(null);
    setEditSelections({});
  };

  const handleSaveEditedNomination = async (nominationId: string) => {
    const refereeIds = [editSelections.referee1, editSelections.referee2, editSelections.referee3];
    const teams = formatMatchTeams(editSelections.team1 || '', editSelections.team2 || '');
    const matchDate = String(editSelections.matchDate || '').trim();
    const matchTime = String(editSelections.matchTime || '').trim();
    const venue = String(editSelections.venue || '').trim();

    if (new Set(refereeIds).size !== 3 || refereeIds.some((item) => !item)) {
      setDashboardError('Choose 3 different officials.');
      return;
    }

    if (!teams || editSelections.team1 === editSelections.team2) {
      setDashboardError('Choose two different teams.');
      return;
    }

    if (!matchDate || !matchTime || !venue) {
      setDashboardError('Fill in date, time and venue.');
      return;
    }

    setEditActionNominationId(nominationId);
    setDashboardError('');
    setDashboardMessage('');

    try {
      const response = await editNominationOfficials({
        nominationId,
        instructorId: user.id,
        refereeIds,
        teams,
        matchDate,
        matchTime,
        venue,
        seasonId: activeSeasonId,
      });

      if (response.nomination) {
        setInstructorNominations((prev) =>
          prev.map((item) => (item.id === nominationId ? response.nomination : item)),
        );
      }

      handleCancelEditNomination();
      setDashboardMessage('Game crew updated.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to update game crew.');
    } finally {
      setEditActionNominationId(null);
    }
  };

  const getTONominationSelection = (nomination: InstructorNomination) =>
    toSelections[nomination.id] ||
    TO_CREW_SLOT_NUMBERS.map((slotNumber) => nomination.toCrew.find((item) => item.slotNumber === slotNumber)?.toId || '');

  const getStatisticNominationSelection = (nomination: InstructorNomination) =>
    statisticSelections[nomination.id] ||
    STATISTIC_CREW_SLOT_NUMBERS.map(
      (slotNumber) => nomination.statisticCrew.find((item) => item.slotNumber === slotNumber)?.toId || '',
    );

  const handleSaveTOCrew = async (nominationId: string) => {
    const nomination = instructorNominations.find((item) => item.id === nominationId);
    if (!nomination) {
      return;
    }

    const existingTOIds = TO_CREW_SLOT_NUMBERS.map((slotNumber) => nomination.toCrew.find((item) => item.slotNumber === slotNumber)?.toId || '');
    const selectedTOs = getTONominationSelection(nomination);
    const isPastNomination = isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow);
    const payloadTOs = isPastNomination
      ? existingTOIds.map((toId, index) => toId || selectedTOs[index] || '')
      : selectedTOs;
    const filledTOs = payloadTOs.filter(Boolean);

    if (new Set(filledTOs).size !== filledTOs.length) {
      setDashboardError('Choose different TO users.');
      return;
    }

    if (isPastNomination) {
      const changedAssignedSlot = existingTOIds.some((toId, index) => toId && selectedTOs[index] && selectedTOs[index] !== toId);
      if (changedAssignedSlot) {
        setDashboardError('Assigned TO officials cannot be changed after the match starts.');
        return;
      }

      const hasNewTOForEmptySlot = existingTOIds.some((toId, index) => !toId && payloadTOs[index]);
      if (!hasNewTOForEmptySlot) {
        setDashboardError(t('dashboard.toCrewPastSelectAtLeastOne'));
        return;
      }
    } else if (filledTOs.length !== 4) {
      setDashboardError('Choose 4 different TO users.');
      return;
    }

    setTOActionNominationId(nominationId);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await assignNominationTOs({
        nominationId,
        toSupervisorId: user.id,
        toIds: payloadTOs,
      });
      await refreshInstructorData();
      setDashboardMessage('TO crew updated.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to update TO crew.');
    } finally {
      setTOActionNominationId(null);
    }
  };

  const handleSaveStatisticCrew = async (nominationId: string) => {
    const nomination = instructorNominations.find((item) => item.id === nominationId);
    if (!nomination) {
      return;
    }

    const existingStatisticIds = STATISTIC_CREW_SLOT_NUMBERS.map(
      (slotNumber) => nomination.statisticCrew.find((item) => item.slotNumber === slotNumber)?.toId || '',
    );
    const selectedStatisticians = getStatisticNominationSelection(nomination);
    const isPastNomination = isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow);
    const payloadStatisticians = isPastNomination
      ? existingStatisticIds.map((toId, index) => toId || selectedStatisticians[index] || '')
      : selectedStatisticians;
    const filledStatisticians = payloadStatisticians.filter(Boolean);

    if (new Set(filledStatisticians).size !== filledStatisticians.length) {
      setDashboardError('Choose different statistic crew members.');
      return;
    }

    if (isPastNomination) {
      if (nomination.statisticCrew.length > 0) {
        setDashboardError('Assigned statistic crew members cannot be changed after the match starts.');
        return;
      }

      if (REQUIRED_STATISTIC_CREW_SLOT_NUMBERS.some((slotNumber) => !payloadStatisticians[slotNumber - 1])) {
        setDashboardError('Choose Statistician 1 and Statistician 2.');
        return;
      }
    } else if (REQUIRED_STATISTIC_CREW_SLOT_NUMBERS.some((slotNumber) => !payloadStatisticians[slotNumber - 1])) {
      setDashboardError('Choose Statistician 1 and Statistician 2.');
      return;
    }

    setStatisticActionNominationId(nominationId);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await assignNominationStatistics({
        nominationId,
        toSupervisorId: user.id,
        statisticianIds: payloadStatisticians,
      });
      await refreshInstructorData();
      setDashboardMessage('Statistic crew updated.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to update statistic crew.');
    } finally {
      setStatisticActionNominationId(null);
    }
  };

  const declinedAssignments = instructorNominations.flatMap((nomination) =>
    nomination.createdById === user.id
      ? nomination.referees
      .filter((referee) => referee.status === 'Declined')
      .map((referee) => ({
        nomination,
        referee,
      }))
      : [],
  );

  const getReplacementOptions = (nomination: InstructorNomination, slotNumber: number) => {
    const occupied = new Set(
      nomination.referees.filter((item) => item.slotNumber !== slotNumber).map((item) => item.refereeId),
    );

    return referees.filter(
      (referee) =>
        !occupied.has(referee.id) &&
        !isOfficialUnavailableOnMatchDate(referee, nomination.matchDate),
    );
  };

  const getOfficialOptionLabel = (official: RefereeDirectoryItem, matchDate: string, includeRole = false) => {
    const availability = getOfficialUnavailabilityRange(official, matchDate);
    const baseLabel = includeRole
      ? `${official.fullName} (${getRoleLabel(official.role, language)})`
      : official.fullName;

    if (!availability) {
      return baseLabel;
    }

    return `${baseLabel} - Leave ${availability.startDate} to ${availability.endDate}`;
  };

  const createdNominationSections = useMemo(
    () => splitMatchesByTime(instructorNominations, countdownNow),
    [instructorNominations, countdownNow],
  );
  const assignmentSections = useMemo(
    () => splitMatchesByTime(refereeAssignments, countdownNow),
    [refereeAssignments, countdownNow],
  );
  const totalUnreadChatCount = useMemo(
    () => chatConversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    [chatConversations],
  );
  const firstUnreadConversation = useMemo(
    () => chatConversations.find((conversation) => conversation.unreadCount > 0) || null,
    [chatConversations],
  );
  const pendingResponseCount = useMemo(
    () => refereeAssignments.filter((assignment) => assignment.status === 'Pending').length,
    [refereeAssignments],
  );
  const firstPendingAssignment = useMemo(
    () => refereeAssignments.find((assignment) => assignment.status === 'Pending') || null,
    [refereeAssignments],
  );
  const pendingTOCrewCount = useMemo(
    () =>
      createdNominationSections.upcoming.filter(
        (nomination) =>
          nomination.toCrew.length < 4 || nomination.toCrew.some((member) => member.status === 'Declined'),
      ).length,
    [createdNominationSections],
  );
  const firstPendingTOCrewNomination = useMemo(
    () =>
      createdNominationSections.upcoming.find(
        (nomination) =>
          nomination.toCrew.length < 4 || nomination.toCrew.some((member) => member.status === 'Declined'),
      ) || null,
    [createdNominationSections],
  );
  const hasPendingRequiredStatisticCrew = (nomination: InstructorNomination) =>
    REQUIRED_STATISTIC_CREW_SLOT_NUMBERS.some(
      (slotNumber) =>
        !nomination.statisticCrew.find((member) => member.slotNumber === slotNumber) ||
        nomination.statisticCrew.find((member) => member.slotNumber === slotNumber)?.status === 'Declined',
    );

  const pendingStatisticCrewCount = useMemo(
    () =>
      !isStatisticSupervisor
        ? 0
        : createdNominationSections.upcoming.filter(
            (nomination) => hasPendingRequiredStatisticCrew(nomination),
          ).length,
    [createdNominationSections, isStatisticSupervisor],
  );
  const firstPendingStatisticCrewNomination = useMemo(
    () =>
      !isStatisticSupervisor
        ? null
        : createdNominationSections.upcoming.find(
            (nomination) => hasPendingRequiredStatisticCrew(nomination),
          ) || null,
    [createdNominationSections, isStatisticSupervisor],
  );
  const { year: currentBakuYear, month: currentBakuMonth } = getBakuDateParts(countdownNow);
  const currentMonthKey = `${currentBakuYear}-${currentBakuMonth}`;
  const workedAssignmentStatuses = new Set(['Accepted', 'Assigned']);
  const monthlyAssignmentGroup = user.role === 'TO' ? 'TO' : 'Referee';
  const monthlyWorkedAssignments = useMemo(
    () =>
      !canUseEarningsCalculator
        ? []
        : refereeAssignments.filter(
            (assignment) =>
              assignment.assignmentGroup === monthlyAssignmentGroup &&
              assignment.matchDate.slice(0, 7) === currentMonthKey &&
              workedAssignmentStatuses.has(assignment.status) &&
              isPastMatch(assignment.matchDate, assignment.matchTime, countdownNow),
          ),
    [canUseEarningsCalculator, countdownNow, currentMonthKey, monthlyAssignmentGroup, refereeAssignments],
  );
  const monthlyMatchesWorkedCount = monthlyWorkedAssignments.length;
  const monthlyEarningsTotal = useMemo(
    () =>
      monthlyWorkedAssignments.reduce(
        (sum, assignment) => sum + (user.role === 'TO' ? assignment.toFee || 0 : assignment.refereeFee || 0),
        0,
      ),
    [monthlyWorkedAssignments, user.role],
  );

  useEffect(() => {
    if (monthlyEarningsAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(monthlyEarningsAnimationFrameRef.current);
      monthlyEarningsAnimationFrameRef.current = null;
    }

    if (!canUseEarningsCalculator) {
      animatedMonthlyEarningsRef.current = 0;
      setDisplayedMonthlyEarnings(0);
      setIsMonthlyEarningsAnimating(false);
      return;
    }

    const startValue = animatedMonthlyEarningsRef.current;
    const targetValue = monthlyEarningsTotal;

    if (Math.abs(targetValue - startValue) < 0.01) {
      animatedMonthlyEarningsRef.current = targetValue;
      setDisplayedMonthlyEarnings(targetValue);
      setIsMonthlyEarningsAnimating(false);
      return;
    }

    setIsMonthlyEarningsAnimating(true);
    const animationStartedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - animationStartedAt;
      const progress = Math.min(elapsed / MONTHLY_EARNINGS_ANIMATION_MS, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (targetValue - startValue) * easedProgress;

      animatedMonthlyEarningsRef.current = nextValue;
      setDisplayedMonthlyEarnings(nextValue);

      if (progress < 1) {
        monthlyEarningsAnimationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      animatedMonthlyEarningsRef.current = targetValue;
      setDisplayedMonthlyEarnings(targetValue);
      setIsMonthlyEarningsAnimating(false);
      monthlyEarningsAnimationFrameRef.current = null;
    };

    monthlyEarningsAnimationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (monthlyEarningsAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(monthlyEarningsAnimationFrameRef.current);
        monthlyEarningsAnimationFrameRef.current = null;
      }
    };
  }, [canUseEarningsCalculator, monthlyEarningsTotal]);
  const pendingAvailabilityApprovalsCount = canUseAvailability ? availabilityOverview.pendingApprovals.length : 0;
  const pendingMyAvailabilityCount = useMemo(
    () =>
      canUseAvailability
        ? availabilityOverview.myRequests.filter((request) => request.status === 'Pending').length
        : 0,
    [availabilityOverview.myRequests, canUseAvailability],
  );
  const firstPendingAvailabilityApproval = canUseAvailability ? availabilityOverview.pendingApprovals[0] || null : null;
  const firstPendingMyAvailability = useMemo(
    () =>
      canUseAvailability
        ? availabilityOverview.myRequests.find((request) => request.status === 'Pending') || null
        : null,
    [availabilityOverview.myRequests, canUseAvailability],
  );
  const upcomingApprovedAvailabilityCount = canUseAvailability ? availabilityOverview.upcomingApproved.length : 0;
  const todayGamesCount = useMemo(() => {
    const source =
      isInstructor || isTOSupervisor || isStaff ? createdNominationSections.upcoming : assignmentSections.upcoming;
    return source.filter((item) => isUpcomingMatchDay(item.matchDate, item.matchTime, countdownNow)).length;
  }, [assignmentSections, countdownNow, createdNominationSections, isInstructor, isStaff, isTOSupervisor]);
  const firstTodayGame = useMemo(() => {
    const source =
      isInstructor || isTOSupervisor || isStaff ? createdNominationSections.upcoming : assignmentSections.upcoming;
    return source.find((item) => isUpcomingMatchDay(item.matchDate, item.matchTime, countdownNow)) || null;
  }, [assignmentSections, countdownNow, createdNominationSections, isInstructor, isStaff, isTOSupervisor]);
  const pendingActionCount = isInstructor
    ? declinedAssignments.length + pendingAvailabilityApprovalsCount
    : isTOSupervisor
      ? pendingTOCrewCount + pendingStatisticCrewCount + pendingAvailabilityApprovalsCount
        : isStaff
          ? 0
          : pendingResponseCount + replacementNotices.length + pendingMyAvailabilityCount;
  const notificationBadgeCount =
    pendingActionCount +
    upcomingApprovedAvailabilityCount +
    (activeAnnouncement ? 1 : 0);
  const quickOverviewItems = [
    {
      id: 'unreadMessages',
      label: t('dashboard.unreadMessages'),
      value: totalUnreadChatCount,
      tone: 'border-cyan-100 bg-cyan-50 text-cyan-700',
      icon: MessageSquare,
    },
    ...(!isStaff
      ? [
          {
            id: 'pendingActions',
            label: t('dashboard.pendingActions'),
            value: pendingActionCount,
            tone: 'border-amber-100 bg-amber-50 text-amber-700',
            icon: Bell,
          },
        ]
      : []),
    {
      id: 'todayGames',
      label: t('dashboard.todayGames'),
      value: todayGamesCount,
      tone: 'border-blue-100 bg-blue-50 text-blue-700',
      icon: Calendar,
    },
  ];
  const firstDeclinedAssignment = declinedAssignments[0] || null;
  const firstReplacementNotice = replacementNotices[0] || null;
  const actionCenterItems = [
    ...(totalUnreadChatCount > 0
      ? [
          {
            id: 'chat',
            title: t('dashboard.unreadMessages'),
            description: t('dashboard.notificationUnreadMessages', { count: totalUnreadChatCount }),
            actionLabel: t('dashboard.openChat'),
            actionView: 'chat' as const,
            targetId: firstUnreadConversation?.id,
            tone: 'border-cyan-200 bg-cyan-50 text-cyan-800',
          },
        ]
      : []),
    ...(pendingAvailabilityApprovalsCount > 0
      ? [
          {
            id: 'availabilityApprovals',
            title: t('dashboard.pendingActions'),
            description: t('dashboard.notificationAvailabilityPendingApproval', { count: pendingAvailabilityApprovalsCount }),
            actionLabel: t('dashboard.openAvailability'),
            actionView: 'availability' as const,
            targetId: firstPendingAvailabilityApproval?.id,
            tone: 'border-violet-200 bg-violet-50 text-violet-800',
          },
        ]
      : []),
    ...(pendingMyAvailabilityCount > 0
      ? [
          {
            id: 'availabilityMine',
            title: t('dashboard.pendingActions'),
            description: t('dashboard.notificationAvailabilityPendingMine', { count: pendingMyAvailabilityCount }),
            actionLabel: t('dashboard.openAvailability'),
            actionView: 'availability' as const,
            targetId: firstPendingMyAvailability?.id,
            tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800',
          },
        ]
      : []),
    ...(upcomingApprovedAvailabilityCount > 0
      ? [
          {
            id: 'availabilityApproved',
            title: t('dashboard.pendingActions'),
            description: t('dashboard.notificationAvailabilityApproved', { count: upcomingApprovedAvailabilityCount }),
            actionLabel: t('dashboard.openAvailability'),
            actionView: 'availability' as const,
            targetId: availabilityOverview.upcomingApproved[0]?.id,
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
          },
        ]
      : []),
    ...(isInstructor && declinedAssignments.length > 0
      ? [
          {
            id: 'declinedAssignments',
            title: t('dashboard.pendingActions'),
            description: t('dashboard.notificationDeclinedAssignments', { count: declinedAssignments.length }),
            actionLabel: t('dashboard.openNominations'),
            actionView: 'nominations' as const,
            targetId: firstDeclinedAssignment?.nomination.id,
            tone: 'border-amber-200 bg-amber-50 text-amber-800',
          },
        ]
      : []),
    ...(isTOSupervisor && pendingTOCrewCount > 0
      ? [
          {
            id: 'toCrew',
            title: t('dashboard.pendingActions'),
            description: t('dashboard.notificationTOCrewPending', { count: pendingTOCrewCount }),
            actionLabel: t('dashboard.openNominations'),
            actionView: 'nominations' as const,
            targetId: firstPendingTOCrewNomination?.id,
            tone: 'border-teal-200 bg-teal-50 text-teal-800',
          },
        ]
      : []),
    ...(isStatisticSupervisor && pendingStatisticCrewCount > 0
      ? [
          {
            id: 'statisticCrew',
            title: t('dashboard.pendingActions'),
            description: t('dashboard.notificationStatisticCrewPending', { count: pendingStatisticCrewCount }),
            actionLabel: t('dashboard.openNominations'),
            actionView: 'nominations' as const,
            targetId: firstPendingStatisticCrewNomination?.id,
            tone: 'border-sky-200 bg-sky-50 text-sky-800',
          },
        ]
      : []),
    ...((user.role === 'Referee' || isTO) && pendingResponseCount > 0
      ? [
          {
            id: 'assignmentResponses',
            title: t('dashboard.pendingActions'),
            description: t('dashboard.notificationPendingAssignments', { count: pendingResponseCount }),
            actionLabel: t('dashboard.openNominations'),
            actionView: 'nominations' as const,
            targetId: firstPendingAssignment?.nominationId,
            tone: 'border-amber-200 bg-amber-50 text-amber-800',
          },
        ]
      : []),
    ...(replacementNotices.length > 0
      ? [
          {
            id: 'replacementNotices',
            title: t('dashboard.pendingActions'),
            description: t('dashboard.notificationReplacementNotices', { count: replacementNotices.length }),
            actionLabel: t('dashboard.openNominations'),
            actionView: 'nominations' as const,
            targetId: firstReplacementNotice?.nominationId,
            tone: 'border-red-200 bg-red-50 text-red-800',
          },
        ]
      : []),
    ...(todayGamesCount > 0
      ? [
          {
            id: 'todayGames',
            title: t('dashboard.todayGames'),
            description: t('dashboard.notificationTodayGames', { count: todayGamesCount }),
            actionLabel: t('dashboard.openCalendar'),
            actionView: 'calendar' as const,
            targetDate: firstTodayGame?.matchDate || BAKU_DATE_FORMATTER.format(new Date()),
            tone: 'border-blue-200 bg-blue-50 text-blue-800',
          },
        ]
      : []),
  ];

  const handleActionCenterNavigation = (item: { actionView: 'chat' | 'nominations' | 'availability' | 'calendar'; targetId?: string; targetDate?: string }) => {
    if (item.targetId || item.targetDate) {
      setNavigationIntent({
        view: item.actionView,
        targetId: item.targetId,
        targetDate: item.targetDate,
      });
    }

    onNavigate(item.actionView);
  };

  const openMatchCenter = (nominationId: string) => {
    setNavigationIntent({
      view: 'matchCenter',
      targetId: nominationId,
    });
    onNavigate('matchCenter');
  };

  const navItems: Array<{
    id: AppView;
    label: string;
    icon: typeof Calendar;
    iconColor: string;
    color: string;
    badgeCount?: number;
  }> = isFinancialist
    ? [
        {
          id: 'nominations' as const,
          label: t('nominations.title'),
          icon: Calendar,
          iconColor: 'text-blue-500',
          color: 'bg-blue-50',
        },
        {
          id: 'calendar' as const,
          label: t('dashboard.navCalendar'),
          icon: Calendar,
          iconColor: 'text-sky-600',
          color: 'bg-sky-50',
        },
        {
          id: 'calculation' as const,
          label: t('dashboard.calculation'),
          icon: Calculator,
          iconColor: 'text-emerald-600',
          color: 'bg-emerald-50',
        },
        {
          id: 'chat' as const,
          label: t('dashboard.navChat'),
          icon: MessageSquare,
          iconColor: 'text-cyan-600',
          color: 'bg-cyan-50',
          badgeCount: totalUnreadChatCount,
        },
        {
          id: 'notifications' as const,
          label: t('notifications.title'),
          icon: Bell,
          iconColor: 'text-amber-600',
          color: 'bg-amber-50',
          badgeCount: notificationBadgeCount || undefined,
        },
        {
          id: 'news' as const,
          label: t('news.title'),
          icon: Newspaper,
          iconColor: 'text-orange-500',
          color: 'bg-orange-50',
        },
      ]
    : [
        { id: 'nominations' as const, label: isInstructor || isTOSupervisor || isStaff ? t('nominations.title') : t('nominations.myTitle'), icon: Calendar, iconColor: 'text-blue-500', color: 'bg-blue-50' },
        ...(canOpenCalculation
          ? [{ id: 'calculation' as const, label: t('dashboard.calculation'), icon: Calculator, iconColor: 'text-emerald-600', color: 'bg-emerald-50' }]
          : []),
        ...(canUseAvailability
          ? [{ id: 'availability' as const, label: t('dashboard.navAvailability'), icon: CalendarDays, iconColor: 'text-violet-600', color: 'bg-violet-50' }]
          : []),
        ...(canOpenCalendar
          ? [{ id: 'calendar' as const, label: t('dashboard.navCalendar'), icon: Calendar, iconColor: 'text-sky-600', color: 'bg-sky-50' }]
          : []),
        ...(isInstructor
          ? [{ id: 'activity' as const, label: t('activity.title'), icon: History, iconColor: 'text-amber-600', color: 'bg-amber-50' }]
          : []),
        ...(isInstructor || isStaff
          ? [
              {
                id: 'ranking' as const,
                label: t('dashboard.navRanking'),
                icon: TrendingUp,
                iconColor: 'text-green-500',
                color: 'bg-green-50',
              },
              {
                id: 'reports' as const,
                label: t('reports.title'),
                icon: FileText,
                iconColor: 'text-purple-500',
                color: 'bg-purple-50',
              },
            ]
          : isTO || isTOSupervisor
          ? [
              {
                id: 'toRanking' as const,
                label: isTOSupervisor ? t('dashboard.navTORanking') : t('ranking.myTORankingTitle'),
                icon: TrendingUp,
                iconColor: 'text-teal-600',
                color: 'bg-teal-50',
              },
              {
                id: 'reports' as const,
                label: t('reports.title'),
                icon: FileText,
                iconColor: 'text-fuchsia-600',
                color: 'bg-fuchsia-50',
              },
            ]
          : [
              {
                id: 'calendar' as const,
                label: t('dashboard.navCalendar'),
                icon: Calendar,
                iconColor: 'text-sky-600',
                color: 'bg-sky-50',
              },
              {
                id: 'ranking' as const,
                label: isInstructor || isStaff ? t('dashboard.navRanking') : t('dashboard.navMyRanking'),
                icon: TrendingUp,
                iconColor: 'text-green-500',
                color: 'bg-green-50',
              },
              {
                id: 'reports' as const,
                label: t('reports.myTitle'),
                icon: FileText,
                iconColor: 'text-purple-500',
                color: 'bg-purple-50',
              },
            ]),
        {
          id: 'chat' as const,
          label: t('dashboard.navChat'),
          icon: MessageSquare,
          iconColor: 'text-cyan-600',
          color: 'bg-cyan-50',
          badgeCount: totalUnreadChatCount,
        },
        ...(permissions.canOpenNotifications && !isStaff
          ? [
              {
                id: 'notifications' as const,
                label: t('notifications.title'),
                icon: Bell,
                iconColor: 'text-amber-600',
                color: 'bg-amber-50',
                badgeCount: notificationBadgeCount || undefined,
              },
            ]
          : []),
        ...(permissions.canOpenTests
          ? [{ id: 'tests' as const, label: t('tests.title'), icon: Shield, iconColor: 'text-fuchsia-600', color: 'bg-fuchsia-50' }]
          : []),
        { id: 'news' as const, label: t('news.title'), icon: Newspaper, iconColor: 'text-orange-500', color: 'bg-orange-50' },
      ];
  const operationsModules: OperationsModuleCard[] = [
    {
      id: 'match-operations',
      title: t('workspace.moduleMatchOperationsTitle'),
      description: t('workspace.moduleMatchOperationsText'),
      view: 'nominations',
      icon: Calendar,
      tone: 'border-blue-100 bg-blue-50 text-blue-700',
      badgeLabel: pendingActionCount > 0 ? t('workspace.badgePending', { count: pendingActionCount }) : undefined,
      statusLabel: t('workspace.statusLive'),
    },
    ...(navItems.some((item) => item.id === 'calendar')
      ? [
          {
            id: 'season-calendar',
            title: t('workspace.moduleSeasonCalendarTitle'),
            description: t('workspace.moduleSeasonCalendarText'),
            view: 'calendar' as const,
            icon: CalendarDays,
            tone: 'border-sky-100 bg-sky-50 text-sky-700',
            badgeLabel: todayGamesCount > 0 ? t('workspace.badgeToday', { count: todayGamesCount }) : undefined,
            statusLabel: t('workspace.statusLive'),
          },
        ]
      : []),
    ...(navItems.some((item) => item.id === 'ranking')
      ? [
          {
            id: 'ranking',
            title: t('workspace.moduleRankingTitle'),
            description: t('workspace.moduleRankingText'),
            view: 'ranking' as const,
            icon: TrendingUp,
            tone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
            statusLabel: t('workspace.statusLive'),
          },
        ]
      : []),
    ...(navItems.some((item) => item.id === 'toRanking')
      ? [
          {
            id: 'to-ranking',
            title: t('workspace.moduleRankingTitle'),
            description: t('workspace.moduleRankingText'),
            view: 'toRanking' as const,
            icon: TrendingUp,
            tone: 'border-teal-100 bg-teal-50 text-teal-700',
            statusLabel: t('workspace.statusLive'),
          },
        ]
      : []),
    ...(navItems.some((item) => item.id === 'reports')
      ? [
          {
            id: 'reports',
            title: t('workspace.moduleReportsTitle'),
            description: t('workspace.moduleReportsText'),
            view: 'reports' as const,
            icon: FileText,
            tone: 'border-purple-100 bg-purple-50 text-purple-700',
            statusLabel: t('workspace.statusLive'),
          },
        ]
      : []),
    ...(navItems.some((item) => item.id === 'tests')
      ? [
          {
            id: 'tests-certification',
            title: t('workspace.moduleTestsTitle'),
            description: t('workspace.moduleTestsText'),
            view: 'tests' as const,
            icon: Shield,
            tone: 'border-indigo-100 bg-indigo-50 text-indigo-700',
            statusLabel: t('workspace.statusExpansion'),
          },
        ]
      : []),
    ...(navItems.some((item) => item.id === 'availability')
      ? [
          {
            id: 'availability-control',
            title: t('workspace.moduleAvailabilityTitle'),
            description: t('workspace.moduleAvailabilityText'),
            view: 'availability' as const,
            icon: CalendarDays,
            tone: 'border-violet-100 bg-violet-50 text-violet-700',
            statusLabel: t('workspace.statusLive'),
          },
        ]
      : []),
    ...(navItems.some((item) => item.id === 'calculation')
      ? [
          {
            id: 'finance-ops',
            title: t('workspace.moduleFinanceTitle'),
            description: t('workspace.moduleFinanceText'),
            view: 'financeCenter' as const,
            icon: Calculator,
            tone: 'border-amber-100 bg-amber-50 text-amber-700',
            statusLabel: t('workspace.statusLive'),
          },
        ]
      : []),
    ...(navItems.some((item) => item.id === 'members')
      ? [
          {
            id: 'member-governance',
            title: t('workspace.moduleGovernanceTitle'),
            description: t('workspace.moduleGovernanceText'),
            view: 'governanceCenter' as const,
            icon: Users,
            tone: 'border-slate-200 bg-slate-50 text-slate-700',
            statusLabel: t('workspace.statusLive'),
          },
        ]
      : []),
    ...(navItems.some((item) => item.id === 'chat')
      ? [
          {
            id: 'communications',
            title: t('workspace.moduleCommunicationsTitle'),
            description: t('workspace.moduleCommunicationsText'),
            view: 'chat' as const,
            icon: MessageSquare,
            tone: 'border-cyan-100 bg-cyan-50 text-cyan-700',
            badgeLabel: totalUnreadChatCount > 0 ? t('workspace.badgeUnread', { count: totalUnreadChatCount }) : undefined,
            statusLabel: t('workspace.statusLive'),
          },
        ]
      : []),
    ...(navItems.some((item) => item.id === 'notifications')
      ? [
          {
            id: 'notifications-center',
            title: t('workspace.moduleNotificationsTitle'),
            description: t('workspace.moduleNotificationsText'),
            view: 'notifications' as const,
            icon: Bell,
            tone: 'border-amber-100 bg-amber-50 text-amber-700',
            badgeLabel: notificationBadgeCount > 0 ? t('workspace.badgePending', { count: notificationBadgeCount }) : undefined,
            statusLabel: t('workspace.statusLive'),
          },
        ]
      : []),
    ...(navItems.some((item) => item.id === 'news')
      ? [
          {
            id: 'news-desk',
            title: t('workspace.moduleNewsTitle'),
            description: t('workspace.moduleNewsText'),
            view: 'news' as const,
            icon: Newspaper,
            tone: 'border-orange-100 bg-orange-50 text-orange-700',
            statusLabel: t('workspace.statusLive'),
          },
        ]
      : []),
  ];
  const nextGameLabel = firstTodayGame ? `${getDisplayGameCode(firstTodayGame.gameCode)} at ${firstTodayGame.matchTime}` : null;

  const handleSaveScore = async (nomination: InstructorNomination) => {
    const finalScore = (scoreInputs[nomination.id] ?? nomination.finalScore ?? '').trim();
    const matchVideoUrl = (videoInputs[nomination.id] ?? nomination.matchVideoUrl ?? '').trim();
    const matchProtocolUrl = (protocolInputs[nomination.id] ?? nomination.matchProtocolUrl ?? '').trim();
    const refereeFee = (refereeFeeInputs[nomination.id] ?? (nomination.refereeFee === null ? '' : String(nomination.refereeFee))).trim();
    const toFee = (toFeeInputs[nomination.id] ?? (nomination.toFee === null ? '' : String(nomination.toFee))).trim();
    if (!finalScore && !matchVideoUrl && !matchProtocolUrl && !refereeFee && !toFee) {
      setDashboardError('Enter the final score, a YouTube link, a Game Scoresheet link, or match fees first.');
      return;
    }

    setScoreActionId(nomination.id);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await updateNominationScore({
        nominationId: nomination.id,
        instructorId: user.id,
        finalScore,
        matchVideoUrl,
        matchProtocolUrl,
        refereeFee,
        toFee,
      });
      await refreshInstructorData();
      setScoreInputs((prev) => ({
        ...prev,
        [nomination.id]: finalScore,
      }));
      setVideoInputs((prev) => ({
        ...prev,
        [nomination.id]: matchVideoUrl,
      }));
      setProtocolInputs((prev) => ({
        ...prev,
        [nomination.id]: matchProtocolUrl,
      }));
      setRefereeFeeInputs((prev) => ({
        ...prev,
        [nomination.id]: refereeFee,
      }));
      setTOFeeInputs((prev) => ({
        ...prev,
        [nomination.id]: toFee,
      }));
      setDashboardMessage('Match details saved.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to save match details.');
    } finally {
      setScoreActionId(null);
    }
  };

  const renderFinalScore = (finalScore: string | null) =>
    finalScore ? (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
        {t('common.finalScore', { score: finalScore })}
      </div>
    ) : null;

  const formatFee = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'AZN',
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);

  const renderNominationFees = (refereeFee: number | null, toFee: number | null) => {
    if (refereeFee === null && toFee === null) {
      return null;
    }

    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {refereeFee !== null ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            {t('common.refereeFee')}: {formatFee(refereeFee)}
          </div>
        ) : null}
        {toFee !== null ? (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900">
            {t('common.toFee')}: {formatFee(toFee)}
          </div>
        ) : null}
      </div>
    );
  };

  const renderMatchLinks = (matchVideoUrl: string | null, matchProtocolUrl: string | null) => {
    if (!matchVideoUrl && !matchProtocolUrl) {
      return null;
    }

    const baseButtonClass =
      'inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors';

    return (
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {matchVideoUrl ? (
          <a
            href={matchVideoUrl}
            target="_blank"
            rel="noreferrer"
            className={`${baseButtonClass} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
          >
            <Youtube size={16} />
            {t('common.youtube')}
          </a>
        ) : null}
        {matchProtocolUrl ? (
          <a
            href={matchProtocolUrl}
            target="_blank"
            rel="noreferrer"
            className={`${baseButtonClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
          >
            <FileText size={16} />
            {t('common.gameScoresheet')}
          </a>
        ) : null}
      </div>
    );
  };

  const renderInstructorScoreEditor = (nomination: InstructorNomination) => {
    const isOwner = nomination.createdById === user.id;
    const isPast = isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow);

    if (!isOwner || !isPast) {
      return null;
    }

    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('common.matchDetails')}</div>
        <div className="mt-3 grid gap-3">
          <input
            value={scoreInputs[nomination.id] ?? nomination.finalScore ?? ''}
            onChange={(event) =>
              setScoreInputs((prev) => ({
                ...prev,
                [nomination.id]: event.target.value,
              }))
            }
            placeholder="e.g. 89:76"
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
          />
          <input
            value={videoInputs[nomination.id] ?? nomination.matchVideoUrl ?? ''}
            onChange={(event) =>
              setVideoInputs((prev) => ({
                ...prev,
                [nomination.id]: event.target.value,
              }))
            }
            placeholder="https://www.youtube.com/watch?v=..."
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
          />
          <input
            value={protocolInputs[nomination.id] ?? nomination.matchProtocolUrl ?? ''}
            onChange={(event) =>
              setProtocolInputs((prev) => ({
                ...prev,
                [nomination.id]: event.target.value,
              }))
            }
            placeholder="https://drive.google.com/... (game scoresheet)"
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={refereeFeeInputs[nomination.id] ?? (nomination.refereeFee === null ? '' : String(nomination.refereeFee))}
            onChange={(event) =>
              setRefereeFeeInputs((prev) => ({
                ...prev,
                [nomination.id]: event.target.value,
              }))
            }
            placeholder={`${t('common.refereeFee')} (AZN)`}
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={toFeeInputs[nomination.id] ?? (nomination.toFee === null ? '' : String(nomination.toFee))}
            onChange={(event) =>
              setTOFeeInputs((prev) => ({
                ...prev,
                [nomination.id]: event.target.value,
              }))
            }
            placeholder={`${t('common.toFee')} (AZN)`}
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
          />
          <button
            onClick={() => handleSaveScore(nomination)}
            disabled={scoreActionId === nomination.id}
            className="rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
            {scoreActionId === nomination.id ? t('common.saving') : t('common.saveMatchDetails')}
          </button>
        </div>
      </div>
    );
  };

  const renderCreatedNominationCard = (nomination: InstructorNomination) => (
    <div key={nomination.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="rz-game-code text-xs uppercase text-[#581c1c]">{getDisplayGameCode(nomination.gameCode)}</div>
          <MatchTeamsHeader
            teams={nomination.teams}
            className="mt-1 gap-2"
            titleClassName="text-sm font-bold text-slate-950"
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} className="text-[#f97316]" />
              {nomination.matchDate}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} className="text-[#f97316]" />
              {nomination.matchTime}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="text-[#f97316]" />
              {getCanonicalVenueName(nomination.venue)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{`${nomination.referees.length} referees`}</span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">{`${nomination.toCrew.length}/4 TO`}</span>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">{`${nomination.statisticCrew.length}/3 stats`}</span>
            {nomination.finalScore ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{nomination.finalScore}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {canOpenMatchCenter ? (
            <button
              onClick={() => openMatchCenter(nomination.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#57131b] px-3 py-2 text-sm font-bold text-white"
            >
              Match Center
            </button>
          ) : null}
          <button
            onClick={() => {
              setNavigationIntent({ view: 'nominations', targetId: nomination.id });
              onNavigate('nominations');
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
          >
            Open Game
          </button>
        </div>
      </div>
    </div>
  );

  const renderAssignmentCard = (assignment: RefereeNomination) => (
    <div key={assignment.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      {user.role === 'Referee' && assignment.assignmentGroup === 'Referee' && isUpcomingMatchDay(assignment.matchDate, assignment.matchTime, countdownNow) ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <div className="font-black uppercase tracking-[0.18em] text-emerald-700">{t('dashboard.gameDay')}</div>
          <div className="mt-1 font-medium">{t('dashboard.gameDayWish')}</div>
        </div>
      ) : null}
      {assignment.assignmentGroup === 'Referee' && assignment.status === 'Pending' ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {formatAutoDeclineCountdown(assignment.autoDeclineAt, countdownNow, language) || t('dashboard.autoRejectUnavailable')}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="rz-game-code text-xs uppercase text-[#581c1c]">{getDisplayGameCode(assignment.gameCode)}</div>
          <div className="rz-ui-text text-xs font-bold uppercase text-[#581c1c]">{assignment.assignmentLabel}</div>
          <MatchTeamsHeader
            teams={assignment.teams}
            className="mt-1 gap-2"
            titleClassName="text-sm font-bold text-slate-950"
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} className="text-[#f97316]" />
              {assignment.matchDate}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} className="text-[#f97316]" />
              {assignment.matchTime}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} className="text-[#f97316]" />
              {getCanonicalVenueName(assignment.venue)}
            </span>
            <span className="text-xs uppercase font-semibold tracking-wide text-slate-500">
              Instructor: {assignment.instructorName}
            </span>
            {assignment.finalScore ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{assignment.finalScore}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getAssignmentStatusClasses(assignment.status)}`}>
            {getAssignmentStatusLabel(assignment.status, language)}
          </div>
          {canOpenMatchCenter ? (
            <button
              onClick={() => openMatchCenter(assignment.nominationId)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#57131b] px-3 py-2 text-sm font-bold text-white"
            >
              Match Center
            </button>
          ) : null}
        </div>
      </div>
      {assignment.status === 'Pending' && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => handleNominationResponse(assignment.nominationId, 'Accepted', assignment.id)}
            disabled={actionAssignmentId === assignment.id}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
              {actionAssignmentId === assignment.id ? t('common.saving') : t('dashboard.accept')}
            </button>
          <button
            onClick={() => handleNominationResponse(assignment.nominationId, 'Declined', assignment.id)}
            disabled={actionAssignmentId === assignment.id}
            className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-70"
          >
              {actionAssignmentId === assignment.id ? t('common.saving') : t('dashboard.decline')}
            </button>
          </div>
      )}
    </div>
  );

  const dashboardTitle = isInstructor
    ? t('dashboard.instructorPanel')
    : isTOSupervisor
      ? t('dashboard.toSupervisorPanel')
      : isStaff
        ? t('dashboard.staffPanel')
        : isFinancialist
          ? t('dashboard.financialistPanel')
        : isTO
          ? t('dashboard.toDashboard')
          : t('dashboard.refZoneDashboard');

  const formatAnnouncementDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Baku',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));

  const renderAnnouncementNotice = () =>
    activeAnnouncement ? (
      <div className="mb-4 rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fff8e7_0%,#fff2d8_55%,#fbe6bf_100%)] px-4 py-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">{t('announcement.title')}</div>
        <div className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800">
          {getAnnouncementMessage(activeAnnouncement, language)}
        </div>
        <div className="mt-3 text-xs text-slate-600">
          {t('announcement.expiresAt', { date: formatAnnouncementDate(activeAnnouncement.expiresAt) })}
        </div>
      </div>
    ) : null;

  const hasAttentionItems = declinedAssignments.length > 0 || Boolean(activeAnnouncement);
  const instructorAttentionCount = declinedAssignments.length + (activeAnnouncement ? 1 : 0);
  const instructorTopMatches = createdNominationSections.upcoming.slice(0, 4);
  const instructorControlPanel = isInstructor ? (
    <>
      <button
        type="button"
        title={
          declinedAssignments.length > 0
            ? `${declinedAssignments.length} referee ${declinedAssignments.length === 1 ? 'declined' : 'declined'} assignment${declinedAssignments.length === 1 ? '' : 's'}`
            : t('announcement.title')
        }
        aria-label={t('announcement.title')}
        onClick={() => {
          if (declinedAssignments.length > 0) {
            onNavigate('nominations');
            return;
          }
          onNavigate('announcement');
        }}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold shadow-sm transition hover:-translate-y-0.5 ${
          activeAnnouncement ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-slate-200 bg-white text-slate-700'
        }`}
      >
        <Bell size={17} />
        {instructorAttentionCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white">
            {instructorAttentionCount}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        title={t('dashboard.allMembers')}
        aria-label={t('dashboard.allMembers')}
        onClick={() => onNavigate('members')}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5"
      >
        <Users size={17} />
      </button>
      <button
        type="button"
        title={t('dashboard.addAccess')}
        aria-label={t('dashboard.addAccess')}
        onClick={() => onNavigate('access')}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f39200]/20 bg-[#f39200] text-white shadow-sm transition hover:-translate-y-0.5"
      >
        <UserPlus size={17} />
      </button>
      <button
        type="button"
        title={t('dashboard.createNomination')}
        aria-label={t('dashboard.createNomination')}
        onClick={handleOpenCreateNomination}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#57131b]/20 shadow-sm transition hover:-translate-y-0.5 ${
          showCreateForm ? 'bg-[#7b1f29] text-white' : 'bg-[#57131b] text-white'
        }`}
      >
        <Plus size={18} />
      </button>
    </>
  ) : null;

  const instructorCompactMatchesPanel = isInstructor ? (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8e6570]">{t('workspace.upcomingGames')}</div>
          <div className="mt-1 text-sm text-slate-500">{t('workspace.upcomingGamesText')}</div>
        </div>
      </div>
      {declinedAssignments.length > 0 ? (
        <button
          type="button"
          onClick={() => onNavigate('nominations')}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:border-amber-300"
        >
          <div className="flex min-w-0 items-center gap-3">
            <AlertTriangle size={18} className="shrink-0 text-amber-600" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-amber-900">Referee declined a game</div>
              <div className="mt-0.5 text-xs text-amber-800">
                {getDisplayPersonName(declinedAssignments[0].referee.refereeName)} | {getDisplayGameCode(declinedAssignments[0].nomination.gameCode)}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Open</span>
        </button>
      ) : null}
      {instructorTopMatches.length === 0 ? (
        <div className="mt-4 text-sm text-slate-500">{t('dashboard.noUpcomingNominations')}</div>
      ) : (
        <div className="mt-4 space-y-3">
          {instructorTopMatches.map((nomination) => (
            <div key={nomination.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="rz-game-code text-xs uppercase text-[#581c1c]">{getDisplayGameCode(nomination.gameCode)}</div>
                  <MatchTeamsHeader
                    teams={nomination.teams}
                    className="mt-1 gap-2"
                    titleClassName="text-sm font-bold text-slate-950"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={14} className="text-[#f97316]" />
                      {nomination.matchDate}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} className="text-[#f97316]" />
                      {nomination.matchTime}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} className="text-[#f97316]" />
                      {getCanonicalVenueName(nomination.venue)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {canOpenMatchCenter ? (
                    <button
                      onClick={() => openMatchCenter(nomination.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#57131b] px-3 py-2 text-sm font-bold text-white"
                    >
                      Match Center
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      setNavigationIntent({ view: 'nominations', targetId: nomination.id });
                      onNavigate('nominations');
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
                  >
                    Open Game
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
      <Layout title={dashboardTitle} showBack={false} onLogout={onLogout}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer group" onClick={handlePhotoClick}>
              <img
                src={user.photoUrl}
                alt={user.fullName}
                className="w-20 h-20 rounded-2xl object-cover shadow-md ring-2 ring-[#f97316]/20 group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white drop-shadow-md" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#f97316] p-1.5 rounded-lg shadow-sm">
                <Award size={16} className="text-white" />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div>
              <h2 className="rz-ui-text text-xl font-bold text-slate-800">{getDisplayPersonName(user.fullName)}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <UserIcon size={14} /> {t('common.license')}: {user.licenseNumber}
              </p>
              <div className="mt-1 inline-block px-2 py-0.5 bg-[#581c1c] text-white text-[10px] uppercase font-bold rounded">
                {getRoleLabel(user.role, language)}
              </div>
            </div>
          </div>
          {canUseEarningsCalculator ? (
            <div className="w-full max-w-[320px] md:ml-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                    {t('dashboard.thisMonth')}
                  </div>
                  <div className="mt-1 text-xl font-black leading-none text-slate-900">{monthlyMatchesWorkedCount}</div>
                  <div className="mt-1 text-xs font-medium text-slate-600">{t('dashboard.monthlyMatchesWorked')}</div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                    {t('dashboard.thisMonth')}
                  </div>
                  <div
                    className={`mt-1 text-xl font-black leading-none transition-all duration-300 ${
                      isMonthlyEarningsAnimating
                        ? 'scale-[1.03] text-emerald-700 drop-shadow-[0_0_10px_rgba(16,185,129,0.18)]'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatFee(displayedMonthlyEarnings)}
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-600">{t('dashboard.monthlyEarnings')}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {dashboardError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {dashboardError}
        </div>
      )}

      {dashboardMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {dashboardMessage}
        </div>
      )}

      <OperationsCommandCenter
        activeSeason={activeSeason}
        userRole={user.role}
        pendingActions={pendingActionCount}
        unreadMessages={totalUnreadChatCount}
        todayGames={todayGamesCount}
        nextGameLabel={nextGameLabel}
        modules={operationsModules}
        onNavigate={onNavigate}
        controlPanel={instructorControlPanel}
        compactMatchesPanel={instructorCompactMatchesPanel}
      />

      {isInstructor && (
        <div className="space-y-5 mb-8">
          {showCreateForm && (
            <form ref={createNominationFormRef} onSubmit={handleCreateNomination} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Game Number</label>
                  <input
                    ref={createNominationCodeInputRef}
                    required
                    value={form.gameCode}
                    onChange={(e) => updateFormField('gameCode', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                    placeholder="ABL-205"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Team 1</label>
                  <select
                    required
                    value={form.team1}
                    onChange={(e) => updateFormField('team1', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                  >
                    <option value="">Select team</option>
                    {TEAM_OPTIONS.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Team 2</label>
                  <select
                    required
                    value={form.team2}
                    onChange={(e) => updateFormField('team2', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                  >
                    <option value="">Select team</option>
                    {TEAM_OPTIONS.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.matchDate}
                    onChange={(e) => updateFormField('matchDate', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={form.matchTime}
                    onChange={(e) => updateFormField('matchTime', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Venue</label>
                  <input
                    required
                    value={form.venue}
                    onChange={(e) => updateFormField('venue', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                    placeholder="Sarhadchi Arena"
                  />
                </div>
                {[1, 2, 3].map((slot) => (
                  <div key={slot}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{getNominationSlotLabel(slot, language)}</label>
                    <select
                      required
                      value={form[`referee${slot}` as keyof typeof form]}
                      onChange={(e) => updateFormField(`referee${slot}` as keyof typeof form, e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] bg-white"
                    >
                      <option value="">{t('common.selectOfficial')}</option>
                      {referees.map((referee) => (
                        <option
                          key={referee.id}
                          value={referee.id}
                          disabled={isOfficialUnavailableOnMatchDate(referee, form.matchDate)}
                        >
                          {getOfficialOptionLabel(referee, form.matchDate, true)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="rounded-xl bg-[#f39200] px-5 py-3 text-sm font-bold text-white disabled:opacity-70"
                >
                  {isSubmittingCreate ? t('dashboard.creatingNomination') : t('dashboard.saveNomination')}
                </button>
              </div>
            </form>
          )}

          {(activeAnnouncement || declinedAssignments.length > 0) && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell size={18} className="text-[#581c1c]" />
                <h3 className="text-base font-bold text-slate-900">Attention Needed</h3>
              </div>
              {renderAnnouncementNotice()}
              {declinedAssignments.length > 0 ? (
                <div className="space-y-4">
                  {declinedAssignments.map(({ nomination, referee }) => {
                    const replaceKey = `${nomination.id}-${referee.slotNumber}`;
                    const options = getReplacementOptions(nomination, referee.slotNumber);
                    return (
                      <div key={replaceKey} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
                          <div className="flex-1 space-y-3">
                            <p className="text-sm font-semibold text-amber-900">
                              {t('dashboard.declinedGame', { name: getDisplayPersonName(referee.refereeName) })}
                            </p>
                            <div className="grid gap-2 text-sm text-amber-900 md:grid-cols-2">
                              <div>{getDisplayGameCode(nomination.gameCode)}</div>
                              <div>{getDisplayMatchTeams(nomination.teams)}</div>
                              <div>{nomination.matchDate} at {nomination.matchTime}</div>
                              <div className="md:col-span-2">{getCanonicalVenueName(nomination.venue)}</div>
                            </div>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                              <select
                                value={replaceSelections[replaceKey] || ''}
                                onChange={(e) => setReplaceSelections((prev) => ({ ...prev, [replaceKey]: e.target.value }))}
                                className="min-w-64 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                              >
                                <option value="">{t('dashboard.selectReplacementOfficial')}</option>
                                {options.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {getOfficialOptionLabel(option, nomination.matchDate, true)}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleReplaceReferee(nomination.id, referee.slotNumber)}
                                disabled={replaceActionKey === replaceKey || options.length === 0}
                                className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                              >
                                {replaceActionKey === replaceKey ? t('dashboard.replacing') : t('dashboard.replaceSlot', { slot: getNominationSlotLabel(referee.slotNumber, language) })}
                              </button>
                            </div>
                            {options.length === 0 && (
                              <p className="text-xs text-amber-700">{t('dashboard.noFreeReferee')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

        </div>
      )}

      {isTOSupervisor && (
        <div className="space-y-5 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className="text-[#581c1c]" />
                  <h3 className="text-base font-bold text-slate-900">TO Assignment Desk</h3>
                </div>
                <p className="text-sm text-slate-500">Fill TO crews, review season announcements, and keep table staffing complete.</p>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => onNavigate('announcement')}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900"
                >
                  <Bell size={16} />
                  {t('announcement.title')}
                </button>
              </div>
            </div>
            <div className="mt-4">{renderAnnouncementNotice()}</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4">{t('dashboard.gamesAwaitingTOCrew')}</h3>
            {(
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{t('dashboard.upcomingGames')}</div>
                {createdNominationSections.upcoming.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('dashboard.noUpcomingGames')}</p>
                ) : (
                  createdNominationSections.upcoming.slice(0, 8).map(renderCreatedNominationCard)
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {(user.role === 'Referee' || isTO || (isInstructor && assignmentSections.upcoming.length > 0)) && (
        <div className="space-y-5 mb-8">
          {activeAnnouncement && (user.role === 'Referee' || isTO) ? renderAnnouncementNotice() : null}
          {replacementNotices.length > 0 && !isTO && (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-red-600" />
                <h3 className="text-base font-bold text-slate-900">{t('dashboard.replacementNotices')}</h3>
              </div>
              <div className="space-y-3">
                {replacementNotices.map((notice) => (
                  <div key={notice.id} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <div className="text-sm font-bold text-red-800">
                      {t('dashboard.youWereReplaced', { gameCode: notice.gameCode, slot: getNominationSlotLabel(notice.slotNumber, language) })}
                    </div>
                    <div className="mt-1 text-sm text-red-700">
                      {getDisplayMatchTeams(notice.teams)} | {notice.matchDate} at {notice.matchTime}
                    </div>
                    <div className="mt-1 text-xs font-medium text-red-700">
                      {t('dashboard.newOfficial', { name: getDisplayPersonName(notice.newRefereeName) })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-[#581c1c]" />
              <h3 className="text-base font-bold text-slate-900">
                {t('dashboard.gameAssignments')}
              </h3>
            </div>
            {(
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{t('dashboard.upcomingAssignedGames')}</div>
                {assignmentSections.upcoming.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('dashboard.noUpcomingGamesYet')}</p>
                ) : (
                  assignmentSections.upcoming.slice(0, 8).map(renderAssignmentCard)
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </Layout>
  );
};

export default Dashboard;
