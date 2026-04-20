import { Language, getNominationSlotLabelByLanguage, getStatisticSlotLabelByLanguage, getTOSlotLabelByLanguage } from './i18n';

export const getNominationSlotLabel = (slotNumber: number, language: Language = 'en') =>
  getNominationSlotLabelByLanguage(slotNumber, language);

export const getTOSlotLabel = (slotNumber: number, language: Language = 'en') =>
  getTOSlotLabelByLanguage(slotNumber, language);

export const getStatisticSlotLabel = (slotNumber: number, language: Language = 'en') =>
  getStatisticSlotLabelByLanguage(slotNumber, language);
