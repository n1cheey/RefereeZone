import { createClient } from '@supabase/supabase-js';

const DEFAULT_PHOTO_URL = 'https://picsum.photos/seed/referee/300/300';
const ROLE_OPTIONS = ['Instructor', 'TO Supervisor', 'TO', 'Referee', 'Staff'];
const LEGACY_ROLE_ALIASES = {
  Stuff: 'Staff',
  Table: 'TO',
};
const ASSIGNMENT_STATUS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};
const ASSIGNMENT_PENDING_AUTO_DECLINE_MS = 2 * 24 * 60 * 60 * 1000;
const REPORT_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
};
const REPORT_MODE = {
  STANDARD: 'standard',
  TO: 'to',
  TEST_TO: 'test_to',
};
const TEST_REPORT_TO_TABLE = 'test_report_tos';
const REPORT_DEADLINE_EXTENSION_MS = 24 * 60 * 60 * 1000;
const REPORT_DEADLINE_BASE_MS = 48 * 60 * 60 * 1000;
const ANNOUNCEMENT_TTL_MS = 24 * 60 * 60 * 1000;
const ANNOUNCEMENT_AUDIENCE = {
  REFEREE: 'Referee',
  TO: 'TO',
};
const ROLE_PREFIX = {
  Instructor: 'INS',
  'TO Supervisor': 'TOS',
  TO: 'TO',
  Referee: 'REF',
  Staff: 'STF',
};
const BAKU_TIMEZONE = 'Asia/Baku';
const BAKU_OFFSET = '+04:00';
let googleGenAiModulePromise = null;
const CURRENT_USER_CACHE_TTL_MS = 30000;
const currentUserCache = new Map();
const currentUserRequestCache = new Map();

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

const binary = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...headers,
  },
  body: Buffer.from(body).toString('base64'),
  isBase64Encoded: true,
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeRole = (role) => LEGACY_ROLE_ALIASES[String(role || '').trim()] || String(role || '').trim();
const toStorageRole = (role) => (normalizeRole(role) === 'Staff' ? 'Stuff' : normalizeRole(role));
const hasRole = (role, expectedRole) => normalizeRole(role) === expectedRole;
const normalizeProfileRow = (profile) => ({
  ...profile,
  role: normalizeRole(profile.role),
});
const normalizeReportMode = (mode) => {
  if (mode === REPORT_MODE.TEST_TO) {
    return REPORT_MODE.TEST_TO;
  }

  if (mode === REPORT_MODE.TO) {
    return REPORT_MODE.TO;
  }

  return REPORT_MODE.STANDARD;
};
const normalizeVisibleToRefereeIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
};
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
  const normalized = sourcePath.replace(/^\/api/, '');

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

const getTeyinatServiceUrl = () =>
  String(process.env.TEYINAT_API_URL || process.env.VITE_TEYINAT_API_URL || 'https://refereezone.onrender.com')
    .trim()
    .replace(/\/+$/, '');

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

const mapOfficialDirectoryItem = (row) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  licenseNumber: row.license_number || 'Pending',
  role: normalizeRole(row.role),
});

const getNominationSlotLabel = (slotNumber) => {
  if (slotNumber === 1) {
    return 'Referee';
  }

  if (slotNumber === 2) {
    return 'Umpire 1';
  }

  if (slotNumber === 3) {
    return 'Umpire 2';
  }

  return `Official ${slotNumber}`;
};

const getTOAssignmentLabel = (slotNumber) => {
  if (slotNumber === 1) {
    return 'Scorer';
  }

  if (slotNumber === 2) {
    return 'Assistant Scorer';
  }

  if (slotNumber === 3) {
    return 'Timer';
  }

  if (slotNumber === 4) {
    return '24sec Operator';
  }

  return `TO ${slotNumber}`;
};

const sortByMatchAsc = (left, right) => {
  const leftTime = createMatchDateTime(left.matchDate, left.matchTime)?.getTime() ?? 0;
  const rightTime = createMatchDateTime(right.matchDate, right.matchTime)?.getTime() ?? 0;
  return leftTime - rightTime;
};

const sortByMatchDesc = (left, right) => {
  const leftTime = createMatchDateTime(left.matchDate, left.matchTime)?.getTime() ?? 0;
  const rightTime = createMatchDateTime(right.matchDate, right.matchTime)?.getTime() ?? 0;
  return rightTime - leftTime;
};

const formatDeadline = (deadline) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: BAKU_TIMEZONE,
  }).format(deadline);

const createAssignmentAutoDeclineDate = (createdAt) => {
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return null;
  }

  return new Date(createdDate.getTime() + ASSIGNMENT_PENDING_AUTO_DECLINE_MS);
};

const normalizeMatchTime = (matchTime) => {
  const trimmed = String(matchTime || '').trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
};

