// 판 만들기: 색을 골라 빈 칸에 점을 놓음(색마다 2개) · 미리 그어 둔 선도 색마다 하나씩 기억 · 점을 치우면 그 색 선도 지움
import { cellKey, sameCell, type Cell, type Size } from './grid';
import type { Paths } from './board';
import type { Pair, Puzzle } from './puzzle';

export type PlaceResult = 'placed' | 'removed' | 'occupied' | 'full' | 'hole';

export const MIN_PAIRS = 2;

export class Editor {
  readonly size: Size;
  readonly colors: number;
  readonly #dots = new Map<number, Cell[]>();
  readonly #holes = new Map<string, Cell>();
  #paths: Paths = new Map();

  constructor(size: Size, colors: number) {
    this.size = size;
    this.colors = colors;
  }

  get paths(): Paths {
    return this.#paths;
  }

  set paths(paths: Paths) {
    this.#paths = paths;
  }

  dotsOf(color: number): readonly Cell[] {
    return this.#dots.get(color) ?? [];
  }

  colorAt(cell: Cell): number | undefined {
    for (const [color, dots] of this.#dots) {
      if (dots.some(dot => sameCell(dot, cell))) return color;
    }
    return undefined;
  }

  isHole(cell: Cell): boolean {
    return this.#holes.has(cellKey(cell));
  }

  /** 빵구를 한꺼번에 바꿈(랜덤 맵) · 점이 있는 칸은 건너뜀 · 선은 다 지움 */
  setHoles(cells: readonly Cell[]): void {
    this.#holes.clear();
    for (const cell of cells) {
      if (this.colorAt(cell) === undefined) this.#holes.set(cellKey(cell), cell);
    }
    this.#paths = new Map();
  }

  /** 빵구 내기 · 이미 빵구면 메움 · 점 있는 칸은 못 냄(false) · 지나던 선은 지움 */
  toggleHole(cell: Cell): boolean {
    const key = cellKey(cell);
    if (this.#holes.delete(key)) return true;
    if (this.colorAt(cell) !== undefined) return false;
    this.#holes.set(key, cell);
    for (const [color, path] of this.#paths) {
      if (path.some(step => sameCell(step, cell))) this.eraseLine(color);
    }
    return true;
  }

  check(cell: Cell, color: number): PlaceResult {
    if (this.isHole(cell)) return 'hole';
    const owner = this.colorAt(cell);
    if (owner !== undefined) return owner === color ? 'removed' : 'occupied';
    return this.dotsOf(color).length >= 2 ? 'full' : 'placed';
  }

  place(cell: Cell, color: number): PlaceResult {
    const result = this.check(cell, color);
    if (result === 'placed') {
      // 놓는 칸을 지나던 선은 지움
      for (const [other, path] of this.#paths) {
        if (path.some(step => sameCell(step, cell))) this.eraseLine(other);
      }
      this.#dots.set(color, [...this.dotsOf(color), cell]);
    }
    if (result === 'removed') this.removeDot(cell);
    if (result === 'placed' || result === 'removed') this.eraseLine(color);
    return result;
  }

  removeDot(cell: Cell): void {
    const color = this.colorAt(cell);
    if (color === undefined) return;
    this.#dots.set(color, this.dotsOf(color).filter(dot => !sameCell(dot, cell)));
    this.eraseLine(color);
  }

  eraseLine(color: number): void {
    if (!this.#paths.has(color)) return;
    const next = new Map(this.#paths);
    next.delete(color);
    this.#paths = next;
  }

  clear(): void {
    this.#dots.clear();
    this.#holes.clear();
    this.#paths = new Map();
  }

  pairCount(): number {
    return [...this.#dots.values()].filter(dots => dots.length === 2).length;
  }

  /** 한 개만 놓인 색이 있으면 아직 못 풂 */
  hasHalfPair(): boolean {
    return [...this.#dots.values()].some(dots => dots.length === 1);
  }

  isReady(): boolean {
    return this.pairCount() >= MIN_PAIRS && !this.hasHalfPair();
  }

  /** 짝이 다 놓인 색만 풀 판으로 */
  toPuzzle(): Puzzle {
    const pairs: Pair[] = [...this.#dots.entries()]
      .filter(([, dots]) => dots.length === 2)
      .sort(([a], [b]) => a - b)
      .map(([color, dots]) => ({ color, ends: [dots[0], dots[1]] as const, solution: [] }));
    return { size: this.size, pairs, holes: [...this.#holes.values()], singles: this.halfDots() };
  }

  /** 한 개만 놓인 점(잇지 않지만 선을 막음) */
  halfDots(): { cell: Cell; color: number }[] {
    return [...this.#dots.entries()].filter(([, dots]) => dots.length === 1).map(([color, [cell]]) => ({ cell, color }));
  }
}
