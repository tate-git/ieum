// 두 사람 대결 규칙: 선 플레이어가 말 1개로 열고, 이후 차례마다 서로 다른 색 말 2개 · 차례 중엔 이번에 놓은 말만 되돌릴 수 있음
import { Editor } from './editor';
import { sameCell, type Cell, type Size } from './grid';

export type Player = 0 | 1;

export type VersusPlaceResult = 'placed' | 'removed' | 'occupied' | 'full' | 'sameColor' | 'enough' | 'notMine' | 'hole';

export const OPENING_PIECES = 1;
export const PIECES_PER_TURN = 2;

export const other = (player: Player): Player => (player === 0 ? 1 : 0);

export class Versus {
  readonly editor: Editor;
  #current: Player;
  /** 이번 차례에 놓은 말 */
  #placed: { cell: Cell; color: number }[] = [];
  #turn = 1;
  /** 마지막으로 말을 놓고 차례를 넘긴 사람(도전받으면 이 사람이 증명) */
  #lastPlacer: Player | null = null;

  /** holes: 이번 라운드 맵의 빵구 */
  constructor(size: Size, colors: number, first: Player, holes: readonly Cell[] = []) {
    this.editor = new Editor(size, colors);
    this.editor.setHoles(holes);
    this.#current = first;
  }

  get current(): Player {
    return this.#current;
  }

  get turn(): number {
    return this.#turn;
  }

  get lastPlacer(): Player | null {
    return this.#lastPlacer;
  }

  get placedThisTurn(): readonly { cell: Cell; color: number }[] {
    return this.#placed;
  }

  /** 아직 안 놓은 말 수 */
  remaining(): number {
    let left = 0;
    for (let color = 0; color < this.editor.colors; color++) left += 2 - this.editor.dotsOf(color).length;
    return left;
  }

  /** 이번 차례에 놓아야 하는 수(남은 말 · 남은 색이 모자라면 그만큼만) */
  required(): number {
    const want = this.#turn === 1 ? OPENING_PIECES : PIECES_PER_TURN;
    const placedColors = new Set(this.#placed.map(({ color }) => color));
    let colorsLeft = placedColors.size;
    for (let color = 0; color < this.editor.colors; color++) {
      if (!placedColors.has(color) && this.editor.dotsOf(color).length < 2) colorsLeft++;
    }
    return Math.min(want, this.#placed.length + this.remaining(), colorsLeft);
  }

  check(cell: Cell, color: number): VersusPlaceResult {
    if (this.editor.isHole(cell)) return 'hole';
    const owner = this.editor.colorAt(cell);
    if (owner !== undefined) return this.#placed.some(piece => sameCell(piece.cell, cell)) ? 'removed' : owner === color ? 'notMine' : 'occupied';
    if (this.#placed.length >= this.required()) return 'enough';
    if (this.#placed.some(piece => piece.color === color)) return 'sameColor';
    if (this.editor.dotsOf(color).length >= 2) return 'full';
    return 'placed';
  }

  /** 빈 칸이면 놓고, 이번에 놓은 말을 누르면 되돌림 */
  place(cell: Cell, color: number): VersusPlaceResult {
    const result = this.check(cell, color);
    if (result === 'placed') {
      this.editor.place(cell, color);
      this.#placed.push({ cell, color });
    }
    if (result === 'removed') this.takeBack(cell);
    return result;
  }

  /** 이번 차례에 놓은 말이면 되돌림 */
  takeBack(cell: Cell): boolean {
    if (!this.#placed.some(piece => sameCell(piece.cell, cell))) return false;
    this.editor.removeDot(cell);
    this.#placed = this.#placed.filter(piece => !sameCell(piece.cell, cell));
    return true;
  }

  canEndTurn(): boolean {
    return this.#placed.length > 0 && this.#placed.length === this.required();
  }

  /** 도전은 내 차례에 아직 아무것도 안 놓았을 때 · 상대가 놓은 게 있어야 함 */
  canChallenge(): boolean {
    return this.#placed.length === 0 && this.#lastPlacer === other(this.#current);
  }

  endTurn(): void {
    if (!this.canEndTurn()) return;
    this.#lastPlacer = this.#current;
    this.#current = other(this.#current);
    this.#placed = [];
    this.#turn++;
  }

  /** 28개를 다 놓았음 */
  isFull(): boolean {
    return this.remaining() === 0;
  }
}