const createMatchDateTime = (matchDate, matchTime) => {
  const candidate = new Date(`${matchDate}T${normalizeMatchTime(matchTime)}${BAKU_OFFSET}`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const createDeadlineDate = (matchDate, matchTime) => {
  const deadline = new Date(`${matchDate}T${normalizeMatchTime(matchTime)}${BAKU_OFFSET}`);
  return Number.isNaN(deadline.getTime()) ? null : new Date(deadline.getTime() + REPORT_DEADLINE_BASE_MS);
};

const isYoutubeUrl = (value) => {
  if (!value) {
    return true;
  }

  try {
    const parsedUrl = new URL(String(value).trim());
    return parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be');
  } catch {
    return false;
  }
};

const isGoogleDriveUrl = (value) => {
  if (!value) {
    return true;
  }

  try {
    const parsedUrl = new URL(String(value).trim());
    return parsedUrl.hostname.includes('drive.google.com') || parsedUrl.hostname.includes('docs.google.com');
  } catch {
    return false;
  }
};

const getReportDeadlineDate = (assignment) => {
  const baseDeadline = createDeadlineDate(assignment.matchDate, assignment.matchTime);

  if (assignment.reportDeadlineAt) {
    const customDeadline = new Date(assignment.reportDeadlineAt);
    if (!Number.isNaN(customDeadline.getTime())) {
      if (baseDeadline && customDeadline.getTime() < baseDeadline.getTime()) {
        return baseDeadline;
      }

      return customDeadline;
    }
  }

  return baseDeadline;
};

const getDeadlineMessage = (assignment) => {
  const deadline = getReportDeadlineDate(assignment);
  if (!deadline) {
    return 'Report deadline could not be calculated.';
  }

  return `Report deadline expired on ${formatDeadline(deadline)} (${BAKU_TIMEZONE}).`;
};

const isDeadlineExceeded = (assignment) => {
  const deadline = getReportDeadlineDate(assignment);
  return Boolean(deadline && Date.now() > deadline.getTime());
};

const mapUser = (profile) => ({
  id: profile.id,
  email: profile.email,
  fullName: profile.full_name,
  photoUrl: profile.photo_url || DEFAULT_PHOTO_URL,
  licenseNumber: profile.license_number || 'Pending',
  role: normalizeRole(profile.role),
  category: normalizeRole(profile.role),
});

const mapAllowedAccess = (item) => ({
  id: item.id,
  email: item.email,
  displayName: item.display_name || '',
  licenseNumber: item.license_number || 'Pending',
  role: normalizeRole(item.allowed_role),
});

const mapAnnouncement = (announcement, creatorName = '') =>
  announcement
    ? {
        id: announcement.id,
        audienceRole: announcement.audience_role,
        message: announcement.message || '',
        messageAz: announcement.message_az || announcement.message || '',
        messageEn: announcement.message_en || announcement.message || '',
        messageRu: announcement.message_ru || announcement.message || '',
        createdAt: announcement.created_at,
        expiresAt: announcement.expires_at,
        createdById: announcement.created_by,
        createdByName: creatorName || 'Unknown user',
      }
    : null;

const mapReplacementNotice = ({ notice, nomination, newRefereeName }) => ({
  id: notice.id,
  nominationId: nomination.id,
  gameCode: nomination.game_code || 'ABL-NEW',
  teams: nomination.teams,
  matchDate: nomination.match_date,
  matchTime: nomination.match_time,
  venue: nomination.venue,
  slotNumber: Number(notice.slot_number),
  newRefereeName,
  createdAt: notice.created_at,
});

const mapReportEntry = (entry) =>
  entry
    ? {
        id: entry.id,
        authorRole: entry.author_role || 'Instructor',
        status: entry.status,
        feedbackScore: Number(entry.score || 0),
        threePO_IOT: entry.three_po_iot || '',
        criteria: entry.criteria || '',
        teamwork: entry.teamwork || '',
        generally: entry.generally || '',
        googleDriveUrl: entry.google_drive_url || '',
        visibleToRefereeIds: entry.referee_id ? [entry.referee_id] : normalizeVisibleToRefereeIds(entry.visible_to_referee_ids),
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
  currentUserRole,
  reportMode = REPORT_MODE.STANDARD,
  googleDriveUrl = null,
  visibleToRefereeIds = [],
}) => {
  const reportSubjectId = assignment.referee_id || assignment.to_id;
  const deadlineContext = {
    matchDate: nomination.match_date,
    matchTime: nomination.match_time,
    reportDeadlineAt: assignment.report_deadline_at || null,
  };
  const deadlineExceeded = isDeadlineExceeded(deadlineContext);

  return {
    nominationId: nomination.id,
    refereeId: reportSubjectId,
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
    deadlineExceeded,
    deadlineMessage: deadlineExceeded ? getDeadlineMessage(deadlineContext) : null,
    reportDeadlineAt:
      assignment.report_deadline_at ||
      createDeadlineDate(nomination.match_date, nomination.match_time)?.toISOString() ||
      null,
    canAddTime: reportMode === REPORT_MODE.STANDARD && currentUserRole === 'Instructor' && deadlineExceeded,
    reportMode,
    googleDriveUrl,
    visibleToRefereeIds: normalizeVisibleToRefereeIds(visibleToRefereeIds),
  };
};

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
  {
    const profile = await maybeSingle(admin.from('profiles').select('*').eq('id', id), 'Failed to load user profile.');
    return profile ? normalizeProfileRow(profile) : null;
  };

const requireProfileById = async (admin, id) =>
  {
    const profile = await requireSingle(
      admin.from('profiles').select('*').eq('id', id),
      'User not found.',
      'Failed to load user profile.',
    );
    return normalizeProfileRow(profile);
  };

const loadProfileByEmail = async (admin, email) =>
  {
    const profile = await maybeSingle(
      admin.from('profiles').select('*').eq('email', normalizeEmail(email)),
      'Failed to load user profile.',
    );
    return profile ? normalizeProfileRow(profile) : null;
  };

const requireRole = async (admin, userId, role) => {
  const profile = await requireProfileById(admin, userId);
  if (!hasRole(profile.role, role)) {
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
  return ensureData(data || [], error, 'Failed to load user profiles.').map(normalizeProfileRow);
};

const getAnnouncementAudienceForRole = (role) => {
  if (role === 'Instructor' || role === 'Referee') {
    return ANNOUNCEMENT_AUDIENCE.REFEREE;
  }

  if (role === 'TO Supervisor' || role === 'TO') {
    return ANNOUNCEMENT_AUDIENCE.TO;
  }

  return null;
};

const purgeExpiredAnnouncements = async (admin) => {
  const { error } = await admin.from('announcements').delete().lte('expires_at', new Date().toISOString());
  if (error) {
    throw new HttpError(500, 'Failed to refresh announcements.');
  }
};

const loadActiveAnnouncementByAudience = async (admin, audienceRole) => {
  if (!audienceRole) {
    return null;
  }

  await purgeExpiredAnnouncements(admin);

  const announcement = await maybeSingle(
    admin
      .from('announcements')
      .select('*')
      .eq('audience_role', audienceRole)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1),
    'Failed to load announcement.',
  );

  if (!announcement) {
    return null;
  }

  const creator = await loadProfileById(admin, announcement.created_by);
  return mapAnnouncement(announcement, creator?.full_name || '');
};

const getCurrentAnnouncementForUser = async (admin, currentUser) =>
  loadActiveAnnouncementByAudience(admin, getAnnouncementAudienceForRole(currentUser.role));

const saveCurrentAnnouncement = async (admin, currentUser, body) => {
  const audienceRole = getAnnouncementAudienceForRole(currentUser.role);
  if (!audienceRole || !['Instructor', 'TO Supervisor'].includes(currentUser.role)) {
    throw new HttpError(403, 'This role cannot manage announcements.');
  }

  const sourceLanguage = ['az', 'en', 'ru'].includes(String(body.sourceLanguage || '').trim())
    ? String(body.sourceLanguage || '').trim()
    : 'en';
  const manualTranslations = {
    az: String(body.messageAz || '').trim(),
    en: String(body.messageEn || '').trim(),
    ru: String(body.messageRu || '').trim(),
  };
  const message =
    String(body.message || '').trim() ||
    manualTranslations[sourceLanguage] ||
    manualTranslations.en ||
    manualTranslations.az ||
    manualTranslations.ru;

  if (!message) {
    throw new HttpError(400, 'Announcement text is required.');
  }

  const generatedTranslations = await generateAnnouncementTranslations(message, sourceLanguage);
  const translations = {
    az: manualTranslations.az || generatedTranslations.az,
    en: manualTranslations.en || generatedTranslations.en,
    ru: manualTranslations.ru || generatedTranslations.ru,
  };

  const { error: deleteError } = await admin.from('announcements').delete().eq('audience_role', audienceRole);
  if (deleteError) {
    throw new HttpError(500, 'Failed to replace the previous announcement.');
  }

  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ANNOUNCEMENT_TTL_MS).toISOString();
  const { error: insertError } = await admin.from('announcements').insert({
    audience_role: audienceRole,
    message,
    message_az: translations.az,
    message_en: translations.en,
    message_ru: translations.ru,
    created_by: currentUser.id,
    expires_at: expiresAt,
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (insertError) {
    throw new HttpError(500, 'Failed to save announcement.');
  }

  const announcement = await loadActiveAnnouncementByAudience(admin, audienceRole);
  if (!announcement) {
    throw new HttpError(500, 'Failed to load saved announcement.');
  }

  return announcement;
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

const listTOAssignmentsByNominationIds = async (admin, nominationIds) => {
  if (!nominationIds.length) {
    return [];
  }

  const { data, error } = await admin
    .from('nomination_tos')
    .select('*')
    .in('nomination_id', nominationIds)
    .order('slot_number', { ascending: true });

  return ensureData(data || [], error, 'Failed to load TO assignments.');
};

const listTOAssignmentsByUserId = async (admin, toId) => {
  const { data, error } = await admin
    .from('nomination_tos')
    .select('*')
    .eq('to_id', toId)
    .order('created_at', { ascending: false });

  return ensureData(data || [], error, 'Failed to load TO assignments.');
};

const groupRowsByNominationId = (rows = []) => {
  const grouped = new Map();

  rows.forEach((row) => {
    const nominationId = row.nomination_id;
    if (!grouped.has(nominationId)) {
      grouped.set(nominationId, []);
    }

    grouped.get(nominationId).push(row);
  });

  return grouped;
};

const buildRefereeCrewFromAssignments = (assignments = [], officialMap) =>
  assignments.map((assignment) => ({
    slotNumber: Number(assignment.slot_number),
    refereeId: assignment.referee_id,
    refereeName: officialMap.get(assignment.referee_id)?.full_name || officialMap.get(assignment.referee_id)?.fullName || 'Unknown referee',
    status: assignment.status,
    respondedAt: assignment.responded_at || null,
  }));

const buildTOCrewFromAssignments = (assignments = [], toMap, options = {}) => {
  const { acceptedOnly = false, requireFullAcceptedCrew = false } = options;

  const filteredAssignments = acceptedOnly
    ? assignments.filter((assignment) => assignment.status === ASSIGNMENT_STATUS.ACCEPTED)
    : assignments;

  if (requireFullAcceptedCrew && filteredAssignments.length !== 4) {
    return [];
  }

  return filteredAssignments.map((assignment) => ({
    slotNumber: Number(assignment.slot_number),
    toId: assignment.to_id,
    toName: toMap.get(assignment.to_id)?.full_name || toMap.get(assignment.to_id)?.fullName || 'Unknown TO',
    status: assignment.status || ASSIGNMENT_STATUS.PENDING,
    respondedAt: assignment.responded_at || null,
  }));
};

const buildTOCrew = (toAssignments, nominationId, toMap, options = {}) => {
  const nominationAssignments = toAssignments.filter((assignment) => assignment.nomination_id === nominationId);
  return buildTOCrewFromAssignments(nominationAssignments, toMap, options);
};

const expirePendingAssignments = async (admin, nominationIds = []) => {
  const scopedNominationIds = [...new Set((nominationIds || []).filter(Boolean))];
  if (!scopedNominationIds.length) {
    return;
  }

  const staleNominationsQuery = admin
    .from('nominations')
    .select('id')
    .lte('created_at', new Date(Date.now() - ASSIGNMENT_PENDING_AUTO_DECLINE_MS).toISOString());

  if (scopedNominationIds.length) {
    staleNominationsQuery.in('id', scopedNominationIds);
  }

  const { data: staleNominationRows, error: staleNominationsError } = await staleNominationsQuery;
  const staleNominations = ensureData(
    staleNominationRows || [],
    staleNominationsError,
    'Failed to validate nomination response window.',
  );

  const staleNominationIds = staleNominations.map((nomination) => nomination.id);
  if (!staleNominationIds.length) {
    return;
  }

  const { data: staleAssignments, error: staleAssignmentsError } = await admin
    .from('nomination_referees')
    .select('id')
    .in('nomination_id', staleNominationIds)
    .eq('status', ASSIGNMENT_STATUS.PENDING);

  const assignmentsToExpire = ensureData(
    staleAssignments || [],
    staleAssignmentsError,
    'Failed to validate nomination response window.',
  );

  if (!assignmentsToExpire.length) {
    return;
  }

  const { error: updateError } = await admin
    .from('nomination_referees')
    .update({
      status: ASSIGNMENT_STATUS.DECLINED,
      responded_at: new Date().toISOString(),
    })
    .in('nomination_id', staleNominationIds)
    .eq('status', ASSIGNMENT_STATUS.PENDING);

  if (updateError) {
    throw new HttpError(500, 'Failed to expire pending nominations.');
  }
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

const loadTestReportsForPairs = async (admin, pairs) => {
  if (!pairs.length) {
    return [];
  }

  const nominationIds = [...new Set(pairs.map((pair) => pair.nominationId))];
  const refereeIds = [...new Set(pairs.map((pair) => pair.refereeId))];
  const { data, error } = await admin
    .from(TEST_REPORT_TO_TABLE)
    .select('*')
    .in('nomination_id', nominationIds)
    .in('referee_id', refereeIds);

  const rows = ensureData(data || [], error, 'Failed to load test reports.');
  const pairSet = new Set(pairs.map((pair) => `${pair.nominationId}:${pair.refereeId}`));
  return rows.filter((row) => pairSet.has(`${row.nomination_id}:${row.referee_id}`));
};

const groupReportsByPairKey = (reports = []) => {
  const grouped = new Map();

  reports.forEach((report) => {
    const key = `${report.nomination_id}:${report.referee_id}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(report);
  });

  return grouped;
};

const loadTestReportByAuthor = async (admin, nominationId, refereeId, authorId) =>
  maybeSingle(
    admin
      .from(TEST_REPORT_TO_TABLE)
      .select('*')
      .eq('nomination_id', nominationId)
      .eq('referee_id', refereeId)
      .eq('author_id', authorId),
    'Failed to load test report.',
  );

const loadVisibleTestReportForReferee = async (admin, nominationId, refereeId, viewerRefereeId) => {
  const report = await maybeSingle(
    admin
      .from(TEST_REPORT_TO_TABLE)
      .select('*')
      .eq('nomination_id', nominationId)
      .eq('referee_id', refereeId)
      .eq('status', REPORT_STATUS.REVIEWED),
    'Failed to load test report.',
  );

  if (!report) {
    return null;
  }

  return normalizeVisibleToRefereeIds(report.visible_to_referee_ids).includes(viewerRefereeId) ? report : null;
};

const loadManualTestReportTOById = async (admin, reportId) =>
  requireSingle(
    admin.from(TEST_REPORT_TO_TABLE).select('*').eq('id', reportId),
    'Report Test TO not found.',
    'Failed to load Report Test TO.',
  );

const buildManualTestReportTOItem = ({ report, refereeName }) => ({
  nominationId: report.id,
  refereeId: report.referee_id,
  gameCode: report.game_code || 'NEW',
  teams: report.teams || '',
  matchDate: report.match_date || '',
  matchTime: report.match_time || '',
  venue: report.venue || '',
  refereeName,
  slotNumber: 0,
  refereeReportStatus: null,
  instructorReportStatus: report.status || null,
  reviewScore: report.score === null || report.score === undefined ? null : Number(report.score),
  deadlineExceeded: false,
  deadlineMessage: null,
  reportDeadlineAt: null,
  canAddTime: false,
  reportMode: REPORT_MODE.TEST_TO,
  googleDriveUrl: report.google_drive_url || null,
  visibleToRefereeIds: [report.referee_id],
});

const requireAssignment = async (admin, nominationId, refereeId) => {
  await expirePendingAssignments(admin, [nominationId]);

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
    reportDeadlineAt: assignmentRow.report_deadline_at || null,
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

const requireTOAssignment = async (admin, nominationId, toId) => {
  const assignmentRow = await requireSingle(
    admin
      .from('nomination_tos')
      .select('*')
      .eq('nomination_id', nominationId)
      .eq('to_id', toId),
    'TO assignment not found.',
    'Failed to load TO assignment.',
  );

  const [nomination, toOfficial] = await Promise.all([
    requireSingle(
      admin.from('nominations').select('*').eq('id', nominationId),
      'Nomination not found.',
      'Failed to load nomination.',
    ),
    requireSingle(
      admin.from('profiles').select('*').eq('id', toId),
      'User not found.',
      'Failed to load user profile.',
    ),
  ]);

  return {
    assignmentId: assignmentRow.id,
    slotNumber: Number(assignmentRow.slot_number),
    assignmentStatus: assignmentRow.status,
    reportDeadlineAt: null,
    nominationId: nomination.id,
    createdBy: nomination.created_by,
    assignedBy: assignmentRow.assigned_by,
    gameCode: nomination.game_code || 'ABL-NEW',
    teams: nomination.teams,
    matchDate: nomination.match_date,
    matchTime: nomination.match_time,
    venue: nomination.venue,
    refereeName: toOfficial.full_name,
  };
};

const requireVisibleTestReportViewerAssignment = async (admin, nominationId, viewerRefereeId) => {
  await expirePendingAssignments(admin, [nominationId]);

  const assignment = await requireSingle(
    admin
      .from('nomination_referees')
      .select('*')
      .eq('nomination_id', nominationId)
      .eq('referee_id', viewerRefereeId),
    'Assignment not found.',
    'Failed to load assignment.',
  );

  if (assignment.status === ASSIGNMENT_STATUS.DECLINED) {
    throw new HttpError(403, 'Declined assignments do not have access to Report Test TO.');
  }

  return assignment;
};

const listTestReportVisibilityOptions = async (admin, nominationId) => {
  const assignments = (await listAssignmentsByNominationIds(admin, [nominationId])).filter(
    (assignment) => assignment.nomination_id === nominationId && assignment.status !== ASSIGNMENT_STATUS.DECLINED,
  );

  if (!assignments.length) {
    return [];
  }

  const referees = await listProfilesByIds(
    admin,
    [...new Set(assignments.map((assignment) => assignment.referee_id))],
  );
  const refereeMap = new Map(referees.map((referee) => [referee.id, referee]));

  return assignments.map((assignment) => ({
    id: assignment.referee_id,
    fullName: refereeMap.get(assignment.referee_id)?.full_name || 'Unknown referee',
    slotNumber: Number(assignment.slot_number),
  }));
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
    if (!hasRole(row.role, 'Referee')) {
      throw new HttpError(400, 'Only users with role Referee can be assigned.');
    }
  });

  return rows;
};

const requireTOUsers = async (admin, toIds) => {
  const rows = await listProfilesByIds(admin, toIds);

  if (rows.length !== toIds.length) {
    throw new HttpError(404, 'One or more TO users were not found.');
  }

  rows.forEach((row) => {
    if (!hasRole(row.role, 'TO')) {
      throw new HttpError(400, 'Only users with role TO can be assigned to TO crew.');
    }
  });

  return rows;
};

const listReplacementNotices = async (admin, refereeId) => {
  const { data, error } = await admin
    .from('replacement_notices')
    .select('*')
    .eq('replaced_referee_id', refereeId)
    .order('created_at', { ascending: false })
    .limit(20);
  const notices = ensureData(data || [], error, 'Failed to load replacement notices.');

  if (!notices.length) {
    return [];
  }

  const nominations = await listNominationsByIds(
    admin,
    [...new Set(notices.map((notice) => notice.nomination_id))],
  );
  const newReferees = await listProfilesByIds(
    admin,
    [...new Set(notices.map((notice) => notice.new_referee_id))],
  );
  const nominationMap = new Map(nominations.map((nomination) => [nomination.id, nomination]));
  const refereeMap = new Map(newReferees.map((referee) => [referee.id, referee]));

  return notices
    .map((notice) => {
      const nomination = nominationMap.get(notice.nomination_id);
      if (!nomination) {
        return null;
      }

      return mapReplacementNotice({
        notice,
        nomination,
        newRefereeName: refereeMap.get(notice.new_referee_id)?.full_name || 'Unknown referee',
      });
    })
    .filter(Boolean);
};

const requireAssignableOfficials = async (admin, refereeIds) => {
  const rows = await listProfilesByIds(admin, refereeIds);

  if (rows.length !== refereeIds.length) {
    throw new HttpError(404, 'One or more officials were not found.');
  }

  rows.forEach((row) => {
    if (!['Referee', 'Instructor'].includes(normalizeRole(row.role))) {
      throw new HttpError(400, 'Only Referee and Instructor users can be assigned.');
    }
  });

  return rows;
};

const ensureDistinctTOs = (toIds) => {
  const normalized = (toIds || []).map((toId) => String(toId || '').trim()).filter(Boolean);
  const unique = new Set(normalized);

  if (normalized.length !== 4 || unique.size !== 4) {
    throw new HttpError(400, 'Select exactly 4 different TO users.');
  }

  return normalized;
};

const getNextLicenseNumber = async (admin, role) => {
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', toStorageRole(role));

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

  const cachedUser = currentUserCache.get(token);
  if (cachedUser && cachedUser.expiresAt > Date.now()) {
    return cachedUser.profile;
  }

  const existingRequest = currentUserRequestCache.get(token);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) {
      throw new HttpError(401, 'Invalid or expired session.');
    }

    const profile = await loadProfileById(admin, data.user.id);
    if (!profile) {
      throw new HttpError(401, 'Profile is missing for the authenticated user.');
    }

    currentUserCache.set(token, {
      expiresAt: Date.now() + CURRENT_USER_CACHE_TTL_MS,
      profile,
    });

    return profile;
  })();

  currentUserRequestCache.set(token, request);

  try {
    return await request;
  } finally {
    currentUserRequestCache.delete(token);
  }
};

const recordUserActivity = async (admin, currentUser, event) => {
  try {
    const userAgent =
      event.headers?.['user-agent'] ||
      event.headers?.['User-Agent'] ||
      event.multiValueHeaders?.['user-agent']?.[0] ||
      event.multiValueHeaders?.['User-Agent']?.[0] ||
      '';

    const { error } = await admin.from('user_activity').upsert(
      {
        user_id: currentUser.id,
        last_seen_at: new Date().toISOString(),
        user_agent: String(userAgent || ''),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      },
    );

    if (error) {
      console.error('Failed to record user activity', error);
    }
  } catch (error) {
    console.error('Failed to record user activity', error);
  }
};

const listRecentActivity = async (admin, currentUser) => {
  await requireRole(admin, currentUser.id, 'Instructor');

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from('user_activity')
    .select('user_id, last_seen_at')
    .gte('last_seen_at', cutoff)
    .order('last_seen_at', { ascending: false });

  const activityRows = ensureData(data || [], error, 'Failed to load activity.');
  if (!activityRows.length) {
    return [];
  }

  const profiles = await listProfilesByIds(
    admin,
    activityRows.map((item) => item.user_id),
  );
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return activityRows
    .map((item) => {
      const profile = profileMap.get(item.user_id);
      if (!profile) {
        return null;
      }

      return {
        userId: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        role: normalizeRole(profile.role),
        lastSeenAt: item.last_seen_at,
      };
    })
    .filter(Boolean);
};

const getGeminiClient = async () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new HttpError(500, 'GEMINI_API_KEY is missing.');
  }

  googleGenAiModulePromise ||= import('@google/genai');
  const { GoogleGenAI } = await googleGenAiModulePromise;
  return new GoogleGenAI({ apiKey });
};

const generateAiTips = async (category) => {
  const fallback = 'Keep focusing on positioning and clear communication with the crew.';

  try {
    const ai = await getGeminiClient();
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
    const ai = await getGeminiClient();
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

const extractJsonObject = (text) => {
  const source = String(text || '').trim();
  if (!source) {
    return null;
  }

  try {
    return JSON.parse(source);
  } catch {
    const match = source.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const generateAnnouncementTranslations = async (message, sourceLanguage = 'en') => {
  const normalizedMessage = String(message || '').trim();
  const normalizedSourceLanguage = ['az', 'en', 'ru'].includes(String(sourceLanguage)) ? String(sourceLanguage) : 'en';
  const fallback = {
    az: normalizedMessage,
    en: normalizedMessage,
    ru: normalizedMessage,
  };

  if (!normalizedMessage) {
    return fallback;
  }

  try {
    const ai = await getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents:
        `Translate the following announcement into Azerbaijani (az), English (en), and Russian (ru). ` +
        `Preserve meaning, tone, line breaks, and keep it concise. ` +
        `The source language is ${normalizedSourceLanguage}. ` +
        `Return only valid JSON like {"az":"...","en":"...","ru":"..."}. ` +
        `Announcement:\n${normalizedMessage}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const parsed = extractJsonObject(response.text);
    if (!parsed || typeof parsed !== 'object') {
      return fallback;
    }

    return {
      az: String(parsed.az || fallback.az).trim() || fallback.az,
      en: String(parsed.en || fallback.en).trim() || fallback.en,
      ru: String(parsed.ru || fallback.ru).trim() || fallback.ru,
    };
  } catch {
    return fallback;
  }
};

const generateAiLogo = async () => {
  try {
    const ai = await getGeminiClient();
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
  const currentUser = await requireProfileById(admin, instructorId);
  if (!['Instructor', 'Staff', 'TO Supervisor'].includes(currentUser.role)) {
    throw new HttpError(403, 'Only Instructor, TO Supervisor and Staff accounts can load nominations.');
  }

  const { data, error } = await admin
    .from('nominations')
    .select('*')
    .order('match_date', { ascending: false })
    .order('match_time', { ascending: false });

  const nominations = ensureData(data || [], error, 'Failed to load instructor nominations.');
  if (!nominations.length) {
    return [];
  }

  const nominationIds = nominations.map((nomination) => nomination.id);
  await expirePendingAssignments(admin, nominationIds);
  const assignments = await listAssignmentsByNominationIds(admin, nominationIds);
  const toAssignments = await listTOAssignmentsByNominationIds(admin, nominationIds);
  const referees = await listProfilesByIds(
    admin,
    [...new Set(assignments.map((assignment) => assignment.referee_id))],
  );
  const toUsers = await listProfilesByIds(
    admin,
    [...new Set(toAssignments.map((assignment) => assignment.to_id))],
  );
  const creators = await listProfilesByIds(
    admin,
    [...new Set(nominations.map((nomination) => nomination.created_by))],
  );
  const refereeMap = new Map(referees.map((referee) => [referee.id, referee]));
  const toMap = new Map(toUsers.map((item) => [item.id, item]));
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));
  const assignmentsByNominationId = groupRowsByNominationId(assignments);
  const toAssignmentsByNominationId = groupRowsByNominationId(toAssignments);

  return nominations
    .map((nomination) => ({
      id: nomination.id,
      gameCode: nomination.game_code || 'ABL-NEW',
      teams: nomination.teams,
      matchDate: nomination.match_date,
      matchTime: nomination.match_time,
      venue: nomination.venue,
      finalScore: nomination.final_score || null,
      matchVideoUrl: nomination.match_video_url || null,
      matchProtocolUrl: nomination.match_protocol_url || null,
      createdAt: nomination.created_at,
      createdById: nomination.created_by,
      createdByName: creatorMap.get(nomination.created_by)?.full_name || 'Unknown instructor',
      referees: buildRefereeCrewFromAssignments(assignmentsByNominationId.get(nomination.id) || [], refereeMap),
      toCrew: buildTOCrewFromAssignments(toAssignmentsByNominationId.get(nomination.id) || [], toMap),
    }))
    .sort(sortByMatchDesc);
};

const getRefereeAssignmentsData = async (admin, refereeId) => {
  const user = await requireProfileById(admin, refereeId);
  if (!['Referee', 'Instructor', 'TO'].includes(user.role)) {
    throw new HttpError(403, 'Only Referee, Instructor and TO accounts have game assignments.');
  }

  const replacementNotices = user.role === 'TO' ? [] : await listReplacementNotices(admin, refereeId);

  if (user.role === 'TO') {
    const assignments = await listTOAssignmentsByUserId(admin, refereeId);
    const visibleAssignments = assignments.filter((assignment) => assignment.status !== ASSIGNMENT_STATUS.DECLINED);

    if (!visibleAssignments.length) {
      return {
        nominations: [],
        replacementNotices: [],
        activeAnnouncement: await getCurrentAnnouncementForUser(admin, user),
      };
    }

    const nominations = await listNominationsByIds(
      admin,
      [...new Set(visibleAssignments.map((assignment) => assignment.nomination_id))],
    );
    const instructors = await listProfilesByIds(
      admin,
      [...new Set(nominations.map((nomination) => nomination.created_by))],
    );
    const nominationAssignments = await listAssignmentsByNominationIds(
      admin,
      [...new Set(visibleAssignments.map((assignment) => assignment.nomination_id))],
    );
    const toAssignments = await listTOAssignmentsByNominationIds(
      admin,
      [...new Set(visibleAssignments.map((assignment) => assignment.nomination_id))],
    );
    const refereeCrewProfiles = await listProfilesByIds(
      admin,
      [...new Set(nominationAssignments.map((assignment) => assignment.referee_id))],
    );
    const toCrewProfiles = await listProfilesByIds(
      admin,
      [...new Set(toAssignments.map((assignment) => assignment.to_id))],
    );
    const nominationMap = new Map(nominations.map((nomination) => [nomination.id, nomination]));
    const instructorMap = new Map(instructors.map((instructor) => [instructor.id, instructor]));
    const refereeCrewMap = new Map(refereeCrewProfiles.map((item) => [item.id, item]));
    const toCrewMap = new Map(toCrewProfiles.map((item) => [item.id, item]));
    const nominationAssignmentsByNominationId = groupRowsByNominationId(nominationAssignments);
    const toAssignmentsByNominationId = groupRowsByNominationId(toAssignments);

    return {
      nominations: visibleAssignments
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
            finalScore: nomination.final_score || null,
            matchVideoUrl: nomination.match_video_url || null,
            matchProtocolUrl: nomination.match_protocol_url || null,
            slotNumber: Number(assignment.slot_number),
            status: assignment.status || ASSIGNMENT_STATUS.PENDING,
            respondedAt: assignment.responded_at || null,
            autoDeclineAt: null,
            instructorName: instructorMap.get(nomination.created_by)?.full_name || 'Unknown instructor',
            assignmentGroup: 'TO',
            assignmentLabel: getTOAssignmentLabel(Number(assignment.slot_number)),
            crew: buildRefereeCrewFromAssignments(nominationAssignmentsByNominationId.get(nomination.id) || [], refereeCrewMap),
            toCrew: buildTOCrewFromAssignments(toAssignmentsByNominationId.get(nomination.id) || [], toCrewMap),
          };
        })
        .filter(Boolean)
        .sort(sortByMatchDesc),
      replacementNotices: [],
      activeAnnouncement: await getCurrentAnnouncementForUser(admin, user),
    };
  }

  const { data, error } = await admin.from('nomination_referees').select('*').eq('referee_id', refereeId);
  const assignments = ensureData(data || [], error, 'Failed to load referee nominations.');
  await expirePendingAssignments(admin, [...new Set(assignments.map((assignment) => assignment.nomination_id))]);
  const refreshedAssignmentsResponse = await admin.from('nomination_referees').select('*').eq('referee_id', refereeId);
  const refreshedAssignments = ensureData(
    refreshedAssignmentsResponse.data || [],
    refreshedAssignmentsResponse.error,
    'Failed to load referee nominations.',
  );
  const visibleAssignments = refreshedAssignments.filter((assignment) => assignment.status !== ASSIGNMENT_STATUS.DECLINED);

  if (!visibleAssignments.length) {
    return {
      nominations: [],
      replacementNotices,
      activeAnnouncement: await getCurrentAnnouncementForUser(admin, user),
    };
  }

  const nominations = await listNominationsByIds(
    admin,
    [...new Set(visibleAssignments.map((assignment) => assignment.nomination_id))],
  );
  const instructors = await listProfilesByIds(
    admin,
    [...new Set(nominations.map((nomination) => nomination.created_by))],
  );
  const nominationAssignments = await listAssignmentsByNominationIds(
    admin,
    [...new Set(visibleAssignments.map((assignment) => assignment.nomination_id))],
  );
  const toAssignments = await listTOAssignmentsByNominationIds(
    admin,
    [...new Set(visibleAssignments.map((assignment) => assignment.nomination_id))],
  );
  const assignedOfficials = await listProfilesByIds(
    admin,
    [...new Set(nominationAssignments.map((assignment) => assignment.referee_id))],
  );
  const toProfiles = await listProfilesByIds(
    admin,
    [...new Set(toAssignments.map((assignment) => assignment.to_id))],
  );
  const nominationMap = new Map(nominations.map((nomination) => [nomination.id, nomination]));
  const instructorMap = new Map(instructors.map((instructor) => [instructor.id, instructor]));
  const officialMap = new Map(assignedOfficials.map((official) => [official.id, official]));
  const toMap = new Map(toProfiles.map((item) => [item.id, item]));
  const nominationAssignmentsByNominationId = groupRowsByNominationId(nominationAssignments);
  const toAssignmentsByNominationId = groupRowsByNominationId(toAssignments);

  return {
    nominations: visibleAssignments
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
          finalScore: nomination.final_score || null,
          matchVideoUrl: nomination.match_video_url || null,
          matchProtocolUrl: nomination.match_protocol_url || null,
          slotNumber: Number(assignment.slot_number),
          status: assignment.status,
          respondedAt: assignment.responded_at || null,
          autoDeclineAt: createAssignmentAutoDeclineDate(nomination.created_at)?.toISOString() || null,
          instructorName: instructorMap.get(nomination.created_by)?.full_name || 'Unknown instructor',
          assignmentGroup: 'Referee',
          assignmentLabel: getNominationSlotLabel(Number(assignment.slot_number)),
          crew: buildRefereeCrewFromAssignments(nominationAssignmentsByNominationId.get(nomination.id) || [], officialMap),
          toCrew: buildTOCrewFromAssignments(toAssignmentsByNominationId.get(nomination.id) || [], toMap, {
            acceptedOnly: user.role === 'Referee',
            requireFullAcceptedCrew: user.role === 'Referee',
          }),
        };
      })
      .filter(Boolean)
      .sort(sortByMatchDesc),
    replacementNotices,
    activeAnnouncement: await getCurrentAnnouncementForUser(admin, user),
  };
};

