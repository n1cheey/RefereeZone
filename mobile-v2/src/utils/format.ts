const EMPTY_DASH = '-';

const safeDate = (value: string | Date | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateLabel = (value: string) => {
  if (!value) {
    return EMPTY_DASH;
  }

  const directDate = safeDate(value);
  const date = directDate || safeDate(`${value}T00:00:00`);
  if (!date) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTimeLabel = (value: string | null | undefined) => {
  const date = safeDate(value);
  if (!date) {
    return EMPTY_DASH;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatTimeLabel = (value: string | null | undefined) => {
  if (!value) {
    return EMPTY_DASH;
  }

  const timeMatch = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }

  const date = safeDate(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatMonthYearLabel = (value: Date) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(value);

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'AZN',
    maximumFractionDigits: 0,
  }).format(value || 0);

export const getInitials = (value: string) =>
  String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
