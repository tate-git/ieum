// 단계가 오를수록 색이 늘고 길이 길어지고 시간은 빠듯해짐
import type { Size } from './grid';
import type { PuzzleOptions } from './puzzle';

/** 가로 10칸 × 세로 11칸 */
export const BOARD_SIZE: Size = { rows: 11, cols: 10 };

export interface Stage {
  readonly number: number;
  readonly puzzle: PuzzleOptions;
  readonly seconds: number;
}

const FIRST_COLORS = 4;
const MAX_COLORS = 10;
const FIRST_SECONDS = 60;
const MIN_SECONDS = 35;

export function stage(number: number): Stage {
  const colors = Math.min(FIRST_COLORS + Math.floor((number - 1) / 2), MAX_COLORS);
  const minLength = Math.min(6 + Math.floor((number - 1) / 4), 7);
  return {
    number,
    puzzle: { size: BOARD_SIZE, colors, minLength, maxLength: minLength + 6 },
    seconds: Math.max(FIRST_SECONDS - (number - 1) * 3, MIN_SECONDS) + colors * 3,
  };
}
