// 랜덤 판: 빈 칸 위로 겹치지 않는 길을 색 수만큼 그어 두고, 길의 양 끝을 같은 색 점 한 쌍으로 냄 → 항상 풀 수 있음
import { cellKey, neighbors, type Cell, type Size } from './grid';
import { pick, shuffle, type Random } from './random';

export interface Pair {
  readonly color: number;
  readonly ends: readonly [Cell, Cell];
  /** 만들 때 그은 길(답 하나) */
  readonly solution: readonly Cell[];
}

export interface Puzzle {
  readonly size: Size;
  readonly pairs: readonly Pair[];
  /** 빵구 낸 칸(점도 선도 못 들어감) */
  readonly holes: readonly Cell[];
  /** 짝 없이 하나만 놓인 점(잇지는 않지만 선이 못 지나감) */
  readonly singles: readonly { readonly cell: Cell; readonly color: number }[];
}

export interface PuzzleOptions {
  readonly size: Size;
  readonly colors: number;
  /** 길 한 개의 칸 수 범위(짧으면 너무 쉬움) */
  readonly minLength: number;
  readonly maxLength: number;
}

const WALK_TRIES = 200;
const PUZZLE_TRIES = 500;

export function generatePuzzle(options: PuzzleOptions, random: Random): Puzzle {
  for (let attempt = 0; attempt < PUZZLE_TRIES; attempt++) {
    const pairs = tryPuzzle(options, random);
    if (pairs) return { size: options.size, pairs, holes: [], singles: [] };
  }
  throw new Error('판을 만들지 못했어요');
}

function tryPuzzle({ size, colors, minLength, maxLength }: PuzzleOptions, random: Random): Pair[] | null {
  const used = new Set<string>();
  const pairs: Pair[] = [];
  for (let color = 0; color < colors; color++) {
    const path = randomWalk(size, used, minLength, minLength + Math.floor(random() * (maxLength - minLength + 1)), random);
    if (!path) return null;
    for (const cell of path) used.add(cellKey(cell));
    pairs.push({ color, ends: [path[0], path.at(-1)!], solution: path });
  }
  return pairs;
}

/** 빈 칸만 밟는 무작위 길 · 길이가 minLength 에 못 미치면 다시 */
function randomWalk(size: Size, used: ReadonlySet<string>, minLength: number, length: number, random: Random): Cell[] | null {
  const free = allCells(size).filter(cell => !used.has(cellKey(cell)));
  if (free.length < minLength) return null;
  for (let attempt = 0; attempt < WALK_TRIES; attempt++) {
    const path = [pick(free, random)];
    const onPath = new Set([cellKey(path[0])]);
    while (path.length < length) {
      const options = shuffle(neighbors(path.at(-1)!, size), random).filter(cell => !used.has(cellKey(cell)) && !onPath.has(cellKey(cell)) && !touchesPathSide(cell, path, size));
      if (options.length === 0) break;
      path.push(options[0]);
      onPath.add(cellKey(options[0]));
    }
    if (path.length >= minLength) return path;
  }
  return null;
}

/** 길이 자기 옆으로 붙어 지나가면 더 짧은 지름길이 생겨 답이 뻔해지므로 막음(바로 앞 칸만 이웃이어야 함) */
function touchesPathSide(cell: Cell, path: readonly Cell[], size: Size): boolean {
  const keys = new Set(path.slice(0, -1).map(cellKey));
  return neighbors(cell, size).some(next => keys.has(cellKey(next)));
}

function allCells({ rows, cols }: Size): Cell[] {
  return Array.from({ length: rows * cols }, (_, index) => ({ row: Math.floor(index / cols), col: index % cols }));
}
