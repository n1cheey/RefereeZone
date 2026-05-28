import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { User, TestAdminSummary, TestAttemptSummary, TestQuestionDraft, TestResultView, TestSessionState, UserTestSummary } from '../types';
import {
  createTest,
  getTestDetail,
  getTestResult,
  getTestSession,
  getTests,
  grantTestRetake,
  isUserTestSummary,
  startTestAttempt,
  submitTestAnswer,
  updateTest,
} from '../services/testsService';
import { getMembers } from '../services/adminService';
import { useI18n } from '../i18n';

interface TestsProps {
  user: User;
  onBack: () => void;
}

const QUESTION_BANK_SIZE = 50;
const QUESTIONS_PER_ATTEMPT = 25;
const PASS_THRESHOLD = 20;

const AUDIENCE_OPTIONS = [
  { value: 'Referee', label: 'Referee' },
  { value: 'TO', label: 'TO' },
  { value: 'Both', label: 'Referee + TO' },
] as const;

const ASSIGNMENT_MODE_OPTIONS = [
  { value: 'AllEligible', label: 'All eligible officials' },
  { value: 'SelectedUsers', label: 'Selected officials only' },
] as const;

const emptyQuestion = (): TestQuestionDraft => ({
  promptEn: '',
  promptAz: '',
  promptRu: '',
  type: 'single',
  correctAnswer: 'Yes',
  options: [
    { label: 'Yes', isCorrect: true },
    { label: 'No', isCorrect: false },
  ],
});

const expandQuestionBank = (questions?: TestQuestionDraft[] | null) => {
  const nextQuestions = Array.from({ length: QUESTION_BANK_SIZE }, () => emptyQuestion());

  (questions || []).slice(0, QUESTION_BANK_SIZE).forEach((question, index) => {
    nextQuestions[index] = {
      ...emptyQuestion(),
      ...question,
      options: question.options && question.options.length ? question.options : emptyQuestion().options,
    };
  });

  return nextQuestions;
};

