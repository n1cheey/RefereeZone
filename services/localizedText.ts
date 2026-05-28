import { Language } from '../i18n';
import { AnnouncementItem, LocalizedTextValue, TestQuestionDraft } from '../types';

export const resolveLocalizedText = (
  value: LocalizedTextValue | null | undefined,
  language: Language,
  fallback = '',
) => {
  if (!value) {
    return fallback;
  }

  const requested = String(value[language] || '').trim();
  if (requested) {
    return requested;
  }

  const english = String(value.en || '').trim();
  if (english) {
    return english;
  }

  const azerbaijani = String(value.az || '').trim();
  if (azerbaijani) {
    return azerbaijani;
  }

  const russian = String(value.ru || '').trim();
  return russian || fallback;
};

export const getAnnouncementMessage = (announcement: AnnouncementItem | null | undefined, language: Language) =>
  resolveLocalizedText(
    {
      az: announcement?.messageAz,
      en: announcement?.messageEn,
      ru: announcement?.messageRu,
    },
    language,
    String(announcement?.message || '').trim(),
  );

export const getDraftQuestionPrompt = (question: Pick<TestQuestionDraft, 'promptAz' | 'promptEn' | 'promptRu'>, language: Language) =>
  resolveLocalizedText(
    {
      az: question.promptAz,
      en: question.promptEn,
      ru: question.promptRu,
    },
    language,
  );
