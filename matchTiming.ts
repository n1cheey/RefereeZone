const BAKU_OFFSET = '+04:00';

const normalizeMatchTime = (matchTime: string) => {
  const trimmed = String(matchTime || '').trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
};

export const getMatchTimestamp = (matchDate: string, matchTime: string) => {
  const normalizedTime = normalizeMatchTime(matchTime);
  const candidate = new Date(`${matchDate}T${normalizedTime}${BAKU_OFFSET}`);
  return Number.isNaN(candidate.getTime()) ? null : candidate.getTime();
};

export const isPastMatch = (matchDate: string, matchTime: string, now = Date.now()) => {
  const timestamp = getMatchTimestamp(matchDate, matchTime);
  return timestamp === null ? false : timestamp < now;
};
