import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const DEFAULT_PHOTO_URL = 'https://picsum.photos/seed/referee/300/300';
const ROLE_OPTIONS = ['Instructor', 'Table', 'Referee', 'Stuff'];
const ASSIGNMENT_STATUS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};
const REPORT_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
};
const ROLE_PREFIX = {
  Instructor: 'INS',
  Table: 'TAB',
  Referee: 'REF',
  Stuff: 'STF',
};
const BAKU_TIMEZONE = 'Asia/Baku';
const BAKU_OFFSET = '+04:00';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
  body: JSON.stringify(body),
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const clampScore = (score) => {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, numeric));
};

const isStrongEnoughPassword = (password) =>
  password.length >= 10 && /[A-Za-z]/.test(password) && /\d/.test(password);

const buildLicenseNumber = (role, sequence) => `ABL-${ROLE_PREFIX[role]}-${String(sequence).padStart(4, '0')}`;

const getApiPath = (event) => {
  const sourcePath = event.path || new URL(event.rawUrl).pathname;
  const normalized = sourcePath
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '');

  return normalized || '/';
};

const parseJsonBody = (event) => {
  if (!event.body) {
    return {};
  }

  if (event.isBase64Encoded) {
    return JSON.parse(Buffer.from(event.body, 'base64').toString('utf8'));
  }

  return JSON.parse(event.body);
};

const getEnv = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new HttpError(
      500,
      'Supabase environment variables are missing. Configure SUPABASE_URL, publishable key and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return { supabaseUrl, serviceRoleKey };
};

const createClients = () => {
  const { supabaseUrl, serviceRoleKey } = getEnv();

  return {
    admin: createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  };
};

const sortByMatchAsc = (left, right) => {
  const leftKey = `${left.matchDate}T${left.matchTime}`;
  const rightKey = `${right.matchDate}T${right.matchTime}`;
  return leftKey.localeCompare(rightKey);
};

const sortByMatchDesc = (left, right) => {
  const leftKey = `${left.matchDate}T${left.matchTime}`;
  const rightKey = `${right.matchDate}T${right.matchTime}`;
  return rightKey.localeCompare(leftKey);
};

const formatDeadline = (deadline) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: BAKU_TIMEZONE,
  }).format(deadline);

const createDeadlineDate = (matchDate, matchTime) => {
  const deadline = new Date(`${matchDate}T${matchTime}:00${BAKU_OFFSET}`);
  return Number.isNaN(deadline.getTime()) ? null : new Date(deadline.getTime() + 24 * 60 * 60 * 1000);
};

const getDeadlineMessage = (assignment) => {
  const deadline = createDeadlineDate(assignment.matchDate, assignment.matchTime);
  if (!deadline) {
    return 'Report deadline could not be calculated.';
  }

  return `Report deadline expired on ${formatDeadline(deadline)} (${BAKU_TIMEZONE}).`;
};

const isDeadlineExceeded = (assignment) => {
  const deadline = createDeadlineDate(assignment.matchDate, assignment.matchTime);
  return Boolean(deadline && Date.now() > deadline.getTime());
};

const mapUser = (profile) => ({
  id: profile.id,
  email: profile.email,
  fullName: profile.full_name,
  photoUrl: profile.photo_url || DEFAULT_PHOTO_URL,
  licenseNumber: profile.license_number || 'Pending',
  role: profile.role,
  category: profile.role,
});

const mapAllowedAccess = (item) => ({
  id: item.id,
  email: item.email,
  displayName: item.display_name || '',
  role: item.allowed_role,
});

const mapReportEntry = (entry) =>
  entry
    ? {
        id: entry.id,
        authorRole: entry.author_role,
        status: entry.status,
        feedbackScore: Number(entry.score || 0),
        threePO_IOT: entry.three_po_iot || '',
        criteria: entry.criteria || '',
        teamwork: entry.teamwork || '',
        generally: entry.generally || '',
        updatedAt: entry.updated_at,
      }
    : null;

const buildReportListItem = ({
  nomination,
  assignment,
  refereeName,
  refereeReportStatus,
  instructorReportStatus,
  reviewScore,
}) => ({
  nominationId: nomination.id,
  refereeId: assignment.referee_id,
  gameCode: nomination.game_code || 'ABL-NEW',
  teams: nomination.teams,
  matchDate: nomination.match_date,
  matchTime: nomination.match_time,
  venue: nomination.venue,
  refereeName,
  slotNumber: Number(assignment.slot_number),
  refereeReportStatus: refereeReportStatus || null,
  instructorReportStatus: instructorReportStatus || null,
  reviewScore: reviewScore === null || reviewScore === undefined ? null : Number(reviewScore),
});

const ensureData = (data, error, fallbackMessage) => {
  if (error) {
    throw new HttpError(500, fallbackMessage);
  }

  return data;
};

const maybeSingle = async (query, fallbackMessage) => {
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new HttpError(500, fallbackMessage);
  }

  return data;
};

const requireSingle = async (query, notFoundMessage, fallbackMessage) => {
  const data = await maybeSingle(query, fallbackMessage);
  if (!data) {
    throw new HttpError(404, notFoundMessage);
  }

  return data;
};

const loadProfileById = async (admin, id) =>
  maybeSingle(admin.from('profiles').select('*').eq('id', id), 'Failed to load user profile.');

const requireProfileById = async (admin, id) =>
  requireSingle(admin.from('profiles').select('*').eq('id', id), 'User not found.', 'Failed to load user profile.');

const loadProfileByEmail = async (admin, email) =>
  maybeSingle(admin.from('profiles').select('*').eq('email', normalizeEmail(email)), 'Failed to load user profile.');

const requireRole = async (admin, userId, role) => {
  const profile = await requireProfileById(admin, userId);
  if (profile.role !== role) {
    throw new HttpError(403, `Only ${role} accounts can perform this action.`);
  }

  return profile;
};

const loadAllowedAccessByEmail = async (admin, email) =>
  maybeSingle(
    admin.from('allowed_access').select('*').eq('email', normalizeEmail(email)),
    'Failed to load allowed access.',
  );

const requireAllowedAccessById = async (admin, accessId) =>
  requireSingle(
    admin.from('allowed_access').select('*').eq('id', accessId),
    'Access entry not found.',
    'Failed to load allowed access.',
  );

const requireNominationOwner = async (admin, nominationId, instructorId) => {
  const nomination = await requireSingle(
    admin.from('nominations').select('*').eq('id', nominationId),
    'Nomination not found.',
    'Failed to load nomination.',
  );

  if (nomination.created_by !== instructorId) {
    throw new HttpError(403, 'This nomination belongs to another instructor.');
  }

  return nomination;
};

