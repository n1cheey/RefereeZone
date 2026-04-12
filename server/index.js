import express from 'express';
import {
  authenticateUser,
  addAllowedAccess,
  createNomination,
  createRankingEvaluation,
  deleteNomination,
  deleteReport,
  deleteMember,
  deleteAllowedAccess,
  getReportDetail,
  getRankingAdminData,
  getRankingDashboard,
  getInstructorNominations,
  getRefereeAssignments,
  HttpError,
  initializeDatabase,
  listReportItems,
  listAllowedAccess,
  listMembers,
  listReferees,
  registerUser,
  replaceNominationReferee,
  respondToNomination,
  ROLE_OPTIONS,
  saveRankingPerformance,
  saveReport,
  updateNominationScore,
  updateMemberProfile,
} from './db.js';

const app = express();
const port = Number(process.env.AUTH_SERVER_PORT || 3001);

app.use(express.json());

const handleError = (error, response, fallbackMessage) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ message: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ message: fallbackMessage });
};

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/auth/roles', (_request, response) => {
  response.json({ roles: ROLE_OPTIONS });
});

app.post('/api/auth/register', async (request, response) => {
  try {
    const user = await registerUser(request.body);
    response.status(201).json({
      message: 'Registration completed.',
      user,
    });
  } catch (error) {
    handleError(error, response, 'Server error during registration.');
  }
});

app.post('/api/auth/login', async (request, response) => {
  try {
    const user = await authenticateUser(request.body);
    response.json({
      message: 'Login completed.',
      user,
    });
  } catch (error) {
    handleError(error, response, 'Server error during login.');
  }
});

app.get('/api/referees', (request, response) => {
  try {
    const instructorId = request.query.instructorId;
    const referees = listReferees(instructorId);
    response.json({ referees });
  } catch (error) {
    handleError(error, response, 'Server error while loading referees.');
  }
});

app.get('/api/members', (request, response) => {
  try {
    const members = listMembers(request.query.instructorId);
    response.json({ members });
  } catch (error) {
    handleError(error, response, 'Server error while loading members.');
  }
});

app.patch('/api/members/:memberId', (request, response) => {
  try {
    const member = updateMemberProfile({
      instructorId: request.body.instructorId,
      memberId: request.params.memberId,
      email: request.body.email,
      fullName: request.body.fullName,
      licenseNumber: request.body.licenseNumber,
      photoUrl: request.body.photoUrl,
    });
    response.json({ message: 'Member updated.', member });
  } catch (error) {
    handleError(error, response, 'Server error while updating member.');
  }
});

app.delete('/api/members/:memberId', (request, response) => {
  try {
    deleteMember({
      instructorId: request.query.instructorId,
      memberId: request.params.memberId,
    });
    response.json({ message: 'Member deleted.' });
  } catch (error) {
    handleError(error, response, 'Server error while deleting member.');
  }
});

app.get('/api/access', (request, response) => {
  try {
    const accessList = listAllowedAccess(request.query.instructorId);
    response.json({ accessList });
  } catch (error) {
    handleError(error, response, 'Server error while loading allowed access.');
  }
});

app.post('/api/access', (request, response) => {
  try {
    const access = addAllowedAccess({
      instructorId: request.body.instructorId,
      email: request.body.email,
      role: request.body.role,
    });
    response.status(201).json({ message: 'Access added.', access });
  } catch (error) {
    handleError(error, response, 'Server error while adding access.');
  }
});

app.delete('/api/access/:accessId', (request, response) => {
  try {
    deleteAllowedAccess({
      instructorId: request.query.instructorId,
      accessId: request.params.accessId,
    });
    response.json({ message: 'Access deleted.' });
  } catch (error) {
    handleError(error, response, 'Server error while deleting access.');
  }
});

app.delete('/api/nominations/:nominationId', (request, response) => {
  try {
    deleteNomination({
      instructorId: request.query.instructorId,
      nominationId: request.params.nominationId,
    });
    response.json({ message: 'Nomination deleted.' });
  } catch (error) {
    handleError(error, response, 'Server error while deleting nomination.');
  }
});

app.get('/api/nominations/instructor/:instructorId', (request, response) => {
  try {
    const nominations = getInstructorNominations(request.params.instructorId);
    response.json({ nominations });
  } catch (error) {
    handleError(error, response, 'Server error while loading instructor nominations.');
  }
});

app.get('/api/nominations/referee/:refereeId', (request, response) => {
  try {
    const nominations = getRefereeAssignments(request.params.refereeId);
    response.json({ nominations });
  } catch (error) {
    handleError(error, response, 'Server error while loading referee nominations.');
  }
});

