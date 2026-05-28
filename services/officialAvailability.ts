import { AvailabilityDateRange, RefereeDirectoryItem } from '../types';

export const getOfficialUnavailabilityRange = (
  official: RefereeDirectoryItem,
  matchDate: string,
): AvailabilityDateRange | null => {
  if (!matchDate) {
    return null;
  }

  return (
    official.unavailableRanges?.find(
      (range) => range.startDate <= matchDate && range.endDate >= matchDate,
    ) || null
  );
};

export const isOfficialUnavailableOnMatchDate = (
  official: RefereeDirectoryItem,
  matchDate: string,
) => Boolean(getOfficialUnavailabilityRange(official, matchDate));
