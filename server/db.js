import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirectory = process.env.AUTH_DATA_DIR || path.join(__dirname, 'data');
const databasePath = process.env.AUTH_DB_PATH || path.join(dataDirectory, 'auth.sqlite');
const seedPath = process.env.AUTH_ALLOWED_EMAILS_PATH || path.join(dataDirectory, 'allowed-emails.seed.json');
const sqlJsDistPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist');

const DEFAULT_PHOTO_URL = 'https://picsum.photos/seed/referee/300/300';
const REPORT_DEADLINE_BASE_MS = 48 * 60 * 60 * 1000;
export const ROLE_OPTIONS = ['Instructor', 'Table', 'Referee', 'Stuff'];
export const ASSIGNMENT_STATUS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};
export const REPORT_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
};
const REPORT_MODE = {
  STANDARD: 'standard',
  TEST_TO: 'test_to',
};

const DEFAULT_ALLOWED_EMAILS = [
  { email: 'instructor@abl.az', displayName: 'ABL Instructor', role: 'Instructor' },
  { email: 'table@abl.az', displayName: 'ABL Table Official', role: 'Table' },
  { email: 'referee@abl.az', displayName: 'ABL Referee', role: 'Referee' },
  { email: 'stuff@abl.az', displayName: 'ABL Stuff', role: 'Stuff' },
];

let dbInstance;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const normalizeEmail = (email) => email.trim().toLowerCase();
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

const buildLicenseNumber = (role, id) => {
  const prefix = {
    Instructor: 'INS',
    Table: 'TAB',
    Referee: 'REF',
    Stuff: 'STF',
  }[role];

  return `ABL-${prefix}-${String(id).padStart(4, '0')}`;
};

const persistDatabase = () => {
  if (!dbInstance) {
    return;
  }

  const data = dbInstance.export();
  fs.writeFileSync(databasePath, Buffer.from(data));
};

const queryAll = (sql, params = []) => {
  const statement = dbInstance.prepare(sql);
  const rows = [];

  try {
    statement.bind(params);
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }
  } finally {
    statement.free();
  }

  return rows;
};

const queryOne = (sql, params = []) => queryAll(sql, params)[0] ?? null;

const hasMatchStarted = (matchDate, matchTime) => {
  const matchDateTime = new Date(`${matchDate}T${matchTime}:00`);
  return Number.isFinite(matchDateTime.getTime()) && Date.now() >= matchDateTime.getTime();
};

const autoAcceptPastRefereeAssignments = () => {
  const pastNominationIds = queryAll(
    `
      SELECT id, match_date, match_time
      FROM nominations
    `,
  )
    .filter((nomination) => hasMatchStarted(nomination.match_date, nomination.match_time))
    .map((nomination) => Number(nomination.id))
    .filter(Number.isFinite);

  if (!pastNominationIds.length) {
    return;
  }

  const placeholders = pastNominationIds.map(() => '?').join(', ');
  dbInstance.run(
    `
      UPDATE nomination_referees
      SET status = ?, responded_at = COALESCE(responded_at, CURRENT_TIMESTAMP)
      WHERE status = ?
        AND nomination_id IN (${placeholders})
    `,
    [ASSIGNMENT_STATUS.ACCEPTED, ASSIGNMENT_STATUS.PENDING, ...pastNominationIds],
  );
  persistDatabase();
};

const tableHasColumn = (tableName, columnName) =>
  queryAll(`PRAGMA table_info(${tableName})`).some((row) => row.name === columnName);