const listProfilesByIds = async (admin, ids) => {
  if (!ids.length) {
    return [];
  }

  const { data, error } = await admin.from('profiles').select('*').in('id', ids);
  return ensureData(data || [], error, 'Failed to load user profiles.');
};

const listNominationsByIds = async (admin, ids) => {
  if (!ids.length) {
    return [];
  }

  const { data, error } = await admin.from('nominations').select('*').in('id', ids);
  return ensureData(data || [], error, 'Failed to load nominations.');
};

const listAssignmentsByNominationIds = async (admin, nominationIds) => {
  if (!nominationIds.length) {
    return [];
  }

  const { data, error } = await admin
    .from('nomination_referees')
    .select('*')
    .in('nomination_id', nominationIds)
    .order('slot_number', { ascending: true });

  return ensureData(data || [], error, 'Failed to load nomination assignments.');
};

const loadReportsForPairs = async (admin, pairs) => {
  if (!pairs.length) {
    return [];
  }

  const nominationIds = [...new Set(pairs.map((pair) => pair.nominationId))];
  const refereeIds = [...new Set(pairs.map((pair) => pair.refereeId))];
  const { data, error } = await admin
    .from('reports')
    .select('*')
    .in('nomination_id', nominationIds)
    .in('referee_id', refereeIds);

  const rows = ensureData(data || [], error, 'Failed to load reports.');
  const pairSet = new Set(pairs.map((pair) => `${pair.nominationId}:${pair.refereeId}`));
  return rows.filter((row) => pairSet.has(`${row.nomination_id}:${row.referee_id}`));
};

const loadReportByAuthor = async (admin, nominationId, refereeId, authorId) =>
  maybeSingle(
    admin
      .from('reports')
      .select('*')
      .eq('nomination_id', nominationId)
      .eq('referee_id', refereeId)
      .eq('author_id', authorId),
    'Failed to load report.',
  );

const loadSubmittedRefereeReport = async (admin, nominationId, refereeId) =>
  maybeSingle(
    admin
      .from('reports')
      .select('*')
      .eq('nomination_id', nominationId)
      .eq('referee_id', refereeId)
      .eq('author_role', 'Referee')
      .eq('status', REPORT_STATUS.SUBMITTED),
    'Failed to load referee report.',
  );

const loadVisibleInstructorReport = async (admin, nominationId, refereeId) =>
  maybeSingle(
    admin
      .from('reports')
      .select('*')
      .eq('nomination_id', nominationId)
      .eq('referee_id', refereeId)
      .eq('author_role', 'Instructor')
      .eq('status', REPORT_STATUS.REVIEWED),
    'Failed to load instructor report.',
  );

const requireAssignment = async (admin, nominationId, refereeId) => {
  const assignmentRow = await requireSingle(
    admin
      .from('nomination_referees')
      .select('*')
      .eq('nomination_id', nominationId)
      .eq('referee_id', refereeId),
    'Assignment not found.',
    'Failed to load assignment.',
  );

  const [nomination, referee] = await Promise.all([
    requireSingle(
      admin.from('nominations').select('*').eq('id', nominationId),
      'Nomination not found.',
      'Failed to load nomination.',
    ),
    requireSingle(
      admin.from('profiles').select('*').eq('id', refereeId),
      'User not found.',
      'Failed to load user profile.',
    ),
  ]);

  return {
    assignmentId: assignmentRow.id,
    slotNumber: Number(assignmentRow.slot_number),
    assignmentStatus: assignmentRow.status,
    nominationId: nomination.id,
    createdBy: nomination.created_by,
    gameCode: nomination.game_code || 'ABL-NEW',
    teams: nomination.teams,
    matchDate: nomination.match_date,
    matchTime: nomination.match_time,
    venue: nomination.venue,
    refereeName: referee.full_name,
  };
};

const ensureDistinctReferees = (refereeIds) => {
  const normalized = (refereeIds || []).map((refereeId) => String(refereeId || '').trim()).filter(Boolean);
  const unique = new Set(normalized);

  if (normalized.length !== 3 || unique.size !== 3) {
    throw new HttpError(400, 'Select exactly 3 different referees.');
  }

  return normalized;
};

const requireReferees = async (admin, refereeIds) => {
  const rows = await listProfilesByIds(admin, refereeIds);

  if (rows.length !== refereeIds.length) {
    throw new HttpError(404, 'One or more referees were not found.');
  }

  rows.forEach((row) => {
    if (row.role !== 'Referee') {
      throw new HttpError(400, 'Only users with role Referee can be assigned.');
    }
  });

  return rows;
};

const getNextLicenseNumber = async (admin, role) => {
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', role);

  if (error) {
    throw new HttpError(500, 'Failed to generate license number.');
  }

  return buildLicenseNumber(role, Number(count || 0) + 1);
};

const getCurrentUser = async (admin, event) => {
  const authorization =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    event.multiValueHeaders?.authorization?.[0] ||
    event.multiValueHeaders?.Authorization?.[0];

  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication required.');
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new HttpError(401, 'Authentication required.');
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, 'Invalid or expired session.');
  }

  const profile = await loadProfileById(admin, data.user.id);
  if (!profile) {
    throw new HttpError(401, 'Profile is missing for the authenticated user.');
  }

  return profile;
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new HttpError(500, 'GEMINI_API_KEY is missing.');
  }

  return new GoogleGenAI({ apiKey });
};

const generateAiTips = async (category) => {
  const fallback = 'Keep focusing on positioning and clear communication with the crew.';

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 3 short, professional refereeing tips for a ${category} level basketball official in Azerbaijan. Keep it concise and practical.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    return response.text || fallback;
  } catch {
    return fallback;
  }
};

const generateAiSummary = async (reportsCount, avgScore) => {
  const fallback = 'Your consistency in game management is highly valued by the league committee.';

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a 2-sentence performance summary for a basketball referee who has completed ${reportsCount} matches with an average feedback score of ${avgScore}%.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    return response.text || fallback;
  } catch {
    return fallback;
  }
};

const generateAiLogo = async () => {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          text: "A professional circular logo for 'Azerbaijan Basketball Referees'. The logo should feature a basketball and a referee whistle. Use a color palette of deep burgundy (#581c1c) and basketball orange (#f39200). The text 'Azerbaijan Basketball Referees' should be incorporated into the circular border in a clean, modern sans-serif font. High-end sports branding style, minimalist and bold.",
        },
      ],
      config: {
        imageConfig: {
          aspectRatio: '1:1',
        },
      },
    });

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
};

