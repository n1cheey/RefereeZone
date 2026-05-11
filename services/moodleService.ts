import { User } from '../types';

type MoodleTarget = 'admin' | 'learner';

const normalize = (value?: string) => String(value || '').trim().replace(/\/+$/, '');

const testsProvider = String(import.meta.env.VITE_TESTS_PROVIDER || 'native').trim().toLowerCase();
const moodleBaseUrl = normalize(import.meta.env.VITE_MOODLE_BASE_URL);
const moodleLearnerPath = String(import.meta.env.VITE_MOODLE_LEARNER_PATH || '/my/').trim() || '/my/';
const moodleAdminPath = String(import.meta.env.VITE_MOODLE_ADMIN_PATH || '/my/').trim() || '/my/';

export const isMoodleTestsEnabled = () => testsProvider === 'moodle' && Boolean(moodleBaseUrl);

export const getMoodleTargetForUser = (user: User): MoodleTarget =>
  user.role === 'Instructor' || user.role === 'TO Supervisor' ? 'admin' : 'learner';

export const buildMoodleUrl = (user: User, target: MoodleTarget = getMoodleTargetForUser(user)) => {
  if (!moodleBaseUrl) {
    return '';
  }

  const nextUrl = new URL(target === 'admin' ? moodleAdminPath : moodleLearnerPath, `${moodleBaseUrl}/`);
  nextUrl.searchParams.set('source', 'abl-refzone');
  nextUrl.searchParams.set('role', String(user.role || ''));
  nextUrl.searchParams.set('userId', String(user.id || ''));
  if (user.email) {
    nextUrl.searchParams.set('email', user.email);
  }
  return nextUrl.toString();
};

export const openMoodleForUser = (user: User, target?: MoodleTarget) => {
  const url = buildMoodleUrl(user, target);
  if (!url || typeof window === 'undefined') {
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};
