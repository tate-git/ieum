import { describe, expect, it } from 'vitest';
import { Board } from '../src/game/board';
import type { Puzzle } from '../src/game/puzzle';

// 5×7 · A(0) (0,0)→(0,6) · D(3) (2,0)→(2,6) — 색 번호가 이어지지 않아도 됨
const puzzle: Puzzle = {
  size: { rows: 5, cols: 7 },
  pairs: [
    { color: 0, ends: [{ row: 0, col: 0 }, { row: 0, col: 6 }], solution: [] },
    { color: 3, ends: [{ row: 2, col: 0 }, { row: 2, col: 6 }], solution: [] },
  ],
  holes: [],
};
const at = (row: number, col: number) => ({ row, col });

describe('Board', () => {
  it('점에서 같은 색 점까지 끌면 이어짐 · 건너뛴 칸은 채움', () => {
    const board = new Board(puzzle);
    expect(board.begin(at(0, 0))).toBe(true);
    board.drag(at(0, 6));
    board.end();
    expect(board.pathOf(0)).toHaveLength(7);
    expect(board.isConnected(0)).toBe(true);
    expect(board.connectedCount()).toBe(1);
  });

  it('빈 칸에서는 시작 못 함', () => {
    expect(new Board(puzzle).begin(at(4, 4))).toBe(false);
  });

  it('다른 색 점은 지나갈 수 없음', () => {
    const board = new Board(puzzle);
    board.begin(at(1, 0));
    board.begin(at(0, 0));
    board.drag(at(1, 0));
    board.drag(at(2, 0));
    expect(board.pathOf(0)).toEqual([at(0, 0), at(1, 0)]);
  });

  it('되돌아가면 줄어듦', () => {
    const board = new Board(puzzle);
    board.begin(at(0, 0));
    board.drag(at(0, 3));
    board.drag(at(0, 1));
    expect(board.pathOf(0)).toEqual([at(0, 0), at(0, 1)]);
  });

  it('다른 색 길을 지나가면 그 길이 끊김', () => {
    const board = new Board(puzzle);
    board.begin(at(2, 0));
    board.drag(at(2, 1));
    board.drag(at(1, 1));
    board.drag(at(1, 3));
    board.end();
    board.begin(at(0, 0));
    board.drag(at(0, 2));
    board.drag(at(1, 2));
    expect(board.pathOf(3)).toEqual([at(2, 0), at(2, 1), at(1, 1)]);
    expect(board.colorAt(at(1, 2))).toBe(0);
  });

  it('이어진 뒤에는 더 늘지 않음 · 둘 다 이으면 성공', () => {
    const board = new Board(puzzle);
    board.begin(at(0, 0));
    board.drag(at(0, 6));
    board.drag(at(1, 6));
    expect(board.pathOf(0)).toHaveLength(7);
    board.end();
    board.begin(at(2, 6));
    board.drag(at(2, 0));
    board.end();
    expect(board.isSolved()).toBe(true);
  });

  it('양 끝이 닿아도 6칸 미만이면 이어진 것으로 안 침 · 지우개는 선 하나만', () => {
    const short: Puzzle = { size: { rows: 5, cols: 7 }, pairs: [{ color: 0, ends: [at(0, 0), at(0, 2)], solution: [] }, { color: 1, ends: [at(4, 0), at(4, 6)], solution: [] }], holes: [] };
    const board = new Board(short);
    board.begin(at(0, 0));
    board.drag(at(0, 2));
    board.end();
    expect(board.isTooShort(0)).toBe(true);
    expect(board.isConnected(0)).toBe(false);
    board.erase(0);
    expect(board.pathOf(0)).toHaveLength(0);
    board.begin(at(0, 0));
    board.drag(at(1, 0));
    board.drag(at(1, 2));
    board.drag(at(0, 2));
    board.end();
    expect(board.isConnected(0)).toBe(false);
    board.begin(at(0, 0));
    board.drag(at(2, 0));
    board.drag(at(2, 2));
    board.drag(at(0, 2));
    expect(board.pathOf(0)).toHaveLength(7);
    expect(board.isConnected(0)).toBe(true);
  });

  it('빵구 낸 칸은 선이 못 지나감', () => {
    const board = new Board({ ...puzzle, holes: [at(0, 3)] });
    board.begin(at(0, 0));
    board.drag(at(0, 6));
    expect(board.pathOf(0)).toEqual([at(0, 0), at(0, 1), at(0, 2)]);
  });

  it('길 중간을 누르면 거기서부터 다시 그음', () => {
    const board = new Board(puzzle);
    board.begin(at(0, 0));
    board.drag(at(0, 3));
    board.end();
    board.begin(at(0, 1));
    board.drag(at(1, 1));
    expect(board.pathOf(0)).toEqual([at(0, 0), at(0, 1), at(1, 1)]);
  });
});