const getInstructorNominationsData = async (admin, instructorId) => {
  await requireRole(admin, instructorId, 'Instructor');

  const { data, error } = await admin
    .from('nominations')
    .select('*')
    .eq('created_by', instructorId)
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true });

  const nominations = ensureData(data || [], error, 'Failed to load instructor nominations.');
  if (!nominations.length) {
    return [];
  }

  const nominationIds = nominations.map((nomination) => nomination.id);
  const assignments = await listAssignmentsByNominationIds(admin, nominationIds);
  const referees = await listProfilesByIds(
    admin,
    [...new Set(assignments.map((assignment) => assignment.referee_id))],
  );
  const refereeMap = new Map(referees.map((referee) => [referee.id, referee]));

  return nominations.map((nomination) => ({
    id: nomination.id,
    gameCode: nomination.game_code || 'ABL-NEW',
    teams: nomination.teams,
    matchDate: nomination.match_date,
    matchTime: nomination.match_time,
    venue: nomination.venue,
    createdAt: nomination.created_at,
    referees: assignments
      .filter((assignment) => assignment.nomination_id === nomination.id)
      .sort((left, right) => Number(left.slot_number) - Number(right.slot_number))
      .map((assignment) => ({
        slotNumber: Number(assignment.slot_number),
        refereeId: assignment.referee_id,
        refereeName: refereeMap.get(assignment.referee_id)?.full_name || 'Unknown referee',
        status: assignment.status,
        respondedAt: assignment.responded_at || null,
      })),
  }));
};

const getRefereeAssignmentsData = async (admin, refereeId) => {
  await requireRole(admin, refereeId, 'Referee');

  const { data, error } = await admin.from('nomination_referees').select('*').eq('referee_id', refereeId);
  const assignments = ensureData(data || [], error, 'Failed to load referee nominations.');
  const visibleAssignments = assignments.filter((assignment) => assignment.status !== ASSIGNMENT_STATUS.DECLINED);

  if (!visibleAssignments.length) {
    return [];
  }

  const nominations = await listNominationsByIds(
    admin,
    [...new Set(visibleAssignments.map((assignment) => assignment.nomination_id))],
  );
  const instructors = await listProfilesByIds(
    admin,
    [...new Set(nominations.map((nomination) => nomination.created_by))],
  );
  const nominationMap = new Map(nominations.map((nomination) => [nomination.id, nomination]));
  const instructorMap = new Map(instructors.map((instructor) => [instructor.id, instructor]));

  return visibleAssignments
    .map((assignment) => {
      const nomination = nominationMap.get(assignment.nomination_id);
      if (!nomination) {
        return null;
      }

      return {
        id: assignment.id,
        nominationId: nomination.id,
        gameCode: nomination.game_code || 'ABL-NEW',
        teams: nomination.teams,
        matchDate: nomination.match_date,
        matchTime: nomination.match_time,
        venue: nomination.venue,
        slotNumber: Number(assignment.slot_number),
        status: assignment.status,
        respondedAt: assignment.responded_at || null,
        instructorName: instructorMap.get(nomination.created_by)?.full_name || 'Unknown instructor',
      };
    })
    .filter(Boolean)
    .sort(sortByMatchAsc);
};

const buildRankingState = async (admin) => {
  const refereeResponse = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'Referee')
    .order('full_name', { ascending: true });
  const referees = ensureData(refereeResponse.data || [], refereeResponse.error, 'Failed to load referees.');

  const evaluationsResponse = await admin
    .from('ranking_evaluations')
    .select('*')
    .order('evaluation_date', { ascending: true })
    .order('created_at', { ascending: true });
  const evaluationRows = ensureData(
    evaluationsResponse.data || [],
    evaluationsResponse.error,
    'Failed to load ranking evaluations.',
  );

  const performanceResponse = await admin.from('ranking_performance').select('*');
  const performanceRows = ensureData(
    performanceResponse.data || [],
    performanceResponse.error,
    'Failed to load ranking performance profiles.',
  );

  const refereeNameMap = new Map(referees.map((referee) => [referee.id, referee.full_name]));
  const evaluations = evaluationRows.map((evaluation) => ({
    id: evaluation.id,
    refereeId: evaluation.referee_id,
    refereeName: refereeNameMap.get(evaluation.referee_id) || 'Unknown referee',
    gameCode: evaluation.game_code,
    evaluationDate: evaluation.evaluation_date,
    score: Number(evaluation.score),
    note: evaluation.note || '',
  }));

  const performanceProfiles = new Map(
    performanceRows.map((row) => [
      row.referee_id,
      {
        refereeId: row.referee_id,
        refereeName: refereeNameMap.get(row.referee_id) || 'Unknown referee',
        physicalFitness: Number(row.physical_fitness || 0),
        mechanics: Number(row.mechanics || 0),
        iot: Number(row.iot || 0),
        criteriaScore: Number(row.criteria_score || 0),
        teamworkScore: Number(row.teamwork_score || 0),
        gameControl: Number(row.game_control || 0),
        newPhilosophy: Number(row.new_philosophy || 0),
        communication: Number(row.communication || 0),
      },
    ]),
  );

  const calculatePerformanceTotal = (profile) =>
    (profile?.physicalFitness || 0) +
    (profile?.mechanics || 0) +
    (profile?.iot || 0) +
    (profile?.criteriaScore || 0) +
    (profile?.teamworkScore || 0) +
    (profile?.gameControl || 0) +
    (profile?.newPhilosophy || 0) +
    (profile?.communication || 0);

  const totalGameScores = new Map(referees.map((referee) => [referee.id, 0]));
  evaluations.forEach((evaluation) => {
    totalGameScores.set(evaluation.refereeId, (totalGameScores.get(evaluation.refereeId) || 0) + evaluation.score);
  });

  const leaderboard = referees
    .map((referee) => {
      const performanceProfile = performanceProfiles.get(referee.id) || null;
      const performanceScore = calculatePerformanceTotal(performanceProfile);
      const totalGameScore = totalGameScores.get(referee.id) || 0;

      return {
        refereeId: referee.id,
        refereeName: referee.full_name,
        totalGameScore,
        performanceScore,
        overallScore: totalGameScore + performanceScore,
        rank: 0,
      };
    })
    .sort((left, right) => {
      if (right.overallScore !== left.overallScore) return right.overallScore - left.overallScore;
      if (right.totalGameScore !== left.totalGameScore) return right.totalGameScore - left.totalGameScore;
      return left.refereeName.localeCompare(right.refereeName);
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return {
    referees,
    evaluations,
    performanceProfiles,
    leaderboard,
  };
};

const buildRankingHistory = (targetRefereeId, rankingState) => {
  const targetEvaluations = rankingState.evaluations.filter((item) => item.refereeId === targetRefereeId);
  if (!targetEvaluations.length) {
    return [];
  }

  const calculatePerformanceTotal = (profile) =>
    (profile?.physicalFitness || 0) +
    (profile?.mechanics || 0) +
    (profile?.iot || 0) +
    (profile?.criteriaScore || 0) +
    (profile?.teamworkScore || 0) +
    (profile?.gameControl || 0) +
    (profile?.newPhilosophy || 0) +
    (profile?.communication || 0);

  const runningScores = new Map(rankingState.referees.map((referee) => [referee.id, 0]));
  const history = [];

  rankingState.evaluations.forEach((evaluation) => {
    runningScores.set(evaluation.refereeId, (runningScores.get(evaluation.refereeId) || 0) + evaluation.score);

    if (evaluation.refereeId !== targetRefereeId) {
      return;
    }

    const snapshot = rankingState.referees
      .map((referee) => {
        const performanceProfile = rankingState.performanceProfiles.get(referee.id) || null;
        const performanceScore = calculatePerformanceTotal(performanceProfile);
        const totalGameScore = runningScores.get(referee.id) || 0;

        return {
          refereeId: referee.id,
          refereeName: referee.full_name,
          overallScore: totalGameScore + performanceScore,
          totalGameScore,
        };
      })
      .sort((left, right) => {
        if (right.overallScore !== left.overallScore) return right.overallScore - left.overallScore;
        if (right.totalGameScore !== left.totalGameScore) return right.totalGameScore - left.totalGameScore;
        return left.refereeName.localeCompare(right.refereeName);
      });

    history.push({
      date: evaluation.evaluationDate,
      rank: snapshot.findIndex((item) => item.refereeId === targetRefereeId) + 1,
    });
  });

  return history;
};

const upsertReport = async ({
  admin,
  nominationId,
  refereeId,
  authorId,
  authorRole,
  status,
  score,
  threePO_IOT,
  criteria,
  teamwork,
  generally,
}) => {
  const payload = {
    nomination_id: nominationId,
    referee_id: refereeId,
    author_id: authorId,
    author_role: authorRole,
    status,
    score: clampScore(score),
    three_po_iot: threePO_IOT,
    criteria,
    teamwork,
    generally,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from('reports').upsert(payload, {
    onConflict: 'nomination_id,referee_id,author_id',
  });

  if (error) {
    throw new HttpError(500, 'Failed to save report.');
  }
};

const listReferees = async (admin, currentUser) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, email, license_number')
    .eq('role', 'Referee')
    .order('full_name', { ascending: true });

  return ensureData(data || [], error, 'Failed to load referees.').map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    licenseNumber: row.license_number || 'Pending',
  }));
};

