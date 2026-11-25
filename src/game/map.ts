// 랜덤 맵: 판에 빵구 덩어리를 점대칭(가운데 기준 180도)으로 흩뿌림 · 남은 칸이 한 덩어리로 이어지게
import { cellKey, neighbors, type Cell, type Size } from './grid';
import { pick, type Random } from './random';

export interface MapOptions {
  /** 대칭 짝 덩어리 수 범위 */
  readonly minBlobs: number;
  readonly maxBlobs: number;
  /** 덩어리 하나의 칸 수 상한 */
  readonly maxBlobCells: number;
}

export const DEFAULT_MAP: MapOptions = { minBlobs: 3, maxBlobs: 5, maxBlobCells: 3 };

const TRIES = 100;

export function randomHoles(size: Size, random: Random, options: MapOptions = DEFAULT_MAP): Cell[] {
  for (let attempt = 0; attempt < TRIES; attempt++) {
    const holes = tryHoles(size, random, options);
    if (isConnected(size, holes)) return [...holes.values()];
  }
  return [];
}

function tryHoles(size: Size, random: Random, { minBlobs, maxBlobs, maxBlobCells }: MapOptions): Map<string, Cell> {
  const holes = new Map<string, Cell>();
  const blobs = minBlobs + Math.floor(random() * (maxBlobs - minBlobs + 1));
  for (let blob = 0; blob < blobs; blob++) {
    const cells = [{ row: Math.floor(random() * size.rows), col: Math.floor(random() * size.cols) }];
    const target = 1 + Math.floor(random() * maxBlobCells);
    while (cells.length < target) {
      const next = pick(neighbors(pick(cells, random), size), random);
      if (!cells.some(cell => cellKey(cell) === cellKey(next))) cells.push(next);
    }
    for (const cell of cells) {
      for (const hole of [cell, mirror(cell, size)]) holes.set(cellKey(hole), hole);
    }
  }
  return holes;
}

/** 가운데 기준 180도 돌린 칸 */
export const mirror = ({ row, col }: Cell, { rows, cols }: Size): Cell => ({ row: rows - 1 - row, col: cols - 1 - col });

/** 빵구 아닌 칸이 모두 상하좌우로 이어져 있는지 */
export function isConnected(size: Size, holes: ReadonlyMap<string, Cell>): boolean {
  const open: Cell[] = [];
  for (let row = 0; row < size.rows; row++) {
    for (let col = 0; col < size.cols; col++) {
      if (!holes.has(cellKey({ row, col }))) open.push({ row, col });
    }
  }
  if (open.length === 0) return false;
  const seen = new Set([cellKey(open[0])]);
  const queue = [open[0]];
  while (queue.length > 0) {
    for (const next of neighbors(queue.pop()!, size)) {
      const key = cellKey(next);
      if (holes.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen.size === open.length;
}
