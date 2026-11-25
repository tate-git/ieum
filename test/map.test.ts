import { describe, expect, it } from 'vitest';
import { cellKey } from '../src/game/grid';
import { isConnected, mirror, randomHoles } from '../src/game/map';
import { seededRandom } from '../src/game/random';
import { BOARD_SIZE } from '../src/game/stages';

describe('randomHoles', () => {
  it('맵 200개: 빵구가 있고 · 점대칭이고 · 남은 칸이 한 덩어리', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const holes = randomHoles(BOARD_SIZE, seededRandom(seed));
      const keys = new Map(holes.map(cell => [cellKey(cell), cell]));
      expect(holes.length).toBeGreaterThan(0);
      expect(holes.length).toBeLessThanOrEqual(30);
      for (const cell of holes) expect(keys.has(cellKey(mirror(cell, BOARD_SIZE)))).toBe(true);
      expect(isConnected(BOARD_SIZE, keys)).toBe(true);
    }
  });

  it('시드마다 다른 맵', () => {
    const shapes = new Set([1, 2, 3, 4, 5].map(seed => randomHoles(BOARD_SIZE, seededRandom(seed)).map(cellKey).sort().join('|')));
    expect(shapes.size).toBe(5);
  });

  it('한 칸이라도 갇히면 이어지지 않은 것', () => {
    const size = { rows: 3, cols: 3 };
    const wall = new Map([[cellKey({ row: 0, col: 1 }), { row: 0, col: 1 }], [cellKey({ row: 1, col: 0 }), { row: 1, col: 0 }]]);
    expect(isConnected(size, wall)).toBe(false);
  });
});