const listMembers = async (admin, currentUser) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  return ensureData(data || [], error, 'Failed to load members.').map(mapUser);
};

const updateMemberProfile = async (admin, currentUser, memberId, fullName, photoUrl) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const member = await requireProfileById(admin, memberId);
  const trimmedName = String(fullName || '').trim();
  const nextPhotoUrl = String(photoUrl || '').trim();

  if (!trimmedName) {
    throw new HttpError(400, 'Full name is required.');
  }

  const { error } = await admin
    .from('profiles')
    .update({
      full_name: trimmedName,
      photo_url: nextPhotoUrl || member.photo_url || DEFAULT_PHOTO_URL,
    })
    .eq('id', memberId);

  if (error) {
    throw new HttpError(500, 'Failed to update member.');
  }

  return mapUser(await requireProfileById(admin, memberId));
};

const deleteMember = async (admin, currentUser, memberId) => {
  await requireRole(admin, currentUser.id, 'Instructor');

  if (currentUser.id === memberId) {
    throw new HttpError(400, 'Instructor cannot delete their own account.');
  }

  await requireProfileById(admin, memberId);

  const createdNominations = await maybeSingle(
    admin.from('nominations').select('id').eq('created_by', memberId).limit(1),
    'Failed to check created nominations.',
  );
  if (createdNominations) {
    throw new HttpError(409, 'Cannot delete a user who has created nominations.');
  }

  const activeAssignments = await maybeSingle(
    admin.from('nomination_referees').select('id').eq('referee_id', memberId).limit(1),
    'Failed to check member assignments.',
  );
  if (activeAssignments) {
    throw new HttpError(409, 'Cannot delete a user who is assigned to nominations.');
  }

  const { error } = await admin.auth.admin.deleteUser(memberId);
  if (error) {
    throw new HttpError(500, 'Failed to delete member.');
  }
};

const listAllowedAccess = async (admin, currentUser) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const { data, error } = await admin.from('allowed_access').select('*').order('email', { ascending: true });
  return ensureData(data || [], error, 'Failed to load allowed access.').map(mapAllowedAccess);
};

const addAllowedAccess = async (admin, currentUser, email, role) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new HttpError(400, 'E-mail is required.');
  }

  if (!ROLE_OPTIONS.includes(role)) {
    throw new HttpError(400, 'Choose a valid role.');
  }

  const { error } = await admin.from('allowed_access').upsert(
    {
      email: normalizedEmail,
      allowed_role: role,
    },
    {
      onConflict: 'email',
    },
  );

  if (error) {
    throw new HttpError(500, 'Failed to save allowed access.');
  }

  const access = await loadAllowedAccessByEmail(admin, normalizedEmail);
  if (!access) {
    throw new HttpError(500, 'Allowed access could not be loaded after save.');
  }

  return mapAllowedAccess(access);
};

const deleteAllowedAccess = async (admin, currentUser, accessId) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  await requireAllowedAccessById(admin, accessId);

  const linkedProfile = await maybeSingle(
    admin.from('profiles').select('id').eq('allowed_access_id', accessId).limit(1),
    'Failed to check linked users.',
  );

  if (linkedProfile) {
    throw new HttpError(409, 'Cannot delete access for an e-mail that is already linked to a registered user.');
  }

  const { error } = await admin.from('allowed_access').delete().eq('id', accessId);
  if (error) {
    throw new HttpError(500, 'Failed to delete allowed access.');
  }
};