const createTables = () => {
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS allowed_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT,
      allowed_role TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      photo_url TEXT NOT NULL DEFAULT '${DEFAULT_PHOTO_URL}',
      license_number TEXT,
      allowed_email_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (allowed_email_id) REFERENCES allowed_emails(id)
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS nominations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_by INTEGER NOT NULL,
      game_code TEXT,
      teams TEXT NOT NULL,
      match_date TEXT NOT NULL,
      match_time TEXT NOT NULL,
      venue TEXT NOT NULL,
      final_score TEXT,
      match_video_url TEXT,
      match_protocol_url TEXT,
      referee_fee REAL,
      to_fee REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS nomination_referees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomination_id INTEGER NOT NULL,
      referee_id INTEGER NOT NULL,
      slot_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT '${ASSIGNMENT_STATUS.PENDING}',
      responded_at TEXT,
      FOREIGN KEY (nomination_id) REFERENCES nominations(id) ON DELETE CASCADE,
      FOREIGN KEY (referee_id) REFERENCES users(id),
      UNIQUE (nomination_id, slot_number)
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomination_id INTEGER NOT NULL,
      referee_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      author_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '${REPORT_STATUS.DRAFT}',
      score INTEGER NOT NULL DEFAULT 0,
      three_po_iot TEXT NOT NULL DEFAULT '',
      criteria TEXT NOT NULL DEFAULT '',
      teamwork TEXT NOT NULL DEFAULT '',
      generally TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (nomination_id) REFERENCES nominations(id) ON DELETE CASCADE,
      FOREIGN KEY (referee_id) REFERENCES users(id),
      FOREIGN KEY (author_id) REFERENCES users(id),
      UNIQUE (nomination_id, referee_id, author_id)
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS test_report_tos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      author_role TEXT NOT NULL DEFAULT 'Instructor',
      referee_id INTEGER NOT NULL,
      game_code TEXT NOT NULL DEFAULT '',
      teams TEXT NOT NULL DEFAULT '',
      match_date TEXT NOT NULL DEFAULT '',
      match_time TEXT NOT NULL DEFAULT '',
      venue TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '${REPORT_STATUS.DRAFT}',
      score INTEGER NOT NULL DEFAULT 0,
      three_po_iot TEXT NOT NULL DEFAULT '',
      criteria TEXT NOT NULL DEFAULT '',
      teamwork TEXT NOT NULL DEFAULT '',
      generally TEXT NOT NULL DEFAULT '',
      google_drive_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id),
      FOREIGN KEY (referee_id) REFERENCES users(id)
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS ranking_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referee_id INTEGER NOT NULL,
      game_code TEXT NOT NULL,
      evaluation_date TEXT NOT NULL,
      score INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS ranking_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referee_id INTEGER NOT NULL UNIQUE,
      physical_fitness INTEGER NOT NULL DEFAULT 0,
      mechanics INTEGER NOT NULL DEFAULT 0,
      iot INTEGER NOT NULL DEFAULT 0,
      criteria_score INTEGER NOT NULL DEFAULT 0,
      teamwork_score INTEGER NOT NULL DEFAULT 0,
      game_control INTEGER NOT NULL DEFAULT 0,
      new_philosophy INTEGER NOT NULL DEFAULT 0,
      communication INTEGER NOT NULL DEFAULT 0,
      updated_by INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );
  `);
};

const migrateTables = () => {
  if (!tableHasColumn('allowed_emails', 'allowed_role')) {
    dbInstance.run('ALTER TABLE allowed_emails ADD COLUMN allowed_role TEXT');
  }

  if (!tableHasColumn('nominations', 'game_code')) {
    dbInstance.run('ALTER TABLE nominations ADD COLUMN game_code TEXT');
  }

  if (!tableHasColumn('nominations', 'final_score')) {
    dbInstance.run('ALTER TABLE nominations ADD COLUMN final_score TEXT');
  }

  if (!tableHasColumn('nominations', 'match_video_url')) {
    dbInstance.run('ALTER TABLE nominations ADD COLUMN match_video_url TEXT');
  }

  if (!tableHasColumn('nominations', 'match_protocol_url')) {
    dbInstance.run('ALTER TABLE nominations ADD COLUMN match_protocol_url TEXT');
  }

  if (!tableHasColumn('nominations', 'referee_fee')) {
    dbInstance.run('ALTER TABLE nominations ADD COLUMN referee_fee REAL');
  }

  if (!tableHasColumn('nominations', 'to_fee')) {
    dbInstance.run('ALTER TABLE nominations ADD COLUMN to_fee REAL');
  }
};

const loadSeedData = () => {
  if (!fs.existsSync(seedPath)) {
    return DEFAULT_ALLOWED_EMAILS;
  }

  try {
    const content = fs.readFileSync(seedPath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ALLOWED_EMAILS;
  } catch {
    return DEFAULT_ALLOWED_EMAILS;
  }
};

const writeSeedData = (entries) => {
  fs.mkdirSync(path.dirname(seedPath), { recursive: true });
  fs.writeFileSync(seedPath, JSON.stringify(entries, null, 2));
};

const seedAllowedEmails = () => {
  const seedEntries = loadSeedData();
  const normalizedEmails = [];

  for (const entry of seedEntries) {
    if (!entry || typeof entry.email !== 'string' || !ROLE_OPTIONS.includes(entry.role)) {
      continue;
    }

    const normalizedEmail = normalizeEmail(entry.email);
    normalizedEmails.push(normalizedEmail);

    dbInstance.run(
      `
        INSERT INTO allowed_emails (email, display_name, allowed_role)
        VALUES (?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          display_name = excluded.display_name,
          allowed_role = excluded.allowed_role
      `,
      [normalizedEmail, entry.displayName ?? null, entry.role],
    );
  }

  if (normalizedEmails.length === 0) {
    return;
  }

  const placeholders = normalizedEmails.map(() => '?').join(', ');
  dbInstance.run(
    `
      DELETE FROM allowed_emails
      WHERE email NOT IN (${placeholders})
      AND id NOT IN (
        SELECT allowed_email_id
        FROM users
      )
    `,
    normalizedEmails,
  );
};

const mapUser = (row) => ({
  id: String(row.id),
  email: row.email,
  fullName: row.full_name,
  photoUrl: row.photo_url || DEFAULT_PHOTO_URL,
  licenseNumber: row.license_number || 'Pending',
  role: row.role,
  category: row.role,
});

const mapAllowedAccess = (row) => ({
  id: String(row.id),
  email: row.email,
  displayName: row.display_name || '',
  role: row.allowed_role,
});

const mapRankingEvaluation = (row) => ({
  id: String(row.id),
  refereeId: String(row.referee_id),
  refereeName: row.referee_name,
  gameCode: row.game_code,
  evaluationDate: row.evaluation_date,
  score: Number(row.score),
  note: row.note || '',
});

const mapRankingPerformanceProfile = (row) =>
  row
    ? {
        refereeId: String(row.referee_id),
        refereeName: row.referee_name,
        physicalFitness: Number(row.physical_fitness ?? 0),
        mechanics: Number(row.mechanics ?? 0),
        iot: Number(row.iot ?? 0),
        criteriaScore: Number(row.criteria_score ?? 0),
        teamworkScore: Number(row.teamwork_score ?? 0),
        gameControl: Number(row.game_control ?? 0),
        newPhilosophy: Number(row.new_philosophy ?? 0),
        communication: Number(row.communication ?? 0),
      }
    : null;

const mapReportEntry = (row) =>
  row
    ? {
        id: String(row.id),
        authorRole: row.author_role || 'Instructor',
        status: row.status,
        feedbackScore: Number(row.score ?? 0),
        threePO_IOT: row.three_po_iot || '',
        criteria: row.criteria || '',
        teamwork: row.teamwork || '',
        generally: row.generally || '',
        googleDriveUrl: row.google_drive_url || '',
        visibleToRefereeIds: row.referee_id ? [String(row.referee_id)] : [],
        updatedAt: row.updated_at,
      }
    : null;

const getUserByEmail = (email) =>
  queryOne(
    `
      SELECT id, email, full_name, role, photo_url, license_number, allowed_email_id
      FROM users
      WHERE email = ?
    `,
    [normalizeEmail(email)],
  );

const getUserById = (id) =>
  queryOne(
    `
      SELECT id, email, full_name, role, photo_url, license_number, allowed_email_id
      FROM users
      WHERE id = ?
    `,
    [Number(id)],
  );

const requireUser = (userId) => {
  const user = queryOne(
    `
      SELECT id, email, full_name, role, photo_url, license_number, allowed_email_id
      FROM users
      WHERE id = ?
    `,
    [Number(userId)],
  );

  if (!user) {
    throw new HttpError(404, 'User not found.');
  }

  return user;
};

const requireRole = (userId, role) => {
  const user = requireUser(userId);

  if (user.role !== role) {
    throw new HttpError(403, `Only ${role} accounts can perform this action.`);
  }

  return user;
};

const requireNominationOwner = (nominationId, instructorId) => {
  const nomination = queryOne(
    `
      SELECT id, created_by, game_code, teams, match_date, match_time, venue, created_at
      FROM nominations
      WHERE id = ?
    `,
    [Number(nominationId)],
  );

  if (!nomination) {
    throw new HttpError(404, 'Nomination not found.');
  }

  if (Number(nomination.created_by) !== Number(instructorId)) {
    throw new HttpError(403, 'This nomination belongs to another instructor.');
  }

  return nomination;
};

const requireAssignment = (nominationId, refereeId) => {
  const assignment = queryOne(
    `
      SELECT
        nr.id AS assignment_id,
        nr.slot_number,
        nr.status AS assignment_status,
        n.id AS nomination_id,
        n.created_by,
        n.game_code,
        n.teams,
        n.match_date,
        n.match_time,
        n.venue,
        referee.full_name AS referee_name
      FROM nomination_referees nr
      JOIN nominations n ON n.id = nr.nomination_id
      JOIN users referee ON referee.id = nr.referee_id
      WHERE nr.nomination_id = ? AND nr.referee_id = ?
    `,
    [Number(nominationId), Number(refereeId)],
  );

  if (!assignment) {
    throw new HttpError(404, 'Assignment not found.');
  }

  return assignment;
};

const getAssignmentDeadline = (assignment) => {
  const matchDateTime = new Date(`${assignment.match_date}T${assignment.match_time}:00`);
  return new Date(matchDateTime.getTime() + REPORT_DEADLINE_BASE_MS);
};

const isReportDeadlineExceeded = (assignment) => {
  const deadline = getAssignmentDeadline(assignment);
  return Number.isFinite(deadline.getTime()) && Date.now() > deadline.getTime();
};

const getDeadlineMessage = (assignment) => {
  const deadline = getAssignmentDeadline(assignment);
  if (!Number.isFinite(deadline.getTime())) {
    return 'Report deadline could not be calculated.';
  }

  return `Report deadline expired on ${deadline.toLocaleString()}.`;
};

const ensureDistinctReferees = (refereeIds) => {
  const normalized = refereeIds.map((id) => Number(id));
  const unique = new Set(normalized);

  if (normalized.length !== 3 || unique.size !== 3 || normalized.some((id) => Number.isNaN(id))) {
    throw new HttpError(400, 'Select exactly 3 different referees.');
  }

  return normalized;
};

const requireReferees = (refereeIds) => {
  const placeholders = refereeIds.map(() => '?').join(', ');
  const rows = queryAll(
    `
      SELECT id, full_name, role
      FROM users
      WHERE id IN (${placeholders})
    `,
    refereeIds,
  );

  if (rows.length !== refereeIds.length) {
    throw new HttpError(404, 'One or more referees were not found.');
  }

  for (const row of rows) {
    if (row.role !== 'Referee') {
      throw new HttpError(400, 'Only users with role Referee can be assigned.');
    }
  }

  return rows;
};

const listRankingRefereeUsers = () =>
  queryAll(
    `
      SELECT id, full_name
      FROM users
      WHERE role = 'Referee'
      ORDER BY full_name ASC
    `,
  );

const getRankingEvaluationsRaw = () =>
  queryAll(
    `
      SELECT
        re.id,
        re.referee_id,
        referee.full_name AS referee_name,
        re.game_code,
        re.evaluation_date,
        re.score,
        re.note
      FROM ranking_evaluations re
      JOIN users referee ON referee.id = re.referee_id
      ORDER BY re.evaluation_date ASC, re.id ASC
    `,
  );

const getRankingPerformanceRaw = () =>
  queryAll(
    `
      SELECT
        rp.referee_id,
        referee.full_name AS referee_name,
        rp.physical_fitness,
        rp.mechanics,
        rp.iot,
        rp.criteria_score,
        rp.teamwork_score,
        rp.game_control,
        rp.new_philosophy,
        rp.communication
      FROM ranking_performance rp
      JOIN users referee ON referee.id = rp.referee_id
    `,
  );

const calculatePerformanceTotal = (profile) =>
  (profile?.physicalFitness ?? 0) +
  (profile?.mechanics ?? 0) +
  (profile?.iot ?? 0) +
  (profile?.criteriaScore ?? 0) +
  (profile?.teamworkScore ?? 0) +
  (profile?.gameControl ?? 0) +
  (profile?.newPhilosophy ?? 0) +
  (profile?.communication ?? 0);

const buildRankingState = () => {
  const referees = listRankingRefereeUsers();
  const evaluations = getRankingEvaluationsRaw().map(mapRankingEvaluation);
  const performanceProfiles = new Map(
    getRankingPerformanceRaw().map((row) => {
      const profile = mapRankingPerformanceProfile(row);
      return [profile.refereeId, profile];
    }),
  );

  const totalGameScores = new Map(referees.map((referee) => [String(referee.id), 0]));
  for (const evaluation of evaluations) {
    totalGameScores.set(evaluation.refereeId, (totalGameScores.get(evaluation.refereeId) || 0) + evaluation.score);
  }

  const leaderboard = referees
    .map((referee) => {
      const refereeId = String(referee.id);
      const performanceProfile = performanceProfiles.get(refereeId) ?? null;
      const performanceScore = calculatePerformanceTotal(performanceProfile);
      const totalGameScore = totalGameScores.get(refereeId) || 0;

      return {
        refereeId,
        refereeName: referee.full_name,
        totalGameScore,
        performanceScore,
        overallScore: totalGameScore + performanceScore,
        rank: 0,
      };
    })
    .sort((a, b) => {
      if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
      if (b.totalGameScore !== a.totalGameScore) return b.totalGameScore - a.totalGameScore;
      return a.refereeName.localeCompare(b.refereeName);
    })
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return { referees, evaluations, performanceProfiles, leaderboard };
};

const buildRankingHistory = (targetRefereeId, rankingState) => {
  const targetEvaluations = rankingState.evaluations.filter((item) => item.refereeId === String(targetRefereeId));
  if (targetEvaluations.length === 0) {
    return [];
  }

  const referees = rankingState.referees.map((item) => ({ id: String(item.id), name: item.full_name }));
  const performanceProfiles = rankingState.performanceProfiles;
  const runningScores = new Map(referees.map((referee) => [referee.id, 0]));
  const history = [];

  for (const evaluation of rankingState.evaluations) {
    runningScores.set(evaluation.refereeId, (runningScores.get(evaluation.refereeId) || 0) + evaluation.score);

    if (evaluation.refereeId !== String(targetRefereeId)) {
      continue;
    }

    const snapshot = referees
      .map((referee) => {
        const performanceScore = calculatePerformanceTotal(performanceProfiles.get(referee.id) ?? null);
        const totalGameScore = runningScores.get(referee.id) || 0;
        return {
          refereeId: referee.id,
          overallScore: totalGameScore + performanceScore,
          totalGameScore,
          refereeName: referee.name,
        };
      })
      .sort((a, b) => {
        if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
        if (b.totalGameScore !== a.totalGameScore) return b.totalGameScore - a.totalGameScore;
        return a.refereeName.localeCompare(b.refereeName);
      });

    const rank = snapshot.findIndex((item) => item.refereeId === String(targetRefereeId)) + 1;
    history.push({
      date: evaluation.evaluationDate,
      rank,
    });
  }

  return history;
};

const groupInstructorNominations = (rows) => {
  const grouped = new Map();

  for (const row of rows) {
    const nominationId = String(row.nomination_id);

    if (!grouped.has(nominationId)) {
      grouped.set(nominationId, {
        id: nominationId,
        gameCode: row.game_code || 'ABL-NEW',
        teams: row.teams,
        matchDate: row.match_date,
        matchTime: row.match_time,
        venue: row.venue,
        finalScore: row.final_score || null,
        matchVideoUrl: row.match_video_url || null,
        matchProtocolUrl: row.match_protocol_url || null,
        refereeFee: row.referee_fee ?? null,
        toFee: row.to_fee ?? null,
        createdAt: row.created_at,
        referees: [],
      });
    }

    grouped.get(nominationId).referees.push({
      slotNumber: Number(row.slot_number),
      refereeId: String(row.referee_id),
      refereeName: row.referee_name,
      status: row.status,
      respondedAt: row.responded_at || null,
    });
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    referees: item.referees.sort((a, b) => a.slotNumber - b.slotNumber),
  }));
};

const getReportByAuthor = (nominationId, refereeId, authorId) =>
  queryOne(
    `
      SELECT *
      FROM reports
      WHERE nomination_id = ? AND referee_id = ? AND author_id = ?
    `,
    [Number(nominationId), Number(refereeId), Number(authorId)],
  );

const getSubmittedRefereeReport = (nominationId, refereeId) =>
  queryOne(
    `
      SELECT *
      FROM reports
      WHERE nomination_id = ? AND referee_id = ? AND author_role = 'Referee' AND status = ?
    `,
    [Number(nominationId), Number(refereeId), REPORT_STATUS.SUBMITTED],
  );

const getVisibleInstructorReportForReferee = (nominationId, refereeId) =>
  queryOne(
    `
      SELECT *
      FROM reports
      WHERE nomination_id = ? AND referee_id = ? AND author_role = 'Instructor' AND status = ?
    `,
    [Number(nominationId), Number(refereeId), REPORT_STATUS.REVIEWED],
  );

const getManualTestReportTOById = (reportId) =>
  queryOne(
    `
      SELECT *
      FROM test_report_tos
      WHERE id = ?
    `,
    [Number(reportId)],
  );

const buildReportListItem = (row) => ({
  nominationId: String(row.nomination_id),
  refereeId: String(row.referee_id),
  gameCode: row.game_code || 'ABL-NEW',
  teams: row.teams,
  matchDate: row.match_date,
  matchTime: row.match_time,
  venue: row.venue,
  refereeName: row.referee_name,
  slotNumber: Number(row.slot_number),
  refereeReportStatus: row.referee_report_status || null,
  instructorReportStatus: row.instructor_report_status || null,
  reviewScore: row.review_score === null || row.review_score === undefined ? null : Number(row.review_score),
  deadlineExceeded: false,
  deadlineMessage: null,
  reportDeadlineAt: null,
  canAddTime: false,
  reportMode: row.report_mode || REPORT_MODE.STANDARD,
  googleDriveUrl: row.google_drive_url || null,
  visibleToRefereeIds: row.referee_id ? [String(row.referee_id)] : [],
});

const buildManualTestReportTOListItem = (row) =>
  buildReportListItem({
    nomination_id: row.id,
    referee_id: row.referee_id,
    game_code: row.game_code || 'NEW',
    teams: row.teams || '',
    match_date: row.match_date || '',
    match_time: row.match_time || '',
    venue: row.venue || '',
    referee_name: row.referee_name,
    slot_number: 0,
    referee_report_status: null,
    instructor_report_status: row.status || null,
    review_score: row.score ?? null,
    report_mode: REPORT_MODE.TEST_TO,
    google_drive_url: row.google_drive_url || null,
  });

const upsertReport = ({
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
  const existing = getReportByAuthor(nominationId, refereeId, authorId);
  const normalizedScore = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Number(score))) : 0;

  if (existing) {
    dbInstance.run(
      `
        UPDATE reports
        SET status = ?, score = ?, three_po_iot = ?, criteria = ?, teamwork = ?, generally = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [status, normalizedScore, threePO_IOT, criteria, teamwork, generally, Number(existing.id)],
    );
    return;
  }

  dbInstance.run(
    `
      INSERT INTO reports (
        nomination_id, referee_id, author_id, author_role, status, score, three_po_iot, criteria, teamwork, generally
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [Number(nominationId), Number(refereeId), Number(authorId), authorRole, status, normalizedScore, threePO_IOT, criteria, teamwork, generally],
  );
};

const upsertManualTestReportTO = ({
  reportId,
  authorId,
  refereeId,
  gameCode,
  teams,
  matchDate,
  matchTime,
  venue,
  status,
  score,
  threePO_IOT,
  criteria,
  teamwork,
  generally,
  googleDriveUrl,
}) => {
  const normalizedScore = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Number(score))) : 0;

  if (reportId && Number(reportId) > 0) {
    dbInstance.run(
      `
        UPDATE test_report_tos
        SET referee_id = ?, game_code = ?, teams = ?, match_date = ?, match_time = ?, venue = ?, status = ?, score = ?, three_po_iot = ?, criteria = ?, teamwork = ?, generally = ?, google_drive_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        Number(refereeId),
        gameCode,
        teams,
        matchDate,
        matchTime,
        venue,
        status,
        normalizedScore,
        threePO_IOT,
        criteria,
        teamwork,
        generally,
        googleDriveUrl,
        Number(reportId),
      ],
    );
    return Number(reportId);
  }

  dbInstance.run(
    `
      INSERT INTO test_report_tos (
        author_id, author_role, referee_id, game_code, teams, match_date, match_time, venue, status, score, three_po_iot, criteria, teamwork, generally, google_drive_url
      )
      VALUES (?, 'Instructor', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [Number(authorId), Number(refereeId), gameCode, teams, matchDate, matchTime, venue, status, normalizedScore, threePO_IOT, criteria, teamwork, generally, googleDriveUrl],
  );

  return queryOne('SELECT last_insert_rowid() AS id')?.id ?? null;
};

export const initializeDatabase = async () => {
  if (dbInstance) {
    return dbInstance;
  }

  fs.mkdirSync(dataDirectory, { recursive: true });

  const sqlModule = await initSqlJs({
    locateFile: (file) => path.join(sqlJsDistPath, file),
  });

  if (fs.existsSync(databasePath)) {
    const fileBuffer = fs.readFileSync(databasePath);
    dbInstance = new sqlModule.Database(fileBuffer);
  } else {
    dbInstance = new sqlModule.Database();
  }

  dbInstance.run('PRAGMA foreign_keys = ON;');
  createTables();
  migrateTables();
  seedAllowedEmails();
  persistDatabase();

  return dbInstance;
};

export const registerUser = async ({ email, password, fullName, role }) => {
  const normalizedEmail = normalizeEmail(email || '');
  const trimmedName = (fullName || '').trim();

  if (!normalizedEmail || !password || !trimmedName) {
    throw new HttpError(400, 'Fill in full name, e-mail and password.');
  }

  if (!ROLE_OPTIONS.includes(role)) {
    throw new HttpError(400, 'Choose a valid role.');
  }

  const allowedEmail = queryOne(
    'SELECT id, allowed_role FROM allowed_emails WHERE email = ?',
    [normalizedEmail],
  );

  if (!allowedEmail) {
    throw new HttpError(403, 'Registration is allowed only for e-mails from the allowed list.');
  }

  if (allowedEmail.allowed_role && allowedEmail.allowed_role !== role) {
    throw new HttpError(403, `This e-mail is approved only for the ${allowedEmail.allowed_role} role.`);
  }

  const existingUser = getUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new HttpError(409, 'A user with this e-mail already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  dbInstance.run(
    `
      INSERT INTO users (email, full_name, password_hash, role, photo_url, license_number, allowed_email_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [normalizedEmail, trimmedName, passwordHash, role, DEFAULT_PHOTO_URL, '', allowedEmail.id],
  );

  const insertedRow = queryOne('SELECT last_insert_rowid() AS id');
  const userId = Number(insertedRow?.id);
  const licenseNumber = buildLicenseNumber(role, userId);

  dbInstance.run('UPDATE users SET license_number = ? WHERE id = ?', [licenseNumber, userId]);
  persistDatabase();

  return mapUser(getUserById(userId));
};

