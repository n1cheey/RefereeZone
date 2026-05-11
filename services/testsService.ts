import {
  TestAssignmentMode,
  TestAdminSummary,
  TestAttemptSummary,
  TestLanguage,
  TestPublishStatus,
  TestQuestionDraft,
  TestResultView,
  TestSessionState,
  TestSummary,
  UserTestSummary,
} from '../types';
import { apiRequest } from './apiClient';

interface CreateTestPayload {
  title: string;
  description: string;
  audienceRole: 'Referee' | 'TO' | 'Both';
  status: TestPublishStatus;
  assignmentMode: TestAssignmentMode;
  selectedUserIds: string[];
  deadlineAt: string | null;
  questions: TestQuestionDraft[];
}

export interface CreateTestResponse {
  message: string;
  test: TestSummary;
}

type TestsListResponse = {
  tests: Array<UserTestSummary | TestAdminSummary>;
};

export interface TestDetailResponse {
  test: TestAdminSummary;
}

export interface StartTestResponse {
  attemptId: string;
}

export interface SubmitTestAnswerResponse {
  attemptId: string;
  completed: boolean;
}

export interface GrantRetakeResponse {
  message: string;
}

<<<<<<< HEAD
=======
export interface DeleteTestResponse {
  message: string;
}

>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
export const getTests = () => apiRequest<TestsListResponse>('/api/tests');

export const getTestDetail = (testId: string) =>
  apiRequest<TestDetailResponse>(`/api/tests/${encodeURIComponent(testId)}`);

export const createTest = (payload: CreateTestPayload) =>
  apiRequest<CreateTestResponse>('/api/tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const updateTest = (testId: string, payload: CreateTestPayload) =>
  apiRequest<CreateTestResponse>(`/api/tests/${encodeURIComponent(testId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

<<<<<<< HEAD
=======
export const deleteTest = (testId: string) =>
  apiRequest<DeleteTestResponse>(`/api/tests/${encodeURIComponent(testId)}`, {
    method: 'DELETE',
  });

>>>>>>> 3551f15290eb32b836a9dd83f38df669108c7ad3
export const startTestAttempt = (testId: string) =>
  apiRequest<StartTestResponse>(`/api/tests/${encodeURIComponent(testId)}/start`, {
    method: 'POST',
  });

export const getTestSession = (testId: string, attemptId: string, language: TestLanguage) =>
  apiRequest<TestSessionState>(
    `/api/tests/${encodeURIComponent(testId)}/session?attemptId=${encodeURIComponent(attemptId)}&language=${encodeURIComponent(language)}`,
  );

export const submitTestAnswer = (testId: string, attemptId: string, optionIds: string[]) =>
  apiRequest<SubmitTestAnswerResponse>(`/api/tests/${encodeURIComponent(testId)}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId,
      optionIds,
    }),
  });

export const getTestResult = (testId: string, attemptId: string) =>
  apiRequest<TestResultView>(
    `/api/tests/${encodeURIComponent(testId)}/result?attemptId=${encodeURIComponent(attemptId)}`,
  );

export const grantTestRetake = (testId: string, attemptId: string) =>
  apiRequest<GrantRetakeResponse>(
    `/api/tests/${encodeURIComponent(testId)}/attempts/${encodeURIComponent(attemptId)}/retake`,
    {
      method: 'POST',
    },
  );

export const isAdminTestSummary = (
  test: UserTestSummary | TestAdminSummary,
): test is TestAdminSummary => 'attempts' in test;

export const isUserTestSummary = (
  test: UserTestSummary | TestAdminSummary,
): test is UserTestSummary => 'latestAttempt' in test;

export const getLatestAttemptForAdmin = (
  attempts: TestAttemptSummary[],
  userId: string,
) => [...attempts]
  .filter((attempt) => attempt.userId === userId)
  .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0] || null;
