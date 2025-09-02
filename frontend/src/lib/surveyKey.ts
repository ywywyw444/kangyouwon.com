export const SURVEY_KEY_STORAGE = 'surveyKey';

export function normalizeSurveyKey(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/\./g, '_');
}

export function saveSurveyKey(rawKey: string) {
  const key = normalizeSurveyKey(rawKey);
  localStorage.setItem(SURVEY_KEY_STORAGE, key);
  console.info('설문 ID localStorage 저장 완료(정규화):', key);
  return key;
}

export function loadSurveyKey(): string {
  return normalizeSurveyKey(localStorage.getItem(SURVEY_KEY_STORAGE));
}

export function generateSurveyKey(corpId: string | number, surveyId: string | number): string {
  return `${corpId}_${surveyId}`;
}