export const authenticateUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email || '');

  if (!normalizedEmail || !password) {
    throw new HttpError(400, 'Enter e-mail and password.');
  }

  const userRow = queryOne(
    `
      SELECT id, email, full_name, role, photo_url, license_number, password_hash
      FROM users
      WHERE email = ?
    `,
    [normalizedEmail],
  );

  if (!userRow) {
    throw new HttpError(401, 'Invalid e-mail or password.');
  }

  const isValidPassword = await bcrypt.compare(password, userRow.password_hash);
  if (!isValidPassword) {
    throw new HttpError(401, 'Invalid e-mail or password.');
  }

  return mapUser(userRow);
};

export const listReferees = (requestingUserId) => {
  requireRole(requestingUserId, 'Instructor');

  return queryAll(
    `
      SELECT id, full_name, email, license_number
      FROM users
      WHERE role = 'Referee'
      ORDER BY full_name ASC
    `,
  ).map((row) => ({
    id: String(row.id),
    fullName: row.full_name,
    email: row.email,
    licenseNumber: row.license_number || 'Pending',
  }));
};

export const listMembers = (requestingUserId) => {
  requireRole(requestingUserId, 'Instructor');

  return queryAll(
    `
      SELECT id, email, full_name, role, photo_url, license_number
      FROM users
      ORDER BY role ASC, full_name ASC
    `,
  ).map(mapUser);
};

