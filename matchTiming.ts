const BAKU_OFFSET = '+04:00';

export const getMatchTimestamp = (matchDate: string, matchTime: string) => {
  const candidate = new Date(`${matchDate}T${matchTime}:00${BAKU_OFFSET}`);
  return Number.isNaN(candidate.getTime()) ? null : candidate.getTime();
};

export const isPastMatch = (matchDate: string, matchTime: string, now = Date.now()) => {
  const timestamp = getMatchTimestamp(matchDate, matchTime);
  return timestamp === null ? false : timestamp < now;
};