const createNomination = async (admin, currentUser, body) => {
  await requireRole(admin, currentUser.id, 'Instructor');

  const gameCode = String(body.gameCode || '').trim();
  const teams = String(body.teams || '').trim();
  const matchDate = String(body.matchDate || '').trim();
  const matchTime = String(body.matchTime || '').trim();
  const venue = String(body.venue || '').trim();
  const refereeIds = ensureDistinctReferees(body.refereeIds || []);

  if (!gameCode || !teams || !matchDate || !matchTime || !venue) {
    throw new HttpError(400, 'Fill in game number, teams, date, time and venue.');
  }

  await requireReferees(admin, refereeIds);

  const { data: inserted, error } = await admin
    .from('nominations')
    .insert({
      created_by: currentUser.id,
      game_code: gameCode,
      teams,
      match_date: matchDate,
      match_time: matchTime,
      venue,
    })
    .select('*')
    .single();

  if (error || !inserted) {
    throw new HttpError(500, 'Failed to create nomination.');
  }

  const slotsResponse = await admin.from('nomination_referees').insert(
    refereeIds.map((refereeId, index) => ({
      nomination_id: inserted.id,
      referee_id: refereeId,
      slot_number: index + 1,
      status: ASSIGNMENT_STATUS.PENDING,
    })),
  );

  if (slotsResponse.error) {
    await admin.from('nominations').delete().eq('id', inserted.id);
    throw new HttpError(500, 'Failed to assign referees to the game.');
  }

  const nominations = await getInstructorNominationsData(admin, currentUser.id);
  return nominations.find((nomination) => nomination.id === inserted.id);
};

const replaceNominationReferee = async (admin, currentUser, nominationId, slotNumber, refereeId) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  await requireNominationOwner(admin, nominationId, currentUser.id);
  await requireReferees(admin, [refereeId]);

  const slot = await requireSingle(
    admin.from('nomination_referees').select('*').eq('nomination_id', nominationId).eq('slot_number', slotNumber),
    'Nomination slot not found.',
    'Failed to load nomination slot.',
  );

  if (slot.status === ASSIGNMENT_STATUS.ACCEPTED) {
    throw new HttpError(400, 'Accepted referee cannot be replaced from this screen.');
  }

  const duplicate = await maybeSingle(
    admin
      .from('nomination_referees')
      .select('id')
      .eq('nomination_id', nominationId)
      .eq('referee_id', refereeId)
      .neq('slot_number', slotNumber)
      .limit(1),
    'Failed to validate nomination slot.',
  );

  if (duplicate) {
    throw new HttpError(409, 'This referee is already assigned to the game.');
  }

  const { error } = await admin
    .from('nomination_referees')
    .update({
      referee_id: refereeId,
      status: ASSIGNMENT_STATUS.PENDING,
      responded_at: null,
    })
    .eq('nomination_id', nominationId)
    .eq('slot_number', slotNumber);

  if (error) {
    throw new HttpError(500, 'Failed to replace referee.');
  }

  const nominations = await getInstructorNominationsData(admin, currentUser.id);
  return nominations.find((nomination) => nomination.id === nominationId);
};

const respondToNomination = async (admin, currentUser, nominationId, response) => {
  await requireRole(admin, currentUser.id, 'Referee');

  if (![ASSIGNMENT_STATUS.ACCEPTED, ASSIGNMENT_STATUS.DECLINED].includes(response)) {
    throw new HttpError(400, 'Response must be Accepted or Declined.');
  }

  const assignment = await maybeSingle(
    admin
      .from('nomination_referees')
      .select('*')
      .eq('nomination_id', nominationId)
      .eq('referee_id', currentUser.id),
    'Failed to load nomination response.',
  );

  if (!assignment) {
    throw new HttpError(404, 'Assignment not found.');
  }

  const { error } = await admin
    .from('nomination_referees')
    .update({
      status: response,
      responded_at: new Date().toISOString(),
    })
    .eq('nomination_id', nominationId)
    .eq('referee_id', currentUser.id);

  if (error) {
    throw new HttpError(500, 'Failed to save response.');
  }

  const nominations = await getRefereeAssignmentsData(admin, currentUser.id);
  return nominations.find((nomination) => nomination.nominationId === nominationId);
};

const deleteNomination = async (admin, currentUser, nominationId) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  await requireNominationOwner(admin, nominationId, currentUser.id);

  const { error } = await admin.from('nominations').delete().eq('id', nominationId);
  if (error) {
    throw new HttpError(500, 'Failed to delete nomination.');
  }
};

const listReportItems = async (admin, currentUser) => {
  if (currentUser.role === 'Referee') {
    const assignmentsResponse = await admin.from('nomination_referees').select('*').eq('referee_id', currentUser.id);
    const assignments = ensureData(assignmentsResponse.data || [], assignmentsResponse.error, 'Failed to load reports.')
      .filter((assignment) => assignment.status !== ASSIGNMENT_STATUS.DECLINED);

    if (!assignments.length) {
      return [];
    }

    const nominationIds = [...new Set(assignments.map((assignment) => assignment.nomination_id))];
    const nominations = await listNominationsByIds(admin, nominationIds);
    const nominationMap = new Map(nominations.map((nomination) => [nomination.id, nomination]));
    const reports = await loadReportsForPairs(
      admin,
      assignments.map((assignment) => ({
        nominationId: assignment.nomination_id,
        refereeId: assignment.referee_id,
      })),
    );

    return assignments
      .map((assignment) => {
        const nomination = nominationMap.get(assignment.nomination_id);
        if (!nomination) {
          return null;
        }

        const ownReport = reports.find(
          (report) =>
            report.nomination_id === assignment.nomination_id &&
            report.referee_id === assignment.referee_id &&
            report.author_id === currentUser.id,
        );
        const instructorReport = reports.find(
          (report) =>
            report.nomination_id === assignment.nomination_id &&
            report.referee_id === assignment.referee_id &&
            report.author_role === 'Instructor' &&
            report.status === REPORT_STATUS.REVIEWED,
        );

        return buildReportListItem({
          nomination,
          assignment,
          refereeName: currentUser.full_name,
          refereeReportStatus: ownReport?.status || null,
          instructorReportStatus: instructorReport?.status || null,
          reviewScore: instructorReport?.score ?? null,
        });
      })
      .filter(Boolean)
      .sort(sortByMatchDesc);
  }

  if (currentUser.role === 'Instructor') {
    const { data, error } = await admin.from('nominations').select('*').eq('created_by', currentUser.id);
    const nominations = ensureData(data || [], error, 'Failed to load reports.');

    if (!nominations.length) {
      return [];
    }

    const assignments = (await listAssignmentsByNominationIds(admin, nominations.map((nomination) => nomination.id))).filter(
      (assignment) => assignment.status !== ASSIGNMENT_STATUS.DECLINED,
    );

    if (!assignments.length) {
      return [];
    }

    const referees = await listProfilesByIds(
      admin,
      [...new Set(assignments.map((assignment) => assignment.referee_id))],
    );
    const refereeMap = new Map(referees.map((referee) => [referee.id, referee]));
    const nominationMap = new Map(nominations.map((nomination) => [nomination.id, nomination]));
    const reports = await loadReportsForPairs(
      admin,
      assignments.map((assignment) => ({
        nominationId: assignment.nomination_id,
        refereeId: assignment.referee_id,
      })),
    );

    return assignments
      .map((assignment) => {
        const nomination = nominationMap.get(assignment.nomination_id);
        if (!nomination) {
          return null;
        }

        const refereeReport = reports.find(
          (report) =>
            report.nomination_id === assignment.nomination_id &&
            report.referee_id === assignment.referee_id &&
            report.author_role === 'Referee' &&
            report.status === REPORT_STATUS.SUBMITTED,
        );
        const ownReport = reports.find(
          (report) =>
            report.nomination_id === assignment.nomination_id &&
            report.referee_id === assignment.referee_id &&
            report.author_id === currentUser.id,
        );

        return buildReportListItem({
          nomination,
          assignment,
          refereeName: refereeMap.get(assignment.referee_id)?.full_name || 'Unknown referee',
          refereeReportStatus: refereeReport?.status || null,
          instructorReportStatus: ownReport?.status || null,
          reviewScore: ownReport?.score ?? null,
        });
      })
      .filter(Boolean)
      .sort((left, right) => {
        const matchOrder = sortByMatchDesc(left, right);
        if (matchOrder !== 0) {
          return matchOrder;
        }

        return left.slotNumber - right.slotNumber;
      });
  }

  return [];
};

