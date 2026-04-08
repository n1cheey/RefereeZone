import { Language } from './i18n';

const countdownLabels: Record<Language, Record<string, string>> = {
  en: {
    applied: 'Auto reject is being applied.',
    inDays: 'Auto reject in {days}d {hours}h {minutes}m',
    inHours: 'Auto reject in {hours}h {minutes}m',
    inMinutes: 'Auto reject in {minutes}m {seconds}s',
    inSeconds: 'Auto reject in {seconds}s',
  },
  az: {
    applied: 'Avto imtina tətbiq olunur.',
    inDays: 'Avto imtinaya {days}g {hours}s {minutes}d',
    inHours: 'Avto imtinaya {hours}s {minutes}d',
    inMinutes: 'Avto imtinaya {minutes}d {seconds}san',
    inSeconds: 'Avto imtinaya {seconds}san',
  },
  ru: {
    applied: 'Автоотказ применяется.',
    inDays: 'Автоотказ через {days}д {hours}ч {minutes}м',
    inHours: 'Автоотказ через {hours}ч {minutes}м',
    inMinutes: 'Автоотказ через {minutes}м {seconds}с',
    inSeconds: 'Автоотказ через {seconds}с',
  },
};

const interpolate = (template: string, params: Record<string, number>) =>
  Object.entries(params).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), template);

export const formatAutoDeclineCountdown = (autoDeclineAt: string | null, now = Date.now(), language: Language = 'en') => {
  if (!autoDeclineAt) {
    return null;
  }

  const deadline = new Date(autoDeclineAt);
  const deadlineTime = deadline.getTime();
  if (Number.isNaN(deadlineTime)) {
    return null;
  }

  const diffMs = deadlineTime - now;
  if (diffMs <= 0) {
    return countdownLabels[language].applied;
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return interpolate(countdownLabels[language].inDays, { days, hours, minutes });
  }

  if (hours > 0) {
    return interpolate(countdownLabels[language].inHours, { hours, minutes });
  }

  if (minutes > 0) {
    return interpolate(countdownLabels[language].inMinutes, { minutes, seconds });
  }

  return interpolate(countdownLabels[language].inSeconds, { seconds });
};
