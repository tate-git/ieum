// 선 긋기 상태: 색마다 길 하나 · 점에서 시작해 끌면 늘고, 되돌아가면 줄고, 다른 색 길을 지나면 그 길을 끊음 · 6칸 이상이어야 이어진 것
import { cellKey, isAdjacent, sameCell, stepsBetween, type Cell } from './grid';
import type { Pair, Puzzle } from './puzzle';
import { MIN_SPAN } from './rules';

export type Paths = ReadonlyMap<number, readonly Cell[]>;

export class Board {
  readonly puzzle: Puzzle;
  readonly #paths = new Map<number, Cell[]>();
  /** 점 칸 → 색 */
  readonly #dots = new Map<string, number>();
  readonly #pairs = new Map<number, Pair>();
  readonly #holes: ReadonlySet<string>;
  #active: number | null = null;

  /** paths: 미리 그어 둔 선(만들기 화면에서 이은 것) */
  constructor(puzzle: Puzzle, paths: Paths = new Map()) {
    this.puzzle = puzzle;
    this.#holes = new Set(puzzle.holes.map(cellKey));
    for (const pair of puzzle.pairs) {
      this.#pairs.set(pair.color, pair);
      for (const end of pair.ends) this.#dots.set(cellKey(end), pair.color);
    }
    for (const { cell, color } of puzzle.singles) this.#dots.set(cellKey(cell), color);
    for (const [color, path] of paths) {
      if (this.#pairs.has(color) && path.length > 0) this.#paths.set(color, [...path]);
    }
  }

  get activeColor(): number | null {
    return this.#active;
  }

  paths(): Paths {
    return new Map([...this.#paths].map(([color, path]) => [color, [...path]]));
  }

  pathOf(color: number): readonly Cell[] {
    return this.#paths.get(color) ?? [];
  }

  dotAt(cell: Cell): number | undefined {
    return this.#dots.get(cellKey(cell));
  }

  /** 선이 지나가는 색(점 칸 포함) */
  lineAt(cell: Cell): number | undefined {
    for (const [color, path] of this.#paths) {
      if (path.length > 1 && path.some(step => sameCell(step, cell))) return color;
    }
    return undefined;
  }

  /** 칸을 차지한 색(점 또는 길) */
  colorAt(cell: Cell): number | undefined {
    return this.dotAt(cell) ?? this.lineAt(cell);
  }

  /** 양 끝 점이 선으로 닿았는지(길이는 안 봄) */
  reachesBothEnds(color: number): boolean {
    const path = this.pathOf(color);
    const pair = this.#pairs.get(color);
    if (!pair || path.length < 2) return false;
    const [a, b] = pair.ends;
    const first = path[0];
    const last = path.at(-1)!;
    return (sameCell(first, a) && sameCell(last, b)) || (sameCell(first, b) && sameCell(last, a));
  }

  isConnected(color: number): boolean {
    return this.reachesBothEnds(color) && this.pathOf(color).length >= MIN_SPAN;
  }

  /** 닿긴 했는데 6칸이 안 됨 */
  isTooShort(color: number): boolean {
    return this.reachesBothEnds(color) && !this.isConnected(color);
  }

  connectedCount(): number {
    return this.puzzle.pairs.filter(({ color }) => this.isConnected(color)).length;
  }

  isSolved(): boolean {
    return this.connectedCount() === this.puzzle.pairs.length;
  }

  /** 점을 누르면 그 색을 처음부터, 길 위를 누르면 그 자리부터 이어 긋기 */
  begin(cell: Cell): boolean {
    const dot = this.dotAt(cell);
    if (dot !== undefined) {
      if (!this.#pairs.has(dot)) return false;   // 짝 없는 점은 이을 게 없음
      this.#paths.set(dot, [cell]);
      this.#active = dot;
      return true;
    }
    const color = this.lineAt(cell);
    if (color === undefined) return false;
    this.#truncate(color, cell);
    this.#active = color;
    return true;
  }

  /** 끄는 중 손가락이 간 칸(건너뛴 칸은 한 칸씩 채움) · 바뀌었으면 true */
  drag(target: Cell): boolean {
    if (this.#active === null) return false;
    const path = this.#paths.get(this.#active)!;
    let changed = false;
    for (const step of stepsBetween(path.at(-1)!, target)) {
      if (!this.#stepTo(this.#active, step)) break;
      changed = true;
    }
    return changed;
  }

  end(): void {
    if (this.#active !== null && this.pathOf(this.#active).length < 2) this.#paths.delete(this.#active);
    this.#active = null;
  }

  /** 선 하나 지우기 */
  erase(color: number): void {
    this.#paths.delete(color);
  }

  reset(): void {
    this.#paths.clear();
    this.#active = null;
  }

  #stepTo(color: number, cell: Cell): boolean {
    const path = this.#paths.get(color)!;
    const last = path.at(-1)!;
    if (!isAdjacent(last, cell) || this.#holes.has(cellKey(cell))) return false;
    // 되돌아가기: 지나온 칸으로 가면 거기까지 줄임
    const back = path.findIndex(step => sameCell(step, cell));
    if (back >= 0) {
      path.length = back + 1;
      return true;
    }
    if (this.reachesBothEnds(color)) return false;
    const dot = this.dotAt(cell);
    if (dot !== undefined && dot !== color) return false;
    for (const [other, otherPath] of this.#paths) {
      if (other !== color && otherPath.some(step => sameCell(step, cell))) this.#truncate(other, cell, true);
    }
    path.push(cell);
    return true;
  }

  /** color 길을 cell 까지(beforeCell 이면 cell 바로 앞까지)로 자름 */
  #truncate(color: number, cell: Cell, beforeCell = false): void {
    const path = this.#paths.get(color);
    if (!path) return;
    const index = path.findIndex(step => sameCell(step, cell));
    if (index < 0) return;
    path.length = beforeCell ? index : index + 1;
    if (path.length === 0) this.#paths.delete(color);
  }
}