const getReportDetail = async (admin, currentUser, nominationId, refereeId) => {
  const assignment = await requireAssignment(admin, nominationId, refereeId);
  const deadlineExceeded = isDeadlineExceeded(assignment);
  const deadlineMessage = deadlineExceeded ? getDeadlineMessage(assignment) : null;

  if (currentUser.role === 'Referee') {
    if (currentUser.id !== refereeId) {
      throw new HttpError(403, 'Referees can only view their own reports.');
    }

    if (assignment.assignmentStatus === ASSIGNMENT_STATUS.DECLINED) {
      throw new HttpError(403, 'Declined assignments do not have reports.');
    }

    const [ownReport, instructorReport] = await Promise.all([
      loadReportByAuthor(admin, nominationId, refereeId, currentUser.id),
      loadVisibleInstructorReport(admin, nominationId, refereeId),
    ]);

    return {
      item: {
        nominationId: assignment.nominationId,
        refereeId,
        gameCode: assignment.gameCode,
        teams: assignment.teams,
        matchDate: assignment.matchDate,
        matchTime: assignment.matchTime,
        venue: assignment.venue,
        refereeName: assignment.refereeName,
        slotNumber: assignment.slotNumber,
        refereeReportStatus: ownReport?.status || null,
        instructorReportStatus: instructorReport?.status || null,
        reviewScore: instructorReport?.score ?? null,
      },
      refereeReport: mapReportEntry(ownReport),
      instructorReport: mapReportEntry(instructorReport),
      canEditCurrentUserReport: !deadlineExceeded && (!ownReport || ownReport.status === REPORT_STATUS.DRAFT),
      deadlineExceeded,
      deadlineMessage,
    };
  }

  if (currentUser.role === 'Instructor') {
    await requireNominationOwner(admin, nominationId, currentUser.id);
    const [refereeReport, ownReport] = await Promise.all([
      loadSubmittedRefereeReport(admin, nominationId, refereeId),
      loadReportByAuthor(admin, nominationId, refereeId, currentUser.id),
    ]);

    return {
      item: {
        nominationId: assignment.nominationId,
        refereeId,
        gameCode: assignment.gameCode,
        teams: assignment.teams,
        matchDate: assignment.matchDate,
        matchTime: assignment.matchTime,
        venue: assignment.venue,
        refereeName: assignment.refereeName,
        slotNumber: assignment.slotNumber,
        refereeReportStatus: refereeReport?.status || null,
        instructorReportStatus: ownReport?.status || null,
        reviewScore: ownReport?.score ?? null,
      },
      refereeReport: mapReportEntry(refereeReport),
      instructorReport: mapReportEntry(ownReport),
      canEditCurrentUserReport: Boolean(refereeReport) && (!ownReport || ownReport.status === REPORT_STATUS.DRAFT),
      deadlineExceeded: false,
      deadlineMessage: null,
    };
  }

  throw new HttpError(403, 'This role cannot access reports.');
};

const saveReport = async (admin, currentUser, nominationId, refereeId, body) => {
  const assignment = await requireAssignment(admin, nominationId, refereeId);
  const action = body.action;

  if (![REPORT_STATUS.DRAFT, REPORT_STATUS.SUBMITTED].includes(action)) {
    throw new HttpError(400, 'Action must be Draft or Submitted.');
  }

  const normalizedPayload = {
    feedbackScore: clampScore(body.feedbackScore),
    threePO_IOT: String(body.threePO_IOT || '').trim(),
    criteria: String(body.criteria || '').trim(),
    teamwork: String(body.teamwork || '').trim(),
    generally: String(body.generally || '').trim(),
  };

  if (currentUser.role === 'Referee') {
    if (currentUser.id !== refereeId) {
      throw new HttpError(403, 'Referees can only edit their own report.');
    }

    if (assignment.assignmentStatus === ASSIGNMENT_STATUS.DECLINED) {
      throw new HttpError(403, 'Declined assignments do not have reports.');
    }

    if (isDeadlineExceeded(assignment)) {
      throw new HttpError(409, getDeadlineMessage(assignment));
    }

    const existing = await loadReportByAuthor(admin, nominationId, refereeId, currentUser.id);
    if (existing?.status === REPORT_STATUS.SUBMITTED) {
      throw new HttpError(409, 'Submitted report cannot be edited.');
    }

    await upsertReport({
      admin,
      nominationId,
      refereeId,
      authorId: currentUser.id,
      authorRole: 'Referee',
      status: action,
      score: 0,
      ...normalizedPayload,
    });

    return getReportDetail(admin, currentUser, nominationId, refereeId);
  }

  if (currentUser.role === 'Instructor') {
    await requireNominationOwner(admin, nominationId, currentUser.id);
    const refereeReport = await loadSubmittedRefereeReport(admin, nominationId, refereeId);

    if (!refereeReport) {
      throw new HttpError(409, 'Instructor can evaluate only after the referee submits their report.');
    }

    const existing = await loadReportByAuthor(admin, nominationId, refereeId, currentUser.id);
    if (existing?.status === REPORT_STATUS.REVIEWED) {
      throw new HttpError(409, 'Reviewed report cannot be edited.');
    }

    await upsertReport({
      admin,
      nominationId,
      refereeId,
      authorId: currentUser.id,
      authorRole: 'Instructor',
      status: action === REPORT_STATUS.SUBMITTED ? REPORT_STATUS.REVIEWED : REPORT_STATUS.DRAFT,
      score: normalizedPayload.feedbackScore,
      ...normalizedPayload,
    });

    return getReportDetail(admin, currentUser, nominationId, refereeId);
  }

  throw new HttpError(403, 'This role cannot save reports.');
};

