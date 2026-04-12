import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnnouncementItem, AvailabilityOverview, ChatConversationItem, User, InstructorNomination, RefereeDirectoryItem, RefereeNomination, ReplacementNotice } from '../types';
import { getNominationSlotLabel, getTOSlotLabel } from '../slotLabels';
import { formatAutoDeclineCountdown } from '../assignmentCountdown';
import { getMatchTimestamp, isPastMatch } from '../matchTiming';
import Layout from './Layout';
import {
  AlertTriangle,
  Award,
  Bell,
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
  createNomination,
  deleteNomination,
  editNominationOfficials,
  getInstructorDashboard,
  getRefereeNominations,
  replaceNominationReferee,
  respondToNomination,
  updateNominationScore,
} from '../services/nominationService';
import { getAvailabilityOverview } from '../services/availabilityService';
import { getChatBootstrap } from '../services/chatService';
import { setNavigationIntent } from '../services/navigationIntent';
import { readViewCache, writeViewCache } from '../services/viewCache';
import { getAssignmentStatusLabel, getRoleLabel, useI18n } from '../i18n';
import { supabase } from '../services/supabaseClient';

interface DashboardProps {
  user: User;
  onNavigate: (
    view:
      | 'nominations'
      | 'teyinat'
      | 'ranking'
      | 'toRanking'
      | 'reports'
      | 'toReports'
      | 'news'
      | 'announcement'
      | 'chat'
      | 'calendar'
      | 'availability'
      | 'members'
      | 'access'
      | 'activity',
  ) => void;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const POLL_INTERVAL_MS = 45000;
const getDashboardCacheKey = (userId: string, role: User['role']) => `dashboard:${userId}:${role}`;
const getNominationsCacheKey = (userId: string, role: User['role']) => `nominations:${userId}:${role}`;
const getChatDashboardCacheKey = (userId: string) => `chat:bootstrap:${userId}`;
const getAvailabilityCacheKey = (userId: string, role: User['role']) => `availability:${userId}:${role}`;
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
  const [scoreActionId, setScoreActionId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [videoInputs, setVideoInputs] = useState<Record<string, string>>({});
  const [protocolInputs, setProtocolInputs] = useState<Record<string, string>>({});
  const [refereeFeeInputs, setRefereeFeeInputs] = useState<Record<string, string>>({});
  const [toFeeInputs, setTOFeeInputs] = useState<Record<string, string>>({});
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const dashboardLoadPromiseRef = useRef<Promise<void> | null>(null);
  const [form, setForm] = useState({
    gameCode: '',
    teams: '',
    matchDate: '',
    matchTime: '',
    venue: '',
    referee1: '',
    referee2: '',
    referee3: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInstructor = user.role === 'Instructor';
  const isStaff = user.role === 'Staff';
  const isTOSupervisor = user.role === 'TO Supervisor';
  const isTO = user.role === 'TO';
  const canUseAvailability = user.role !== 'Staff';
  const dashboardCacheKey = getDashboardCacheKey(user.id, user.role);
  const nominationsCacheKey = getNominationsCacheKey(user.id, user.role);
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

      if (!cached) {
        return false;
      }

      setReferees(cached.referees || []);
      setTOOfficials(cached.toOfficials || []);
      setInstructorNominations(cached.nominations || []);
      setRefereeAssignments(cached.assignments || []);
      setReplacementNotices(cached.replacementNotices || []);
      setActiveAnnouncement(cached.activeAnnouncement || null);
      setIsLoadingAssignments(false);
      return true;
    };

    const loadInstructorData = async () => {
      const response = await getInstructorDashboard(user.id);

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
    };

    const loadRefereeData = async () => {
      const response = await getRefereeNominations(user.id);

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
            setDashboardError(error instanceof Error ? error.message : 'Failed to load dashboard data.');
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
      teams: '',
      matchDate: '',
      matchTime: '',
      venue: '',
      referee1: '',
      referee2: '',
      referee3: '',
    });
  };