export const updateMemberProfile = ({ instructorId, memberId, email, fullName, licenseNumber, photoUrl }) => {
  requireRole(instructorId, 'Instructor');
  const member = requireUser(memberId);
  const normalizedEmail = normalizeEmail(email || '');
  const trimmedName = (fullName || '').trim();
  const trimmedLicenseNumber = (licenseNumber || '').trim();
  const nextPhotoUrl = (photoUrl || '').trim();

  if (!normalizedEmail) {
    throw new HttpError(400, 'E-mail is required.');
  }

  if (!trimmedName) {
    throw new HttpError(400, 'Full name is required.');
  }

  if (!trimmedLicenseNumber) {
    throw new HttpError(400, 'License is required.');
  }

  const existingUser = getUserByEmail(normalizedEmail);
  if (existingUser && Number(existingUser.id) !== Number(memberId)) {
    throw new HttpError(409, 'A user with this e-mail already exists.');
  }

  let nextAllowedEmailId = Number(member.allowed_email_id || 0) || null;
  if (normalizedEmail !== normalizeEmail(member.email || '')) {
    const currentAllowedEmail =
      nextAllowedEmailId !== null
        ? queryOne('SELECT id, email, allowed_role FROM allowed_emails WHERE id = ?', [nextAllowedEmailId])
        : null;
    const existingAllowedEmail = queryOne('SELECT id, email, allowed_role FROM allowed_emails WHERE email = ?', [normalizedEmail]);

    if (existingAllowedEmail && Number(existingAllowedEmail.id) !== Number(nextAllowedEmailId)) {
      const linkedUser = queryOne('SELECT id FROM users WHERE allowed_email_id = ? AND id != ? LIMIT 1', [
        Number(existingAllowedEmail.id),
        Number(memberId),
      ]);
      if (linkedUser) {
        throw new HttpError(409, 'This e-mail is already linked to another registered user.');
      }

      nextAllowedEmailId = Number(existingAllowedEmail.id);
    } else if (currentAllowedEmail) {
      dbInstance.run('UPDATE allowed_emails SET email = ?, allowed_role = ? WHERE id = ?', [
        normalizedEmail,
        member.role,
        Number(currentAllowedEmail.id),
      ]);
    } else {
      dbInstance.run('INSERT INTO allowed_emails (email, display_name, allowed_role) VALUES (?, ?, ?)', [
        normalizedEmail,
        trimmedName,
        member.role,
      ]);
      const insertedAllowedEmail = queryOne('SELECT last_insert_rowid() AS id');
      nextAllowedEmailId = Number(insertedAllowedEmail?.id || 0) || null;
    }
  }

  dbInstance.run(
    `
      UPDATE users
      SET email = ?, full_name = ?, photo_url = ?, license_number = ?, allowed_email_id = ?
      WHERE id = ?
    `,
    [
      normalizedEmail,
      trimmedName,
      nextPhotoUrl || member.photo_url || DEFAULT_PHOTO_URL,
      trimmedLicenseNumber,
      nextAllowedEmailId,
      Number(memberId),
    ],
  );

  persistDatabase();

  return mapUser(getUserById(memberId));
};