const deleteReport = async (admin, currentUser, nominationId, refereeId) => {
  if (!['Referee', 'Instructor'].includes(currentUser.role)) {
    throw new HttpError(403, 'This role cannot delete reports.');
  }

  if (currentUser.role === 'Referee' && currentUser.id !== refereeId) {
    throw new HttpError(403, 'Referees can delete only their own draft reports.');
  }

  if (currentUser.role === 'Instructor') {
    await requireNominationOwner(admin, nominationId, currentUser.id);
  }

  const report = await loadReportByAuthor(admin, nominationId, refereeId, currentUser.id);
  if (!report) {
    throw new HttpError(404, 'Report not found.');
  }

  if (report.status !== REPORT_STATUS.DRAFT) {
    throw new HttpError(409, 'Only draft reports can be deleted.');
  }

  const { error } = await admin.from('reports').delete().eq('id', report.id);
  if (error) {
    throw new HttpError(500, 'Failed to delete report.');
  }
};

const getRankingDashboard = async (admin, currentUser) => {
  const rankingState = await buildRankingState(admin);

  if (currentUser.role === 'Referee') {
    return {
      leaderboard: rankingState.leaderboard,
      history: buildRankingHistory(currentUser.id, rankingState),
      currentUserItem: rankingState.leaderboard.find((item) => item.refereeId === currentUser.id) || null,
      performanceProfile: rankingState.performanceProfiles.get(currentUser.id) || null,
    };
  }

  if (currentUser.role === 'Instructor') {
    return {
      leaderboard: rankingState.leaderboard,
      history: [],
      currentUserItem: null,
      performanceProfile: null,
    };
  }

  return {
    leaderboard: [],
    history: [],
    currentUserItem: null,
    performanceProfile: null,
  };
};

const getRankingAdminData = async (admin, currentUser) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const rankingState = await buildRankingState(admin);

  return {
    leaderboard: rankingState.leaderboard,
    evaluations: rankingState.evaluations,
    performanceProfiles: Array.from(rankingState.performanceProfiles.values()),
    referees: rankingState.referees.map((referee) => ({
      id: referee.id,
      fullName: referee.full_name,
    })),
  };
};

const createRankingEvaluation = async (admin, currentUser, body) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  await requireReferees(admin, [body.refereeId]);

  const normalizedScore = Number(body.score);
  if (![-1, 0, 1].includes(normalizedScore)) {
    throw new HttpError(400, 'Ranking score must be -1, 0 or 1.');
  }

  const gameCode = String(body.gameCode || '').trim();
  const evaluationDate = String(body.evaluationDate || '').trim();

  if (!gameCode || !evaluationDate) {
    throw new HttpError(400, 'Game number and evaluation date are required.');
  }

  const { error } = await admin.from('ranking_evaluations').insert({
    referee_id: body.refereeId,
    game_code: gameCode,
    evaluation_date: evaluationDate,
    score: normalizedScore,
    note: String(body.note || '').trim(),
    created_by: currentUser.id,
  });

  if (error) {
    throw new HttpError(500, 'Failed to save ranking evaluation.');
  }
};

const saveRankingPerformance = async (admin, currentUser, body) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  await requireReferees(admin, [body.refereeId]);

  const values = [
    Number(body.physicalFitness),
    Number(body.mechanics),
    Number(body.iot),
    Number(body.criteriaScore),
    Number(body.teamworkScore),
    Number(body.gameControl),
    Number(body.newPhilosophy),
    Number(body.communication),
  ];

  if (values.some((value) => ![-1, 0, 1].includes(value))) {
    throw new HttpError(400, 'Performance values must be -1, 0 or 1.');
  }

  const { error } = await admin.from('ranking_performance').upsert(
    {
      referee_id: body.refereeId,
      physical_fitness: values[0],
      mechanics: values[1],
      iot: values[2],
      criteria_score: values[3],
      teamwork_score: values[4],
      game_control: values[5],
      new_philosophy: values[6],
      communication: values[7],
      updated_by: currentUser.id,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'referee_id',
    },
  );

  if (error) {
    throw new HttpError(500, 'Failed to save performance profile.');
  }
};

const registerUser = async (admin, body) => {
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const fullName = String(body.fullName || '').trim();
  const role = body.role;

  if (!email || !password || !fullName) {
    throw new HttpError(400, 'Fill in full name, e-mail and password.');
  }

  if (!isStrongEnoughPassword(password)) {
    throw new HttpError(400, 'Password must be at least 10 characters and include letters and numbers.');
  }

  if (!ROLE_OPTIONS.includes(role)) {
    throw new HttpError(400, 'Choose a valid role.');
  }

  const allowedAccess = await loadAllowedAccessByEmail(admin, email);
  if (!allowedAccess) {
    throw new HttpError(403, 'Registration is allowed only for e-mails from the allowed list.');
  }

  if (allowedAccess.allowed_role && allowedAccess.allowed_role !== role) {
    throw new HttpError(403, `This e-mail is approved only for the ${allowedAccess.allowed_role} role.`);
  }

  const existingProfile = await loadProfileByEmail(admin, email);
  if (existingProfile) {
    throw new HttpError(409, 'A user with this e-mail already exists.');
  }

  const licenseNumber = await getNextLicenseNumber(admin, role);
  const authResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  });

  if (authResult.error || !authResult.data.user) {
    throw new HttpError(409, authResult.error?.message || 'Failed to create auth user.');
  }

  const authUser = authResult.data.user;
  const insertProfile = await admin.from('profiles').insert({
    id: authUser.id,
    email,
    full_name: fullName,
    role,
    photo_url: DEFAULT_PHOTO_URL,
    license_number: licenseNumber,
    allowed_access_id: allowedAccess.id,
  });

  if (insertProfile.error) {
    await admin.auth.admin.deleteUser(authUser.id);
    throw new HttpError(500, 'Failed to create user profile.');
  }

  return mapUser({
    id: authUser.id,
    email,
    full_name: fullName,
    role,
    photo_url: DEFAULT_PHOTO_URL,
    license_number: licenseNumber,
  });
};