const getInstructorDashboardData = async (admin, instructorId) => {
  const currentUser = await requireProfileById(admin, instructorId);
  if (!['Instructor', 'TO Supervisor'].includes(currentUser.role)) {
    throw new HttpError(403, 'Only Instructor and TO Supervisor accounts can load this dashboard.');
  }

  const [
    { data: officialRows, error: officialsError },
    { data: toRows, error: toError },
    { data: nominationRows, error: nominationsError },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, email, license_number, role')
      .in('role', ['Referee', 'Instructor'])
      .order('role', { ascending: true })
      .order('full_name', { ascending: true }),
    admin
      .from('profiles')
      .select('id, full_name, email, license_number, role')
      .eq('role', 'TO')
      .order('full_name', { ascending: true }),
    admin
      .from('nominations')
      .select('*')
      .order('match_date', { ascending: false })
      .order('match_time', { ascending: false }),
  ]);

  const officials = ensureData(officialRows || [], officialsError, 'Failed to load referees.').map(mapOfficialDirectoryItem);
  const toOfficials = ensureData(toRows || [], toError, 'Failed to load TO users.').map(mapOfficialDirectoryItem);
  const officialMap = new Map(officials.map((official) => [official.id, official]));
  const nominationsSource = ensureData(nominationRows || [], nominationsError, 'Failed to load instructor nominations.');

  const nominationIds = nominationsSource.map((nomination) => nomination.id);
  await expirePendingAssignments(admin, nominationIds);
  const nominationAssignments = nominationIds.length ? await listAssignmentsByNominationIds(admin, nominationIds) : [];
  const nominationTOAssignments = nominationIds.length ? await listTOAssignmentsByNominationIds(admin, nominationIds) : [];
  const ownVisibleAssignments = nominationAssignments.filter(
    (assignment) => assignment.referee_id === instructorId && assignment.status !== ASSIGNMENT_STATUS.DECLINED,
  );
  const ownNominationMap = new Map(nominationsSource.map((nomination) => [nomination.id, nomination]));
  const nominationCreators = await listProfilesByIds(
    admin,
    [...new Set(nominationsSource.map((nomination) => nomination.created_by))],
  );
  const creatorMap = new Map(nominationCreators.map((creator) => [creator.id, creator]));
  const toMap = new Map(toOfficials.map((official) => [official.id, official]));
  const nominationAssignmentsByNominationId = groupRowsByNominationId(nominationAssignments);
  const nominationTOAssignmentsByNominationId = groupRowsByNominationId(nominationTOAssignments);

  const nominations = nominationsSource.map((nomination) => ({
    id: nomination.id,
    gameCode: nomination.game_code || 'ABL-NEW',
    teams: nomination.teams,
    matchDate: nomination.match_date,
    matchTime: nomination.match_time,
    venue: nomination.venue,
    finalScore: nomination.final_score || null,
    matchVideoUrl: nomination.match_video_url || null,
    matchProtocolUrl: nomination.match_protocol_url || null,
    createdAt: nomination.created_at,
    createdById: nomination.created_by,
    createdByName: creatorMap.get(nomination.created_by)?.full_name || 'Unknown instructor',
    referees: buildRefereeCrewFromAssignments(nominationAssignmentsByNominationId.get(nomination.id) || [], officialMap),
    toCrew: buildTOCrewFromAssignments(nominationTOAssignmentsByNominationId.get(nomination.id) || [], toMap),
  }));

  const assignments = ownVisibleAssignments
    .map((assignment) => {
      const nomination = ownNominationMap.get(assignment.nomination_id);
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
        finalScore: nomination.final_score || null,
        matchVideoUrl: nomination.match_video_url || null,
        matchProtocolUrl: nomination.match_protocol_url || null,
        slotNumber: Number(assignment.slot_number),
        status: assignment.status,
        respondedAt: assignment.responded_at || null,
        autoDeclineAt: createAssignmentAutoDeclineDate(nomination.created_at)?.toISOString() || null,
        instructorName: officialMap.get(nomination.created_by)?.fullName || currentUser.full_name,
        assignmentGroup: 'Referee',
        assignmentLabel: getNominationSlotLabel(Number(assignment.slot_number)),
        crew: buildRefereeCrewFromAssignments(nominationAssignmentsByNominationId.get(nomination.id) || [], officialMap),
        toCrew: buildTOCrewFromAssignments(nominationTOAssignmentsByNominationId.get(nomination.id) || [], toMap),
      };
    })
    .filter(Boolean)
    .sort(sortByMatchDesc);

  return {
    referees: officials,
    toOfficials,
    nominations,
    assignments: currentUser.role === 'Instructor' ? assignments : [],
    replacementNotices: currentUser.role === 'Instructor' ? await listReplacementNotices(admin, instructorId) : [],
    activeAnnouncement: await getCurrentAnnouncementForUser(admin, currentUser),
  };
};