export const deleteMember = ({ instructorId, memberId }) => {
  requireRole(instructorId, 'Instructor');

  if (Number(instructorId) === Number(memberId)) {
    throw new HttpError(400, 'Instructor cannot delete their own account.');
  }

  requireUser(memberId);

  const createdNominations = queryOne(
    'SELECT id FROM nominations WHERE created_by = ? LIMIT 1',
    [Number(memberId)],
  );

  if (createdNominations) {
    throw new HttpError(409, 'Cannot delete a user who has created nominations.');
  }

  const activeAssignments = queryOne(
    'SELECT id FROM nomination_referees WHERE referee_id = ? LIMIT 1',
    [Number(memberId)],
  );

  if (activeAssignments) {
    throw new HttpError(409, 'Cannot delete a user who is assigned to nominations.');
  }

  dbInstance.run('DELETE FROM users WHERE id = ?', [Number(memberId)]);
  persistDatabase();
};

export const listAllowedAccess = (requestingUserId) => {
  requireRole(requestingUserId, 'Instructor');

  return queryAll(
    `
      SELECT id, email, display_name, allowed_role
      FROM allowed_emails
      ORDER BY email ASC
    `,
  ).map(mapAllowedAccess);
};

export const addAllowedAccess = ({ instructorId, email, role }) => {
  requireRole(instructorId, 'Instructor');

  const normalizedEmail = normalizeEmail(email || '');

  if (!normalizedEmail) {
    throw new HttpError(400, 'E-mail is required.');
  }

  if (!ROLE_OPTIONS.includes(role)) {
    throw new HttpError(400, 'Choose a valid role.');
  }

  dbInstance.run(
    `
      INSERT INTO allowed_emails (email, display_name, allowed_role)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        allowed_role = excluded.allowed_role
    `,
    [normalizedEmail, null, role],
  );

  const currentSeedEntries = loadSeedData().filter((entry) => entry && typeof entry.email === 'string');
  const nextSeedEntries = currentSeedEntries.filter((entry) => normalizeEmail(entry.email) !== normalizedEmail);
  nextSeedEntries.push({
    email: normalizedEmail,
    displayName: currentSeedEntries.find((entry) => normalizeEmail(entry.email) === normalizedEmail)?.displayName ?? '',
    role,
  });
  nextSeedEntries.sort((a, b) => a.email.localeCompare(b.email));
  writeSeedData(nextSeedEntries);

  persistDatabase();

  return mapAllowedAccess(
    queryOne('SELECT id, email, display_name, allowed_role FROM allowed_emails WHERE email = ?', [normalizedEmail]),
  );
};

export const deleteAllowedAccess = ({ instructorId, accessId }) => {
  requireRole(instructorId, 'Instructor');

  const access = queryOne('SELECT id, email FROM allowed_emails WHERE id = ?', [Number(accessId)]);
  if (!access) {
    throw new HttpError(404, 'Access entry not found.');
  }

  const linkedUser = queryOne('SELECT id FROM users WHERE allowed_email_id = ? LIMIT 1', [Number(accessId)]);
  if (linkedUser) {
    throw new HttpError(409, 'Cannot delete access for an e-mail that is already linked to a registered user.');
  }

  dbInstance.run('DELETE FROM allowed_emails WHERE id = ?', [Number(accessId)]);

  const nextSeedEntries = loadSeedData().filter(
    (entry) => normalizeEmail(entry.email || '') !== normalizeEmail(access.email),
  );
  writeSeedData(nextSeedEntries);

  persistDatabase();
};

export const deleteNomination = ({ instructorId, nominationId }) => {
  requireRole(instructorId, 'Instructor');
  requireNominationOwner(nominationId, instructorId);

  dbInstance.run('DELETE FROM nominations WHERE id = ?', [Number(nominationId)]);
  persistDatabase();
};

