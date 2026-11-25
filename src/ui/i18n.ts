// 한국어 · 영어(브라우저 언어 기본, 고른 값은 기억)
export type Lang = 'ko' | 'en';

const STORAGE_KEY = 'ieum:lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // 저장소를 못 쓰는 브라우저
  }
  return navigator.language.startsWith('ko') ? 'ko' : 'en';
}

export let lang: Lang = initialLang();

export const t = (ko: string, en: string): string => (lang === 'ko' ? ko : en);

export function setLang(next: Lang): void {
  lang = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 기억 못 해도 됨
  }
}