const rankingRefereePerformanceFieldMap = [
  ['physicalFitness', 'physical_fitness'],
  ['mechanics', 'mechanics'],
  ['iot', 'iot'],
  ['criteriaScore', 'criteria_score'],
  ['teamworkScore', 'teamwork_score'],
  ['gameControl', 'game_control'],
  ['newPhilosophy', 'new_philosophy'],
  ['communication', 'communication'],
  ['externalEvaluation', 'external_evaluation'],
];

const rankingTOPerformanceFieldMap = [
  ['criteriaScore', 'criteria_score'],
  ['teamworkScore', 'teamwork_score'],
  ['communication', 'communication'],
  ['externalEvaluation', 'external_evaluation'],
];

const createEmptyRankingPerformanceProfile = (refereeId, refereeName) => ({
  refereeId,
  refereeName,
  physicalFitness: 0,
  mechanics: 0,
  iot: 0,
  criteriaScore: 0,
  teamworkScore: 0,
  gameControl: 0,
  newPhilosophy: 0,
  communication: 0,
  externalEvaluation: 0,
});

const getRankingPerformanceValues = (item, performanceFieldMap = rankingRefereePerformanceFieldMap) =>
  performanceFieldMap.map(([clientKey]) => Number(item?.[clientKey] || 0));

const calculateRankingPerformanceAverage = (item, performanceFieldMap = rankingRefereePerformanceFieldMap) => {
  const values = getRankingPerformanceValues(item, performanceFieldMap);
  if (!values.length) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
};

const compareRankingLeaderboardItems = (left, right) => {
  if (right.performanceAverage !== left.performanceAverage) return right.performanceAverage - left.performanceAverage;
  if (right.overallScore !== left.overallScore) return right.overallScore - left.overallScore;
  if (right.totalGameScore !== left.totalGameScore) return right.totalGameScore - left.totalGameScore;
  return left.refereeName.localeCompare(right.refereeName);
};