const routeRequest = async (event) => {
  const { admin } = createClients();
  const method = event.httpMethod.toUpperCase();
  const path = getApiPath(event);
  const body = ['POST', 'PATCH', 'PUT'].includes(method) ? parseJsonBody(event) : {};

  if (method === 'GET' && path === '/health') {
    return json(200, { status: 'ok' });
  }

  if (method === 'GET' && path === '/auth/roles') {
    return json(200, { roles: ROLE_OPTIONS });
  }

  if (method === 'POST' && path === '/auth/register') {
    const user = await registerUser(admin, body);
    return json(201, {
      message: 'Registration completed.',
      user,
    });
  }

  if (method === 'POST' && path === '/ai/tips') {
    return json(200, {
      text: await generateAiTips(String(body.category || 'Referee')),
    });
  }

  if (method === 'POST' && path === '/ai/summary') {
    return json(200, {
      text: await generateAiSummary(Number(body.reportsCount || 0), Number(body.avgScore || 0)),
    });
  }

  if (method === 'POST' && path === '/ai/logo') {
    return json(200, {
      imageUrl: await generateAiLogo(),
    });
  }

  const currentUser = await getCurrentUser(admin, event);

  if (method === 'GET' && path === '/auth/me') {
    return json(200, {
      user: mapUser(currentUser),
    });
  }

  if (method === 'GET' && path === '/referees') {
    return json(200, { referees: await listReferees(admin, currentUser) });
  }

  if (method === 'GET' && path === '/members') {
    return json(200, { members: await listMembers(admin, currentUser) });
  }

  const memberMatch = path.match(/^\/members\/([^/]+)$/);
  if (method === 'PATCH' && memberMatch) {
    const member = await updateMemberProfile(admin, currentUser, memberMatch[1], body.fullName, body.photoUrl);
    return json(200, { message: 'Member updated.', member });
  }

  if (method === 'DELETE' && memberMatch) {
    await deleteMember(admin, currentUser, memberMatch[1]);
    return json(200, { message: 'Member deleted.' });
  }

  if (method === 'GET' && path === '/access') {
    return json(200, { accessList: await listAllowedAccess(admin, currentUser) });
  }

  if (method === 'POST' && path === '/access') {
    const access = await addAllowedAccess(admin, currentUser, body.email, body.role);
    return json(201, { message: 'Access added.', access });
  }

  const accessMatch = path.match(/^\/access\/([^/]+)$/);
  if (method === 'DELETE' && accessMatch) {
    await deleteAllowedAccess(admin, currentUser, accessMatch[1]);
    return json(200, { message: 'Access deleted.' });
  }

  if (method === 'POST' && path === '/nominations') {
    const nomination = await createNomination(admin, currentUser, body);
    return json(201, { message: 'Nomination created.', nomination });
  }

  const deleteNominationMatch = path.match(/^\/nominations\/([^/]+)$/);
  if (method === 'DELETE' && deleteNominationMatch) {
    await deleteNomination(admin, currentUser, deleteNominationMatch[1]);
    return json(200, { message: 'Nomination deleted.' });
  }

  if (method === 'GET' && path === `/nominations/instructor/${currentUser.id}`) {
    return json(200, { nominations: await getInstructorNominationsData(admin, currentUser.id) });
  }

  if (method === 'GET' && path === `/nominations/referee/${currentUser.id}`) {
    return json(200, { nominations: await getRefereeAssignmentsData(admin, currentUser.id) });
  }

  const replaceNominationMatch = path.match(/^\/nominations\/([^/]+)\/slots\/([^/]+)$/);
  if (method === 'PATCH' && replaceNominationMatch) {
    const nomination = await replaceNominationReferee(
      admin,
      currentUser,
      replaceNominationMatch[1],
      Number(replaceNominationMatch[2]),
      String(body.refereeId || ''),
    );
    return json(200, { message: 'Referee replaced.', nomination });
  }

  const nominationResponseMatch = path.match(/^\/nominations\/([^/]+)\/respond$/);
  if (method === 'POST' && nominationResponseMatch) {
    const nomination = await respondToNomination(admin, currentUser, nominationResponseMatch[1], body.response);
    return json(200, { message: 'Response saved.', nomination });
  }

  if (method === 'GET' && path === '/reports') {
    return json(200, { reports: await listReportItems(admin, currentUser) });
  }

  const reportMatch = path.match(/^\/reports\/([^/]+)\/([^/]+)$/);
  if (method === 'GET' && reportMatch) {
    const report = await getReportDetail(admin, currentUser, reportMatch[1], reportMatch[2]);
    return json(200, { report });
  }

  if (method === 'POST' && reportMatch) {
    const report = await saveReport(admin, currentUser, reportMatch[1], reportMatch[2], body);
    return json(200, { message: 'Report saved.', report });
  }

  if (method === 'DELETE' && reportMatch) {
    await deleteReport(admin, currentUser, reportMatch[1], reportMatch[2]);
    return json(200, { message: 'Report deleted.' });
  }

  if (method === 'GET' && path === '/rankings') {
    return json(200, await getRankingDashboard(admin, currentUser));
  }

  if (method === 'GET' && path === '/rankings/admin') {
    return json(200, await getRankingAdminData(admin, currentUser));
  }

  if (method === 'POST' && path === '/rankings/evaluations') {
    await createRankingEvaluation(admin, currentUser, body);
    return json(201, { message: 'Ranking evaluation saved.' });
  }

  if (method === 'POST' && path === '/rankings/performance') {
    await saveRankingPerformance(admin, currentUser, body);
    return json(200, { message: 'Performance profile saved.' });
  }

  return json(404, { message: 'Route not found.' });
};

export const handler = async (event) => {
  try {
    return await routeRequest(event);
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.status, { message: error.message });
    }

    console.error(error);
    return json(500, { message: 'Internal server error.' });
  }
};
