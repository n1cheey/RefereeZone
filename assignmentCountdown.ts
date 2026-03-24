export const formatAutoDeclineCountdown = (autoDeclineAt: string | null, now = Date.now()) => {
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
    return 'Auto reject is being applied.';
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `Auto reject in ${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `Auto reject in ${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `Auto reject in ${minutes}m ${seconds}s`;
  }

  return `Auto reject in ${seconds}s`;
};
