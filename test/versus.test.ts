import { describe, expect, it } from 'vitest';
import { Versus } from '../src/game/versus';
import { BOARD_SIZE } from '../src/game/stages';

const at = (row: number, col: number) => ({ row, col });

describe('Versus', () => {
  it('선은 1개로 열고, 다음부터 차례마다 2개', () => {
    const game = new Versus(BOARD_SIZE, 14, 0);
    expect(game.required()).toBe(1);
    expect(game.canChallenge()).toBe(false);
    game.place(at(0, 0), 0);
    expect(game.check(at(0, 1), 1)).toBe('enough');
    game.endTurn();
    expect(game.current).toBe(1);
    expect(game.required()).toBe(2);
    expect(game.canChallenge()).toBe(true);
  });

  it('한 차례에 같은 색 2개는 안 됨 · 이번에 놓은 말만 되돌림', () => {
    const game = new Versus(BOARD_SIZE, 14, 0);
    game.place(at(0, 0), 0);
    game.endTurn();
    expect(game.place(at(5, 5), 3)).toBe('placed');
    expect(game.place(at(6, 6), 3)).toBe('sameColor');
    expect(game.place(at(0, 0), 0)).toBe('notMine');
    expect(game.place(at(0, 0), 2)).toBe('occupied');
    expect(game.place(at(5, 5), 3)).toBe('removed');
    expect(game.canEndTurn()).toBe(false);
    game.place(at(5, 5), 3);
    game.place(at(6, 6), 4);
    expect(game.canEndTurn()).toBe(true);
    expect(game.canChallenge()).toBe(false);
    game.endTurn();
    expect(game.lastPlacer).toBe(1);
  });

  it('색마다 2개까지 · 28개를 다 놓으면 끝(마지막 차례는 남은 만큼)', () => {
    const game = new Versus(BOARD_SIZE, 14, 0);
    const cells = Array.from({ length: 28 }, (_, index) => at(Math.floor(index / 10), index % 10));
    const colors = Array.from({ length: 28 }, (_, index) => index % 14);
    let next = 0;
    while (!game.isFull()) {
      while (game.placedThisTurn.length < game.required()) {
        const result = game.place(cells[next], colors[next]);
        expect(result).toBe('placed');
        next++;
      }
      game.endTurn();
    }
    expect(game.remaining()).toBe(0);
    expect(game.turn).toBe(16);   // 1 + 2×13 + 1 = 28 → 15차례 둔 뒤
  });

  it('맵 빵구 칸엔 못 놓음', () => {
    const game = new Versus(BOARD_SIZE, 14, 0, [at(3, 3)]);
    expect(game.place(at(3, 3), 0)).toBe('hole');
    expect(game.editor.toPuzzle().holes).toEqual([at(3, 3)]);
  });

  it('남은 말이 같은 색 하나뿐이면 1개만 놓으면 됨', () => {
    const game = new Versus(BOARD_SIZE, 2, 0);
    game.place(at(0, 0), 0);
    game.endTurn();
    game.place(at(0, 5), 0);
    game.place(at(5, 0), 1);
    game.endTurn();
    expect(game.remaining()).toBe(1);
    expect(game.required()).toBe(1);
  });
});
