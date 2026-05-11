<<<<<<< HEAD
const TEST_QUESTION_BANK_SIZE = 50;
=======
let googleGenAiModulePromise = null;

const TEST_QUESTION_BANK_SIZE = 100;
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
const TEST_SESSION_QUESTION_COUNT = 25;
const TEST_PASS_THRESHOLD = 20;
const TEST_QUESTION_TIME_LIMIT_SECONDS = 120;
const TEST_LANGUAGES = ['en', 'az', 'ru'];
const TEST_PUBLISH_STATUSES = ['Draft', 'Published'];
const TEST_ASSIGNMENT_MODES = ['AllEligible', 'SelectedUsers'];
<<<<<<< HEAD
=======
const TEST_TRANSLATION_CHUNK_SIZE = 20;
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
const BINARY_OPTION_LABELS = {
  en: ['Yes', 'No'],
  az: ['Bəli', 'Xeyr'],
  ru: ['Да', 'Нет'],
};

export class RouteError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'RouteError';
    this.status = status;
  }
}

const normalizeRole = (role) => {
  const value = String(role || '').trim();
  if (value === 'Stuff') {
    return 'Staff';
  }
  if (value === 'Table') {
    return 'TO';
  }
  return value;
};

const ensureResponseData = (data, error, message) => {
  if (error) {
    throw new RouteError(500, message);
  }
  return data;
};

const ensureSingle = (data, error, notFoundMessage, failureMessage) => {
  if (error) {
    throw new RouteError(500, failureMessage);
  }
  if (!data) {
    throw new RouteError(404, notFoundMessage);
  }
  return data;
};

const maybeSingle = async (query, failureMessage) => {
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new RouteError(500, failureMessage);
  }
  return data;
};

const listByIds = async (admin, table, ids, select, failureMessage) => {
  if (!ids.length) {
    return [];
  }

  const { data, error } = await admin.from(table).select(select).in('id', ids);
  return ensureResponseData(data || [], error, failureMessage);
};

<<<<<<< HEAD
=======
const getGeminiClient = async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new RouteError(500, 'GEMINI_API_KEY is missing.');
  }

  googleGenAiModulePromise ||= import('@google/genai');
  const { GoogleGenAI } = await googleGenAiModulePromise;
  return new GoogleGenAI({ apiKey });
};

>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
const normalizeAudienceRole = (value) => {
  const normalized = String(value || '').trim();
  if (normalized === 'Referee' || normalized === 'TO' || normalized === 'Both') {
    return normalized;
  }

  throw new RouteError(400, 'Audience role must be Referee, TO or Both.');
};

const normalizePublishStatus = (value) => {
  const normalized = String(value || '').trim();
  if (TEST_PUBLISH_STATUSES.includes(normalized)) {
    return normalized;
  }

  throw new RouteError(400, 'Status must be Draft or Published.');
};

const normalizeAssignmentMode = (value) => {
  const normalized = String(value || '').trim();
  if (TEST_ASSIGNMENT_MODES.includes(normalized)) {
    return normalized;
  }

  throw new RouteError(400, 'Assignment mode must be AllEligible or SelectedUsers.');
};

const normalizeQuestionType = (value) => {
  const normalized = String(value || '').trim();
  if (normalized === 'single' || normalized === 'multiple') {
    return normalized;
  }

  throw new RouteError(400, 'Question type must be single or multiple.');
};

const normalizeLanguage = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return TEST_LANGUAGES.includes(normalized) ? normalized : 'en';
};

const mapProfileSummary = (profile) => ({
  id: profile.id,
  fullName: profile.full_name,
  role: normalizeRole(profile.role),
});

const mapTestSummary = (test, creatorProfile) => ({
  id: test.id,
  title: test.title,
  description: test.description || '',
  audienceRole: test.audience_role,
<<<<<<< HEAD
  status: test.status || 'Draft',
=======
  status: getNormalizedTestStatus(test),
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  assignmentMode: test.assignment_mode || 'AllEligible',
  questionBankSize: Number(test.question_bank_size || 0),
  questionCount: Number(test.question_count || TEST_SESSION_QUESTION_COUNT),
  questionTimeLimitSeconds: Number(test.question_time_limit_seconds || TEST_QUESTION_TIME_LIMIT_SECONDS),
  passThreshold: Number(test.pass_threshold || TEST_PASS_THRESHOLD),
  deadlineAt: test.deadline_at || null,
  createdAt: test.created_at,
  createdById: test.created_by,
  createdByName: creatorProfile?.full_name || 'Unknown user',
});

const mapAttemptSummary = (attempt, profile) => ({
  id: attempt.id,
  testId: attempt.test_id,
  userId: attempt.user_id,
  userName: profile?.full_name || 'Unknown user',
  userRole: normalizeRole(attempt.user_role),
  startedAt: attempt.started_at,
  completedAt: attempt.completed_at || null,
  totalDurationSeconds: attempt.total_duration_seconds === null ? null : Number(attempt.total_duration_seconds || 0),
  correctAnswers: Number(attempt.correct_answers || 0),
  totalQuestions: Number(attempt.total_questions || TEST_SESSION_QUESTION_COUNT),
  resultStatus: attempt.result_status || null,
  status: attempt.status || 'NotStarted',
  retakeAllowed: Boolean(attempt.retake_allowed),
});

const shuffleArray = (items) => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

<<<<<<< HEAD
const normalizeQuestionDraft = (question, index, status) => {
  const promptEn = String(question?.promptEn ?? question?.prompt_en ?? question?.prompt ?? '').trim();
  const promptAz = String(question?.promptAz ?? question?.prompt_az ?? '').trim();
  const promptRu = String(question?.promptRu ?? question?.prompt_ru ?? '').trim();
=======
const normalizeQuestionDraft = (question, index, config = {}) => {
  const { allowIncomplete = false } = config;
  const prompt = String(question?.prompt || '').trim();
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  const type = 'single';
  const rawCorrectAnswer = String(question?.correctAnswer || '').trim().toLowerCase();
  const normalizedCorrectAnswer =
    rawCorrectAnswer === 'yes' || rawCorrectAnswer === 'true' || rawCorrectAnswer === '1'
      ? 'Yes'
      : rawCorrectAnswer === 'no' || rawCorrectAnswer === 'false' || rawCorrectAnswer === '0'
        ? 'No'
<<<<<<< HEAD
        : status === 'Draft'
          ? 'Yes'
          : null;
  const isCompletelyEmpty = !promptEn && !promptAz && !promptRu && !rawCorrectAnswer;

  if (status === 'Draft' && isCompletelyEmpty) {
    return null;
  }

  const options = [
=======
        : null;
  const questionOptions = [
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
    { label: 'Yes', isCorrect: normalizedCorrectAnswer === 'Yes' },
    { label: 'No', isCorrect: normalizedCorrectAnswer === 'No' },
  ];

<<<<<<< HEAD
  if (status === 'Published' && !promptEn) {
    throw new RouteError(400, `Question ${index + 1} is missing the English prompt.`);
  }

  if (status === 'Published' && !promptAz) {
    throw new RouteError(400, `Question ${index + 1} is missing the Azerbaijani prompt.`);
  }

  if (status === 'Published' && !promptRu) {
    throw new RouteError(400, `Question ${index + 1} is missing the Russian prompt.`);
  }

  if (!normalizedCorrectAnswer) {
=======
  if (!allowIncomplete && !prompt) {
    throw new RouteError(400, `Question ${index + 1} is missing a prompt.`);
  }

  if (!allowIncomplete && !normalizedCorrectAnswer) {
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
    throw new RouteError(400, `Question ${index + 1} must have a Yes/No correct answer.`);
  }

  return {
<<<<<<< HEAD
    promptEn,
    promptAz,
    promptRu,
    type,
    correctAnswer: normalizedCorrectAnswer,
    options,
  };
};

=======
    prompt,
    type,
    correctAnswer: normalizedCorrectAnswer || 'Yes',
    options: questionOptions,
  };
};

const getNormalizedTestStatus = (test) =>
  TEST_PUBLISH_STATUSES.includes(String(test?.status || '').trim())
    ? String(test.status).trim()
    : 'Published';

const isActiveTestRecord = (test) => test?.is_active !== false;

const applyActiveTestFilter = (query) => query.or('is_active.is.null,is_active.eq.true');

const applyPublishedOrLegacyFilter = (query) => query.or('status.eq.Published,status.is.null');

const applyActiveAssignmentFilter = (query) => query.or('is_active.is.null,is_active.eq.true');

>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
const normalizeSelectedUserIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
};