const formatDuration = (value: number | null) => {
  if (value === null) {
    return '-';
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getSessionLanguage = (language: string) => {
  if (language === 'az' || language === 'ru') {
    return language;
  }

  return 'en';
};

const useExamProtection = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const preventDefault = (event: Event) => {
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const lowerKey = event.key.toLowerCase();
      const blockedShortcut =
        (event.ctrlKey || event.metaKey) &&
        ['a', 'c', 'x', 's', 'p', 'u'].includes(lowerKey);

      if (blockedShortcut || event.key === 'PrintScreen') {
        event.preventDefault();
      }
    };

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('selectstart', preventDefault);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('cut', preventDefault);
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('selectstart', preventDefault);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
};

const Tests: React.FC<TestsProps> = ({ user, onBack }) => {
  const { language, t } = useI18n();
  const [tests, setTests] = useState<Array<UserTestSummary | TestAdminSummary>>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TestAdminSummary | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [session, setSession] = useState<TestSessionState | null>(null);
  const [result, setResult] = useState<TestResultView | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [retakeLoadingId, setRetakeLoadingId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const currentSessionLanguage = getSessionLanguage(language);
  const [form, setForm] = useState({
    title: '',
    description: '',
    audienceRole: 'Referee' as 'Referee' | 'TO' | 'Both',
    status: 'Draft' as 'Draft' | 'Published',
    assignmentMode: 'AllEligible' as 'AllEligible' | 'SelectedUsers',
    selectedUserIds: [] as string[],
    deadlineAt: '',
    questions: Array.from({ length: QUESTION_BANK_SIZE }, () => emptyQuestion()),
  });

  const role = user.role;
  const isInstructor = role === 'Instructor';
  const isTOSupervisor = role === 'TO Supervisor';
  const isParticipant = role === 'Referee' || role === 'TO';
  const canCreate = isInstructor;
  const isExamActive = Boolean(session && session.status === 'InProgress' && session.question);

  useExamProtection(isExamActive);

  const loadTests = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await getTests();
      setTests(response.tests);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load tests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTests();
  }, [loadTests]);

  const resetForm = useCallback(() => {
    setEditingTestId(null);
    setForm({
      title: '',
      description: '',
      audienceRole: 'Referee',
      status: 'Draft',
      assignmentMode: 'AllEligible',
      selectedUserIds: [],
      deadlineAt: '',
      questions: expandQuestionBank(),
    });
  }, []);

  const loadMembers = useCallback(async () => {
    if (!isInstructor) {
      return;
    }

    setMembersLoading(true);
    try {
      const response = await getMembers(user.id);
      setMembers(response.members);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [isInstructor, user.id]);

  useEffect(() => {
    if (showCreateForm && isInstructor && members.length === 0 && !membersLoading) {
      void loadMembers();
    }
  }, [isInstructor, loadMembers, members.length, membersLoading, showCreateForm]);

  const loadDetail = useCallback(async (testId: string) => {
    if (!isInstructor && !isTOSupervisor) {
      return;
    }

    setLoadingDetail(true);
    setErrorMessage('');
    try {
      const response = await getTestDetail(testId);
      setDetail(response.test);
      setActiveTestId(testId);
      return response.test;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load test detail.');
      return null;
    } finally {
      setLoadingDetail(false);
    }
  }, [isInstructor, isTOSupervisor]);

  const openEditor = useCallback((test: TestAdminSummary) => {
    setEditingTestId(test.id);
    setShowCreateForm(true);
    setForm({
      title: test.title,
      description: test.description,
      audienceRole: test.audienceRole,
      status: test.status,
      assignmentMode: test.assignmentMode,
      selectedUserIds: test.selectedUserIds || [],
      deadlineAt: test.deadlineAt ? test.deadlineAt.slice(0, 16) : '',
      questions: expandQuestionBank(test.questions),
    });
  }, []);

  const beginAttempt = useCallback(async (testId: string, latestAttempt?: TestAttemptSummary | null) => {
    setErrorMessage('');
    setSuccessMessage('');
    setResult(null);
    setSelectedOptionIds([]);
    try {
      if (latestAttempt?.resultStatus === 'SUCCESS') {
        const existingResult = await getTestResult(testId, latestAttempt.id);
        setResult(existingResult);
        setSession(null);
        setActiveAttemptId(latestAttempt.id);
        setActiveTestId(testId);
        return;
      }

      const attemptId =
        latestAttempt?.status === 'InProgress'
          ? latestAttempt.id
          : (await startTestAttempt(testId)).attemptId;

      setActiveAttemptId(attemptId);
      const nextSession = await getTestSession(testId, attemptId, currentSessionLanguage);
      setSession(nextSession);
      setRemainingSeconds(nextSession.remainingSeconds);
      setActiveTestId(testId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start exam.');
    }
  }, [currentSessionLanguage]);

  const refreshSession = useCallback(async (options?: { preserveCountdown?: boolean; languageOverride?: string }) => {
    if (!activeTestId || !activeAttemptId) {
      return;
    }

    try {
      const nextSession = await getTestSession(
        activeTestId,
        activeAttemptId,
        options?.languageOverride || currentSessionLanguage,
      );
      setSession(nextSession);
      setRemainingSeconds((previous) => {
        if (!options?.preserveCountdown) {
          return nextSession.remainingSeconds;
        }

        if (previous <= 0) {
          return nextSession.remainingSeconds;
        }

        return Math.min(previous, nextSession.remainingSeconds);
      });

      if (nextSession.status === 'Completed') {
        const resultResponse = await getTestResult(activeTestId, activeAttemptId);
        setResult(resultResponse);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh exam session.';
      setErrorMessage(message);
    }
  }, [activeAttemptId, activeTestId, currentSessionLanguage]);

  useEffect(() => {
    if (!isExamActive) {
      return;
    }

    void refreshSession({
      preserveCountdown: true,
      languageOverride: currentSessionLanguage,
    });
  }, [currentSessionLanguage, isExamActive, refreshSession]);

  useEffect(() => {
    if (!session || session.status !== 'InProgress') {
      return undefined;
    }

    setRemainingSeconds(session.remainingSeconds);
  }, [session?.attemptId, session?.currentQuestionIndex, session?.status]);

  useEffect(() => {
    if (!session || session.status !== 'InProgress') {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          void refreshSession();
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshSession, session?.attemptId, session?.currentQuestionIndex, session?.status]);

  const handleOptionToggle = (optionId: string) => {
    if (!session?.question) {
      return;
    }

    if (session.question.type === 'single') {
      setSelectedOptionIds([optionId]);
      return;
    }

    setSelectedOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((item) => item !== optionId)
        : [...current, optionId],
    );
  };

  const handleSubmitAnswer = async () => {
    if (!activeTestId || !activeAttemptId || !session?.question || submittingAnswer) {
      return;
    }

    setSubmittingAnswer(true);
    setErrorMessage('');
    try {
      const response = await submitTestAnswer(activeTestId, activeAttemptId, selectedOptionIds);
      setSelectedOptionIds([]);

      if (response.completed) {
        const resultResponse = await getTestResult(activeTestId, activeAttemptId);
        setSession((current) =>
          current
            ? {
                ...current,
                status: 'Completed',
                resultStatus: resultResponse.resultStatus,
                question: null,
              }
            : current,
        );
        setResult(resultResponse);
        await loadTests();
        if (isInstructor || isTOSupervisor) {
          await loadDetail(activeTestId);
        }
        return;
      }

      await refreshSession();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit answer.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleGrantRetake = async (testId: string, attemptId: string) => {
    setRetakeLoadingId(attemptId);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const response = await grantTestRetake(testId, attemptId);
      setSuccessMessage(response.message);
      await loadDetail(testId);
      await loadTests();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to grant retake.');
    } finally {
      setRetakeLoadingId(null);
    }
  };

  const handleSaveTest = async (status: 'Draft' | 'Published') => {
    setCreating(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const payload = {
        ...form,
        status,
        deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : null,
      };
      const response = editingTestId
        ? await updateTest(editingTestId, payload)
        : await createTest(payload);
      setSuccessMessage(response.message);
      setShowCreateForm(false);
      resetForm();
      await loadTests();
      await loadDetail(response.test.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create test.');
    } finally {
      setCreating(false);
    }
  };

  const updateQuestion = (questionIndex: number, patch: Partial<TestQuestionDraft>) => {
    setForm((current) => {
      const nextQuestions = [...current.questions];
      const nextQuestion = {
        ...nextQuestions[questionIndex],
        ...patch,
      };
      if (patch.correctAnswer) {
        nextQuestion.options = [
          { label: 'Yes', isCorrect: patch.correctAnswer === 'Yes' },
          { label: 'No', isCorrect: patch.correctAnswer === 'No' },
        ];
      }
      nextQuestions[questionIndex] = nextQuestion;
      return {
        ...current,
        questions: nextQuestions,
      };
    });
  };

  const pendingRetakes = useMemo(() => {
    if (!detail) {
      return [];
    }

    return detail.attempts.filter(
      (attempt) => attempt.status === 'Completed' && attempt.resultStatus === 'FAILED',
    );
  }, [detail]);

  const resultTone =
    result?.resultStatus === 'SUCCESS'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-red-200 bg-red-50 text-red-900';

  const eligibleMembers = useMemo(() => {
    if (form.audienceRole === 'Both') {
      return members.filter((member) => member.role === 'Referee' || member.role === 'TO');
    }

    return members.filter((member) => member.role === form.audienceRole);
  }, [form.audienceRole, members]);

  return (
    <Layout title={t('tests.title')} onBack={onBack} onLogout={undefined}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="space-y-6">
          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {errorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {successMessage}
            </div>
          ) : null}

          {(isInstructor || isTOSupervisor) && !isExamActive ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Exam desk</div>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Role-based exam control</h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Instructors manage the full 50-question bank, while the live exam serves 25 randomized questions per official with a 2-minute limit on each step.
                  </p>
                </div>
                {canCreate ? (
                  <button
                    onClick={() => {
                      if (showCreateForm) {
                        setShowCreateForm(false);
                        resetForm();
                        return;
                      }
                      setShowCreateForm(true);
                    }}
                    className="rounded-full bg-[#57131b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6b1b24]">
                    {showCreateForm ? 'Close builder' : 'Create exam'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {canCreate && showCreateForm ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {editingTestId ? 'Edit exam draft' : 'Create exam'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter each question in English, Azerbaijani and Russian so participants see the correct language during the exam.
                  </p>
                </div>
                <div className="rounded-full bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-900">
                  50 question bank / 25 served per user
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Title</span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#57131b]"
                    placeholder="Referee mechanics exam - Round 5"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Audience</span>
                  <select
                    value={form.audienceRole}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      audienceRole: event.target.value as 'Referee' | 'TO' | 'Both',
                      selectedUserIds: [],
                    }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#57131b]">
                    {AUDIENCE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#57131b]"
                  placeholder="Explain the exam scope, timing and pass requirement."
                />
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Deadline</span>
                  <input
                    type="datetime-local"
                    value={form.deadlineAt}
                    onChange={(event) => setForm((current) => ({ ...current, deadlineAt: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#57131b]"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Assignment</span>
                  <select
                    value={form.assignmentMode}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      assignmentMode: event.target.value as 'AllEligible' | 'SelectedUsers',
                      selectedUserIds: event.target.value === 'SelectedUsers' ? current.selectedUserIds : [],
                    }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#57131b]">
                    {ASSIGNMENT_MODE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {form.assignmentMode === 'SelectedUsers' ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Selected officials</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Choose the specific {form.audienceRole === 'Both' ? 'Referee/TO' : form.audienceRole} users who should receive this test.
                      </div>
                    </div>
                    {membersLoading ? <div className="text-xs text-slate-500">Loading members...</div> : null}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {eligibleMembers.map((member) => {
                      const checked = form.selectedUserIds.includes(member.id);
                      return (
                        <label key={member.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => setForm((current) => ({
                              ...current,
                              selectedUserIds: event.target.checked
                                ? [...current.selectedUserIds, member.id]
                                : current.selectedUserIds.filter((id) => id !== member.id),
                            }))}
                          />
                          <span>
                            <span className="block text-sm font-bold text-slate-900">{member.fullName}</span>
                            <span className="block text-xs text-slate-500">
                              {member.role} {member.licenseNumber ? `• ${member.licenseNumber}` : ''}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">
                  Question bank progress: {form.questions.filter((question) => question.promptEn.trim() || question.promptAz.trim() || question.promptRu.trim()).length} / {QUESTION_BANK_SIZE}
                </div>
                <div className="text-xs text-slate-500">
                  Each question is answered with Yes or No, and you choose which one is correct.
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {form.questions.map((question, questionIndex) => (
                  <div key={`question-${questionIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-slate-900">Question {questionIndex + 1}</div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                        Yes / No
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3">
                      <textarea
                        value={question.promptEn}
                        onChange={(event) => updateQuestion(questionIndex, { promptEn: event.target.value })}
                        className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#57131b]"
                        placeholder="Question in English"
                      />
                      <textarea
                        value={question.promptAz}
                        onChange={(event) => updateQuestion(questionIndex, { promptAz: event.target.value })}
                        className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#57131b]"
                        placeholder="Question in Azerbaijani"
                      />
                      <textarea
                        value={question.promptRu}
                        onChange={(event) => updateQuestion(questionIndex, { promptRu: event.target.value })}
                        className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#57131b]"
                        placeholder="Question in Russian"
                      />
                    </div>
                    <label className="mt-3 flex flex-col gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Correct answer</span>
                      <select
                        value={question.correctAnswer || 'Yes'}
                        onChange={(event) => updateQuestion(questionIndex, { correctAnswer: event.target.value as 'Yes' | 'No' })}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#57131b]">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => void handleSaveTest('Draft')}
                    disabled={creating}
                    className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                    {creating ? 'Saving...' : 'Save draft'}
                  </button>
                  <button
                    onClick={() => void handleSaveTest('Published')}
                    disabled={creating}
                    className="rounded-full bg-[#57131b] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#6b1b24] disabled:opacity-60">
                    {creating ? 'Publishing...' : 'Publish exam'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Loading tests...
            </div>
          ) : (
            <div className="grid gap-4">
              {tests.map((test) => {
                const latestAttempt =
                  isUserTestSummary(test) ? test.latestAttempt : null;
                const waitingForRetakeApproval =
                  isParticipant &&
                  latestAttempt?.status === 'Completed' &&
                  latestAttempt?.resultStatus === 'FAILED' &&
                  !latestAttempt?.retakeAllowed;
                const canOpenParticipantAction =
                  !waitingForRetakeApproval;

                return (
                  <div key={test.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            {test.audienceRole}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                            test.status === 'Draft'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {test.status}
                          </span>
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-900">
                            {test.questionBankSize} bank / {test.questionCount} live
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900">{test.title}</h3>
                        <p className="max-w-3xl text-sm text-slate-500">{test.description || 'No description provided.'}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                          <span>Created by {test.createdByName}</span>
                          <span>{formatDateTime(test.createdAt)}</span>
                          <span>{test.questionTimeLimitSeconds / 60} min / question</span>
                          <span>Pass: {test.passThreshold} / {test.questionCount}</span>
                          <span>{test.assignmentMode === 'SelectedUsers' ? 'Selected officials' : 'All eligible officials'}</span>
                          <span>Deadline: {formatDateTime(test.deadlineAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(isInstructor || isTOSupervisor) ? (
                          <button
                            onClick={() => void loadDetail(test.id)}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                            {activeTestId === test.id ? 'Refresh detail' : 'Open detail'}
                          </button>
                        ) : null}
                        {isInstructor && test.createdById === user.id ? (
                          <button
                            onClick={() => void loadDetail(test.id).then((loadedTest) => {
                              if (loadedTest) {
                                openEditor(loadedTest);
                              }
                            })}
                            className="rounded-full border border-[#57131b]/20 px-4 py-2 text-sm font-bold text-[#57131b] transition hover:bg-[#57131b]/5">
                            Load for edit
                          </button>
                        ) : null}
                        {isParticipant ? (
                          <button
                            onClick={() => void beginAttempt(test.id, latestAttempt)}
                            disabled={!canOpenParticipantAction}
                            className="rounded-full bg-[#57131b] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#6b1b24] disabled:cursor-not-allowed disabled:opacity-60">
                            {latestAttempt?.status === 'InProgress'
                              ? 'Resume exam'
                              : latestAttempt?.resultStatus === 'FAILED' && latestAttempt?.retakeAllowed
                                ? 'Retake exam'
                                : waitingForRetakeApproval
                                  ? 'Await instructor retake'
                                : latestAttempt?.resultStatus === 'SUCCESS'
                                  ? 'Open result'
                                  : 'Start exam'}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {latestAttempt ? (
                      <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-4">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Last status</div>
                          <div className="mt-2 text-sm font-bold text-slate-900">{latestAttempt.status}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Result</div>
                          <div className="mt-2 text-sm font-bold text-slate-900">{latestAttempt.resultStatus || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Correct answers</div>
                          <div className="mt-2 text-sm font-bold text-slate-900">{latestAttempt.correctAnswers} / {latestAttempt.totalQuestions}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Duration</div>
                          <div className="mt-2 text-sm font-bold text-slate-900">{formatDuration(latestAttempt.totalDurationSeconds)}</div>
                        </div>
                      </div>
                    ) : null}
                    {waitingForRetakeApproval ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                        Retake is locked until an Instructor grants access.
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {isExamActive && session?.question ? (
            <div className="rounded-3xl border border-[#57131b]/15 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Live exam</div>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{session.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">{session.description}</p>
                </div>
                <div className="rounded-2xl bg-[#57131b] px-4 py-3 text-center text-white">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Time left</div>
                  <div className="mt-2 text-3xl font-black">{formatDuration(remainingSeconds)}</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Question {session.currentQuestionIndex + 1} / {session.totalQuestions}
                </div>
                <div className="mt-3 text-lg font-black text-slate-900">{session.question.prompt}</div>
                <div className="mt-4 space-y-3">
                  {session.question.options.map((option) => {
                    const isSelected = selectedOptionIds.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionToggle(option.id)}
                        className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                          isSelected ? 'border-[#57131b] bg-[#57131b]/5' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}>
                        <span className={`mt-1 h-5 w-5 rounded-full border ${isSelected ? 'border-[#57131b] bg-[#57131b]' : 'border-slate-300 bg-white'}`} />
                        <span className="text-sm font-semibold text-slate-800">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                  Copy, text selection and context menu are disabled during the exam.
                </div>
                <button
                  onClick={() => void handleSubmitAnswer()}
                  disabled={submittingAnswer || (session.question.type === 'single' && selectedOptionIds.length === 0)}
                  className="rounded-full bg-[#57131b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6b1b24] disabled:opacity-60">
                  {submittingAnswer ? 'Submitting...' : 'Lock answer & next'}
                </button>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className={`rounded-3xl border p-5 shadow-sm ${resultTone}`}>
              <div className="text-xs font-bold uppercase tracking-[0.2em]">Exam result</div>
              <div className="mt-2 text-3xl font-black">{result.resultStatus}</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">Score</div>
                  <div className="mt-2 text-lg font-black">{result.correctAnswers} / {result.totalQuestions}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">Total time</div>
                  <div className="mt-2 text-lg font-black">{formatDuration(result.totalDurationSeconds)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">Submitted</div>
                  <div className="mt-2 text-sm font-semibold">{formatDateTime(result.completedAt)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">Pass line</div>
                  <div className="mt-2 text-sm font-semibold">{result.passThreshold} correct answers</div>
                </div>
              </div>
              <div className="mt-5 text-sm font-semibold">
                {result.correctAnswers >= PASS_THRESHOLD
                  ? 'You passed this exam.'
                  : 'You did not reach the pass threshold yet.'}
              </div>
            </div>
          ) : null}

          {(isInstructor || isTOSupervisor) ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Review desk</div>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Attempts & retakes</h2>
                </div>
                {loadingDetail ? <div className="text-sm text-slate-500">Loading detail...</div> : null}
              </div>

              {!detail ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  Open a test card to review participant attempts and grant retakes.
                </div>
              ) : (
                <>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-slate-900">{detail.title}</div>
                        <div className="mt-2 text-sm text-slate-500">{detail.description || 'No description provided.'}</div>
                      </div>
                      {isInstructor && detail.createdById === user.id ? (
                        <button
                          onClick={() => openEditor(detail)}
                          className="rounded-full border border-[#57131b]/20 px-4 py-2 text-sm font-bold text-[#57131b] transition hover:bg-[#57131b]/5">
                          Edit exam
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                      <span>Audience: {detail.audienceRole}</span>
                      <span>Status: {detail.status}</span>
                      <span>Deadline: {formatDateTime(detail.deadlineAt)}</span>
                      <span>Attempts: {detail.attempts.length}</span>
                      <span>Failed pending retake: {pendingRetakes.filter((attempt) => !attempt.retakeAllowed).length}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {detail.attempts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                        No attempts yet.
                      </div>
                    ) : (
                      detail.attempts.map((attempt) => (
                        <div key={attempt.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-black text-slate-900">{attempt.userName}</div>
                              <div className="mt-1 text-sm text-slate-500">{attempt.userRole}</div>
                            </div>
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                              {attempt.resultStatus || attempt.status}
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Submitted</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(attempt.completedAt || attempt.startedAt)}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Duration</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">{formatDuration(attempt.totalDurationSeconds)}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Score</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">{attempt.correctAnswers} / {attempt.totalQuestions}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Retake</div>
                              <div className="mt-1 text-sm font-semibold text-slate-900">{attempt.retakeAllowed ? 'Enabled' : 'Locked'}</div>
                            </div>
                          </div>
                          {attempt.resultStatus === 'FAILED' ? (
                            <div className="mt-4 flex justify-end">
                              <button
                                onClick={() => void handleGrantRetake(detail.id, attempt.id)}
                                disabled={retakeLoadingId === attempt.id || attempt.retakeAllowed}
                                className="rounded-full border border-[#57131b]/20 px-4 py-2 text-sm font-bold text-[#57131b] transition hover:bg-[#57131b]/5 disabled:opacity-60">
                                {attempt.retakeAllowed
                                  ? 'Retake granted'
                                  : retakeLoadingId === attempt.id
                                    ? 'Granting...'
                                    : 'Grant retake'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
};

export default Tests;
