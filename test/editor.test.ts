import { describe, expect, it } from 'vitest';
import { Board } from '../src/game/board';
import { Editor } from '../src/game/editor';
import { BOARD_SIZE } from '../src/game/stages';

const at = (row: number, col: number) => ({ row, col });

describe('Editor', () => {
  it('색마다 2개 · 거리 제한 없음 · 다른 색 칸엔 못 놓음', () => {
    const editor = new Editor(BOARD_SIZE, 26);
    expect(editor.place(at(0, 0), 0)).toBe('placed');
    expect(editor.place(at(0, 1), 0)).toBe('placed');
    expect(editor.place(at(9, 9), 0)).toBe('full');
    expect(editor.place(at(0, 0), 13)).toBe('occupied');
  });

  it('같은 색 점을 누르면 치우고 그 색 선도 지움', () => {
    const editor = new Editor(BOARD_SIZE, 26);
    editor.place(at(0, 0), 0);
    editor.place(at(0, 5), 0);
    editor.paths = new Map([[0, [at(0, 0), at(0, 1), at(0, 2), at(0, 3), at(0, 4), at(0, 5)]]]);
    expect(editor.place(at(0, 5), 0)).toBe('removed');
    expect(editor.paths.has(0)).toBe(false);
  });

  it('점을 놓는 칸을 지나던 다른 색 선은 지움', () => {
    const editor = new Editor(BOARD_SIZE, 26);
    editor.place(at(0, 0), 0);
    editor.place(at(0, 5), 0);
    editor.paths = new Map([[0, [at(0, 0), at(0, 1), at(0, 2), at(0, 3), at(0, 4), at(0, 5)]]]);
    editor.place(at(0, 2), 1);
    expect(editor.paths.has(0)).toBe(false);
  });

  it('빵구: 점 있는 칸은 못 냄 · 빵구엔 점 못 놓음 · 지나던 선은 지움 · 다시 누르면 메움', () => {
    const editor = new Editor(BOARD_SIZE, 26);
    editor.place(at(0, 0), 0);
    editor.place(at(0, 5), 0);
    editor.paths = new Map([[0, [at(0, 0), at(0, 1), at(0, 2), at(0, 3), at(0, 4), at(0, 5)]]]);
    expect(editor.toggleHole(at(0, 0))).toBe(false);
    expect(editor.toggleHole(at(0, 3))).toBe(true);
    expect(editor.paths.has(0)).toBe(false);
    expect(editor.place(at(0, 3), 1)).toBe('hole');
    expect(editor.toPuzzle().holes).toEqual([at(0, 3)]);
    editor.toggleHole(at(0, 3));
    expect(editor.isHole(at(0, 3))).toBe(false);
  });

  it('2쌍부터 · 한 개만 놓인 색이 있으면 못 풂 · 미리 이은 선은 풀 판으로 넘어감', () => {
    const editor = new Editor(BOARD_SIZE, 26);
    editor.place(at(0, 0), 0);
    editor.place(at(0, 9), 0);
    expect(editor.isReady()).toBe(false);
    editor.place(at(5, 0), 3);
    expect(editor.hasHalfPair()).toBe(true);
    editor.place(at(5, 9), 3);
    expect(editor.isReady()).toBe(true);
    const row = Array.from({ length: 10 }, (_, col) => at(0, col));
    editor.paths = new Map([[0, row]]);
    const board = new Board(editor.toPuzzle(), editor.paths);
    expect(board.isConnected(0)).toBe(true);
    expect(board.connectedCount()).toBe(1);
  });
});