const validateDeadlineAt = (value, required) => {
  if (!value) {
    if (required) {
      throw new RouteError(400, 'Deadline is required when publishing an exam.');
    }
    return null;
  }

  const deadlineAt = new Date(String(value)).toISOString();
  if (!Number.isFinite(new Date(deadlineAt).getTime())) {
    throw new RouteError(400, 'Deadline is invalid.');
  }

  return deadlineAt;
};

const validateTestDraft = (body) => {
  const title = String(body?.title || '').trim();
  const description = String(body?.description || '').trim();
  const audienceRole = normalizeAudienceRole(body?.audienceRole);
  const status = normalizePublishStatus(body?.status || 'Published');
  const assignmentMode = normalizeAssignmentMode(body?.assignmentMode || 'AllEligible');
  const selectedUserIds = normalizeSelectedUserIds(body?.selectedUserIds);
  const deadlineAt = validateDeadlineAt(body?.deadlineAt, status === 'Published');
  const questions = Array.isArray(body?.questions) ? body.questions : [];

  if (!title) {
    throw new RouteError(400, 'Test title is required.');
  }

  if (status === 'Published' && questions.length !== TEST_QUESTION_BANK_SIZE) {
    throw new RouteError(400, `Each test must contain exactly ${TEST_QUESTION_BANK_SIZE} questions.`);
  }

  if (status === 'Draft' && questions.length > TEST_QUESTION_BANK_SIZE) {
    throw new RouteError(400, `Drafts cannot contain more than ${TEST_QUESTION_BANK_SIZE} questions.`);
  }

  if (assignmentMode === 'SelectedUsers' && selectedUserIds.length === 0) {
    throw new RouteError(400, 'Choose at least one assignee for selected-user exams.');
  }

<<<<<<< HEAD
  const normalizedQuestions = questions
    .map((question, index) => normalizeQuestionDraft(question, index, status))
    .filter(Boolean);

=======
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  return {
    title,
    description,
    audienceRole,
    status,
    assignmentMode,
    selectedUserIds,
    deadlineAt,
<<<<<<< HEAD
    questions: normalizedQuestions,
=======
    questions: questions.map((question, index) =>
      normalizeQuestionDraft(question, index, { allowIncomplete: status === 'Draft' }),
    ),
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  };
};

const loadTestById = async (admin, testId) =>
  ensureSingle(
    ...(await admin.from('tests').select('*').eq('id', testId).maybeSingle().then(({ data, error }) => [data, error])),
    'Test not found.',
    'Failed to load test.',
  );

const listQuestionsByTestId = async (admin, testId) => {
  const { data, error } = await admin
    .from('test_questions')
    .select('*')
    .eq('test_id', testId)
    .order('order_index', { ascending: true });

  return ensureResponseData(data || [], error, 'Failed to load test questions.');
};

const listQuestionOptions = async (admin, questionIds) => {
  if (!questionIds.length) {
    return [];
  }

  const { data, error } = await admin
    .from('test_question_options')
    .select('*')
    .in('question_id', questionIds)
    .order('option_order', { ascending: true });

  return ensureResponseData(data || [], error, 'Failed to load test question options.');
};

const deleteQuestionsByTestId = async (admin, testId) => {
  const { error } = await admin.from('test_questions').delete().eq('test_id', testId);
  if (error) {
    throw new RouteError(500, 'Failed to clear existing exam questions.');
  }
};

<<<<<<< HEAD
const deleteQuestionOptionsByIds = async (admin, optionIds) => {
  if (!optionIds.length) {
    return;
  }

  const { error } = await admin.from('test_question_options').delete().in('id', optionIds);
  if (error) {
    throw new RouteError(500, 'Failed to clear existing exam options.');
  }
};

const deleteQuestionsByIds = async (admin, questionIds) => {
  if (!questionIds.length) {
    return;
  }

  const { error } = await admin.from('test_questions').delete().in('id', questionIds);
  if (error) {
    throw new RouteError(500, 'Failed to clear removed exam questions.');
  }
};

const saveQuestionsForTest = async (admin, testId, questions) => {
  for (let questionIndex = 0; questionIndex < questions.length; questionIndex += 1) {
    const questionDraft = questions[questionIndex];
    const { data: insertedQuestion, error: questionError } = await admin
      .from('test_questions')
      .insert({
        test_id: testId,
        prompt_en: questionDraft.promptEn,
        prompt_az: questionDraft.promptAz || null,
        prompt_ru: questionDraft.promptRu || null,
        question_type: questionDraft.type,
        order_index: questionIndex + 1,
      })
      .select('*')
      .single();

    const question = ensureSingle(
      insertedQuestion,
      questionError,
      'Failed to save test question.',
      'Failed to save test question.',
    );

    for (let optionIndex = 0; optionIndex < questionDraft.options.length; optionIndex += 1) {
      const optionDraft = questionDraft.options[optionIndex];
      const { error: optionError } = await admin.from('test_question_options').insert({
        question_id: question.id,
        label_en: optionDraft.label,
        label_az: optionIndex === 0 ? 'Beli' : 'Xeyr',
        label_ru: optionIndex === 0 ? 'Da' : 'Net',
        is_correct: optionDraft.isCorrect,
        option_order: optionIndex + 1,
      });

      if (optionError) {
        throw new RouteError(500, 'Failed to save test option.');
      }
    }
  }
};

const syncQuestionsForTest = async (admin, testId, questions) => {
  const existingQuestions = await listQuestionsByTestId(admin, testId);
  const existingOptions = await listQuestionOptions(admin, existingQuestions.map((question) => question.id));
  const optionsByQuestionId = new Map();

  existingOptions.forEach((option) => {
    const bucket = optionsByQuestionId.get(option.question_id) || [];
    bucket.push(option);
    optionsByQuestionId.set(option.question_id, bucket);
  });

  for (let questionIndex = 0; questionIndex < questions.length; questionIndex += 1) {
    const questionDraft = questions[questionIndex];
    const existingQuestion = existingQuestions[questionIndex] || null;

    let question = existingQuestion;
    if (existingQuestion) {
      const { data, error } = await admin
        .from('test_questions')
        .update({
          prompt_en: questionDraft.promptEn,
          prompt_az: questionDraft.promptAz || null,
          prompt_ru: questionDraft.promptRu || null,
          question_type: questionDraft.type,
          order_index: questionIndex + 1,
        })
        .eq('id', existingQuestion.id)
        .select('*')
        .single();

      question = ensureSingle(data, error, 'Question not found.', 'Failed to update test question.');
    } else {
      const { data, error } = await admin
        .from('test_questions')
        .insert({
          test_id: testId,
          prompt_en: questionDraft.promptEn,
          prompt_az: questionDraft.promptAz || null,
          prompt_ru: questionDraft.promptRu || null,
          question_type: questionDraft.type,
          order_index: questionIndex + 1,
        })
        .select('*')
        .single();

      question = ensureSingle(data, error, 'Failed to save test question.', 'Failed to save test question.');
    }

    const currentOptions = optionsByQuestionId.get(question.id) || [];
    for (let optionIndex = 0; optionIndex < questionDraft.options.length; optionIndex += 1) {
      const optionDraft = questionDraft.options[optionIndex];
      const existingOption = currentOptions[optionIndex] || null;

      if (existingOption) {
        const { error } = await admin
          .from('test_question_options')
          .update({
            label_en: optionDraft.label,
            label_az: optionIndex === 0 ? 'Beli' : 'Xeyr',
            label_ru: optionIndex === 0 ? 'Da' : 'Net',
            is_correct: optionDraft.isCorrect,
            option_order: optionIndex + 1,
          })
          .eq('id', existingOption.id);

        if (error) {
          throw new RouteError(500, 'Failed to update test option.');
        }
      } else {
        const { error } = await admin.from('test_question_options').insert({
          question_id: question.id,
          label_en: optionDraft.label,
          label_az: optionIndex === 0 ? 'Beli' : 'Xeyr',
          label_ru: optionIndex === 0 ? 'Da' : 'Net',
          is_correct: optionDraft.isCorrect,
          option_order: optionIndex + 1,
        });

        if (error) {
          throw new RouteError(500, 'Failed to save test option.');
        }
      }
    }

    const extraOptionIds = currentOptions
      .slice(questionDraft.options.length)
      .map((option) => option.id)
      .filter(Boolean);
    await deleteQuestionOptionsByIds(admin, extraOptionIds);
  }

  const extraQuestionIds = existingQuestions
    .slice(questions.length)
    .map((question) => question.id)
    .filter(Boolean);
  await deleteQuestionsByIds(admin, extraQuestionIds);
=======
const deleteTestById = async (admin, testId) => {
  const { error } = await admin.from('tests').delete().eq('id', testId);
  if (error) {
    throw new RouteError(500, 'Failed to roll back test after save error.');
  }
};

const buildCanonicalTestOptions = (correctAnswer) => [
  {
    label: 'Yes',
    isCorrect: correctAnswer === 'Yes',
  },
  {
    label: 'No',
    isCorrect: correctAnswer === 'No',
  },
];

const parseJsonFromModelResponse = (value) => {
  const source = String(value || '').trim();
  const fencedMatch = source.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1]);
  }

  const jsonMatch = source.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : source);
};

