import { describe, expect, it } from 'vitest';
import { cellKey, isAdjacent, sameCell } from '../src/game/grid';
import { generatePuzzle } from '../src/game/puzzle';
import { seededRandom } from '../src/game/random';
import { stage } from '../src/game/stages';

describe('generatePuzzle', () => {
  for (const number of [1, 5, 10, 20]) {
    it(`${number}단계 판 50개 모두 풀 수 있음(길이 이어지고 · 겹치지 않고 · 끝이 점)`, () => {
      const { puzzle: options } = stage(number);
      for (let seed = 1; seed <= 50; seed++) {
        const puzzle = generatePuzzle(options, seededRandom(seed * 7919 + number));
        expect(puzzle.pairs).toHaveLength(options.colors);
        const used = new Set<string>();
        for (const { ends, solution } of puzzle.pairs) {
          expect(solution.length).toBeGreaterThanOrEqual(options.minLength);
          expect(sameCell(solution[0], ends[0]) && sameCell(solution.at(-1)!, ends[1])).toBe(true);
          solution.slice(1).forEach((cell, index) => expect(isAdjacent(solution[index], cell)).toBe(true));
          for (const cell of solution) {
            expect(cell.row < options.size.rows && cell.col < options.size.cols).toBe(true);
            expect(used.has(cellKey(cell))).toBe(false);
            used.add(cellKey(cell));
          }
        }
      }
    });
  }

  it('같은 시드면 같은 판', () => {
    const options = stage(3).puzzle;
    expect(generatePuzzle(options, seededRandom(42))).toEqual(generatePuzzle(options, seededRandom(42)));
  });
});