export const createNomination = ({ instructorId, gameCode, teams, matchDate, matchTime, venue, refereeIds }) => {
  requireRole(instructorId, 'Instructor');

  const trimmedGameCode = (gameCode || '').trim();
  const trimmedTeams = (teams || '').trim();
  const trimmedVenue = (venue || '').trim();

  if (!trimmedGameCode || !trimmedTeams || !matchDate || !matchTime || !trimmedVenue) {
    throw new HttpError(400, 'Fill in game number, teams, date, time and venue.');
  }

  const normalizedRefereeIds = ensureDistinctReferees(refereeIds || []);
  requireReferees(normalizedRefereeIds);
  const shouldAutoAcceptAssignments =
    Number.isFinite(new Date(`${matchDate}T${matchTime}:00`).getTime()) &&
    Date.now() >= new Date(`${matchDate}T${matchTime}:00`).getTime();

  dbInstance.run(
    `
      INSERT INTO nominations (created_by, game_code, teams, match_date, match_time, venue)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [Number(instructorId), trimmedGameCode, trimmedTeams, matchDate, matchTime, trimmedVenue],
  );

  const nominationId = Number(queryOne('SELECT last_insert_rowid() AS id')?.id);

  normalizedRefereeIds.forEach((refereeId, index) => {
    dbInstance.run(
      `
      INSERT INTO nomination_referees (nomination_id, referee_id, slot_number, status)
      VALUES (?, ?, ?, ?)
      `,
      [nominationId, refereeId, index + 1, shouldAutoAcceptAssignments ? ASSIGNMENT_STATUS.ACCEPTED : ASSIGNMENT_STATUS.PENDING],
    );
  });

  persistDatabase();

  return getInstructorNominations(instructorId).find((item) => item.id === String(nominationId));
};

export const getInstructorNominations = (instructorId) => {
  requireRole(instructorId, 'Instructor');
  autoAcceptPastRefereeAssignments();

  const rows = queryAll(
    `
      SELECT
        n.id AS nomination_id,
        n.game_code,
        n.teams,
        n.match_date,
        n.match_time,
        n.venue,
        n.final_score,
        n.match_video_url,
        n.match_protocol_url,
        n.referee_fee,
        n.to_fee,
        n.created_at,
        nr.slot_number,
        nr.status,
        nr.responded_at,
        u.id AS referee_id,
        u.full_name AS referee_name
      FROM nominations n
      JOIN nomination_referees nr ON nr.nomination_id = n.id
      JOIN users u ON u.id = nr.referee_id
      WHERE n.created_by = ?
      ORDER BY n.match_date ASC, n.match_time ASC, nr.slot_number ASC
    `,
    [Number(instructorId)],
  );

  return groupInstructorNominations(rows);
};

export const replaceNominationReferee = ({ nominationId, slotNumber, instructorId, refereeId }) => {
  requireRole(instructorId, 'Instructor');
  requireNominationOwner(nominationId, instructorId);
  requireReferees([Number(refereeId)]);

  const slot = queryOne(
    `
      SELECT id, referee_id, status
      FROM nomination_referees
      WHERE nomination_id = ? AND slot_number = ?
    `,
    [Number(nominationId), Number(slotNumber)],
  );

  if (!slot) {
    throw new HttpError(404, 'Nomination slot not found.');
  }

  if (slot.status === ASSIGNMENT_STATUS.ACCEPTED) {
    throw new HttpError(400, 'Accepted referee cannot be replaced from this screen.');
  }

  const duplicate = queryOne(
    `
      SELECT id
      FROM nomination_referees
      WHERE nomination_id = ? AND referee_id = ? AND slot_number != ?
    `,
    [Number(nominationId), Number(refereeId), Number(slotNumber)],
  );

  if (duplicate) {
    throw new HttpError(409, 'This referee is already assigned to the game.');
  }

  const nomination = queryOne(
    `
      SELECT match_date, match_time
      FROM nominations
      WHERE id = ?
    `,
    [Number(nominationId)],
  );
  const shouldAutoAcceptAssignment =
    nomination &&
    Number.isFinite(new Date(`${nomination.match_date}T${nomination.match_time}:00`).getTime()) &&
    Date.now() >= new Date(`${nomination.match_date}T${nomination.match_time}:00`).getTime();

  dbInstance.run(
    `
      UPDATE nomination_referees
      SET referee_id = ?, status = ?, responded_at = ?
      WHERE nomination_id = ? AND slot_number = ?
    `,
    [
      Number(refereeId),
      shouldAutoAcceptAssignment ? ASSIGNMENT_STATUS.ACCEPTED : ASSIGNMENT_STATUS.PENDING,
      shouldAutoAcceptAssignment ? new Date().toISOString() : null,
      Number(nominationId),
      Number(slotNumber),
    ],
  );

  persistDatabase();

  return getInstructorNominations(instructorId).find((item) => item.id === String(nominationId));
};

export const getRefereeAssignments = (refereeId) => {
  requireRole(refereeId, 'Referee');
  autoAcceptPastRefereeAssignments();

  return queryAll(
    `
      SELECT
        nr.id AS assignment_id,
        n.id AS nomination_id,
        n.game_code,
        n.teams,
        n.match_date,
        n.match_time,
        n.venue,
        n.final_score,
        n.match_video_url,
        n.match_protocol_url,
        n.referee_fee,
        n.to_fee,
        nr.slot_number,
        nr.status,
        nr.responded_at,
        instructor.full_name AS instructor_name
      FROM nomination_referees nr
      JOIN nominations n ON n.id = nr.nomination_id
      JOIN users instructor ON instructor.id = n.created_by
      WHERE nr.referee_id = ?
      ORDER BY n.match_date ASC, n.match_time ASC
    `,
    [Number(refereeId)],
  ).map((row) => ({
    id: String(row.assignment_id),
    nominationId: String(row.nomination_id),
    gameCode: row.game_code || 'ABL-NEW',
    teams: row.teams,
    matchDate: row.match_date,
    matchTime: row.match_time,
    venue: row.venue,
    finalScore: row.final_score || null,
    matchVideoUrl: row.match_video_url || null,
    matchProtocolUrl: row.match_protocol_url || null,
    refereeFee: row.referee_fee ?? null,
    toFee: row.to_fee ?? null,
    slotNumber: Number(row.slot_number),
    status: row.status,
    respondedAt: row.responded_at || null,
    instructorName: row.instructor_name,
  }));
};

export const respondToNomination = ({ nominationId, refereeId, response }) => {
  requireRole(refereeId, 'Referee');

  if (![ASSIGNMENT_STATUS.ACCEPTED, ASSIGNMENT_STATUS.DECLINED].includes(response)) {
    throw new HttpError(400, 'Response must be Accepted or Declined.');
  }

  const assignment = queryOne(
    `
      SELECT id
      FROM nomination_referees
      WHERE nomination_id = ? AND referee_id = ?
    `,
    [Number(nominationId), Number(refereeId)],
  );

  if (!assignment) {
    throw new HttpError(404, 'Assignment not found.');
  }

  dbInstance.run(
    `
      UPDATE nomination_referees
      SET status = ?, responded_at = CURRENT_TIMESTAMP
      WHERE nomination_id = ? AND referee_id = ?
    `,
    [response, Number(nominationId), Number(refereeId)],
  );

  persistDatabase();

  return getRefereeAssignments(refereeId).find((item) => item.nominationId === String(nominationId));
};

export const updateNominationScore = ({ nominationId, instructorId, finalScore, matchVideoUrl, matchProtocolUrl, refereeFee, toFee }) => {
  requireRole(instructorId, 'Instructor');
  requireNominationOwner(nominationId, instructorId);

  const normalizedFinalScore = (finalScore || '').trim();
  const normalizedMatchVideoUrl = (matchVideoUrl || '').trim();
  const normalizedMatchProtocolUrl = (matchProtocolUrl || '').trim();
  const normalizedRefereeFee =
    refereeFee === '' || refereeFee === null || refereeFee === undefined ? null : Number(String(refereeFee).replace(',', '.'));
  const normalizedTOFee = toFee === '' || toFee === null || toFee === undefined ? null : Number(String(toFee).replace(',', '.'));

  if (!normalizedFinalScore && !normalizedMatchVideoUrl && !normalizedMatchProtocolUrl && normalizedRefereeFee === null && normalizedTOFee === null) {
    throw new HttpError(400, 'Add a final score, a YouTube link, a Google Drive protocol link, or match fees first.');
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

  if (normalizedRefereeFee !== null && (!Number.isFinite(normalizedRefereeFee) || normalizedRefereeFee < 0)) {
    throw new HttpError(400, 'Referee fee must be a valid non-negative number.');
  }

  if (normalizedTOFee !== null && (!Number.isFinite(normalizedTOFee) || normalizedTOFee < 0)) {
    throw new HttpError(400, 'TO fee must be a valid non-negative number.');
  }

  dbInstance.run(
    `
      UPDATE nominations
      SET final_score = ?, match_video_url = ?, match_protocol_url = ?, referee_fee = ?, to_fee = ?
      WHERE id = ?
    `,
    [
      normalizedFinalScore || null,
      normalizedMatchVideoUrl || null,
      normalizedMatchProtocolUrl || null,
      normalizedRefereeFee,
      normalizedTOFee,
      Number(nominationId),
    ],
  );

  persistDatabase();
  return getInstructorNominations(instructorId).find((item) => item.id === String(nominationId)) || null;
};

export const listReportItems = (userId, mode = REPORT_MODE.STANDARD) => {
  const user = requireUser(userId);
  autoAcceptPastRefereeAssignments();

  if (mode === REPORT_MODE.TEST_TO) {
    if (user.role === 'Instructor') {
      return queryAll(
        `
          SELECT tr.*, recipient.full_name AS referee_name
          FROM test_report_tos tr
          JOIN users recipient ON recipient.id = tr.referee_id
          WHERE tr.author_id = ?
          ORDER BY tr.updated_at DESC
        `,
        [Number(userId)],
      ).map(buildManualTestReportTOListItem);
    }

    if (user.role === 'Referee') {
      return queryAll(
        `
          SELECT tr.*, recipient.full_name AS referee_name
          FROM test_report_tos tr
          JOIN users recipient ON recipient.id = tr.referee_id
          WHERE tr.referee_id = ? AND tr.status = ?
          ORDER BY tr.updated_at DESC
        `,
        [Number(userId), REPORT_STATUS.REVIEWED],
      ).map(buildManualTestReportTOListItem);
    }

    return [];
  }

  if (user.role === 'Referee') {
    const standardItems = queryAll(
      `
        SELECT
          n.id AS nomination_id,
          nr.referee_id,
          n.game_code,
          n.teams,
          n.match_date,
          n.match_time,
          n.venue,
          nr.slot_number,
          referee.full_name AS referee_name,
          self_report.status AS referee_report_status,
          instructor_report.status AS instructor_report_status,
          instructor_report.score AS review_score
        FROM nomination_referees nr
        JOIN nominations n ON n.id = nr.nomination_id
        JOIN users referee ON referee.id = nr.referee_id
        LEFT JOIN reports self_report
          ON self_report.nomination_id = nr.nomination_id
          AND self_report.referee_id = nr.referee_id
          AND self_report.author_id = nr.referee_id
        LEFT JOIN reports instructor_report
          ON instructor_report.nomination_id = nr.nomination_id
          AND instructor_report.referee_id = nr.referee_id
          AND instructor_report.author_role = 'Instructor'
          AND instructor_report.status = '${REPORT_STATUS.REVIEWED}'
        WHERE nr.referee_id = ?
          AND nr.status != '${ASSIGNMENT_STATUS.DECLINED}'
        ORDER BY n.match_date DESC, n.match_time DESC
      `,
      [Number(userId)],
    ).map(buildReportListItem);

    const testItems = queryAll(
      `
        SELECT tr.*, recipient.full_name AS referee_name
        FROM test_report_tos tr
        JOIN users recipient ON recipient.id = tr.referee_id
        WHERE tr.referee_id = ? AND tr.status = ?
        ORDER BY tr.updated_at DESC
      `,
      [Number(userId), REPORT_STATUS.REVIEWED],
    ).map(buildManualTestReportTOListItem);

    return [...standardItems, ...testItems].sort((left, right) => {
      const leftKey = `${left.matchDate}T${left.matchTime}`;
      const rightKey = `${right.matchDate}T${right.matchTime}`;
      return rightKey.localeCompare(leftKey);
    });
  }

  if (user.role === 'Instructor') {
    return queryAll(
      `
        SELECT
          n.id AS nomination_id,
          nr.referee_id,
          n.game_code,
          n.teams,
          n.match_date,
          n.match_time,
          n.venue,
          nr.slot_number,
          referee.full_name AS referee_name,
          referee_report.status AS referee_report_status,
          instructor_report.status AS instructor_report_status,
          instructor_report.score AS review_score
        FROM nominations n
        JOIN nomination_referees nr ON nr.nomination_id = n.id
        JOIN users referee ON referee.id = nr.referee_id
        LEFT JOIN reports referee_report
          ON referee_report.nomination_id = nr.nomination_id
          AND referee_report.referee_id = nr.referee_id
          AND referee_report.author_role = 'Referee'
          AND referee_report.status = '${REPORT_STATUS.SUBMITTED}'
        LEFT JOIN reports instructor_report
          ON instructor_report.nomination_id = nr.nomination_id
          AND instructor_report.referee_id = nr.referee_id
          AND instructor_report.author_id = ?
        WHERE n.created_by = ?
          AND nr.status != '${ASSIGNMENT_STATUS.DECLINED}'
        ORDER BY n.match_date DESC, n.match_time DESC, nr.slot_number ASC
      `,
      [Number(userId), Number(userId)],
    ).map(buildReportListItem);
  }

  return [];
};

export const getReportDetail = ({ userId, nominationId, refereeId, mode = REPORT_MODE.STANDARD }) => {
  const user = requireUser(userId);

  if (mode === REPORT_MODE.TEST_TO) {
    const report = getManualTestReportTOById(nominationId);
    if (!report) {
      throw new HttpError(404, 'Report Test TO not found.');
    }

    const recipient = requireUser(report.referee_id);

    if (user.role === 'Instructor') {
      if (Number(report.author_id) !== Number(userId)) {
        throw new HttpError(403, 'This Report Test TO belongs to another instructor.');
      }

      return {
        item: buildManualTestReportTOListItem({
          ...report,
          referee_name: recipient.fullName,
        }),
        refereeReport: null,
        instructorReport: mapReportEntry(report),
        canEditCurrentUserReport: report.status === REPORT_STATUS.DRAFT,
        deadlineExceeded: false,
        deadlineMessage: null,
        reportDeadlineAt: null,
        canAddTime: false,
        visibilityOptions: listReferees(userId).map((item) => ({
          id: item.id,
          fullName: item.fullName,
          slotNumber: 0,
        })),
      };
    }

    if (user.role === 'Referee') {
      if (Number(report.referee_id) !== Number(userId) || report.status !== REPORT_STATUS.REVIEWED) {
        throw new HttpError(404, 'Report Test TO not found.');
      }

      return {
        item: buildManualTestReportTOListItem({
          ...report,
          referee_name: recipient.fullName,
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
  }

  const assignment = requireAssignment(nominationId, refereeId);
  const deadlineExceeded = isReportDeadlineExceeded(assignment);
  const deadlineMessage = deadlineExceeded ? getDeadlineMessage(assignment) : null;

  if (user.role === 'Referee') {
    if (Number(userId) !== Number(refereeId)) {
      throw new HttpError(403, 'Referees can only view their own reports.');
    }

    if (assignment.assignment_status === ASSIGNMENT_STATUS.DECLINED) {
      throw new HttpError(403, 'Declined assignments do not have reports.');
    }

    const ownReport = getReportByAuthor(nominationId, refereeId, userId);
    const instructorReport = getVisibleInstructorReportForReferee(nominationId, refereeId);

    return {
      item: {
        nominationId: String(assignment.nomination_id),
        refereeId: String(refereeId),
        gameCode: assignment.game_code || 'ABL-NEW',
        teams: assignment.teams,
        matchDate: assignment.match_date,
        matchTime: assignment.match_time,
        venue: assignment.venue,
        refereeName: assignment.referee_name,
        slotNumber: Number(assignment.slot_number),
        refereeReportStatus: ownReport?.status || null,
        instructorReportStatus: instructorReport?.status || null,
      },
      refereeReport: mapReportEntry(ownReport),
      instructorReport: mapReportEntry(instructorReport),
      canEditCurrentUserReport: !deadlineExceeded && (!ownReport || ownReport.status === REPORT_STATUS.DRAFT),
      deadlineExceeded,
      deadlineMessage,
    };
  }

  if (user.role === 'Instructor') {
    requireNominationOwner(nominationId, userId);
    const refereeReport = getSubmittedRefereeReport(nominationId, refereeId);
    const ownReport = getReportByAuthor(nominationId, refereeId, userId);

    return {
      item: {
        nominationId: String(assignment.nomination_id),
        refereeId: String(refereeId),
        gameCode: assignment.game_code || 'ABL-NEW',
        teams: assignment.teams,
        matchDate: assignment.match_date,
        matchTime: assignment.match_time,
        venue: assignment.venue,
        refereeName: assignment.referee_name,
        slotNumber: Number(assignment.slot_number),
        refereeReportStatus: refereeReport?.status || null,
        instructorReportStatus: ownReport?.status || null,
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

export const saveReport = ({
  userId,
  nominationId,
  refereeId,
  mode = REPORT_MODE.STANDARD,
  gameCode,
  teams,
  matchDate,
  matchTime,
  venue,
  action,
  feedbackScore,
  threePO_IOT,
  criteria,
  teamwork,
  generally,
}) => {
  const user = requireUser(userId);

  if (mode === REPORT_MODE.TEST_TO) {
    if (user.role !== 'Instructor') {
      throw new HttpError(403, 'Only instructors can save Report Test TO.');
    }

    if (![REPORT_STATUS.DRAFT, REPORT_STATUS.SUBMITTED].includes(action)) {
      throw new HttpError(400, 'Action must be Draft or Submitted.');
    }

    const selectedRefereeId = Number(refereeId);
    const availableRefereeIds = new Set(listReferees(userId).map((item) => Number(item.id)));
    if (!selectedRefereeId || !availableRefereeIds.has(selectedRefereeId)) {
      throw new HttpError(400, 'Choose a referee for Report Test TO.');
    }

    const normalizedGameCode = (gameCode || '').trim();
    const normalizedTeams = (teams || '').trim();
    const normalizedMatchDate = (matchDate || '').trim();
    const normalizedMatchTime = (matchTime || '').trim();
    const normalizedVenue = (venue || '').trim();

    if (action === REPORT_STATUS.SUBMITTED && (!normalizedGameCode || !normalizedTeams || !normalizedMatchDate || !normalizedMatchTime || !normalizedVenue)) {
      throw new HttpError(400, 'Fill in game code, game, date, time and venue before submitting Report Test TO.');
    }

    if (nominationId !== 'new') {
      const existingManualReport = getManualTestReportTOById(nominationId);
      if (!existingManualReport) {
        throw new HttpError(404, 'Report Test TO not found.');
      }
      if (Number(existingManualReport.author_id) !== Number(userId)) {
        throw new HttpError(403, 'This Report Test TO belongs to another instructor.');
      }
      if (existingManualReport.status === REPORT_STATUS.REVIEWED) {
        throw new HttpError(409, 'Submitted Report Test TO cannot be edited.');
      }
    }

    const savedReportId = upsertManualTestReportTO({
      reportId: nominationId === 'new' ? null : nominationId,
      authorId: userId,
      refereeId: selectedRefereeId,
      gameCode: normalizedGameCode,
      teams: normalizedTeams,
      matchDate: normalizedMatchDate,
      matchTime: normalizedMatchTime,
      venue: normalizedVenue,
      status: action === REPORT_STATUS.SUBMITTED ? REPORT_STATUS.REVIEWED : REPORT_STATUS.DRAFT,
      score: Number(feedbackScore || 0),
      threePO_IOT: (threePO_IOT || '').trim(),
      criteria: (criteria || '').trim(),
      teamwork: (teamwork || '').trim(),
      generally: (generally || '').trim(),
      googleDriveUrl: (googleDriveUrl || '').trim(),
    });

    persistDatabase();
    return getReportDetail({ userId, nominationId: String(savedReportId), refereeId: String(selectedRefereeId), mode });
  }

  const assignment = requireAssignment(nominationId, refereeId);

  if (![REPORT_STATUS.DRAFT, REPORT_STATUS.SUBMITTED].includes(action)) {
    throw new HttpError(400, 'Action must be Draft or Submitted.');
  }

  const normalizedPayload = {
    feedbackScore: Number(feedbackScore || 0),
    threePO_IOT: (threePO_IOT || '').trim(),
    criteria: (criteria || '').trim(),
    teamwork: (teamwork || '').trim(),
    generally: (generally || '').trim(),
  };

  if (user.role === 'Referee') {
    if (Number(userId) !== Number(refereeId)) {
      throw new HttpError(403, 'Referees can only edit their own report.');
    }

    if (assignment.assignment_status === ASSIGNMENT_STATUS.DECLINED) {
      throw new HttpError(403, 'Declined assignments do not have reports.');
    }

    if (isReportDeadlineExceeded(assignment)) {
      throw new HttpError(409, getDeadlineMessage(assignment));
    }

    const existing = getReportByAuthor(nominationId, refereeId, userId);
    if (existing?.status === REPORT_STATUS.SUBMITTED) {
      throw new HttpError(409, 'Submitted report cannot be edited.');
    }

    upsertReport({
      nominationId,
      refereeId,
      authorId: userId,
      authorRole: 'Referee',
      status: action,
      score: 0,
      ...normalizedPayload,
    });

    persistDatabase();
    return getReportDetail({ userId, nominationId, refereeId });
  }

  if (user.role === 'Instructor') {
    requireNominationOwner(nominationId, userId);
    const refereeReport = getSubmittedRefereeReport(nominationId, refereeId);

    if (!refereeReport) {
      throw new HttpError(409, 'Instructor can evaluate only after the referee submits their report.');
    }

    const existing = getReportByAuthor(nominationId, refereeId, userId);
    if (existing?.status === REPORT_STATUS.REVIEWED) {
      throw new HttpError(409, 'Reviewed report cannot be edited.');
    }

    upsertReport({
      nominationId,
      refereeId,
      authorId: userId,
      authorRole: 'Instructor',
      status: action === REPORT_STATUS.SUBMITTED ? REPORT_STATUS.REVIEWED : REPORT_STATUS.DRAFT,
      score: normalizedPayload.feedbackScore,
      ...normalizedPayload,
    });

    persistDatabase();
    return getReportDetail({ userId, nominationId, refereeId });
  }

  throw new HttpError(403, 'This role cannot save reports.');
};

export const deleteReport = ({ userId, nominationId, refereeId, mode = REPORT_MODE.STANDARD }) => {
  const user = requireUser(userId);

  if (mode === REPORT_MODE.TEST_TO) {
    if (user.role !== 'Instructor') {
      throw new HttpError(403, 'Only instructors can delete Report Test TO.');
    }

    const report = getManualTestReportTOById(nominationId);
    if (!report) {
      throw new HttpError(404, 'Report Test TO not found.');
    }
    if (Number(report.author_id) !== Number(userId)) {
      throw new HttpError(403, 'This Report Test TO belongs to another instructor.');
    }
    if (report.status !== REPORT_STATUS.DRAFT) {
      throw new HttpError(409, 'Only draft Report Test TO can be deleted.');
    }

    dbInstance.run('DELETE FROM test_report_tos WHERE id = ?', [Number(nominationId)]);
    persistDatabase();
    return;
  }

  if (user.role !== 'Referee' && user.role !== 'Instructor') {
    throw new HttpError(403, 'This role cannot delete reports.');
  }

  if (user.role === 'Referee' && Number(userId) !== Number(refereeId)) {
    throw new HttpError(403, 'Referees can delete only their own draft reports.');
  }

  if (user.role === 'Instructor') {
    requireNominationOwner(nominationId, userId);
  }

  const report = getReportByAuthor(nominationId, refereeId, userId);

  if (!report) {
    throw new HttpError(404, 'Report not found.');
  }

  if (report.status !== REPORT_STATUS.DRAFT) {
    throw new HttpError(409, 'Only draft reports can be deleted.');
  }

  dbInstance.run('DELETE FROM reports WHERE id = ?', [Number(report.id)]);
  persistDatabase();
};

export const getRankingDashboard = (userId) => {
  const user = requireUser(userId);
  const rankingState = buildRankingState();

  if (user.role === 'Referee') {
    const currentUserItem = rankingState.leaderboard.find((item) => item.refereeId === String(userId)) || null;
    const performanceProfile = rankingState.performanceProfiles.get(String(userId)) ?? null;

    return {
      leaderboard: rankingState.leaderboard,
      history: buildRankingHistory(userId, rankingState),
      currentUserItem,
      performanceProfile,
    };
  }

  if (user.role === 'Instructor') {
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

export const getRankingAdminData = (instructorId) => {
  requireRole(instructorId, 'Instructor');
  const rankingState = buildRankingState();

  return {
    leaderboard: rankingState.leaderboard,
    evaluations: rankingState.evaluations,
    performanceProfiles: Array.from(rankingState.performanceProfiles.values()),
    referees: rankingState.referees.map((referee) => ({
      id: String(referee.id),
      fullName: referee.full_name,
    })),
  };
};

export const createRankingEvaluation = ({ instructorId, refereeId, gameCode, evaluationDate, score, note }) => {
  requireRole(instructorId, 'Instructor');
  requireReferees([Number(refereeId)]);

  const normalizedScore = Number(score);
  if (![-1, 0, 1].includes(normalizedScore)) {
    throw new HttpError(400, 'Ranking score must be -1, 0 or 1.');
  }

  const trimmedGameCode = (gameCode || '').trim();
  const trimmedDate = (evaluationDate || '').trim();

  if (!trimmedGameCode || !trimmedDate) {
    throw new HttpError(400, 'Game number and evaluation date are required.');
  }

  dbInstance.run(
    `
      INSERT INTO ranking_evaluations (referee_id, game_code, evaluation_date, score, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [Number(refereeId), trimmedGameCode, trimmedDate, normalizedScore, (note || '').trim(), Number(instructorId)],
  );

  persistDatabase();

  return queryOne('SELECT last_insert_rowid() AS id')?.id;
};

export const saveRankingPerformance = ({
  instructorId,
  refereeId,
  physicalFitness,
  mechanics,
  iot,
  criteriaScore,
  teamworkScore,
  gameControl,
  newPhilosophy,
  communication,
}) => {
  requireRole(instructorId, 'Instructor');
  requireReferees([Number(refereeId)]);

  const values = [
    Number(physicalFitness),
    Number(mechanics),
    Number(iot),
    Number(criteriaScore),
    Number(teamworkScore),
    Number(gameControl),
    Number(newPhilosophy),
    Number(communication),
  ];

  if (values.some((value) => ![-1, 0, 1].includes(value))) {
    throw new HttpError(400, 'Performance values must be -1, 0 or 1.');
  }

  dbInstance.run(
    `
      INSERT INTO ranking_performance (
        referee_id, physical_fitness, mechanics, iot, criteria_score, teamwork_score, game_control, new_philosophy, communication, updated_by, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(referee_id) DO UPDATE SET
        physical_fitness = excluded.physical_fitness,
        mechanics = excluded.mechanics,
        iot = excluded.iot,
        criteria_score = excluded.criteria_score,
        teamwork_score = excluded.teamwork_score,
        game_control = excluded.game_control,
        new_philosophy = excluded.new_philosophy,
        communication = excluded.communication,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      Number(refereeId),
      values[0],
      values[1],
      values[2],
      values[3],
      values[4],
      values[5],
      values[6],
      values[7],
      Number(instructorId),
    ],
  );

  persistDatabase();
};