const translateQuestionPromptsChunk = async (questions, language) => {
  if (!questions.length || language === 'en') {
    return questions.map((question) => question.prompt);
  }

  const ai = await getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents:
      `Translate the following basketball exam questions from English into ${language === 'az' ? 'Azerbaijani' : 'Russian'}. ` +
      'Return only valid JSON as an array. Each item must contain keys index and prompt. Preserve the original meaning.' +
      `\nQuestions:\n${questions.map((question, index) => `${index + 1}. ${question.prompt}`).join('\n')}`,
    config: {
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const parsed = parseJsonFromModelResponse(response.text);
  if (!Array.isArray(parsed)) {
    throw new RouteError(500, `Failed to parse ${language.toUpperCase()} question translations.`);
  }

  const translatedPrompts = questions.map((question) => question.prompt);
  parsed.forEach((item, index) => {
    const translatedPrompt = String(item?.prompt || '').trim();
    const rawIndex = Number(item?.index);
    const targetIndex = Number.isInteger(rawIndex) && rawIndex >= 1 && rawIndex <= questions.length ? rawIndex - 1 : index;
    if (translatedPrompt) {
      translatedPrompts[targetIndex] = translatedPrompt;
    }
  });

  return translatedPrompts;
};

const enrichQuestionsWithTranslations = async (questions) => {
  const filledQuestions = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => String(question.prompt || '').trim());

  if (!filledQuestions.length) {
    return questions.map((question) => ({
      ...question,
      promptAz: null,
      promptRu: null,
    }));
  }

  const translatedByLanguage = {
    az: new Map(),
    ru: new Map(),
  };

  for (const language of ['az', 'ru']) {
    try {
      for (let chunkStart = 0; chunkStart < filledQuestions.length; chunkStart += TEST_TRANSLATION_CHUNK_SIZE) {
        const chunk = filledQuestions.slice(chunkStart, chunkStart + TEST_TRANSLATION_CHUNK_SIZE);
        const translatedPrompts = await translateQuestionPromptsChunk(
          chunk.map(({ question }) => question),
          language,
        );

        chunk.forEach(({ index }, chunkIndex) => {
          const translatedPrompt = String(translatedPrompts[chunkIndex] || '').trim();
          if (translatedPrompt) {
            translatedByLanguage[language].set(index, translatedPrompt);
          }
        });
      }
    } catch {
      // Keep English fallback when translation is unavailable.
    }
  }

  return questions.map((question, index) => ({
    ...question,
    promptAz: translatedByLanguage.az.get(index) || null,
    promptRu: translatedByLanguage.ru.get(index) || null,
  }));
};

const saveQuestionsForTest = async (admin, testId, questions) => {
  if (!questions.length) {
    return;
  }

  const questionRows = questions.map((questionDraft, questionIndex) => ({
    test_id: testId,
    prompt_en: questionDraft.prompt,
    prompt_az: questionDraft.promptAz || null,
    prompt_ru: questionDraft.promptRu || null,
    question_type: questionDraft.type,
    order_index: questionIndex + 1,
  }));

  const { data: insertedQuestions, error: questionError } = await admin
    .from('test_questions')
    .insert(questionRows)
    .select('id, order_index');

  const savedQuestions = ensureResponseData(insertedQuestions || [], questionError, 'Failed to save test questions.');
  if (savedQuestions.length !== questions.length) {
    throw new RouteError(500, 'Failed to save all test questions.');
  }

  const questionIdByOrderIndex = new Map(
    savedQuestions.map((question) => [Number(question.order_index || 0), question.id]),
  );

  const optionRows = questions.flatMap((questionDraft, questionIndex) => {
    const questionId = questionIdByOrderIndex.get(questionIndex + 1);
    if (!questionId) {
      throw new RouteError(500, `Failed to map saved question ${questionIndex + 1}.`);
    }

    return buildCanonicalTestOptions(questionDraft.correctAnswer).map((optionDraft, optionIndex) => ({
      question_id: questionId,
      label_en: optionDraft.label,
      is_correct: optionDraft.isCorrect,
      option_order: optionIndex + 1,
    }));
  });

  if (!optionRows.length) {
    return;
  }

  const { error: optionError } = await admin.from('test_question_options').insert(optionRows);

  if (optionError) {
    throw new RouteError(500, `Failed to save test options: ${optionError.message || 'Unknown database error.'}`);
  }
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
};

const getAudienceRoles = (audienceRole) => {
  if (audienceRole === 'Both') {
    return ['Referee', 'TO'];
  }
  return [audienceRole];
};

const listAssignableProfiles = async (admin, testDraft, currentUser) => {
  const roles = getAudienceRoles(testDraft.audienceRole);
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, photo_url, license_number, role')
    .in('role', roles.map((role) => (role === 'TO' ? 'Table' : role)));
  const rows = ensureResponseData(data || [], error, 'Failed to load exam assignees.');
  const normalizedRows = rows.map((profile) => ({
    ...profile,
    role: normalizeRole(profile.role),
  }));

  if (testDraft.assignmentMode === 'AllEligible') {
    return normalizedRows.filter((profile) => profile.id !== currentUser.id);
  }

  const selected = new Set(testDraft.selectedUserIds);
  const matchingProfiles = normalizedRows.filter((profile) => selected.has(profile.id));
  if (matchingProfiles.length !== testDraft.selectedUserIds.length) {
    throw new RouteError(400, 'Some selected assignees could not be found.');
  }

  const invalidRole = matchingProfiles.find((profile) => !roles.includes(profile.role));
  if (invalidRole) {
    throw new RouteError(400, `Selected user ${invalidRole.full_name} does not match the exam audience.`);
  }

  return matchingProfiles;
};

const replaceAssignments = async (admin, testId, assignees, currentUser) => {
  const { error: deleteError } = await admin.from('test_assignments').delete().eq('test_id', testId);
  if (deleteError) {
    throw new RouteError(500, 'Failed to clear exam assignments.');
  }

  if (!assignees.length) {
    return [];
  }

  const rows = assignees.map((profile) => ({
    test_id: testId,
    user_id: profile.id,
    user_role: profile.role,
    assigned_by: currentUser.id,
    assigned_at: new Date().toISOString(),
    is_active: true,
  }));

  const { data, error } = await admin
    .from('test_assignments')
    .insert(rows)
    .select('*');

  return ensureResponseData(data || [], error, 'Failed to save exam assignments.');
};