  const refreshInstructorData = async () => {
    const response = await getInstructorDashboard(user.id);
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
    const response = await getRefereeNominations(user.id);
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
      await createNomination({
        instructorId: user.id,
        gameCode: form.gameCode,
        teams: form.teams,
        matchDate: form.matchDate,
        matchTime: form.matchTime,
        venue: form.venue,
        refereeIds,
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
    setEditingNominationId(nomination.id);
    setEditSelections({
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

    if (new Set(refereeIds).size !== 3 || refereeIds.some((item) => !item)) {
      setDashboardError('Choose 3 different officials.');
      return;
    }

    setEditActionNominationId(nominationId);
    setDashboardError('');
    setDashboardMessage('');

    try {
      await editNominationOfficials({
        nominationId,
        instructorId: user.id,
        refereeIds,
      });
      await refreshInstructorData();
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
    [1, 2, 3, 4].map((slotNumber) => nomination.toCrew.find((item) => item.slotNumber === slotNumber)?.toId || '');

  const handleSaveTOCrew = async (nominationId: string) => {
    const nomination = instructorNominations.find((item) => item.id === nominationId);
    if (!nomination) {
      return;
    }

    const selectedTOs = getTONominationSelection(nomination);
    if (new Set(selectedTOs.filter(Boolean)).size !== 4 || selectedTOs.some((item) => !item)) {
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
        toIds: selectedTOs,
      });
      await refreshInstructorData();
      setDashboardMessage('TO crew updated.');
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Failed to update TO crew.');
    } finally {
      setTOActionNominationId(null);
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

    return referees.filter((referee) => !occupied.has(referee.id));
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
  const { year: currentBakuYear, month: currentBakuMonth } = getBakuDateParts(countdownNow);
  const currentMonthKey = `${currentBakuYear}-${currentBakuMonth}`;
  const workedAssignmentStatuses = new Set(['Accepted', 'Assigned']);
  const monthlyWorkedAssignments = useMemo(
    () =>
      user.role !== 'Referee'
        ? []
        : refereeAssignments.filter(
            (assignment) =>
              assignment.assignmentGroup === 'Referee' &&
              assignment.matchDate.slice(0, 7) === currentMonthKey &&
              workedAssignmentStatuses.has(assignment.status) &&
              isPastMatch(assignment.matchDate, assignment.matchTime, countdownNow),
          ),
    [countdownNow, currentMonthKey, refereeAssignments, user.role],
  );
  const monthlyMatchesWorkedCount = monthlyWorkedAssignments.length;
  const monthlyEarningsTotal = useMemo(
    () =>
      monthlyWorkedAssignments.reduce((sum, assignment) => sum + (assignment.refereeFee || 0), 0),
    [monthlyWorkedAssignments],
  );
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
      ? pendingTOCrewCount + pendingAvailabilityApprovalsCount
        : isStaff
          ? 0
          : pendingResponseCount + replacementNotices.length + pendingMyAvailabilityCount;
  const quickOverviewItems = [
    {
      id: 'unreadMessages',
      label: t('dashboard.unreadMessages'),
      value: totalUnreadChatCount,
      tone: 'border-cyan-100 bg-cyan-50 text-cyan-700',
      icon: MessageSquare,
    },
    {
      id: 'pendingActions',
      label: t('dashboard.pendingActions'),
      value: pendingActionCount,
      tone: 'border-amber-100 bg-amber-50 text-amber-700',
      icon: Bell,
    },
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

  const navItems = [
    { id: 'nominations' as const, label: isInstructor || isTOSupervisor || isStaff ? t('nominations.title') : t('nominations.myTitle'), icon: Calendar, iconColor: 'text-blue-500', color: 'bg-blue-50' },
    ...(canUseAvailability
      ? [{ id: 'availability' as const, label: t('dashboard.navAvailability'), icon: CalendarDays, iconColor: 'text-violet-600', color: 'bg-violet-50' }]
      : []),
    ...(isInstructor
      ? [
          { id: 'calendar' as const, label: t('dashboard.navCalendar'), icon: Calendar, iconColor: 'text-sky-600', color: 'bg-sky-50' },
          { id: 'teyinat' as const, label: t('teyinat.title'), icon: FileText, iconColor: 'text-[#581c1c]', color: 'bg-rose-50' },
          { id: 'activity' as const, label: t('activity.title'), icon: History, iconColor: 'text-amber-600', color: 'bg-amber-50' },
        ]
      : isTOSupervisor
      ? [{ id: 'calendar' as const, label: t('dashboard.navCalendar'), icon: Calendar, iconColor: 'text-sky-600', color: 'bg-sky-50' }]
      : isStaff
      ? [{ id: 'calendar' as const, label: t('dashboard.navCalendar'), icon: Calendar, iconColor: 'text-sky-600', color: 'bg-sky-50' }]
      : []),
    ...(isInstructor || isStaff
      ? [
          {
            id: 'ranking' as const,
            label: t('ranking.refereeTitle'),
            icon: TrendingUp,
            iconColor: 'text-green-500',
            color: 'bg-green-50',
          },
          {
            id: 'reports' as const,
            label: t('reports.refereeTitle'),
            icon: FileText,
            iconColor: 'text-purple-500',
            color: 'bg-purple-50',
          },
          {
            id: 'toRanking' as const,
            label: t('dashboard.navTORanking'),
            icon: TrendingUp,
            iconColor: 'text-teal-600',
            color: 'bg-teal-50',
          },
          {
            id: 'toReports' as const,
            label: t('reports.toTitle'),
            icon: FileText,
            iconColor: 'text-fuchsia-600',
            color: 'bg-fuchsia-50',
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
            id: 'toReports' as const,
            label: isTO ? t('reports.myTitle') : t('reports.toTitle'),
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
    { id: 'news' as const, label: t('news.title'), icon: Newspaper, iconColor: 'text-orange-500', color: 'bg-orange-50' },
  ];

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
    <div key={nomination.id} className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase text-[#581c1c]">{nomination.gameCode}</div>
          <h4 className="text-lg font-bold text-slate-900">{nomination.teams}</h4>
          <div className="mt-1 text-xs text-slate-500">{t('dashboard.createdByLabel', { name: nomination.createdByName })}</div>
          <div className="grid gap-2 mt-2 text-sm text-slate-600 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#f97316]" />
              {nomination.matchDate}
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#f97316]" />
              {nomination.matchTime}
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <MapPin size={14} className="text-[#f97316]" />
              {nomination.venue}
            </div>
          </div>
        </div>
        {isInstructor && nomination.createdById === user.id ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                editingNominationId === nomination.id ? handleCancelEditNomination() : handleStartEditNomination(nomination)
              }
              className="inline-flex items-center gap-2 self-start rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
            >
              <Pencil size={14} />
              {editingNominationId === nomination.id ? t('dashboard.cancelEdit') : t('common.edit')}
            </button>
            <button
              onClick={() => handleDeleteNomination(nomination.id)}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white"
            >
              <Trash2 size={14} />
              {t('dashboard.deleteGame')}
            </button>
          </div>
        ) : null}
      </div>
      {renderFinalScore(nomination.finalScore)}
      {renderMatchLinks(nomination.matchVideoUrl, nomination.matchProtocolUrl)}
      {renderNominationFees(nomination.refereeFee, nomination.toFee)}
      {renderInstructorScoreEditor(nomination)}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {nomination.referees.map((referee) => {
          const replaceKey = `${nomination.id}-${referee.slotNumber}`;
          const options = getReplacementOptions(nomination, referee.slotNumber);
          const canReplaceSlot = nomination.createdById === user.id && referee.status !== 'Accepted';

          return (
            <div key={replaceKey} className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase text-slate-500">{getNominationSlotLabel(referee.slotNumber, language)}</div>
              {editingNominationId === nomination.id ? (
                <select
                  value={editSelections[`referee${referee.slotNumber}`] || ''}
                  onChange={(e) =>
                    setEditSelections((prev) => ({ ...prev, [`referee${referee.slotNumber}`]: e.target.value }))
                  }
                  className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
                >
                  <option value="">{t('common.selectOfficial')}</option>
                  {getReplacementOptions(nomination, referee.slotNumber)
                    .concat(
                      referees.filter((option) => option.id === referee.refereeId),
                    )
                    .filter((option, index, array) => array.findIndex((item) => item.id === option.id) === index)
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {`${option.fullName} (${getRoleLabel(option.role, language)})`}
                      </option>
                    ))}
                </select>
              ) : (
                <>
                  <div className="mt-1 font-semibold text-slate-900">{referee.refereeName}</div>
                  <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    referee.status === 'Accepted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : referee.status === 'Declined'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {getAssignmentStatusLabel(referee.status, language)}
                  </div>
                </>
              )}
              {editingNominationId !== nomination.id && canReplaceSlot ? (
                <div className="mt-3 space-y-2">
                  <select
                    value={replaceSelections[replaceKey] || ''}
                    onChange={(e) => setReplaceSelections((prev) => ({ ...prev, [replaceKey]: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
                  >
                    <option value="">{t('dashboard.selectReplacementOfficial')}</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {`${option.fullName} (${option.role})`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleReplaceReferee(nomination.id, referee.slotNumber)}
                    disabled={replaceActionKey === replaceKey || options.length === 0}
                    className="w-full rounded-xl bg-[#581c1c] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {replaceActionKey === replaceKey ? t('dashboard.replacing') : t('dashboard.replaceSlot', { slot: getNominationSlotLabel(referee.slotNumber, language) })}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('common.toCrew')}</div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((slotNumber) => {
            const existingAssignment = nomination.toCrew.find((item) => item.slotNumber === slotNumber);
            const currentSelection = getTONominationSelection(nomination)[slotNumber - 1] || '';
            const canAssignTOCrew = isTOSupervisor && !isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow);
            return (
              <div key={`${nomination.id}-to-${slotNumber}`} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-bold uppercase text-slate-500">{getTOSlotLabel(slotNumber, language)}</div>
                {canAssignTOCrew ? (
                  <select
                    value={currentSelection}
                    onChange={(event) =>
                      setTOSelections((prev) => {
                        const next = [...getTONominationSelection(nomination)];
                        next[slotNumber - 1] = event.target.value;
                        return { ...prev, [nomination.id]: next };
                      })
                    }
                    className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#581c1c]"
                  >
                    <option value="">{t('dashboard.selectTO')}</option>
                    {toOfficials.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.fullName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <div className="mt-1 font-semibold text-slate-900">{existingAssignment?.toName || t('common.notAssigned')}</div>
                    {existingAssignment ? (
                      <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getAssignmentStatusClasses(existingAssignment.status)}`}>
                        {existingAssignment.status}
                      </div>
                    ) : null}
                  </>
                )}
                {canAssignTOCrew && existingAssignment ? (
                  <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getAssignmentStatusClasses(existingAssignment.status)}`}>
                    {existingAssignment.status}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {isTOSupervisor && isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow) ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {t('dashboard.toCrewLocked')}
          </div>
        ) : null}
        {isTOSupervisor && !isPastMatch(nomination.matchDate, nomination.matchTime, countdownNow) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleSaveTOCrew(nomination.id)}
              disabled={toActionNominationId === nomination.id}
              className="rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
            >
              {toActionNominationId === nomination.id ? t('dashboard.savingTOCrew') : t('dashboard.saveTOCrew')}
            </button>
          </div>
        )}
      </div>
      {editingNominationId === nomination.id && (
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            onClick={handleCancelEditNomination}
            className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSaveEditedNomination(nomination.id)}
            disabled={editActionNominationId === nomination.id}
            className="rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
            {editActionNominationId === nomination.id ? 'Saving...' : 'Save Crew'}
          </button>
        </div>
      )}
    </div>
  );

  const renderAssignmentCard = (assignment: RefereeNomination) => (
    <div key={assignment.id} className="rounded-xl border border-slate-200 p-4">
      {user.role === 'Referee' && assignment.assignmentGroup === 'Referee' && isUpcomingMatchDay(assignment.matchDate, assignment.matchTime, countdownNow) ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          <div className="font-black uppercase tracking-[0.18em] text-emerald-700">{t('dashboard.gameDay')}</div>
          <div className="mt-1 font-medium">{t('dashboard.gameDayWish')}</div>
        </div>
      ) : null}
      {assignment.assignmentGroup === 'Referee' && assignment.status === 'Pending' ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {formatAutoDeclineCountdown(assignment.autoDeclineAt, countdownNow, language) || t('dashboard.autoRejectUnavailable')}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase text-[#581c1c]">{assignment.gameCode}</div>
          <div className="text-xs font-bold uppercase text-[#581c1c]">{assignment.assignmentLabel}</div>
          <h4 className="text-lg font-bold text-slate-900 mt-1">{assignment.teams}</h4>
          <div className="grid gap-2 mt-3 text-sm text-slate-600 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#f97316]" />
              {assignment.matchDate}
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#f97316]" />
              {assignment.matchTime}
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <MapPin size={14} className="text-[#f97316]" />
              {assignment.venue}
            </div>
            <div className="md:col-span-2 text-xs uppercase font-semibold tracking-wide text-slate-500">
              Instructor: {assignment.instructorName}
            </div>
          </div>
        </div>
      <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
          getAssignmentStatusClasses(assignment.status)
        }`}>
          {getAssignmentStatusLabel(assignment.status, language)}
        </div>
      </div>
      {renderFinalScore(assignment.finalScore)}
      {renderMatchLinks(assignment.matchVideoUrl, assignment.matchProtocolUrl)}
      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {assignment.assignmentGroup === 'TO' ? 'Referee Crew' : t('common.crew')}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {assignment.crew.map((official) => (
            <div key={`${assignment.id}-${official.refereeId}-${official.slotNumber}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] font-bold uppercase text-slate-500">{getNominationSlotLabel(official.slotNumber, language)}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{official.refereeName}</div>
            </div>
          ))}
        </div>
      </div>
      {user.role === 'Referee' && assignment.toCrew.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          {t('dashboard.toCrewWillAppear')}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('common.toCrew')}</div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {[1, 2, 3, 4].map((slotNumber) => {
              const toSlot = assignment.toCrew.find((item) => item.slotNumber === slotNumber);
              return (
                <div key={`${assignment.id}-to-${slotNumber}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[11px] font-bold uppercase text-slate-500">{getTOSlotLabel(slotNumber, language)}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {toSlot?.toName || (user.role === 'Referee' ? t('common.awaitingConfirmation') : t('common.notAssigned'))}
                  </div>
                  {toSlot ? (
                    <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${getAssignmentStatusClasses(toSlot.status)}`}>
                      {getAssignmentStatusLabel(toSlot.status, language)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
          {language === 'az'
            ? activeAnnouncement.messageAz || activeAnnouncement.message
            : language === 'ru'
              ? activeAnnouncement.messageRu || activeAnnouncement.message
              : activeAnnouncement.messageEn || activeAnnouncement.message}
        </div>
        <div className="mt-3 text-xs text-slate-600">
          {t('announcement.expiresAt', { date: formatAnnouncementDate(activeAnnouncement.expiresAt) })}
        </div>
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
              <h2 className="text-xl font-bold text-slate-800">{user.fullName}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <UserIcon size={14} /> {t('common.license')}: {user.licenseNumber}
              </p>
              <div className="mt-1 inline-block px-2 py-0.5 bg-[#581c1c] text-white text-[10px] uppercase font-bold rounded">
                {getRoleLabel(user.role, language)}
              </div>
            </div>
          </div>
          {user.role === 'Referee' ? (
            <div className="grid gap-2 sm:grid-cols-2 md:min-w-[300px] md:max-w-[360px]">
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
                <div className="mt-1 text-xl font-black leading-none text-slate-900">{formatFee(monthlyEarningsTotal)}</div>
                <div className="mt-1 text-xs font-medium text-slate-600">{t('dashboard.monthlyEarnings')}</div>
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

      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.25fr),minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-[#581c1c]" />
            <h3 className="text-base font-bold text-slate-900">{t('dashboard.quickOverview')}</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickOverviewItems.map((item) => (
              <div key={item.id} className={`rounded-2xl border px-4 py-4 ${item.tone}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-80">{item.label}</div>
                  <item.icon size={18} />
                </div>
                <div className="mt-3 text-3xl font-black tracking-tight">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell size={18} className="text-[#581c1c]" />
            <h3 className="text-base font-bold text-slate-900">{t('dashboard.actionCenter')}</h3>
          </div>
          {actionCenterItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              {t('dashboard.noNewNotifications')}
            </div>
          ) : (
            <div className="space-y-3">
              {actionCenterItems.map((item) => (
                <div key={item.id} className={`rounded-2xl border px-4 py-4 ${item.tone}`}>
                  <div className="text-sm font-bold">{item.title}</div>
                  <div className="mt-1 text-sm opacity-90">{item.description}</div>
                  <button
                    onClick={() => handleActionCenterNavigation(item)}
                    className="mt-3 inline-flex rounded-xl bg-white/80 px-3 py-2 text-xs font-bold text-slate-800 transition hover:bg-white"
                  >
                    {item.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isInstructor && (
        <div className="space-y-5 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield size={18} className="text-[#581c1c]" />
                {t('dashboard.instructorControls')}
              </h3>
              <p className="text-sm text-slate-500">{t('dashboard.instructorControlsHelp')}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={() => onNavigate('announcement')}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900"
              >
                <Bell size={16} />
                {t('announcement.title')}
              </button>
              <button
                onClick={() => onNavigate('members')}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-800"
              >
                <Users size={16} />
                {t('dashboard.allMembers')}
              </button>
              <button
                onClick={() => onNavigate('access')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f39200] px-4 py-3 text-sm font-bold text-white"
              >
                <UserPlus size={16} />
                {t('dashboard.addAccess')}
              </button>
              <button
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#581c1c]/15"
              >
                <Plus size={16} />
                {t('dashboard.createNomination')}
              </button>
            </div>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateNomination} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Game Number</label>
                  <input
                    required
                    value={form.gameCode}
                    onChange={(e) => updateFormField('gameCode', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                    placeholder="ABL-205"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Game</label>
                  <input
                    required
                    value={form.teams}
                    onChange={(e) => updateFormField('teams', e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                    placeholder="Sabah vs Ganja"
                  />
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
                        <option key={referee.id} value={referee.id}>
                          {`${referee.fullName} (${getRoleLabel(referee.role, language)})`}
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

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-[#581c1c]" />
              <h3 className="text-base font-bold text-slate-900">{t('dashboard.instructorNotifications')}</h3>
            </div>
            {renderAnnouncementNotice()}
            {declinedAssignments.length === 0 ? (
              <p className="text-sm text-slate-500">{t('dashboard.noDeclinedYet')}</p>
            ) : (
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
                            {t('dashboard.declinedGame', { name: referee.refereeName })}
                          </p>
                          <div className="grid gap-2 text-sm text-amber-900 md:grid-cols-2">
                            <div>{nomination.gameCode}</div>
                            <div>{nomination.teams}</div>
                            <div>{nomination.matchDate} at {nomination.matchTime}</div>
                            <div className="md:col-span-2">{nomination.venue}</div>
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
                                  {`${option.fullName} (${option.role})`}
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
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4">{t('dashboard.createdNominations')}</h3>
            {isLoadingAssignments ? (
              <p className="text-sm text-slate-500">Loading nominations...</p>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{t('dashboard.upcomingGames')}</div>
                {createdNominationSections.upcoming.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('dashboard.noUpcomingNominations')}</p>
                ) : (
                  createdNominationSections.upcoming.map(renderCreatedNominationCard)
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isTOSupervisor && (
        <div className="space-y-5 mb-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className="text-[#581c1c]" />
                  <h3 className="text-base font-bold text-slate-900">TO Supervisor Controls</h3>
                </div>
                <p className="text-sm text-slate-500">New games appear here automatically. Choose 4 TO officials for each match.</p>
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
            {isLoadingAssignments ? (
              <p className="text-sm text-slate-500">Loading games...</p>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{t('dashboard.upcomingGames')}</div>
                {createdNominationSections.upcoming.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('dashboard.noUpcomingGames')}</p>
                ) : (
                  createdNominationSections.upcoming.map(renderCreatedNominationCard)
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {(user.role === 'Referee' || isInstructor || isTO) && (
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
                      {notice.teams} | {notice.matchDate} at {notice.matchTime}
                    </div>
                    <div className="mt-1 text-xs font-medium text-red-700">
                      {t('dashboard.newOfficial', { name: notice.newRefereeName })}
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
                {user.role === 'Instructor' ? t('dashboard.myGameAssignments') : t('dashboard.gameAssignments')}
              </h3>
            </div>
            {isLoadingAssignments ? (
              <p className="text-sm text-slate-500">Loading assignments...</p>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{t('dashboard.upcomingAssignedGames')}</div>
                {assignmentSections.upcoming.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('dashboard.noUpcomingGamesYet')}</p>
                ) : (
                  assignmentSections.upcoming.map(renderAssignmentCard)
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`${item.color} relative rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-transform active:scale-95 shadow-sm min-h-36`}
          >
            {item.badgeCount ? (
              <div className="absolute right-3 top-3 inline-flex min-w-7 items-center justify-center rounded-full bg-[#57131b] px-2 py-1 text-[11px] font-black text-white shadow-sm">
                {item.badgeCount}
              </div>
            ) : null}
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <item.icon size={28} className={item.iconColor} />
            </div>
            <span className="text-sm font-bold text-slate-700">{item.label}</span>
          </button>
        ))}
      </div>
    </Layout>
  );
};

export default Dashboard;
