// 최고 기록(도달 단계) · 이 기기에만
const STORAGE_KEY = 'ieum:best';

export function loadBest(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(stage: number): void {
  try {
    if (stage > loadBest()) localStorage.setItem(STORAGE_KEY, String(stage));
  } catch {
    // 기억 못 해도 됨
  }
}