const sendTestPushNotifications = async (admin, targetUserIds, payload) => {
  if (!targetUserIds.length) {
    return;
  }

  const { data: tokens, error: tokenError } = await admin
    .from('push_notification_tokens')
    .select('id, user_id, expo_push_token')
    .in('user_id', targetUserIds)
    .eq('is_active', true);

  const pushTokens = ensureResponseData(tokens || [], tokenError, 'Failed to load push tokens for tests.');
  if (!pushTokens.length) {
    return;
  }

  const messages = pushTokens.map((pushToken) => ({
    to: pushToken.expo_push_token,
    title: payload.title,
    body: payload.body,
    sound: 'default',
    channelId: payload.kind === 'chat-message' ? 'refzone-chat' : 'refzone-alerts-v2',
    data: {
      ...(payload.data || {}),
      kind: payload.kind,
      path: payload.path,
    },
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  }).catch(() => undefined);
};

const ensureRoleCanAccessTest = (currentUser, test) => {
  const currentRole = normalizeRole(currentUser.role);
  if (currentRole === 'Instructor') {
<<<<<<< HEAD
    return;
=======
    if (test.created_by === currentUser.id) {
      return;
    }

    throw new RouteError(403, 'This test belongs to another instructor.');
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  }

  if (currentRole === 'TO Supervisor') {
    if (test.audience_role === 'TO' || test.audience_role === 'Both') {
      return;
    }

    throw new RouteError(403, 'TO Supervisor can only access TO tests.');
  }

  if (currentRole === 'Referee' && (test.audience_role === 'Referee' || test.audience_role === 'Both')) {
    return;
  }

  if (currentRole === 'TO' && (test.audience_role === 'TO' || test.audience_role === 'Both')) {
    return;
  }

  throw new RouteError(403, 'This test is not available for your role.');
};

const toTranslatedQuestion = (question, options, language) => {
  const prompt =
    language === 'az'
      ? question.prompt_az || question.prompt_en
      : language === 'ru'
        ? question.prompt_ru || question.prompt_en
        : question.prompt_en;

  return {
    id: question.id,
    type: question.question_type,
    prompt,
    options: options.map((option, index) => ({
      id: option.id,
      label:
        language === 'az'
<<<<<<< HEAD
          ? option.label_az || BINARY_OPTION_LABELS.az[index] || option.label_en
          : language === 'ru'
            ? option.label_ru || BINARY_OPTION_LABELS.ru[index] || option.label_en
=======
          ? BINARY_OPTION_LABELS.az[index] || option.label_az || option.label_en
          : language === 'ru'
            ? BINARY_OPTION_LABELS.ru[index] || option.label_ru || option.label_en
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
            : BINARY_OPTION_LABELS.en[index] || option.label_en,
    })),
  };
};

const getAttemptAnswers = (attempt) => (Array.isArray(attempt.answers) ? attempt.answers : []);

const updateAttempt = async (admin, attemptId, patch) => {
  const { data, error } = await admin
    .from('test_attempts')
    .update(patch)
    .eq('id', attemptId)
    .select('*')
    .single();

  return ensureSingle(data, error, 'Attempt not found.', 'Failed to update test attempt.');
};

const computeResultStatus = (correctAnswers) =>
  correctAnswers >= TEST_PASS_THRESHOLD ? 'SUCCESS' : 'FAILED';

const ensureDeadlineIsOpen = (test) => {
  if (!test.deadline_at) {
    return;
  }

  const deadlineMs = new Date(test.deadline_at).getTime();
  if (Number.isFinite(deadlineMs) && deadlineMs <= Date.now()) {
    throw new RouteError(409, 'The deadline for this exam has already passed.');
  }
};

const finalizeAttemptIfNeeded = async (admin, attempt, nowIso) => {
  if (Number(attempt.current_question_index || 0) < Number(attempt.total_questions || TEST_SESSION_QUESTION_COUNT)) {
    return attempt;
  }

  if (attempt.status === 'Completed') {
    return attempt;
  }

  const completedAt = nowIso;
  const startedAt = new Date(attempt.started_at).getTime();
  const completedAtMs = new Date(completedAt).getTime();
  const totalDurationSeconds =
    Number.isFinite(startedAt) && Number.isFinite(completedAtMs)
      ? Math.max(0, Math.round((completedAtMs - startedAt) / 1000))
      : null;
  const resultStatus = computeResultStatus(Number(attempt.correct_answers || 0));

  return updateAttempt(admin, attempt.id, {
    status: 'Completed',
    completed_at: completedAt,
    total_duration_seconds: totalDurationSeconds,
    result_status: resultStatus,
    retake_allowed: resultStatus === 'FAILED',
  });
};

const autoAdvanceExpiredQuestions = async (admin, attempt, test, nowIso) => {
  let currentAttempt = attempt;
  const questionIds = Array.isArray(currentAttempt.question_ids) ? currentAttempt.question_ids : [];
  const totalQuestions = Number(currentAttempt.total_questions || TEST_SESSION_QUESTION_COUNT);

  while (currentAttempt.status === 'InProgress' && Number(currentAttempt.current_question_index || 0) < totalQuestions) {
    const currentIndex = Number(currentAttempt.current_question_index || 0);
    const currentQuestionId = questionIds[currentIndex];
    if (!currentQuestionId) {
      currentAttempt = await finalizeAttemptIfNeeded(admin, currentAttempt, nowIso);
      break;
    }

    const deadline = new Date(currentAttempt.question_deadline_at || currentAttempt.question_started_at || nowIso).getTime();
    const nowMs = new Date(nowIso).getTime();
    if (!Number.isFinite(deadline) || nowMs <= deadline) {
      break;
    }

    const answers = getAttemptAnswers(currentAttempt);
    const existingAnswer = answers.find((item) => item.questionId === currentQuestionId);
    if (existingAnswer) {
      break;
    }

    const nextIndex = currentIndex + 1;
    const isComplete = nextIndex >= totalQuestions;
    currentAttempt = await updateAttempt(admin, currentAttempt.id, {
      answers: [
        ...answers,
        {
          questionId: currentQuestionId,
          selectedOptionIds: [],
          isCorrect: false,
          timedOut: true,
          answeredAt: nowIso,
        },
      ],
      current_question_index: nextIndex,
      question_started_at: isComplete ? null : nowIso,
      question_deadline_at: isComplete
        ? null
        : new Date(Date.now() + Number(test.question_time_limit_seconds || TEST_QUESTION_TIME_LIMIT_SECONDS) * 1000).toISOString(),
    });

    currentAttempt = await finalizeAttemptIfNeeded(admin, currentAttempt, nowIso);
  }

  return currentAttempt;
};

<<<<<<< HEAD
const repairBrokenAttemptIfPossible = async (admin, attempt, test) => {
  if (attempt.status !== 'InProgress') {
    return attempt;
  }

  const currentIndex = Number(attempt.current_question_index || 0);
  const totalQuestions = Number(attempt.total_questions || TEST_SESSION_QUESTION_COUNT);
  const originalQuestionIds = Array.isArray(attempt.question_ids) ? attempt.question_ids : [];

  const questions = await listQuestionsByTestId(admin, test.id);
  const validQuestionIds = shuffleArray(questions.map((question) => question.id));
  const preservedQuestionIds = originalQuestionIds.slice(0, currentIndex);
  const remainingQuestionIds = validQuestionIds
    .filter((questionId) => !preservedQuestionIds.includes(questionId))
    .slice(0, Math.max(0, totalQuestions - preservedQuestionIds.length));
  const refreshedQuestionIds = [...preservedQuestionIds, ...remainingQuestionIds];

  if (refreshedQuestionIds.length < totalQuestions) {
    return attempt;
  }

  const now = new Date();
  return updateAttempt(admin, attempt.id, {
    question_ids: refreshedQuestionIds,
    current_question_index: currentIndex,
    question_started_at: attempt.question_started_at || now.toISOString(),
    question_deadline_at: new Date(
      now.getTime() + Number(test.question_time_limit_seconds || TEST_QUESTION_TIME_LIMIT_SECONDS) * 1000,
    ).toISOString(),
  });
};

const listTestsForAudience = async (admin, audienceRoles) => {
  const { data, error } = await admin
    .from('tests')
    .select('*')
    .in('audience_role', audienceRoles)
    .eq('is_active', true)
    .eq('status', 'Published')
    .order('created_at', { ascending: false });

  return ensureResponseData(data || [], error, 'Failed to load tests.');
};

const listAssignedTestsForUser = async (admin, userId) => {
  const { data, error } = await admin
    .from('test_assignments')
    .select('test_id')
    .eq('user_id', userId)
    .eq('is_active', true);
=======
const ensureQuestionTranslations = async (admin, question, options, language) => {
  if (language === 'en') {
    return { question, options };
  }

  const promptField = language === 'az' ? 'prompt_az' : 'prompt_ru';
  const alreadyTranslated = question[promptField];

  if (alreadyTranslated) {
    return { question, options };
  }

  try {
    const translatedPrompts = await translateQuestionPromptsChunk(
      [{ prompt: question.prompt_en }],
      language,
    );
    const translatedPrompt = String(translatedPrompts[0] || '').trim();

    if (!translatedPrompt) {
      return { question, options };
    }

    const updatedQuestion = await updateQuestionTranslation(admin, question.id, {
      [promptField]: translatedPrompt,
    });
    return { question: updatedQuestion, options };
  } catch {
    return { question, options };
  }
};

const updateQuestionTranslation = async (admin, questionId, patch) => {
  const { data, error } = await admin
    .from('test_questions')
    .update(patch)
    .eq('id', questionId)
    .select('*')
    .single();

  return ensureSingle(data, error, 'Question not found.', 'Failed to save question translation.');
};

const updateQuestionOptionTranslation = async (admin, optionId, patch) => {
  const { data, error } = await admin
    .from('test_question_options')
    .update(patch)
    .eq('id', optionId)
    .select('*')
    .single();

  return ensureSingle(data, error, 'Option not found.', 'Failed to save question option translation.');
};

const listTestsForAudience = async (admin, audienceRoles) => {
  const { data, error } = await applyPublishedOrLegacyFilter(
    applyActiveTestFilter(
      admin
        .from('tests')
        .select('*')
        .in('audience_role', audienceRoles)
        .order('created_at', { ascending: false }),
    ),
  );

  return ensureResponseData((data || []).filter(isActiveTestRecord), error, 'Failed to load tests.');
};

const listAssignedTestsForUser = async (admin, userId) => {
  const { data, error } = await applyActiveAssignmentFilter(
    admin
      .from('test_assignments')
      .select('test_id')
      .eq('user_id', userId),
  );
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3

  const rows = ensureResponseData(data || [], error, 'Failed to load assigned tests.');
  return [...new Set(rows.map((row) => row.test_id).filter(Boolean))];
};

const listAttemptsForTests = async (admin, testIds) => {
  if (!testIds.length) {
    return [];
  }

  const { data, error } = await admin
    .from('test_attempts')
    .select('*')
    .in('test_id', testIds)
    .order('started_at', { ascending: false });

  return ensureResponseData(data || [], error, 'Failed to load test attempts.');
};

const loadLatestAttemptsByUserAndTest = async (admin, userId, testIds) => {
  if (!testIds.length) {
    return new Map();
  }

  const { data, error } = await admin
    .from('test_attempts')
    .select('*')
    .eq('user_id', userId)
    .in('test_id', testIds)
    .order('started_at', { ascending: false });

  const attempts = ensureResponseData(data || [], error, 'Failed to load test attempts.');
  const map = new Map();
  attempts.forEach((attempt) => {
    if (!map.has(attempt.test_id)) {
      map.set(attempt.test_id, attempt);
    }
  });
  return map;
};

const listTestsByIds = async (admin, ids) => {
  if (!ids.length) {
    return [];
  }

<<<<<<< HEAD
  const { data, error } = await admin
    .from('tests')
    .select('*')
    .in('id', ids)
    .eq('is_active', true)
    .eq('status', 'Published')
    .order('created_at', { ascending: false });

  return ensureResponseData(data || [], error, 'Failed to load assigned tests.');
=======
  const { data, error } = await applyPublishedOrLegacyFilter(
    applyActiveTestFilter(
      admin
        .from('tests')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false }),
    ),
  );

  return ensureResponseData((data || []).filter(isActiveTestRecord), error, 'Failed to load assigned tests.');
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
};