app.post('/api/nominations', (request, response) => {
  try {
    const nomination = createNomination(request.body);
    response.status(201).json({
      message: 'Nomination created.',
      nomination,
    });
  } catch (error) {
    handleError(error, response, 'Server error while creating nomination.');
  }
});

app.patch('/api/nominations/:nominationId/slots/:slotNumber', (request, response) => {
  try {
    const nomination = replaceNominationReferee({
      nominationId: request.params.nominationId,
      slotNumber: request.params.slotNumber,
      instructorId: request.body.instructorId,
      refereeId: request.body.refereeId,
    });

    response.json({
      message: 'Referee replaced.',
      nomination,
    });
  } catch (error) {
    handleError(error, response, 'Server error while replacing referee.');
  }
});

app.post('/api/nominations/:nominationId/respond', (request, response) => {
  try {
    const nomination = respondToNomination({
      nominationId: request.params.nominationId,
      refereeId: request.body.refereeId,
      response: request.body.response,
    });

    response.json({
      message: 'Response saved.',
      nomination,
    });
  } catch (error) {
    handleError(error, response, 'Server error while saving response.');
  }
});

app.patch('/api/nominations/:nominationId/score', (request, response) => {
  try {
    const nomination = updateNominationScore({
      nominationId: request.params.nominationId,
      instructorId: request.body.instructorId,
      finalScore: request.body.finalScore,
      matchVideoUrl: request.body.matchVideoUrl,
      matchProtocolUrl: request.body.matchProtocolUrl,
      refereeFee: request.body.refereeFee,
      toFee: request.body.toFee,
    });

    response.json({
      message: 'Match details updated.',
      nomination,
    });
  } catch (error) {
    handleError(error, response, 'Server error while updating match details.');
  }
});

app.get('/api/reports', (request, response) => {
  try {
    const reports = listReportItems(request.query.userId, request.query.mode);
    response.json({ reports });
  } catch (error) {
    handleError(error, response, 'Server error while loading reports.');
  }
});

app.get('/api/reports/:nominationId/:refereeId', (request, response) => {
  try {
    const report = getReportDetail({
      userId: request.query.userId,
      nominationId: request.params.nominationId,
      refereeId: request.params.refereeId,
      mode: request.query.mode,
    });
    response.json({ report });
  } catch (error) {
    handleError(error, response, 'Server error while loading report detail.');
  }
});

app.post('/api/reports/:nominationId/:refereeId', (request, response) => {
  try {
    const report = saveReport({
      userId: request.body.userId,
      nominationId: request.params.nominationId,
      refereeId: request.params.refereeId,
      mode: request.body.mode,
      gameCode: request.body.gameCode,
      teams: request.body.teams,
      matchDate: request.body.matchDate,
      matchTime: request.body.matchTime,
      venue: request.body.venue,
      action: request.body.action,
      feedbackScore: request.body.feedbackScore,
      threePO_IOT: request.body.threePO_IOT,
      criteria: request.body.criteria,
      teamwork: request.body.teamwork,
      generally: request.body.generally,
      googleDriveUrl: request.body.googleDriveUrl,
    });
    response.json({ message: 'Report saved.', report });
  } catch (error) {
    handleError(error, response, 'Server error while saving report.');
  }
});

app.delete('/api/reports/:nominationId/:refereeId', (request, response) => {
  try {
    deleteReport({
      userId: request.query.userId,
      nominationId: request.params.nominationId,
      refereeId: request.params.refereeId,
      mode: request.query.mode,
    });
    response.json({ message: 'Report deleted.' });
  } catch (error) {
    handleError(error, response, 'Server error while deleting report.');
  }
});

app.get('/api/rankings', (request, response) => {
  try {
    const ranking = getRankingDashboard(request.query.userId);
    response.json(ranking);
  } catch (error) {
    handleError(error, response, 'Server error while loading rankings.');
  }
});

app.get('/api/rankings/admin', (request, response) => {
  try {
    const adminData = getRankingAdminData(request.query.instructorId);
    response.json(adminData);
  } catch (error) {
    handleError(error, response, 'Server error while loading ranking admin data.');
  }
});

app.post('/api/rankings/evaluations', (request, response) => {
  try {
    createRankingEvaluation(request.body);
    response.status(201).json({ message: 'Ranking evaluation saved.' });
  } catch (error) {
    handleError(error, response, 'Server error while saving ranking evaluation.');
  }
});

app.post('/api/rankings/performance', (request, response) => {
  try {
    saveRankingPerformance(request.body);
    response.json({ message: 'Performance profile saved.' });
  } catch (error) {
    handleError(error, response, 'Server error while saving performance profile.');
  }
});

const start = async () => {
  await initializeDatabase();

  app.listen(port, () => {
    console.log(`Auth server running on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start auth server', error);
  process.exit(1);
});
