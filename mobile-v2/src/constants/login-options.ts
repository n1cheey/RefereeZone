import { AppLanguage, CountryCode, DisciplineCode } from '@/src/types/domain';

export interface CountryOption {
  code: CountryCode;
  flag: string;
  name: Record<AppLanguage, string>;
}

export interface DisciplineOption {
  code: DisciplineCode;
  label: Record<AppLanguage, string>;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  {
    code: 'az',
    flag: '🇦🇿',
    name: {
      az: 'Azərbaycan',
      en: 'Azerbaijan',
      ru: 'Азербайджан',
    },
  },
];

export const DISCIPLINE_OPTIONS: DisciplineOption[] = [
  {
    code: 'basketball',
    label: {
      az: 'Basketbol',
      en: 'Basketball',
      ru: 'Баскетбол',
    },
  },
];