const hasActiveAssignment = async (admin, testId, userId) => {
  const assignment = await maybeSingle(
<<<<<<< HEAD
    admin
      .from('test_assignments')
      .select('id')
      .eq('test_id', testId)
      .eq('user_id', userId)
      .eq('is_active', true),
=======
    applyActiveAssignmentFilter(
      admin
        .from('test_assignments')
        .select('id')
        .eq('test_id', testId)
        .eq('user_id', userId),
    ),
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
    'Failed to load test assignment.',
  );

  return Boolean(assignment);
};

const loadSelectedUserIdsByTestId = async (admin, testId) => {
<<<<<<< HEAD
  const { data, error } = await admin
    .from('test_assignments')
    .select('user_id')
    .eq('test_id', testId)
    .eq('is_active', true);
=======
  const { data, error } = await applyActiveAssignmentFilter(
    admin
      .from('test_assignments')
      .select('user_id')
      .eq('test_id', testId),
  );
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3

  const rows = ensureResponseData(data || [], error, 'Failed to load test assignees.');
  return [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
};

const loadQuestionDraftsByTestId = async (admin, testId) => {
  const questions = await listQuestionsByTestId(admin, testId);
  const options = await listQuestionOptions(admin, questions.map((question) => question.id));

<<<<<<< HEAD
  return questions.map((question) => ({
    id: question.id,
    promptEn: question.prompt_en || '',
    promptAz: question.prompt_az || '',
    promptRu: question.prompt_ru || '',
    type: question.question_type,
    correctAnswer: options
      .filter((option) => option.question_id === question.id)
      .find((option) => Boolean(option.is_correct))?.label_en === 'No'
        ? 'No'
        : 'Yes',
    options: options
      .filter((option) => option.question_id === question.id)
      .map((option) => ({
=======
    return questions.map((question) => ({
      id: question.id,
      prompt: question.prompt_en,
      type: question.question_type,
      correctAnswer: options
        .filter((option) => option.question_id === question.id)
        .find((option) => Boolean(option.is_correct))?.label_en === 'No'
          ? 'No'
          : 'Yes',
      options: options
        .filter((option) => option.question_id === question.id)
        .map((option) => ({
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
        id: option.id,
        label: option.label_en,
        isCorrect: Boolean(option.is_correct),
      })),
  }));
};

export async function createTest(admin, currentUser, body) {
  if (normalizeRole(currentUser.role) !== 'Instructor') {
    throw new RouteError(403, 'Only Instructor accounts can create tests.');
  }

  const draft = validateTestDraft(body);
<<<<<<< HEAD
=======
  const translatedQuestions = await enrichQuestionsWithTranslations(draft.questions);
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  const nowIso = new Date().toISOString();
  const { data: insertedTest, error: testError } = await admin
    .from('tests')
    .insert({
      title: draft.title,
      description: draft.description,
      audience_role: draft.audienceRole,
      status: draft.status,
      assignment_mode: draft.assignmentMode,
      question_bank_size: TEST_QUESTION_BANK_SIZE,
      question_count: TEST_SESSION_QUESTION_COUNT,
      question_time_limit_seconds: TEST_QUESTION_TIME_LIMIT_SECONDS,
      pass_threshold: TEST_PASS_THRESHOLD,
      deadline_at: draft.deadlineAt,
      created_by: currentUser.id,
      created_at: nowIso,
      updated_at: nowIso,
      is_active: true,
    })
    .select('*')
    .single();

  const test = ensureSingle(insertedTest, testError, 'Failed to create test.', 'Failed to create test.');

<<<<<<< HEAD
  await saveQuestionsForTest(admin, test.id, draft.questions);
=======
  try {
    await saveQuestionsForTest(admin, test.id, translatedQuestions);
  } catch (error) {
    try {
      await deleteTestById(admin, test.id);
    } catch {
      // Keep original save error as the primary failure.
    }
    throw error;
  }
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3

  if (draft.status === 'Published') {
    const assignees = await listAssignableProfiles(admin, draft, currentUser);
    await replaceAssignments(admin, test.id, assignees, currentUser);
    await sendTestPushNotifications(
      admin,
      assignees.map((profile) => profile.id),
      {
        kind: 'test-assigned',
        title: '\u{1F4DD} New test assigned',
        body: `${draft.title} is now assigned to you.`,
        path: '/tests',
        data: {
          testId: test.id,
        },
      },
    );
  }

  return {
    message: draft.status === 'Draft' ? 'Draft saved.' : 'Test created.',
    test: mapTestSummary(test, currentUser),
  };
}

export async function updateTest(admin, currentUser, testId, body) {
  if (normalizeRole(currentUser.role) !== 'Instructor') {
    throw new RouteError(403, 'Only Instructor accounts can update tests.');
  }

  const existingTest = await loadTestById(admin, testId);
  if (existingTest.created_by !== currentUser.id) {
    throw new RouteError(403, 'This test belongs to another instructor.');
  }

  const draft = validateTestDraft(body);
<<<<<<< HEAD
=======
  const translatedQuestions = await enrichQuestionsWithTranslations(draft.questions);
  const previousQuestions = await loadQuestionDraftsByTestId(admin, existingTest.id);
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  const nowIso = new Date().toISOString();
  const { data: updatedTestData, error: updateError } = await admin
    .from('tests')
    .update({
      title: draft.title,
      description: draft.description,
      audience_role: draft.audienceRole,
      status: draft.status,
      assignment_mode: draft.assignmentMode,
      deadline_at: draft.deadlineAt,
      updated_at: nowIso,
    })
    .eq('id', existingTest.id)
    .select('*')
    .single();

  const updatedTest = ensureSingle(updatedTestData, updateError, 'Test not found.', 'Failed to update test.');

<<<<<<< HEAD
  await syncQuestionsForTest(admin, existingTest.id, draft.questions);
=======
  await deleteQuestionsByTestId(admin, existingTest.id);

  try {
    await saveQuestionsForTest(admin, existingTest.id, translatedQuestions);
  } catch (error) {
    try {
      await deleteQuestionsByTestId(admin, existingTest.id);
      await saveQuestionsForTest(admin, existingTest.id, previousQuestions);
      await admin
        .from('tests')
        .update({
          title: existingTest.title,
          description: existingTest.description,
          audience_role: existingTest.audience_role,
          status: existingTest.status,
          assignment_mode: existingTest.assignment_mode,
          deadline_at: existingTest.deadline_at,
          updated_at: existingTest.updated_at || nowIso,
        })
        .eq('id', existingTest.id);
    } catch {
      throw new RouteError(
        500,
        `${error instanceof Error ? error.message : 'Failed to update test.'} Previous saved exam content could not be restored automatically.`,
      );
    }

    throw error;
  }
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3

  if (draft.status === 'Published') {
    const assignees = await listAssignableProfiles(admin, draft, currentUser);
    await replaceAssignments(admin, existingTest.id, assignees, currentUser);
    await sendTestPushNotifications(
      admin,
      assignees.map((profile) => profile.id),
      {
        kind: 'test-assigned',
        title: '\u{1F4DD} Test updated',
        body: `${draft.title} is ready for you.`,
        path: '/tests',
        data: {
          testId: existingTest.id,
        },
      },
    );
  } else {
    await replaceAssignments(admin, existingTest.id, [], currentUser);
  }

  return {
    message: draft.status === 'Draft' ? 'Draft updated.' : 'Test updated.',
    test: mapTestSummary(updatedTest, currentUser),
  };
}

<<<<<<< HEAD
=======
export async function deleteTest(admin, currentUser, testId) {
  if (normalizeRole(currentUser.role) !== 'Instructor') {
    throw new RouteError(403, 'Only Instructor accounts can delete tests.');
  }

  const existingTest = await loadTestById(admin, testId);
  if (existingTest.created_by !== currentUser.id) {
    throw new RouteError(403, 'This test belongs to another instructor.');
  }

  const nowIso = new Date().toISOString();
  const { error: testError } = await admin
    .from('tests')
    .update({
      is_active: false,
      updated_at: nowIso,
    })
    .eq('id', existingTest.id);

  if (testError) {
    throw new RouteError(500, 'Failed to delete test.');
  }

  const { error: assignmentError } = await admin
    .from('test_assignments')
    .update({
      is_active: false,
    })
    .eq('test_id', existingTest.id)
    .eq('is_active', true);

  if (assignmentError) {
    throw new RouteError(500, 'Failed to disable test assignments.');
  }

  return {
    message: 'Test deleted.',
  };
}

>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
export async function listTests(admin, currentUser) {
  const role = normalizeRole(currentUser.role);

  if (role === 'Instructor') {
<<<<<<< HEAD
    const { data, error } = await admin
      .from('tests')
      .select('*')
      .eq('created_by', currentUser.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    const tests = ensureResponseData(data || [], error, 'Failed to load tests.');
=======
    const { data, error } = await applyActiveTestFilter(
      admin
        .from('tests')
        .select('*')
        .eq('created_by', currentUser.id)
        .order('created_at', { ascending: false }),
    );
    const tests = ensureResponseData((data || []).filter(isActiveTestRecord), error, 'Failed to load tests.');
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
    const attempts = await listAttemptsForTests(admin, tests.map((item) => item.id));
    const profiles = await listByIds(
      admin,
      'profiles',
      [...new Set(attempts.map((attempt) => attempt.user_id))],
      'id, full_name, role',
      'Failed to load test participant profiles.',
    );
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

    return {
      tests: tests.map((test) => ({
        ...mapTestSummary(test, currentUser),
        attempts: attempts
          .filter((attempt) => attempt.test_id === test.id)
          .map((attempt) => mapAttemptSummary(attempt, profileMap.get(attempt.user_id) || null)),
      })),
    };
  }

  if (role === 'TO Supervisor') {
    const tests = await listTestsForAudience(admin, ['TO', 'Both']);
    const attempts = await listAttemptsForTests(admin, tests.map((item) => item.id));
    const toAttempts = attempts.filter((attempt) => normalizeRole(attempt.user_role) === 'TO');
    const profiles = await listByIds(
      admin,
      'profiles',
      [...new Set(toAttempts.map((attempt) => attempt.user_id))],
      'id, full_name, role',
      'Failed to load TO profiles.',
    );
    const creators = await listByIds(
      admin,
      'profiles',
      [...new Set(tests.map((item) => item.created_by))],
      'id, full_name, role',
      'Failed to load test creators.',
    );
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const creatorMap = new Map(creators.map((profile) => [profile.id, profile]));

    return {
      tests: tests.map((test) => ({
        ...mapTestSummary(test, creatorMap.get(test.created_by) || null),
        attempts: toAttempts
          .filter((attempt) => attempt.test_id === test.id)
          .map((attempt) => mapAttemptSummary(attempt, profileMap.get(attempt.user_id) || null)),
      })),
    };
  }

  if (role !== 'Referee' && role !== 'TO') {
    return { tests: [] };
  }

  const assignedTestIds = await listAssignedTestsForUser(admin, currentUser.id);
  const tests = await listTestsByIds(admin, assignedTestIds);
  const creators = await listByIds(
    admin,
    'profiles',
    [...new Set(tests.map((item) => item.created_by))],
    'id, full_name, role',
    'Failed to load test creators.',
  );
  const creatorMap = new Map(creators.map((profile) => [profile.id, profile]));
  const latestAttemptsByTest = await loadLatestAttemptsByUserAndTest(admin, currentUser.id, tests.map((item) => item.id));

  return {
    tests: tests.map((test) => ({
      ...mapTestSummary(test, creatorMap.get(test.created_by) || null),
      latestAttempt: latestAttemptsByTest.has(test.id)
        ? mapAttemptSummary(latestAttemptsByTest.get(test.id), currentUser)
        : null,
    })),
  };
}

export async function getTestDetail(admin, currentUser, testId) {
  const test = await loadTestById(admin, testId);
<<<<<<< HEAD
=======
  if (!isActiveTestRecord(test)) {
    throw new RouteError(404, 'Test not found.');
  }
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  ensureRoleCanAccessTest(currentUser, test);

  const creator = await maybeSingle(
    admin.from('profiles').select('id, full_name, role').eq('id', test.created_by),
    'Failed to load test creator.',
  );

  if (normalizeRole(currentUser.role) === 'Instructor' && test.created_by !== currentUser.id) {
    throw new RouteError(403, 'This test belongs to another instructor.');
  }

  const attempts = await listAttemptsForTests(admin, [test.id]);
  const filteredAttempts =
    normalizeRole(currentUser.role) === 'TO Supervisor'
      ? attempts.filter((attempt) => normalizeRole(attempt.user_role) === 'TO')
      : attempts;
  const profiles = await listByIds(
    admin,
    'profiles',
    [...new Set(filteredAttempts.map((attempt) => attempt.user_id))],
    'id, full_name, role',
    'Failed to load test participant profiles.',
  );
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const role = normalizeRole(currentUser.role);

  return {
    test: {
      ...mapTestSummary(test, creator),
      attempts: filteredAttempts.map((attempt) => mapAttemptSummary(attempt, profileMap.get(attempt.user_id) || null)),
      questions: role === 'Instructor' && test.created_by === currentUser.id
        ? await loadQuestionDraftsByTestId(admin, test.id)
        : undefined,
      selectedUserIds: role === 'Instructor' && test.created_by === currentUser.id
        ? await loadSelectedUserIdsByTestId(admin, test.id)
        : undefined,
    },
  };
}

export async function startTestAttempt(admin, currentUser, testId) {
  const role = normalizeRole(currentUser.role);
  if (role !== 'Referee' && role !== 'TO') {
    throw new RouteError(403, 'Only Referee and TO users can start tests.');
  }

  const test = await loadTestById(admin, testId);
<<<<<<< HEAD
  ensureRoleCanAccessTest(currentUser, test);
  if ((test.status || 'Draft') !== 'Published') {
=======
  if (!isActiveTestRecord(test)) {
    throw new RouteError(404, 'Test not found.');
  }
  ensureRoleCanAccessTest(currentUser, test);
  if (getNormalizedTestStatus(test) !== 'Published') {
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
    throw new RouteError(409, 'This exam is not published yet.');
  }
  ensureDeadlineIsOpen(test);

  const assigned = await hasActiveAssignment(admin, test.id, currentUser.id);
  if (!assigned) {
    throw new RouteError(403, 'This exam was not assigned to your account.');
  }

  const { data: latestAttemptData, error: latestAttemptError } = await admin
    .from('test_attempts')
    .select('*')
    .eq('test_id', test.id)
    .eq('user_id', currentUser.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestAttemptError) {
    throw new RouteError(500, 'Failed to load existing test attempt.');
  }

  if (latestAttemptData?.status === 'InProgress') {
    return { attemptId: latestAttemptData.id };
  }

  if (latestAttemptData?.status === 'Completed' && latestAttemptData.result_status === 'SUCCESS') {
    throw new RouteError(409, 'This exam has already been completed successfully.');
  }

  if (latestAttemptData?.status === 'Completed' && latestAttemptData.result_status === 'FAILED' && !latestAttemptData.retake_allowed) {
    throw new RouteError(409, 'Retake is not enabled for this exam yet.');
  }

  const questions = await listQuestionsByTestId(admin, test.id);
  const shuffledQuestionIds = shuffleArray(questions.map((question) => question.id)).slice(0, TEST_SESSION_QUESTION_COUNT);
  if (shuffledQuestionIds.length < TEST_SESSION_QUESTION_COUNT) {
    throw new RouteError(409, 'This test does not have enough questions yet.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const questionDeadlineAt = new Date(now.getTime() + TEST_QUESTION_TIME_LIMIT_SECONDS * 1000).toISOString();
  const { data, error } = await admin
    .from('test_attempts')
    .insert({
      test_id: test.id,
      user_id: currentUser.id,
      user_role: role,
      status: 'InProgress',
      question_ids: shuffledQuestionIds,
      answers: [],
      current_question_index: 0,
      started_at: nowIso,
      question_started_at: nowIso,
      question_deadline_at: questionDeadlineAt,
      completed_at: null,
      correct_answers: 0,
      total_questions: TEST_SESSION_QUESTION_COUNT,
      total_duration_seconds: null,
      result_status: null,
      retake_allowed: false,
    })
    .select('*')
    .single();

  const attempt = ensureSingle(data, error, 'Failed to start test.', 'Failed to start test.');

  if (latestAttemptData?.retake_allowed) {
    await admin.from('test_attempts').update({ retake_allowed: false }).eq('id', latestAttemptData.id);
  }

  return { attemptId: attempt.id };
}

export async function getTestSession(admin, currentUser, testId, attemptId, languageInput) {
  const role = normalizeRole(currentUser.role);
  if (role !== 'Referee' && role !== 'TO') {
    throw new RouteError(403, 'Only Referee and TO users can take tests.');
  }

  const language = normalizeLanguage(languageInput);
  const test = await loadTestById(admin, testId);
<<<<<<< HEAD
  ensureRoleCanAccessTest(currentUser, test);
  if ((test.status || 'Draft') !== 'Published') {
=======
  if (!isActiveTestRecord(test)) {
    throw new RouteError(404, 'Test not found.');
  }
  ensureRoleCanAccessTest(currentUser, test);
  if (getNormalizedTestStatus(test) !== 'Published') {
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
    throw new RouteError(409, 'This exam is not published yet.');
  }

  const attempt = ensureSingle(
    ...(await admin
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('test_id', test.id)
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data, error }) => [data, error])),
    'Attempt not found.',
    'Failed to load test attempt.',
  );

  const nowIso = new Date().toISOString();
  const currentAttempt = await autoAdvanceExpiredQuestions(admin, attempt, test, nowIso);

  if (currentAttempt.status === 'Completed') {
    return {
      attemptId: currentAttempt.id,
      testId: test.id,
      title: test.title,
      description: test.description || '',
      status: currentAttempt.status,
      resultStatus: currentAttempt.result_status,
      currentQuestionIndex: Number(currentAttempt.total_questions || TEST_SESSION_QUESTION_COUNT),
      totalQuestions: Number(currentAttempt.total_questions || TEST_SESSION_QUESTION_COUNT),
      remainingSeconds: 0,
      questionTimeLimitSeconds: Number(test.question_time_limit_seconds || TEST_QUESTION_TIME_LIMIT_SECONDS),
      question: null,
      completedAt: currentAttempt.completed_at,
      correctAnswers: Number(currentAttempt.correct_answers || 0),
    };
  }

  const questionIds = Array.isArray(currentAttempt.question_ids) ? currentAttempt.question_ids : [];
<<<<<<< HEAD
  let currentQuestionId = questionIds[Number(currentAttempt.current_question_index || 0)];
=======
  const currentQuestionId = questionIds[Number(currentAttempt.current_question_index || 0)];
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  let question = await maybeSingle(
    admin.from('test_questions').select('*').eq('id', currentQuestionId),
    'Failed to load current question.',
  );
  if (!question) {
<<<<<<< HEAD
    currentAttempt = await repairBrokenAttemptIfPossible(admin, currentAttempt, test);
    const repairedQuestionIds = Array.isArray(currentAttempt.question_ids) ? currentAttempt.question_ids : [];
    currentQuestionId = repairedQuestionIds[Number(currentAttempt.current_question_index || 0)];
    question = currentQuestionId
      ? await maybeSingle(
          admin.from('test_questions').select('*').eq('id', currentQuestionId),
          'Failed to load current question.',
        )
      : null;
  }
  if (!question) {
    throw new RouteError(409, 'Current question could not be loaded.');
  }

  const options = await listQuestionOptions(admin, [question.id]);
=======
    throw new RouteError(409, 'Current question could not be loaded.');
  }

  let options = await listQuestionOptions(admin, [question.id]);
  ({ question, options } = await ensureQuestionTranslations(admin, question, options, language));
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3

  const deadlineMs = new Date(currentAttempt.question_deadline_at || nowIso).getTime();
  const remainingSeconds = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));

  return {
    attemptId: currentAttempt.id,
    testId: test.id,
    title: test.title,
    description: test.description || '',
    status: currentAttempt.status,
    resultStatus: currentAttempt.result_status,
    currentQuestionIndex: Number(currentAttempt.current_question_index || 0),
    totalQuestions: Number(currentAttempt.total_questions || TEST_SESSION_QUESTION_COUNT),
    remainingSeconds,
    questionTimeLimitSeconds: Number(test.question_time_limit_seconds || TEST_QUESTION_TIME_LIMIT_SECONDS),
    question: toTranslatedQuestion(question, options, language),
    completedAt: currentAttempt.completed_at || null,
    correctAnswers: null,
  };
}

export async function submitTestAnswer(admin, currentUser, testId, body) {
  const role = normalizeRole(currentUser.role);
  if (role !== 'Referee' && role !== 'TO') {
    throw new RouteError(403, 'Only Referee and TO users can answer tests.');
  }

  const attemptId = String(body?.attemptId || '').trim();
  const selectedOptionIds = Array.isArray(body?.optionIds)
    ? [...new Set(body.optionIds.map((item) => String(item || '').trim()).filter(Boolean))]
    : [];

  if (!attemptId) {
    throw new RouteError(400, 'Attempt id is required.');
  }

  const test = await loadTestById(admin, testId);
<<<<<<< HEAD
  ensureRoleCanAccessTest(currentUser, test);
  if ((test.status || 'Draft') !== 'Published') {
=======
  if (!isActiveTestRecord(test)) {
    throw new RouteError(404, 'Test not found.');
  }
  ensureRoleCanAccessTest(currentUser, test);
  if (getNormalizedTestStatus(test) !== 'Published') {
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
    throw new RouteError(409, 'This exam is not published yet.');
  }

  const attempt = ensureSingle(
    ...(await admin
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('test_id', test.id)
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data, error }) => [data, error])),
    'Attempt not found.',
    'Failed to load test attempt.',
  );

  let currentAttempt = await autoAdvanceExpiredQuestions(admin, attempt, test, new Date().toISOString());
  if (currentAttempt.status === 'Completed') {
    return { attemptId: currentAttempt.id, completed: true };
  }

  const currentIndex = Number(currentAttempt.current_question_index || 0);
<<<<<<< HEAD
  let questionIds = Array.isArray(currentAttempt.question_ids) ? currentAttempt.question_ids : [];
  let currentQuestionId = questionIds[currentIndex];
  if (currentQuestionId) {
    const currentQuestion = await maybeSingle(
      admin.from('test_questions').select('id').eq('id', currentQuestionId),
      'Failed to load current question.',
    );
    if (!currentQuestion) {
      currentAttempt = await repairBrokenAttemptIfPossible(admin, currentAttempt, test);
      questionIds = Array.isArray(currentAttempt.question_ids) ? currentAttempt.question_ids : [];
      currentQuestionId = questionIds[Number(currentAttempt.current_question_index || 0)];
    }
  }
=======
  const questionIds = Array.isArray(currentAttempt.question_ids) ? currentAttempt.question_ids : [];
  const currentQuestionId = questionIds[currentIndex];
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  if (!currentQuestionId) {
    throw new RouteError(409, 'Current question is missing.');
  }

  const options = await listQuestionOptions(admin, [currentQuestionId]);
  const correctOptionIds = options
    .filter((option) => Boolean(option.is_correct))
    .map((option) => option.id)
    .sort();
  const normalizedSelectedIds = [...selectedOptionIds].sort();
  const isCorrect =
    normalizedSelectedIds.length === correctOptionIds.length &&
    normalizedSelectedIds.every((optionId, index) => optionId === correctOptionIds[index]);

  const answers = getAttemptAnswers(currentAttempt);
  if (answers.find((item) => item.questionId === currentQuestionId)) {
    throw new RouteError(409, 'This question has already been answered.');
  }

  const nextIndex = currentIndex + 1;
  const completed = nextIndex >= Number(currentAttempt.total_questions || TEST_SESSION_QUESTION_COUNT);
  currentAttempt = await updateAttempt(admin, currentAttempt.id, {
    answers: [
      ...answers,
      {
        questionId: currentQuestionId,
        selectedOptionIds,
        isCorrect,
        timedOut: false,
        answeredAt: new Date().toISOString(),
      },
    ],
    correct_answers: Number(currentAttempt.correct_answers || 0) + (isCorrect ? 1 : 0),
    current_question_index: nextIndex,
    question_started_at: completed ? null : new Date().toISOString(),
    question_deadline_at: completed
      ? null
      : new Date(Date.now() + Number(test.question_time_limit_seconds || TEST_QUESTION_TIME_LIMIT_SECONDS) * 1000).toISOString(),
  });

  currentAttempt = await finalizeAttemptIfNeeded(admin, currentAttempt, new Date().toISOString());

  return {
    attemptId: currentAttempt.id,
    completed: currentAttempt.status === 'Completed',
  };
}

export async function getTestResult(admin, currentUser, testId, attemptId) {
  const test = await loadTestById(admin, testId);
<<<<<<< HEAD
  ensureRoleCanAccessTest(currentUser, test);
  if (
    ['Referee', 'TO'].includes(normalizeRole(currentUser.role)) &&
    (test.status || 'Draft') !== 'Published'
=======
  if (!isActiveTestRecord(test)) {
    throw new RouteError(404, 'Test not found.');
  }
  ensureRoleCanAccessTest(currentUser, test);
  if (
    ['Referee', 'TO'].includes(normalizeRole(currentUser.role)) &&
    getNormalizedTestStatus(test) !== 'Published'
>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
  ) {
    throw new RouteError(409, 'This exam is not published yet.');
  }

  const filters =
    normalizeRole(currentUser.role) === 'Instructor' || normalizeRole(currentUser.role) === 'TO Supervisor'
      ? admin.from('test_attempts').select('*').eq('id', attemptId).eq('test_id', test.id)
      : admin.from('test_attempts').select('*').eq('id', attemptId).eq('test_id', test.id).eq('user_id', currentUser.id);

  let attempt = ensureSingle(
    ...(await filters.maybeSingle().then(({ data, error }) => [data, error])),
    'Attempt not found.',
    'Failed to load attempt.',
  );

  attempt = await autoAdvanceExpiredQuestions(admin, attempt, test, new Date().toISOString());
  attempt = await finalizeAttemptIfNeeded(admin, attempt, new Date().toISOString());

  if (attempt.status !== 'Completed') {
    throw new RouteError(409, 'This exam is still in progress.');
  }

  return {
    attemptId: attempt.id,
    testId: test.id,
    title: test.title,
    correctAnswers: Number(attempt.correct_answers || 0),
    totalQuestions: Number(attempt.total_questions || TEST_SESSION_QUESTION_COUNT),
    passThreshold: Number(test.pass_threshold || TEST_PASS_THRESHOLD),
    resultStatus: attempt.result_status,
    completedAt: attempt.completed_at,
    totalDurationSeconds: Number(attempt.total_duration_seconds || 0),
  };
}

export async function grantTestRetake(admin, currentUser, testId, attemptId) {
  const role = normalizeRole(currentUser.role);
  if (role !== 'Instructor' && role !== 'TO Supervisor') {
    throw new RouteError(403, 'Only Instructor and TO Supervisor can grant a retake.');
  }

  const test = await loadTestById(admin, testId);
  if (role === 'Instructor' && test.created_by !== currentUser.id) {
    throw new RouteError(403, 'This test belongs to another instructor.');
  }
  if (role === 'TO Supervisor' && !['TO', 'Both'].includes(test.audience_role)) {
    throw new RouteError(403, 'TO Supervisor can only grant retake for TO tests.');
  }

  const attempt = ensureSingle(
    ...(await admin
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('test_id', test.id)
      .maybeSingle()
      .then(({ data, error }) => [data, error])),
    'Attempt not found.',
    'Failed to load attempt.',
  );

  if (normalizeRole(attempt.user_role) === 'TO' && role === 'TO Supervisor') {
    // allowed
  } else if (role === 'TO Supervisor') {
    throw new RouteError(403, 'TO Supervisor can only grant retake for TO attempts.');
  }

  if (attempt.status !== 'Completed' || attempt.result_status !== 'FAILED') {
    throw new RouteError(409, 'Only failed completed attempts can receive a retake.');
  }

  await updateAttempt(admin, attempt.id, {
    retake_allowed: true,
  });

  return {
    message: 'Retake granted.',
  };
}