const buildRankingState = async (
  admin,
  {
    subjectRole = 'Referee',
    performanceTable = 'ranking_match_performance',
    subjectIdColumn = 'referee_id',
    performanceFieldMap = rankingRefereePerformanceFieldMap,
    notFoundMessage = 'Failed to load referees.',
  } = {},
) => {
  const refereeResponse = await admin
    .from('profiles')
    .select('id, full_name, photo_url')
    .eq('role', toStorageRole(subjectRole))
    .order('full_name', { ascending: true });
  const referees = ensureData(refereeResponse.data || [], refereeResponse.error, notFoundMessage);

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

  const performanceResponse = await admin
    .from(performanceTable)
    .select('*')
    .order('evaluation_date', { ascending: true })
    .order('created_at', { ascending: true });
  const performanceRows = ensureData(
    performanceResponse.data || [],
    performanceResponse.error,
    'Failed to load ranking performance entries.',
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

  const performanceEntries = performanceRows.map((row) => {
    const entry = {
      id: row.id,
      refereeId: row[subjectIdColumn],
      refereeName: refereeNameMap.get(row[subjectIdColumn]) || `Unknown ${subjectRole}`,
      gameCode: row.game_code,
      evaluationDate: row.evaluation_date,
      note: row.note || '',
      physicalFitness: Number(row.physical_fitness || 0),
      mechanics: Number(row.mechanics || 0),
      iot: Number(row.iot || 0),
      criteriaScore: Number(row.criteria_score || 0),
      teamworkScore: Number(row.teamwork_score || 0),
      gameControl: Number(row.game_control || 0),
      newPhilosophy: Number(row.new_philosophy || 0),
      communication: Number(row.communication || 0),
      externalEvaluation: Number(row.external_evaluation || 0),
      matchAverage: 0,
      createdAt: row.created_at || null,
    };

    return {
      ...entry,
      matchAverage: calculateRankingPerformanceAverage(entry, performanceFieldMap),
    };
  });

  const performanceGroups = new Map(referees.map((referee) => [referee.id, []]));
  performanceEntries.forEach((entry) => {
    const group = performanceGroups.get(entry.refereeId) || [];
    group.push(entry);
    performanceGroups.set(entry.refereeId, group);
  });

  const performanceProfiles = new Map(
    referees.map((referee) => {
      const entries = performanceGroups.get(referee.id) || [];
      if (!entries.length) {
        return [referee.id, createEmptyRankingPerformanceProfile(referee.id, referee.full_name)];
      }

      const profile = createEmptyRankingPerformanceProfile(referee.id, referee.full_name);
      performanceFieldMap.forEach(([clientKey]) => {
        const averageValue =
          entries.reduce((sum, entry) => sum + Number(entry[clientKey] || 0), 0) / entries.length;
        profile[clientKey] = Number(averageValue.toFixed(2));
      });

      return [referee.id, profile];
    }),
  );

  const totalGameScores = new Map(
    referees.map((referee) => [referee.id, (performanceGroups.get(referee.id) || []).length]),
  );

  const performanceAverages = new Map(
    referees.map((referee) => {
      const entries = performanceGroups.get(referee.id) || [];
      const averageValue = entries.length
        ? Number((entries.reduce((sum, entry) => sum + entry.matchAverage, 0) / entries.length).toFixed(2))
        : 0;
      return [referee.id, averageValue];
    }),
  );

  const leaderboard = referees
    .map((referee) => {
      const performanceAverage = performanceAverages.get(referee.id) || 0;
      const totalGameScore = totalGameScores.get(referee.id) || 0;

      return {
        refereeId: referee.id,
        refereeName: referee.full_name,
        photoUrl: referee.photo_url || DEFAULT_PHOTO_URL,
        totalGameScore,
        performanceScore: performanceAverage,
        performanceAverage,
        overallScore: performanceAverage,
        rank: 0,
      };
    })
    .sort(compareRankingLeaderboardItems)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  const matchRecords = new Map();
  evaluations.forEach((evaluation) => {
    const key = `${evaluation.refereeId}|${evaluation.evaluationDate}|${evaluation.gameCode}`;
    const currentRecord = matchRecords.get(key) || {
      refereeId: evaluation.refereeId,
      gameCode: evaluation.gameCode,
      evaluationDate: evaluation.evaluationDate,
      score: 0,
      matchAverage: null,
      createdAt: null,
    };

    currentRecord.score += evaluation.score;
    matchRecords.set(key, currentRecord);
  });

  performanceEntries.forEach((entry) => {
    const key = `${entry.refereeId}|${entry.evaluationDate}|${entry.gameCode}`;
    const currentRecord = matchRecords.get(key) || {
      refereeId: entry.refereeId,
      gameCode: entry.gameCode,
      evaluationDate: entry.evaluationDate,
      score: 0,
      matchAverage: null,
      createdAt: null,
    };

    currentRecord.matchAverage = entry.matchAverage;
    currentRecord.createdAt = entry.createdAt || currentRecord.createdAt;
    matchRecords.set(key, currentRecord);
  });

  return {
    referees,
    evaluations,
    performanceProfiles,
    performanceEntries,
    matchRecords: Array.from(matchRecords.values()).sort((left, right) => {
      const dateCompare = String(left.evaluationDate).localeCompare(String(right.evaluationDate));
      if (dateCompare !== 0) {
        return dateCompare;
      }

      const gameCompare = String(left.gameCode).localeCompare(String(right.gameCode));
      if (gameCompare !== 0) {
        return gameCompare;
      }

      return String(left.refereeId).localeCompare(String(right.refereeId));
    }),
    leaderboard,
  };
};

const buildRankingHistory = (targetRefereeId, rankingState) => {
  const targetMatches = rankingState.matchRecords.filter(
    (item) => item.refereeId === targetRefereeId && typeof item.matchAverage === 'number',
  );
  if (!targetMatches.length) {
    return [];
  }

  const runningPerformanceTotals = new Map(rankingState.referees.map((referee) => [referee.id, 0]));
  const runningPerformanceCounts = new Map(rankingState.referees.map((referee) => [referee.id, 0]));
  const history = [];

  rankingState.matchRecords.forEach((matchRecord) => {
    if (typeof matchRecord.matchAverage !== 'number') {
      return;
    }

    runningPerformanceTotals.set(
      matchRecord.refereeId,
      (runningPerformanceTotals.get(matchRecord.refereeId) || 0) + matchRecord.matchAverage,
    );
    runningPerformanceCounts.set(
      matchRecord.refereeId,
      (runningPerformanceCounts.get(matchRecord.refereeId) || 0) + 1,
    );

    const snapshot = rankingState.referees
      .map((referee) => {
        const performanceCount = runningPerformanceCounts.get(referee.id) || 0;
        const performanceAverage = performanceCount
          ? Number(((runningPerformanceTotals.get(referee.id) || 0) / performanceCount).toFixed(2))
          : 0;

        return {
          refereeId: referee.id,
          refereeName: referee.full_name,
          overallScore: performanceAverage,
          totalGameScore: performanceCount,
          performanceAverage,
        };
      })
      .sort(compareRankingLeaderboardItems);

    if (matchRecord.refereeId !== targetRefereeId) {
      return;
    }

    history.push({
      date: matchRecord.evaluationDate,
      gameCode: matchRecord.gameCode,
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

const upsertTestReportTO = async ({
  admin,
  reportId,
  refereeId,
  authorId,
  status,
  gameCode,
  teams,
  matchDate,
  matchTime,
  venue,
  score,
  threePO_IOT,
  criteria,
  teamwork,
  generally,
  googleDriveUrl,
  visibleToRefereeIds,
}) => {
  const payload = {
    id: reportId || undefined,
    referee_id: refereeId,
    author_id: authorId,
    author_role: 'Instructor',
    game_code: gameCode,
    teams,
    match_date: matchDate,
    match_time: matchTime,
    venue,
    status,
    score: clampScore(score),
    three_po_iot: threePO_IOT,
    criteria,
    teamwork,
    generally,
    google_drive_url: googleDriveUrl,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from(TEST_REPORT_TO_TABLE).upsert(payload, {
    onConflict: 'id',
  });

  if (error) {
    throw new HttpError(500, 'Failed to save Report Test TO.');
  }
};

const listReferees = async (admin, currentUser) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, email, license_number, role')
    .in('role', ['Referee', 'Instructor'])
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  return ensureData(data || [], error, 'Failed to load referees.').map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    licenseNumber: row.license_number || 'Pending',
    role: row.role,
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

const updateMemberProfile = async (admin, currentUser, memberId, email, fullName, licenseNumber, photoUrl) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const member = await requireProfileById(admin, memberId);
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = String(fullName || '').trim();
  const trimmedLicenseNumber = String(licenseNumber || '').trim();
  const nextPhotoUrl = String(photoUrl || '').trim();

  if (!normalizedEmail) {
    throw new HttpError(400, 'E-mail is required.');
  }

  if (!trimmedName) {
    throw new HttpError(400, 'Full name is required.');
  }

  if (!trimmedLicenseNumber) {
    throw new HttpError(400, 'License is required.');
  }

  const existingProfile = await loadProfileByEmail(admin, normalizedEmail);
  if (existingProfile && existingProfile.id !== memberId) {
    throw new HttpError(409, 'A user with this e-mail already exists.');
  }

  let nextAllowedAccessId = member.allowed_access_id || null;
  const currentAllowedAccess = member.allowed_access_id ? await requireAllowedAccessById(admin, member.allowed_access_id) : null;

  if (normalizedEmail !== normalizeEmail(member.email || '')) {
    const targetAllowedAccess = await loadAllowedAccessByEmail(admin, normalizedEmail);

    if (targetAllowedAccess && targetAllowedAccess.id !== member.allowed_access_id) {
      const linkedProfile = await maybeSingle(
        admin.from('profiles').select('id').eq('allowed_access_id', targetAllowedAccess.id).neq('id', memberId).limit(1),
        'Failed to check linked users.',
      );

      if (linkedProfile) {
        throw new HttpError(409, 'This e-mail is already linked to another registered user.');
      }

      const { error: targetAccessError } = await admin
        .from('allowed_access')
        .update({
          allowed_role: toStorageRole(member.role),
          license_number: trimmedLicenseNumber,
        })
        .eq('id', targetAllowedAccess.id);

      if (targetAccessError) {
        throw new HttpError(500, 'Failed to update allowed access.');
      }

      nextAllowedAccessId = targetAllowedAccess.id;
    } else if (currentAllowedAccess) {
      const { error: currentAccessError } = await admin
        .from('allowed_access')
        .update({
          email: normalizedEmail,
          allowed_role: toStorageRole(member.role),
          license_number: trimmedLicenseNumber,
        })
        .eq('id', currentAllowedAccess.id);

      if (currentAccessError) {
        throw new HttpError(500, 'Failed to update allowed access.');
      }
    } else {
      const { data: insertedAccess, error: insertAccessError } = await admin
        .from('allowed_access')
        .insert({
          email: normalizedEmail,
          allowed_role: toStorageRole(member.role),
          license_number: trimmedLicenseNumber,
        })
        .select('*')
        .single();

      if (insertAccessError || !insertedAccess) {
        throw new HttpError(500, 'Failed to create allowed access for the new e-mail.');
      }

      nextAllowedAccessId = insertedAccess.id;
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(memberId, {
      email: normalizedEmail,
      email_confirm: true,
    });

    if (authUpdateError) {
      throw new HttpError(500, 'Failed to update auth e-mail.');
    }
  } else if (currentAllowedAccess) {
    const { error: currentAccessError } = await admin
      .from('allowed_access')
      .update({
        allowed_role: toStorageRole(member.role),
        license_number: trimmedLicenseNumber,
      })
      .eq('id', currentAllowedAccess.id);

    if (currentAccessError) {
      throw new HttpError(500, 'Failed to update allowed access.');
    }
  }

  const { error } = await admin
    .from('profiles')
    .update({
      email: normalizedEmail,
      full_name: trimmedName,
      license_number: trimmedLicenseNumber,
      photo_url: nextPhotoUrl || member.photo_url || DEFAULT_PHOTO_URL,
      allowed_access_id: nextAllowedAccessId,
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

const addAllowedAccess = async (admin, currentUser, email, role, licenseNumber) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const normalizedEmail = normalizeEmail(email);
  const trimmedLicenseNumber = String(licenseNumber || '').trim();

  if (!normalizedEmail) {
    throw new HttpError(400, 'E-mail is required.');
  }

  if (!trimmedLicenseNumber) {
    throw new HttpError(400, 'License is required.');
  }

  if (!ROLE_OPTIONS.includes(role)) {
    throw new HttpError(400, 'Choose a valid role.');
  }

  const { error } = await admin.from('allowed_access').upsert(
    {
      email: normalizedEmail,
      allowed_role: toStorageRole(role),
      license_number: trimmedLicenseNumber,
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

const listNewsPosts = async (admin) => {
  const { data, error } = await admin.from('news_posts').select('*').order('created_at', { ascending: false });
  const posts = ensureData(data || [], error, 'Failed to load news posts.');

  if (!posts.length) {
    return [];
  }

  const creators = await listProfilesByIds(
    admin,
    [...new Set(posts.map((post) => post.created_by).filter(Boolean))],
  );
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));

  return posts.map((post) => ({
    id: post.id,
    youtubeUrl: post.youtube_url,
    commentary: post.commentary || '',
    createdAt: post.created_at,
    createdByName: creatorMap.get(post.created_by)?.full_name || 'Unknown instructor',
  }));
};

const createNewsPost = async (admin, currentUser, body) => {
  await requireRole(admin, currentUser.id, 'Instructor');

  const youtubeUrl = String(body.youtubeUrl || '').trim();
  const commentary = String(body.commentary || '').trim();

  if (!youtubeUrl) {
    throw new HttpError(400, 'YouTube link is required.');
  }

  const { error } = await admin.from('news_posts').insert({
    youtube_url: youtubeUrl,
    commentary,
    created_by: currentUser.id,
  });

  if (error) {
    throw new HttpError(500, 'Failed to save news post.');
  }

  return listNewsPosts(admin);
};

const deleteNewsPost = async (admin, currentUser, postId) => {
  await requireRole(admin, currentUser.id, 'Instructor');

  const { error } = await admin.from('news_posts').delete().eq('id', postId);
  if (error) {
    throw new HttpError(500, 'Failed to delete news post.');
  }
};

const removeReportsForRefereeChange = async (admin, nominationId, previousRefereeId, nextRefereeId) => {
  if (!previousRefereeId || previousRefereeId === nextRefereeId) {
    return;
  }

  const { error } = await admin
    .from('reports')
    .delete()
    .eq('nomination_id', nominationId)
    .eq('referee_id', previousRefereeId);

  if (error) {
    throw new HttpError(500, 'Failed to clean up reports for the replaced referee.');
  }
};

const createReplacementNotice = async (admin, nominationId, slotNumber, previousRefereeId, nextRefereeId, createdBy) => {
  if (!previousRefereeId || previousRefereeId === nextRefereeId) {
    return;
  }

  const { error } = await admin.from('replacement_notices').insert({
    nomination_id: nominationId,
    replaced_referee_id: previousRefereeId,
    new_referee_id: nextRefereeId,
    slot_number: slotNumber,
    created_by: createdBy,
  });

  if (error) {
    throw new HttpError(500, 'Failed to create replacement notice.');
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

  const assignableOfficials = await requireAssignableOfficials(admin, refereeIds);
  const officialMap = new Map(assignableOfficials.map((official) => [official.id, official]));
  const respondedAt = new Date().toISOString();
  const reportDeadlineAt = createDeadlineDate(matchDate, matchTime)?.toISOString() || null;

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
    refereeIds.map((refereeId, index) => {
      const assignedOfficial = officialMap.get(refereeId);
      const isSelfAssignedInstructor = assignedOfficial?.id === currentUser.id && assignedOfficial.role === 'Instructor';

      return {
        nomination_id: inserted.id,
        referee_id: refereeId,
        slot_number: index + 1,
        status: isSelfAssignedInstructor ? ASSIGNMENT_STATUS.ACCEPTED : ASSIGNMENT_STATUS.PENDING,
        report_deadline_at: reportDeadlineAt,
        responded_at: isSelfAssignedInstructor ? respondedAt : null,
      };
    }),
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
  await expirePendingAssignments(admin, [nominationId]);
  const [assignedOfficial] = await requireAssignableOfficials(admin, [refereeId]);
  const isSelfAssignedInstructor = assignedOfficial.id === currentUser.id && assignedOfficial.role === 'Instructor';

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

  const nomination = await requireNominationOwner(admin, nominationId, currentUser.id);
  const reportDeadlineAt = createDeadlineDate(nomination.match_date, nomination.match_time)?.toISOString() || null;
  await removeReportsForRefereeChange(admin, nominationId, slot.referee_id, refereeId);
  await createReplacementNotice(admin, nominationId, slotNumber, slot.referee_id, refereeId, currentUser.id);

  const { error } = await admin
    .from('nomination_referees')
    .update({
      referee_id: refereeId,
      status: isSelfAssignedInstructor ? ASSIGNMENT_STATUS.ACCEPTED : ASSIGNMENT_STATUS.PENDING,
      report_deadline_at: reportDeadlineAt,
      responded_at: isSelfAssignedInstructor ? new Date().toISOString() : null,
    })
    .eq('nomination_id', nominationId)
    .eq('slot_number', slotNumber);

  if (error) {
    throw new HttpError(500, 'Failed to replace referee.');
  }

  const nominations = await getInstructorNominationsData(admin, currentUser.id);
  return nominations.find((nomination) => nomination.id === nominationId);
};

const editNominationOfficials = async (admin, currentUser, nominationId, refereeIds) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const nomination = await requireNominationOwner(admin, nominationId, currentUser.id);
  const normalizedRefereeIds = ensureDistinctReferees(refereeIds || []);
  const assignableOfficials = await requireAssignableOfficials(admin, normalizedRefereeIds);
  const officialMap = new Map(assignableOfficials.map((official) => [official.id, official]));
  const currentSlots = await listAssignmentsByNominationIds(admin, [nominationId]);

  if (currentSlots.length !== 3) {
    throw new HttpError(409, 'This game does not have a complete crew to edit.');
  }

  const slotMap = new Map(currentSlots.map((slot) => [Number(slot.slot_number), slot]));
  const reportDeadlineAt = createDeadlineDate(nomination.match_date, nomination.match_time)?.toISOString() || null;
  const respondedAt = new Date().toISOString();

  for (const [index, refereeId] of normalizedRefereeIds.entries()) {
    const slotNumber = index + 1;
    const existingSlot = slotMap.get(slotNumber);
    if (!existingSlot) {
      throw new HttpError(404, 'Nomination slot not found.');
    }

    const assignedOfficial = officialMap.get(refereeId);
    const isSelfAssignedInstructor = assignedOfficial?.id === currentUser.id && assignedOfficial.role === 'Instructor';
    const isSameOfficial = existingSlot.referee_id === refereeId;

    await removeReportsForRefereeChange(admin, nominationId, existingSlot.referee_id, refereeId);
    await createReplacementNotice(admin, nominationId, slotNumber, existingSlot.referee_id, refereeId, currentUser.id);

    const nextStatus = isSameOfficial
      ? existingSlot.status
      : isSelfAssignedInstructor
        ? ASSIGNMENT_STATUS.ACCEPTED
        : ASSIGNMENT_STATUS.PENDING;

    const nextRespondedAt = isSameOfficial
      ? existingSlot.responded_at || null
      : isSelfAssignedInstructor
        ? respondedAt
        : null;

    const { error } = await admin
      .from('nomination_referees')
      .update({
        referee_id: refereeId,
        status: nextStatus,
        responded_at: nextRespondedAt,
        report_deadline_at: reportDeadlineAt,
      })
      .eq('nomination_id', nominationId)
      .eq('slot_number', slotNumber);

    if (error) {
      throw new HttpError(500, 'Failed to update the crew.');
    }
  }

  const nominations = await getInstructorNominationsData(admin, currentUser.id);
  return nominations.find((item) => item.id === nominationId);
};

const assignNominationTOs = async (admin, currentUser, nominationId, toIds) => {
  await requireRole(admin, currentUser.id, 'TO Supervisor');
  const nomination = await requireSingle(
    admin.from('nominations').select('id, match_date, match_time').eq('id', nominationId),
    'Nomination not found.',
    'Failed to load nomination.',
  );

  const matchDateTime = createMatchDateTime(nomination.match_date, nomination.match_time);
  if (!matchDateTime || Date.now() >= matchDateTime.getTime()) {
    throw new HttpError(409, 'TO crew can be assigned only before the match starts.');
  }

  const normalizedTOIds = ensureDistinctTOs(toIds);
  await requireTOUsers(admin, normalizedTOIds);

  const { error: deleteError } = await admin.from('nomination_tos').delete().eq('nomination_id', nominationId);
  if (deleteError) {
    throw new HttpError(500, 'Failed to reset TO crew.');
  }

  const { error: insertError } = await admin.from('nomination_tos').insert(
    normalizedTOIds.map((toId, index) => ({
      nomination_id: nominationId,
      to_id: toId,
      slot_number: index + 1,
      assigned_by: currentUser.id,
      status: ASSIGNMENT_STATUS.PENDING,
      responded_at: null,
    })),
  );

  if (insertError) {
    throw new HttpError(500, 'Failed to assign TO crew.');
  }

  const nominations = await getInstructorNominationsData(admin, currentUser.id);
  return nominations.find((item) => item.id === nominationId);
};

const updateNominationScore = async (admin, currentUser, nominationId, finalScore, matchVideoUrl, matchProtocolUrl) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const nomination = await requireNominationOwner(admin, nominationId, currentUser.id);
  const normalizedFinalScore = String(finalScore || '').trim();
  const normalizedMatchVideoUrl = String(matchVideoUrl || '').trim();
  const normalizedMatchProtocolUrl = String(matchProtocolUrl || '').trim();

  if (!normalizedFinalScore && !normalizedMatchVideoUrl && !normalizedMatchProtocolUrl) {
    throw new HttpError(400, 'Add a final score, a YouTube link, or a Google Drive protocol link first.');
  }

  if (normalizedFinalScore && normalizedFinalScore.length > 32) {
    throw new HttpError(400, 'Final score is too long.');
  }

  if (normalizedMatchVideoUrl && !isYoutubeUrl(normalizedMatchVideoUrl)) {
    throw new HttpError(400, 'Enter a valid YouTube link.');
  }

  if (normalizedMatchProtocolUrl && !isGoogleDriveUrl(normalizedMatchProtocolUrl)) {
    throw new HttpError(400, 'Enter a valid Google Drive link.');
  }

  const matchDateTime = createMatchDateTime(nomination.match_date, nomination.match_time);
  if (!matchDateTime || Date.now() < matchDateTime.getTime()) {
    throw new HttpError(409, 'Match updates can be saved only after the match starts.');
  }

  const { error } = await admin
    .from('nominations')
    .update({
      final_score: normalizedFinalScore || null,
      match_video_url: normalizedMatchVideoUrl || null,
      match_protocol_url: normalizedMatchProtocolUrl || null,
    })
    .eq('id', nominationId);

  if (error) {
    throw new HttpError(500, 'Failed to update match details.');
  }

  const nominations = await getInstructorNominationsData(admin, currentUser.id);
  return nominations.find((item) => item.id === nominationId);
};

const respondToNomination = async (admin, currentUser, nominationId, response) => {
  if (!['Referee', 'Instructor', 'TO'].includes(currentUser.role)) {
    throw new HttpError(403, 'Only Referee, Instructor and TO accounts can respond to nominations.');
  }

  if (![ASSIGNMENT_STATUS.ACCEPTED, ASSIGNMENT_STATUS.DECLINED].includes(response)) {
    throw new HttpError(400, 'Response must be Accepted or Declined.');
  }

  if (currentUser.role === 'TO') {
    const assignment = await maybeSingle(
      admin
        .from('nomination_tos')
        .select('*')
        .eq('nomination_id', nominationId)
        .eq('to_id', currentUser.id),
      'Failed to load nomination response.',
    );

    if (!assignment) {
      throw new HttpError(404, 'Assignment not found.');
    }

    if (assignment.status !== ASSIGNMENT_STATUS.PENDING) {
      throw new HttpError(409, 'Only pending assignments can be answered.');
    }

    const { error } = await admin
      .from('nomination_tos')
      .update({
        status: response,
        responded_at: new Date().toISOString(),
      })
      .eq('nomination_id', nominationId)
      .eq('to_id', currentUser.id);

    if (error) {
      throw new HttpError(500, 'Failed to save response.');
    }

    const nominations = await getRefereeAssignmentsData(admin, currentUser.id);
    return nominations.nominations.find((nomination) => nomination.nominationId === nominationId) || null;
  }

  await expirePendingAssignments(admin, [nominationId]);

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

  if (assignment.status !== ASSIGNMENT_STATUS.PENDING) {
    throw new HttpError(409, 'Only pending assignments can be answered.');
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
  return nominations.nominations.find((nomination) => nomination.nominationId === nominationId) || null;
};

const deleteNomination = async (admin, currentUser, nominationId) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  const nomination = await requireNominationOwner(admin, nominationId, currentUser.id);

  const matchDate = String(nomination.match_date || '');
  const gameCode = String(nomination.game_code || '');

  if (matchDate && gameCode) {
    const [performanceDelete, evaluationDelete] = await Promise.all([
      admin
        .from('ranking_match_performance')
        .delete()
        .eq('game_code', gameCode)
        .eq('evaluation_date', matchDate),
      admin
        .from('ranking_evaluations')
        .delete()
        .eq('game_code', gameCode)
        .eq('evaluation_date', matchDate),
    ]);

    if (performanceDelete.error) {
      throw new HttpError(500, 'Failed to delete match performance for the removed game.');
    }

    if (evaluationDelete.error) {
      throw new HttpError(500, 'Failed to delete ranking evaluations for the removed game.');
    }
  }

  const { error } = await admin.from('nominations').delete().eq('id', nominationId);
  if (error) {
    throw new HttpError(500, 'Failed to delete nomination.');
  }
};

const listTestReportTOItems = async (admin, currentUser) => {
  if (currentUser.role === 'Referee') {
    const { data, error } = await admin
      .from(TEST_REPORT_TO_TABLE)
      .select('*')
      .eq('referee_id', currentUser.id)
      .eq('status', REPORT_STATUS.REVIEWED)
      .order('updated_at', { ascending: false });

    const reports = ensureData(data || [], error, 'Failed to load reports.');
    return reports.map((report) =>
      buildManualTestReportTOItem({
        report,
        refereeName: currentUser.full_name,
      }),
    );
  }

  if (currentUser.role === 'Instructor') {
    const { data, error } = await admin
      .from(TEST_REPORT_TO_TABLE)
      .select('*')
      .eq('author_id', currentUser.id)
      .order('updated_at', { ascending: false });

    const reports = ensureData(data || [], error, 'Failed to load reports.');
    const referees = await listProfilesByIds(
      admin,
      [...new Set(reports.map((report) => report.referee_id))],
    );
    const refereeMap = new Map(referees.map((referee) => [referee.id, referee]));

    return reports.map((report) =>
      buildManualTestReportTOItem({
        report,
        refereeName: refereeMap.get(report.referee_id)?.full_name || 'Unknown referee',
      }),
    );
  }

  return [];
};

const listTOReportItems = async (admin, currentUser) => {
  let assignmentsQuery = admin.from('nomination_tos').select('*').order('created_at', { ascending: false });

  if (currentUser.role === 'TO') {
    assignmentsQuery = assignmentsQuery.eq('to_id', currentUser.id);
  } else if (currentUser.role === 'TO Supervisor') {
    assignmentsQuery = assignmentsQuery.eq('assigned_by', currentUser.id);
  } else if (!['Instructor', 'Staff'].includes(currentUser.role)) {
    return [];
  }

  const { data, error } = await assignmentsQuery;
  const assignments = ensureData(data || [], error, 'Failed to load TO reports.').filter(
    (assignment) => assignment.status !== ASSIGNMENT_STATUS.DECLINED,
  );

  if (!assignments.length) {
    return [];
  }

  const nominationIds = [...new Set(assignments.map((assignment) => assignment.nomination_id))];
  const toIds = [...new Set(assignments.map((assignment) => assignment.to_id))];
  const [nominations, toOfficials, reports] = await Promise.all([
    listNominationsByIds(admin, nominationIds),
    listProfilesByIds(admin, toIds),
    loadReportsForPairs(
      admin,
      assignments.map((assignment) => ({
        nominationId: assignment.nomination_id,
        refereeId: assignment.to_id,
      })),
    ),
  ]);
  const nominationMap = new Map(nominations.map((nomination) => [nomination.id, nomination]));
  const toMap = new Map(toOfficials.map((official) => [official.id, official]));
  const reportsByPairKey = groupReportsByPairKey(reports);

  return assignments
    .map((assignment) => {
      const nomination = nominationMap.get(assignment.nomination_id);
      if (!nomination) {
        return null;
      }

      const pairReports = reportsByPairKey.get(`${assignment.nomination_id}:${assignment.to_id}`) || [];
      const toReport = pairReports.find((report) => report.author_role === 'Referee');
      const supervisorReport = pairReports.find(
        (report) => report.author_role === 'Instructor' && report.author_id === assignment.assigned_by,
      );

      return buildReportListItem({
        nomination,
        assignment,
        refereeName: toMap.get(assignment.to_id)?.full_name || 'Unknown TO',
        refereeReportStatus: toReport?.status || null,
        instructorReportStatus: supervisorReport?.status || null,
        reviewScore: supervisorReport?.score ?? null,
        currentUserRole: currentUser.role,
        reportMode: REPORT_MODE.TO,
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
};

const listReportItems = async (admin, currentUser, reportMode = REPORT_MODE.STANDARD) => {
  const normalizedReportMode = normalizeReportMode(reportMode);

  if (normalizedReportMode === REPORT_MODE.TEST_TO) {
    return listTestReportTOItems(admin, currentUser);
  }

  if (normalizedReportMode === REPORT_MODE.TO) {
    return listTOReportItems(admin, currentUser);
  }

  if (currentUser.role === 'Referee') {
    const assignmentsResponse = await admin.from('nomination_referees').select('*').eq('referee_id', currentUser.id);
    const initialAssignments = ensureData(assignmentsResponse.data || [], assignmentsResponse.error, 'Failed to load reports.');
    await expirePendingAssignments(
      admin,
      [...new Set(initialAssignments.map((assignment) => assignment.nomination_id))],
    );
    const refreshedAssignmentsResponse = await admin.from('nomination_referees').select('*').eq('referee_id', currentUser.id);
    const assignments = ensureData(refreshedAssignmentsResponse.data || [], refreshedAssignmentsResponse.error, 'Failed to load reports.')
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
    const reportsByPairKey = groupReportsByPairKey(reports);

    return assignments
      .map((assignment) => {
        const nomination = nominationMap.get(assignment.nomination_id);
        if (!nomination) {
          return null;
        }

        const pairReports = reportsByPairKey.get(`${assignment.nomination_id}:${assignment.referee_id}`) || [];
        const ownReport = pairReports.find(
          (report) =>
            report.author_id === currentUser.id,
        );
        const instructorReport = pairReports.find(
          (report) =>
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
          currentUserRole: currentUser.role,
        });
      })
      .filter(Boolean)
      .sort(sortByMatchDesc);

    const testReportItems = await listTestReportTOItems(admin, currentUser);
    return [...standardItems, ...testReportItems].sort((left, right) => {
      const matchOrder = sortByMatchDesc(left, right);
      if (matchOrder !== 0) {
        return matchOrder;
      }

      const typeOrder = left.reportMode.localeCompare(right.reportMode);
      if (typeOrder !== 0) {
        return typeOrder;
      }

      return left.slotNumber - right.slotNumber;
    });
  }

  if (currentUser.role === 'Instructor') {
    const { data, error } = await admin.from('nominations').select('*').eq('created_by', currentUser.id);
    const nominations = ensureData(data || [], error, 'Failed to load reports.');

    if (!nominations.length) {
      return [];
    }

    await expirePendingAssignments(admin, nominations.map((nomination) => nomination.id));
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
    const reportsByPairKey = groupReportsByPairKey(reports);

    return assignments
      .map((assignment) => {
        const nomination = nominationMap.get(assignment.nomination_id);
        if (!nomination) {
          return null;
        }

        const pairReports = reportsByPairKey.get(`${assignment.nomination_id}:${assignment.referee_id}`) || [];
        const refereeReport = pairReports.find(
          (report) =>
            report.author_role === 'Referee' &&
            report.status === REPORT_STATUS.SUBMITTED,
        );
        const ownReport = pairReports.find(
          (report) =>
            report.author_id === currentUser.id,
        );

        return buildReportListItem({
          nomination,
          assignment,
          refereeName: refereeMap.get(assignment.referee_id)?.full_name || 'Unknown referee',
          refereeReportStatus: refereeReport?.status || null,
          instructorReportStatus: ownReport?.status || null,
          reviewScore: ownReport?.score ?? null,
          currentUserRole: currentUser.role,
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

  if (currentUser.role === 'Staff') {
    const assignmentsResponse = await admin.from('nomination_referees').select('*');
    const initialAssignments = ensureData(assignmentsResponse.data || [], assignmentsResponse.error, 'Failed to load reports.');
    await expirePendingAssignments(
      admin,
      [...new Set(initialAssignments.map((assignment) => assignment.nomination_id))],
    );
    const refreshedAssignmentsResponse = await admin.from('nomination_referees').select('*');
    const assignments = ensureData(refreshedAssignmentsResponse.data || [], refreshedAssignmentsResponse.error, 'Failed to load reports.')
      .filter((assignment) => assignment.status !== ASSIGNMENT_STATUS.DECLINED);

    if (!assignments.length) {
      return [];
    }

    const nominationIds = [...new Set(assignments.map((assignment) => assignment.nomination_id))];
    const refereeIds = [...new Set(assignments.map((assignment) => assignment.referee_id))];
    const nominations = await listNominationsByIds(admin, nominationIds);
    const referees = await listProfilesByIds(admin, refereeIds);
    const nominationMap = new Map(nominations.map((nomination) => [nomination.id, nomination]));
    const refereeMap = new Map(referees.map((referee) => [referee.id, referee]));
    const reports = await loadReportsForPairs(
      admin,
      assignments.map((assignment) => ({
        nominationId: assignment.nomination_id,
        refereeId: assignment.referee_id,
      })),
    );
    const reportsByPairKey = groupReportsByPairKey(reports);

    return assignments
      .map((assignment) => {
        const nomination = nominationMap.get(assignment.nomination_id);
        if (!nomination) {
          return null;
        }

        const pairReports = reportsByPairKey.get(`${assignment.nomination_id}:${assignment.referee_id}`) || [];
        const refereeReport = pairReports.find(
          (report) =>
            report.author_role === 'Referee',
        );
        const instructorReport = pairReports.find(
          (report) =>
            report.author_role === 'Instructor',
        );

        return buildReportListItem({
          nomination,
          assignment,
          refereeName: refereeMap.get(assignment.referee_id)?.full_name || 'Unknown referee',
          refereeReportStatus: refereeReport?.status || null,
          instructorReportStatus: instructorReport?.status || null,
          reviewScore: instructorReport?.score ?? null,
          currentUserRole: currentUser.role,
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

const getTestReportTODetail = async (admin, currentUser, reportId) => {
  const report = await loadManualTestReportTOById(admin, reportId);
  const referee = await requireSingle(
    admin.from('profiles').select('*').eq('id', report.referee_id),
    'Recipient referee not found.',
    'Failed to load recipient referee.',
  );

  if (currentUser.role === 'Instructor') {
    if (report.author_id !== currentUser.id) {
      throw new HttpError(403, 'This Report Test TO belongs to another instructor.');
    }

    const visibilityOptions = (await listReferees(admin, currentUser)).map((item) => ({
      id: item.id,
      fullName: item.fullName,
      slotNumber: 0,
    }));

    return {
      item: buildManualTestReportTOItem({
        report,
        refereeName: referee.full_name,
      }),
      refereeReport: null,
      instructorReport: mapReportEntry(report),
      canEditCurrentUserReport: report.status === REPORT_STATUS.DRAFT,
      deadlineExceeded: false,
      deadlineMessage: null,
      reportDeadlineAt: null,
      canAddTime: false,
      visibilityOptions,
    };
  }

  if (currentUser.role === 'Referee') {
    if (report.referee_id !== currentUser.id || report.status !== REPORT_STATUS.REVIEWED) {
      throw new HttpError(404, 'Report Test TO not found.');
    }

    return {
      item: buildManualTestReportTOItem({
        report,
        refereeName: referee.full_name,
      }),
      refereeReport: null,
      instructorReport: mapReportEntry(report),
      canEditCurrentUserReport: false,
      deadlineExceeded: false,
      deadlineMessage: null,
      reportDeadlineAt: null,
      canAddTime: false,
      visibilityOptions: [],
    };
  }

  throw new HttpError(403, 'This role cannot access Report Test TO.');
};

const getTOReportDetail = async (admin, currentUser, nominationId, toId) => {
  const assignment = await requireTOAssignment(admin, nominationId, toId);
  const deadlineExceeded = isDeadlineExceeded(assignment);
  const deadlineMessage = deadlineExceeded ? getDeadlineMessage(assignment) : null;
  const reportDeadlineAt = getReportDeadlineDate(assignment)?.toISOString() || null;

  if (currentUser.role === 'TO') {
    if (currentUser.id !== toId) {
      throw new HttpError(403, 'TO users can only view their own reports.');
    }

    if (assignment.assignmentStatus === ASSIGNMENT_STATUS.DECLINED) {
      throw new HttpError(403, 'Declined assignments do not have reports.');
    }

    const [ownReport, supervisorReport] = await Promise.all([
      loadReportByAuthor(admin, nominationId, toId, currentUser.id),
      loadVisibleInstructorReport(admin, nominationId, toId),
    ]);

    return {
      item: {
        nominationId: assignment.nominationId,
        refereeId: toId,
        gameCode: assignment.gameCode,
        teams: assignment.teams,
        matchDate: assignment.matchDate,
        matchTime: assignment.matchTime,
        venue: assignment.venue,
        refereeName: assignment.refereeName,
        slotNumber: assignment.slotNumber,
        refereeReportStatus: ownReport?.status || null,
        instructorReportStatus: supervisorReport?.status || null,
        reviewScore: supervisorReport?.score ?? null,
        deadlineExceeded,
        deadlineMessage,
        reportDeadlineAt,
        canAddTime: false,
        reportMode: REPORT_MODE.TO,
        googleDriveUrl: null,
        visibleToRefereeIds: [],
      },
      refereeReport: mapReportEntry(ownReport),
      instructorReport: mapReportEntry(supervisorReport),
      canEditCurrentUserReport: !deadlineExceeded && (!ownReport || ownReport.status === REPORT_STATUS.DRAFT),
      deadlineExceeded,
      deadlineMessage,
      reportDeadlineAt,
      canAddTime: false,
      visibilityOptions: [],
    };
  }

  if (currentUser.role === 'TO Supervisor') {
    if (assignment.assignedBy !== currentUser.id) {
      throw new HttpError(403, 'This TO report belongs to another TO Supervisor.');
    }

    const [toReport, ownReport] = await Promise.all([
      loadSubmittedRefereeReport(admin, nominationId, toId),
      loadReportByAuthor(admin, nominationId, toId, currentUser.id),
    ]);

    return {
      item: {
        nominationId: assignment.nominationId,
        refereeId: toId,
        gameCode: assignment.gameCode,
        teams: assignment.teams,
        matchDate: assignment.matchDate,
        matchTime: assignment.matchTime,
        venue: assignment.venue,
        refereeName: assignment.refereeName,
        slotNumber: assignment.slotNumber,
        refereeReportStatus: toReport?.status || null,
        instructorReportStatus: ownReport?.status || null,
        reviewScore: ownReport?.score ?? null,
        deadlineExceeded,
        deadlineMessage,
        reportDeadlineAt,
        canAddTime: false,
        reportMode: REPORT_MODE.TO,
        googleDriveUrl: null,
        visibleToRefereeIds: [],
      },
      refereeReport: mapReportEntry(toReport),
      instructorReport: mapReportEntry(ownReport),
      canEditCurrentUserReport: Boolean(toReport) && (!ownReport || ownReport.status === REPORT_STATUS.DRAFT),
      deadlineExceeded: false,
      deadlineMessage: null,
      reportDeadlineAt,
      canAddTime: false,
      visibilityOptions: [],
    };
  }

  if (['Instructor', 'Staff'].includes(currentUser.role)) {
    const [toReport, supervisorReport] = await Promise.all([
      loadSubmittedRefereeReport(admin, nominationId, toId),
      loadReportByAuthor(admin, nominationId, toId, assignment.assignedBy),
    ]);

    return {
      item: {
        nominationId: assignment.nominationId,
        refereeId: toId,
        gameCode: assignment.gameCode,
        teams: assignment.teams,
        matchDate: assignment.matchDate,
        matchTime: assignment.matchTime,
        venue: assignment.venue,
        refereeName: assignment.refereeName,
        slotNumber: assignment.slotNumber,
        refereeReportStatus: toReport?.status || null,
        instructorReportStatus: supervisorReport?.status || null,
        reviewScore: supervisorReport?.score ?? null,
        deadlineExceeded,
        deadlineMessage,
        reportDeadlineAt,
        canAddTime: false,
        reportMode: REPORT_MODE.TO,
        googleDriveUrl: null,
        visibleToRefereeIds: [],
      },
      refereeReport: mapReportEntry(toReport),
      instructorReport: mapReportEntry(supervisorReport),
      canEditCurrentUserReport: false,
      deadlineExceeded: false,
      deadlineMessage: null,
      reportDeadlineAt,
      canAddTime: false,
      visibilityOptions: [],
    };
  }

  throw new HttpError(403, 'This role cannot access TO reports.');
};

const getReportDetail = async (admin, currentUser, nominationId, refereeId, reportMode = REPORT_MODE.STANDARD) => {
  const normalizedReportMode = normalizeReportMode(reportMode);

  if (normalizedReportMode === REPORT_MODE.TEST_TO) {
    return getTestReportTODetail(admin, currentUser, nominationId, refereeId);
  }

  if (normalizedReportMode === REPORT_MODE.TO) {
    return getTOReportDetail(admin, currentUser, nominationId, refereeId);
  }

  const assignment = await requireAssignment(admin, nominationId, refereeId);
  const deadlineExceeded = isDeadlineExceeded(assignment);
  const deadlineMessage = deadlineExceeded ? getDeadlineMessage(assignment) : null;
  const reportDeadlineAt = getReportDeadlineDate(assignment)?.toISOString() || null;

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
        deadlineExceeded,
        deadlineMessage,
        reportDeadlineAt,
        canAddTime: false,
        reportMode: REPORT_MODE.STANDARD,
        googleDriveUrl: instructorReport?.google_drive_url || null,
        visibleToRefereeIds: [],
      },
      refereeReport: mapReportEntry(ownReport),
      instructorReport: mapReportEntry(instructorReport),
      canEditCurrentUserReport: !deadlineExceeded && (!ownReport || ownReport.status === REPORT_STATUS.DRAFT),
      deadlineExceeded,
      deadlineMessage,
      reportDeadlineAt,
      canAddTime: false,
      visibilityOptions: [],
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
        deadlineExceeded,
        deadlineMessage,
        reportDeadlineAt,
        canAddTime: deadlineExceeded,
        reportMode: REPORT_MODE.STANDARD,
        googleDriveUrl: ownReport?.google_drive_url || null,
        visibleToRefereeIds: [],
      },
      refereeReport: mapReportEntry(refereeReport),
      instructorReport: mapReportEntry(ownReport),
      canEditCurrentUserReport: Boolean(refereeReport) && (!ownReport || ownReport.status === REPORT_STATUS.DRAFT),
      deadlineExceeded: false,
      deadlineMessage: null,
      reportDeadlineAt,
      canAddTime: deadlineExceeded,
      visibilityOptions: [],
    };
  }

  if (currentUser.role === 'Staff') {
    const [refereeReport, instructorReport] = await Promise.all([
      loadSubmittedRefereeReport(admin, nominationId, refereeId),
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
        refereeReportStatus: refereeReport?.status || null,
        instructorReportStatus: instructorReport?.status || null,
        reviewScore: instructorReport?.score ?? null,
        deadlineExceeded,
        deadlineMessage,
        reportDeadlineAt,
        canAddTime: false,
        reportMode: REPORT_MODE.STANDARD,
        googleDriveUrl: instructorReport?.google_drive_url || null,
        visibleToRefereeIds: [],
      },
      refereeReport: mapReportEntry(refereeReport),
      instructorReport: mapReportEntry(instructorReport),
      canEditCurrentUserReport: false,
      deadlineExceeded: false,
      deadlineMessage: null,
      reportDeadlineAt,
      canAddTime: false,
      visibilityOptions: [],
    };
  }

  throw new HttpError(403, 'This role cannot access reports.');
};

const saveTestReportTO = async (admin, currentUser, reportId, refereeId, body) => {
  if (currentUser.role !== 'Instructor') {
    throw new HttpError(403, 'Only instructors can save Report Test TO.');
  }

  const action = body.action;
  if (![REPORT_STATUS.DRAFT, REPORT_STATUS.SUBMITTED].includes(action)) {
    throw new HttpError(400, 'Action must be Draft or Submitted.');
  }

  const availableReferees = await listReferees(admin, currentUser);
  const allowedRefereeIds = new Set(availableReferees.map((item) => item.id));
  const visibleToRefereeIds = normalizeVisibleToRefereeIds(body.visibleToRefereeIds);
  const recipientRefereeId = String(refereeId || visibleToRefereeIds[0] || '').trim();

  if (!recipientRefereeId || !allowedRefereeIds.has(recipientRefereeId)) {
    throw new HttpError(400, 'Choose a referee for Report Test TO.');
  }

  if (action === REPORT_STATUS.SUBMITTED && visibleToRefereeIds.length !== 1) {
    throw new HttpError(400, 'Choose exactly one referee who will receive Report Test TO.');
  }

  const normalizedGameCode = String(body.gameCode || '').trim();
  const normalizedTeams = String(body.teams || '').trim();
  const normalizedMatchDate = String(body.matchDate || '').trim();
  const normalizedMatchTime = String(body.matchTime || '').trim();
  const normalizedVenue = String(body.venue || '').trim();

  if (action === REPORT_STATUS.SUBMITTED) {
    if (!normalizedGameCode || !normalizedTeams || !normalizedMatchDate || !normalizedMatchTime || !normalizedVenue) {
      throw new HttpError(400, 'Fill in game code, game, date, time and venue before submitting Report Test TO.');
    }
  }

  if (reportId !== 'new') {
    const existing = await loadManualTestReportTOById(admin, reportId);
    if (existing.author_id !== currentUser.id) {
      throw new HttpError(403, 'This Report Test TO belongs to another instructor.');
    }
    if (existing.status === REPORT_STATUS.REVIEWED) {
      throw new HttpError(409, 'Submitted Report Test TO cannot be edited.');
    }
  }

  await upsertTestReportTO({
    admin,
    reportId: reportId === 'new' ? null : reportId,
    refereeId: recipientRefereeId,
    authorId: currentUser.id,
    status: action === REPORT_STATUS.SUBMITTED ? REPORT_STATUS.REVIEWED : REPORT_STATUS.DRAFT,
    gameCode: normalizedGameCode,
    teams: normalizedTeams,
    matchDate: normalizedMatchDate,
    matchTime: normalizedMatchTime,
    venue: normalizedVenue,
    score: clampScore(body.feedbackScore),
    threePO_IOT: String(body.threePO_IOT || '').trim(),
    criteria: String(body.criteria || '').trim(),
    teamwork: String(body.teamwork || '').trim(),
    generally: String(body.generally || '').trim(),
    googleDriveUrl: String(body.googleDriveUrl || '').trim(),
    visibleToRefereeIds,
  });

  if (reportId === 'new') {
    const { data, error } = await admin
      .from(TEST_REPORT_TO_TABLE)
      .select('id')
      .eq('author_id', currentUser.id)
      .eq('referee_id', recipientRefereeId)
      .eq('game_code', normalizedGameCode)
      .eq('teams', normalizedTeams)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      throw new HttpError(500, 'Failed to load saved Report Test TO.');
    }

    return getTestReportTODetail(admin, currentUser, data.id);
  }

  return getTestReportTODetail(admin, currentUser, reportId);
};

const saveTOReport = async (admin, currentUser, nominationId, toId, body) => {
  if (!['TO', 'TO Supervisor'].includes(currentUser.role)) {
    throw new HttpError(403, 'This role cannot save TO reports.');
  }

  const assignment = await requireTOAssignment(admin, nominationId, toId);
  const action = body.action;

  if (![REPORT_STATUS.DRAFT, REPORT_STATUS.SUBMITTED].includes(action)) {
    throw new HttpError(400, 'Action must be Draft or Submitted.');
  }

  const normalizedPayload = {
    feedbackScore: 0,
    threePO_IOT: '',
    criteria: '',
    teamwork: '',
    generally: String(body.generally || '').trim(),
  };

  if (currentUser.role === 'TO') {
    if (currentUser.id !== toId) {
      throw new HttpError(403, 'TO users can only edit their own report.');
    }

    if (assignment.assignmentStatus === ASSIGNMENT_STATUS.DECLINED) {
      throw new HttpError(403, 'Declined assignments do not have reports.');
    }

    if (isDeadlineExceeded(assignment)) {
      throw new HttpError(409, getDeadlineMessage(assignment));
    }

    const existing = await loadReportByAuthor(admin, nominationId, toId, currentUser.id);
    if (existing?.status === REPORT_STATUS.SUBMITTED) {
      throw new HttpError(409, 'Submitted report cannot be edited.');
    }

    await upsertReport({
      admin,
      nominationId,
      refereeId: toId,
      authorId: currentUser.id,
      authorRole: 'Referee',
      status: action,
      score: 0,
      ...normalizedPayload,
    });

    return getTOReportDetail(admin, currentUser, nominationId, toId);
  }

  if (assignment.assignedBy !== currentUser.id) {
    throw new HttpError(403, 'This TO report belongs to another TO Supervisor.');
  }

  const toReport = await loadSubmittedRefereeReport(admin, nominationId, toId);
  if (!toReport) {
    throw new HttpError(409, 'TO Supervisor can answer only after the TO submits the report.');
  }

  await upsertReport({
    admin,
    nominationId,
    refereeId: toId,
    authorId: currentUser.id,
    authorRole: 'Instructor',
    status: action === REPORT_STATUS.SUBMITTED ? REPORT_STATUS.REVIEWED : REPORT_STATUS.DRAFT,
    score: 0,
    ...normalizedPayload,
  });

  return getTOReportDetail(admin, currentUser, nominationId, toId);
};

const saveReport = async (admin, currentUser, nominationId, refereeId, body, reportMode = REPORT_MODE.STANDARD) => {
  const normalizedReportMode = normalizeReportMode(reportMode);

  if (normalizedReportMode === REPORT_MODE.TEST_TO) {
    return saveTestReportTO(admin, currentUser, nominationId, refereeId, body);
  }

  if (normalizedReportMode === REPORT_MODE.TO) {
    return saveTOReport(admin, currentUser, nominationId, refereeId, body);
  }

  if (currentUser.role === 'Staff') {
    throw new HttpError(403, 'Staff can view reports but cannot write them.');
  }

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

const deleteTestReportTO = async (admin, currentUser, reportId) => {
  if (currentUser.role !== 'Instructor') {
    throw new HttpError(403, 'Only instructors can delete Report Test TO.');
  }
  const report = await loadManualTestReportTOById(admin, reportId);

  if (report.author_id !== currentUser.id) {
    throw new HttpError(403, 'This Report Test TO belongs to another instructor.');
  }

  if (report.status !== REPORT_STATUS.DRAFT) {
    throw new HttpError(409, 'Only draft Report Test TO can be deleted.');
  }

  const { error } = await admin.from(TEST_REPORT_TO_TABLE).delete().eq('id', report.id);
  if (error) {
    throw new HttpError(500, 'Failed to delete Report Test TO.');
  }
};

const deleteTOReport = async (admin, currentUser, nominationId, toId) => {
  if (!['TO', 'TO Supervisor'].includes(currentUser.role)) {
    throw new HttpError(403, 'This role cannot delete TO reports.');
  }

  const assignment = await requireTOAssignment(admin, nominationId, toId);

  if (currentUser.role === 'TO') {
    if (currentUser.id !== toId) {
      throw new HttpError(403, 'TO users can delete only their own draft reports.');
    }
  } else if (assignment.assignedBy !== currentUser.id) {
    throw new HttpError(403, 'This TO report belongs to another TO Supervisor.');
  }

  const report = await loadReportByAuthor(admin, nominationId, toId, currentUser.id);
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

const deleteReport = async (admin, currentUser, nominationId, refereeId, reportMode = REPORT_MODE.STANDARD) => {
  const normalizedReportMode = normalizeReportMode(reportMode);

  if (normalizedReportMode === REPORT_MODE.TEST_TO) {
    return deleteTestReportTO(admin, currentUser, nominationId, refereeId);
  }

  if (normalizedReportMode === REPORT_MODE.TO) {
    return deleteTOReport(admin, currentUser, nominationId, refereeId);
  }

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

const extendReportDeadline = async (admin, currentUser, nominationId, refereeId) => {
  await requireRole(admin, currentUser.id, 'Instructor');
  await requireNominationOwner(admin, nominationId, currentUser.id);

  const assignment = await requireAssignment(admin, nominationId, refereeId);
  const currentDeadline = getReportDeadlineDate(assignment);

  if (!currentDeadline) {
    throw new HttpError(400, 'Report deadline could not be calculated.');
  }

  if (Date.now() <= currentDeadline.getTime()) {
    throw new HttpError(409, 'Add Time is available only after the report deadline has passed.');
  }

  const extendedDeadline = new Date(Date.now() + REPORT_DEADLINE_EXTENSION_MS).toISOString();
  const { error } = await admin
    .from('nomination_referees')
    .update({ report_deadline_at: extendedDeadline })
    .eq('id', assignment.assignmentId);

  if (error) {
    throw new HttpError(500, 'Failed to extend report deadline.');
  }

  return getReportDetail(admin, currentUser, nominationId, refereeId);
};

const getRankingDashboardConfig = (role, subjectRole = null) => {
  if (subjectRole === 'TO' || role === 'TO' || role === 'TO Supervisor') {
    return {
      subjectRole: 'TO',
      performanceTable: 'ranking_to_match_performance',
      subjectIdColumn: 'to_id',
      performanceFieldMap: rankingTOPerformanceFieldMap,
      notFoundMessage: 'Failed to load TO ranking.',
      adminRoles: ['TO Supervisor'],
      viewerRoles: ['Instructor', 'Staff'],
      selfRoles: ['TO'],
    };
  }

  return {
    subjectRole: 'Referee',
    performanceTable: 'ranking_match_performance',
    subjectIdColumn: 'referee_id',
    performanceFieldMap: rankingRefereePerformanceFieldMap,
    notFoundMessage: 'Failed to load referee ranking.',
    adminRoles: ['Instructor', 'Staff'],
    viewerRoles: [],
    selfRoles: ['Referee'],
  };
};

const getRankingDashboard = async (admin, currentUser, subjectRole = null) => {
  const rankingConfig = getRankingDashboardConfig(currentUser.role, subjectRole);
  const rankingState = await buildRankingState(admin, rankingConfig);
  const totalReferees = rankingState.leaderboard.length;

  if (rankingConfig.selfRoles.includes(currentUser.role)) {
    const currentUserItem = rankingState.leaderboard.find((item) => item.refereeId === currentUser.id) || null;
    const currentUserPerformanceProfile = rankingState.performanceProfiles.get(currentUser.id) || null;
    const currentUserHistory = buildRankingHistory(currentUser.id, rankingState);

    return {
      leaderboard: currentUserItem ? [currentUserItem] : [],
      history: currentUserHistory,
      refereeHistories: {
        [currentUser.id]: currentUserHistory,
      },
      currentUserItem,
      performanceProfile: currentUserPerformanceProfile,
      visiblePerformanceProfiles: currentUserPerformanceProfile ? [currentUserPerformanceProfile] : [],
      performanceEntries: rankingState.performanceEntries.filter((item) => item.refereeId === currentUser.id),
      totalReferees,
      canViewFullLeaderboard: false,
    };
  }

  if (rankingConfig.adminRoles.includes(currentUser.role) || rankingConfig.viewerRoles.includes(currentUser.role)) {
    const refereeHistories = Object.fromEntries(
      rankingState.referees.map((referee) => [referee.id, buildRankingHistory(referee.id, rankingState)]),
    );

    return {
      leaderboard: rankingState.leaderboard,
      history: [],
      refereeHistories,
      currentUserItem: null,
      performanceProfile: null,
      visiblePerformanceProfiles: Array.from(rankingState.performanceProfiles.values()),
      performanceEntries: rankingState.performanceEntries,
      totalReferees,
      canViewFullLeaderboard: true,
    };
  }

  return {
    leaderboard: [],
    history: [],
    refereeHistories: {},
    currentUserItem: null,
    performanceProfile: null,
    visiblePerformanceProfiles: [],
    performanceEntries: [],
    totalReferees,
    canViewFullLeaderboard: false,
  };
};

const getRankingAdminData = async (admin, currentUser, subjectRole = null) => {
  const rankingConfig = getRankingDashboardConfig(currentUser.role, subjectRole);
  if (!rankingConfig.adminRoles.includes(currentUser.role)) {
    throw new HttpError(403, 'This role cannot manage ranking data.');
  }

  const rankingState = await buildRankingState(admin, rankingConfig);
  const gamesResponse = await admin
    .from('nominations')
    .select('id, game_code, match_date, teams')
    .order('match_date', { ascending: false })
    .order('match_time', { ascending: false })
    .order('created_at', { ascending: false });
  const games = ensureData(gamesResponse.data || [], gamesResponse.error, 'Failed to load ranking games.').map(
    (game) => ({
      id: game.id,
      gameCode: game.game_code || 'ABL-NEW',
      matchDate: game.match_date || '',
      teams: game.teams || '',
    }),
  );

  return {
    leaderboard: rankingState.leaderboard,
    evaluations: rankingState.evaluations,
    performanceEntries: rankingState.performanceEntries,
    performanceProfiles: Array.from(rankingState.performanceProfiles.values()),
    games,
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
  if (!['Instructor', 'TO Supervisor'].includes(currentUser.role)) {
    throw new HttpError(403, 'This role cannot save ranking performance.');
  }

  const rankingConfig = getRankingDashboardConfig(currentUser.role);

  if (currentUser.role === 'TO Supervisor') {
    await requireTOUsers(admin, [body.refereeId]);
  } else {
    await requireReferees(admin, [body.refereeId]);
  }

  const gameCode = String(body.gameCode || '').trim();
  const evaluationDate = String(body.evaluationDate || '').trim();
  const note = String(body.note || '').trim();
  const activeFieldMap = rankingConfig.performanceFieldMap || rankingRefereePerformanceFieldMap;
  const values = activeFieldMap.map(([clientKey]) => Number(body[clientKey]));

  if (values.some((value) => ![-1, 0, 1].includes(value))) {
    throw new HttpError(400, 'Performance values must be -1, 0 or 1.');
  }

  if (!gameCode || !evaluationDate) {
    throw new HttpError(400, 'Game number and evaluation date are required.');
  }

  const subjectColumn = rankingConfig.subjectIdColumn;
  const zeroedPerformancePayload = Object.fromEntries(
    rankingRefereePerformanceFieldMap.map(([, columnKey]) => [columnKey, 0]),
  );
  const activePerformancePayload = Object.fromEntries(
    activeFieldMap.map(([clientKey, columnKey]) => [columnKey, Number(body[clientKey])]),
  );
  const { error } = await admin.from(rankingConfig.performanceTable).upsert(
    {
      [subjectColumn]: body.refereeId,
      game_code: gameCode,
      evaluation_date: evaluationDate,
      note,
      ...zeroedPerformancePayload,
      ...activePerformancePayload,
      updated_by: currentUser.id,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: `${subjectColumn},game_code,evaluation_date`,
    },
  );

  if (error) {
    throw new HttpError(500, 'Failed to save match performance.');
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

  if (allowedAccess.allowed_role && normalizeRole(allowedAccess.allowed_role) !== normalizeRole(role)) {
    throw new HttpError(403, `This e-mail is approved only for the ${normalizeRole(allowedAccess.allowed_role)} role.`);
  }

  const existingProfile = await loadProfileByEmail(admin, email);
  if (existingProfile) {
    throw new HttpError(409, 'A user with this e-mail already exists.');
  }

  const licenseNumber = String(allowedAccess.license_number || '').trim() || (await getNextLicenseNumber(admin, role));
  const storageRole = toStorageRole(role);
  const authResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: normalizeRole(role),
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
    role: storageRole,
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

const proxyTeyinatExport = async (body) => {
  const teyinatServiceUrl = getTeyinatServiceUrl();
  if (!teyinatServiceUrl) {
    throw new HttpError(500, 'Teyinat service URL is not configured.');
  }

  let response;

  try {
    response = await fetch(`${teyinatServiceUrl}/teyinat/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selections: Array.isArray(body?.selections) ? body.selections : [],
      }),
    });
  } catch {
    throw new HttpError(502, 'Failed to reach Teyinat PDF service.');
  }

  if (!response.ok) {
    let message = 'Failed to generate Teyinat PDF.';

    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) {
          message = text;
        }
      } catch {
        // Keep fallback message.
      }
    }

    throw new HttpError(502, message);
  }

  const buffer = await response.arrayBuffer();
  return binary(200, buffer, {
    'Content-Type': response.headers.get('Content-Type') || 'application/pdf',
    'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="Teyinat.pdf"',
  });
};

const routeRequest = async (event) => {
  const { admin } = createClients();
  const method = event.httpMethod.toUpperCase();
  const path = getApiPath(event);
  const body = ['POST', 'PATCH', 'PUT'].includes(method) ? parseJsonBody(event) : {};
  const requestUrl = new URL(event.rawUrl || `https://local.refzone${event.path || '/'}`);
  const reportMode = normalizeReportMode(requestUrl.searchParams.get('mode') || body.mode);

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
    await recordUserActivity(admin, currentUser, event);
    return json(200, {
      user: mapUser(currentUser),
    });
  }

  if (method === 'GET' && path === '/activity') {
    return json(200, { activity: await listRecentActivity(admin, currentUser) });
  }

    if (method === 'GET' && path === '/referees') {
      return json(200, { referees: await listReferees(admin, currentUser) });
    }

    if (method === 'GET' && path === `/dashboard/instructor/${currentUser.id}`) {
      return json(200, await getInstructorDashboardData(admin, currentUser.id));
    }

  if (method === 'GET' && path === '/members') {
    return json(200, { members: await listMembers(admin, currentUser) });
  }

  if (method === 'GET' && path === '/news') {
    return json(200, { posts: await listNewsPosts(admin) });
  }

  if (method === 'GET' && path === '/announcements/current') {
    return json(200, { announcement: await getCurrentAnnouncementForUser(admin, currentUser) });
  }

  if (method === 'POST' && path === '/announcements/current') {
    return json(200, {
      message: 'Announcement saved.',
      announcement: await saveCurrentAnnouncement(admin, currentUser, body),
    });
  }

  if (method === 'POST' && path === '/news') {
    return json(201, { posts: await createNewsPost(admin, currentUser, body) });
  }

  const memberMatch = path.match(/^\/members\/([^/]+)$/);
  if (method === 'PATCH' && memberMatch) {
    const member = await updateMemberProfile(
      admin,
      currentUser,
      memberMatch[1],
      body.email,
      body.fullName,
      body.licenseNumber,
      body.photoUrl,
    );
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
    const access = await addAllowedAccess(admin, currentUser, body.email, body.role, body.licenseNumber);
    return json(201, { message: 'Access added.', access });
  }

  const accessMatch = path.match(/^\/access\/([^/]+)$/);
  if (method === 'DELETE' && accessMatch) {
    await deleteAllowedAccess(admin, currentUser, accessMatch[1]);
    return json(200, { message: 'Access deleted.' });
  }

  const newsMatch = path.match(/^\/news\/([^/]+)$/);
  if (method === 'DELETE' && newsMatch) {
    await deleteNewsPost(admin, currentUser, newsMatch[1]);
    return json(200, { message: 'News post deleted.' });
  }

  if (method === 'POST' && path === '/nominations') {
    const nomination = await createNomination(admin, currentUser, body);
    return json(201, { message: 'Nomination created.', nomination });
  }

  const deleteNominationMatch = path.match(/^\/nominations\/([^/]+)$/);
  const editNominationMatch = path.match(/^\/nominations\/([^/]+)$/);
  if (method === 'PATCH' && editNominationMatch) {
    const nomination = await editNominationOfficials(
      admin,
      currentUser,
      editNominationMatch[1],
      body.refereeIds,
    );
    return json(200, { message: 'Nomination updated.', nomination });
  }

  if (method === 'DELETE' && deleteNominationMatch) {
    await deleteNomination(admin, currentUser, deleteNominationMatch[1]);
    return json(200, { message: 'Nomination deleted.' });
  }

  if (method === 'GET' && path === `/nominations/instructor/${currentUser.id}`) {
    return json(200, { nominations: await getInstructorNominationsData(admin, currentUser.id) });
  }

  if (method === 'GET' && path === `/nominations/referee/${currentUser.id}`) {
    return json(200, await getRefereeAssignmentsData(admin, currentUser.id));
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

  const nominationTOMatch = path.match(/^\/nominations\/([^/]+)\/tos$/);
  if (method === 'PATCH' && nominationTOMatch) {
    const nomination = await assignNominationTOs(admin, currentUser, nominationTOMatch[1], body.toIds);
    return json(200, { message: 'TO crew updated.', nomination });
  }

  const nominationScoreMatch = path.match(/^\/nominations\/([^/]+)\/score$/);
  if (method === 'PATCH' && nominationScoreMatch) {
    const nomination = await updateNominationScore(
      admin,
      currentUser,
      nominationScoreMatch[1],
      body.finalScore,
      body.matchVideoUrl,
      body.matchProtocolUrl,
    );
    return json(200, { message: 'Match details updated.', nomination });
  }

  const nominationResponseMatch = path.match(/^\/nominations\/([^/]+)\/respond$/);
  if (method === 'POST' && nominationResponseMatch) {
    const nomination = await respondToNomination(admin, currentUser, nominationResponseMatch[1], body.response);
    return json(200, { message: 'Response saved.', nomination });
  }

  if (method === 'GET' && path === '/reports') {
    return json(200, { reports: await listReportItems(admin, currentUser, reportMode) });
  }

  const reportMatch = path.match(/^\/reports\/([^/]+)\/([^/]+)$/);
  const reportExtendMatch = path.match(/^\/reports\/([^/]+)\/([^/]+)\/extend$/);
  if (method === 'GET' && reportMatch) {
    const report = await getReportDetail(admin, currentUser, reportMatch[1], reportMatch[2], reportMode);
    return json(200, { report });
  }

  if (method === 'POST' && reportExtendMatch) {
    const report = await extendReportDeadline(admin, currentUser, reportExtendMatch[1], reportExtendMatch[2]);
    return json(200, { message: 'Report deadline extended by 24 hours.', report });
  }

  if (method === 'POST' && reportMatch) {
    const report = await saveReport(admin, currentUser, reportMatch[1], reportMatch[2], body, reportMode);
    return json(200, { message: 'Report saved.', report });
  }

  if (method === 'DELETE' && reportMatch) {
    await deleteReport(admin, currentUser, reportMatch[1], reportMatch[2], reportMode);
    return json(200, { message: 'Report deleted.' });
  }

  if (method === 'GET' && path === '/rankings') {
    return json(200, await getRankingDashboard(admin, currentUser));
  }

  if (method === 'GET' && path === '/rankings/to') {
    return json(200, await getRankingDashboard(admin, currentUser, 'TO'));
  }

  if (method === 'GET' && path === '/rankings/admin') {
    return json(200, await getRankingAdminData(admin, currentUser));
  }

  if (method === 'GET' && path === '/rankings/admin/to') {
    return json(200, await getRankingAdminData(admin, currentUser, 'TO'));
  }

  if (method === 'POST' && path === '/teyinat/export') {
    await requireRole(admin, currentUser.id, 'Instructor');
    return proxyTeyinatExport(body);
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
