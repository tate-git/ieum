// 판 그리기(SVG): 칸 · 색 칠한 선 · 알파벳 붙은 점 · 손가락 위치를 칸으로 바꿈
import type { Board } from '../game/board';
import { cellKey, type Cell, type Size } from '../game/grid';

export const COLORS = [
  '#e5484d', '#3e63dd', '#30a46c', '#f5d90a', '#f76b15', '#8e4ec6', '#12a594', '#d6409f', '#8d6e63',
  '#7ce2fe', '#a3e635', '#eceef2', '#64748b', '#b8860b', '#fb7185', '#166534', '#9a3412', '#0284c7',
  '#fde68a', '#6d28d9', '#5eead4', '#f9a8d4', '#713f12', '#94a3b8', '#d9f99d', '#e879f9',
];
/** 비슷한 색을 글자로 가르려고 색마다 알파벳 */
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** 밝은 색 위 글자는 검게(밝기로 판단) */
const BRIGHT = 0.6;

export function letterColor(color: number): string {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(COLORS[color].slice(index, index + 2), 16) / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b > BRIGHT ? '#14161c' : '#fff';
}

const DOT_RADIUS = 0.36;
const LINE_WIDTH = 0.36;
const SVG_NS = 'http://www.w3.org/2000/svg';

export interface Scene {
  readonly holes: ReadonlySet<string>;
  readonly lines: readonly { readonly color: number; readonly path: readonly Cell[]; readonly short: boolean }[];
  readonly dots: readonly { readonly cell: Cell; readonly color: number; readonly done: boolean }[];
}

/** 판의 지금 모습 · extraDots: 짝이 안 맞아 판에 안 들어간 점(만들기 화면) */
export function boardScene(board: Board, extraDots: readonly { cell: Cell; color: number }[] = []): Scene {
  const { pairs, holes } = board.puzzle;
  return {
    holes: new Set(holes.map(cellKey)),
    lines: pairs.map(({ color }) => ({ color, path: board.pathOf(color), short: board.isTooShort(color) })),
    dots: [
      ...pairs.flatMap(({ color, ends }) => ends.map(cell => ({ cell, color, done: board.isConnected(color) }))),
      ...extraDots.map(dot => ({ ...dot, done: false })),
    ],
  };
}

export class BoardView {
  readonly #svg: SVGSVGElement;
  readonly #size: Size;

  constructor(container: HTMLElement, size: Size) {
    this.#size = size;
    this.#svg = document.createElementNS(SVG_NS, 'svg');
    this.#svg.setAttribute('viewBox', `0 0 ${size.cols} ${size.rows}`);
    this.#svg.classList.add('board');
    this.#svg.style.aspectRatio = `${size.cols} / ${size.rows}`;
    container.replaceChildren(this.#svg);
  }

  get element(): SVGSVGElement {
    return this.#svg;
  }

  /** 화면 좌표 → 칸(판 밖이면 가장 가까운 가장자리 칸) */
  cellAt(clientX: number, clientY: number): Cell {
    const box = this.#svg.getBoundingClientRect();
    const { rows, cols } = this.#size;
    const clamp = (value: number, count: number) => Math.min(Math.max(Math.floor(value), 0), count - 1);
    return {
      row: clamp(((clientY - box.top) / box.height) * rows, rows),
      col: clamp(((clientX - box.left) / box.width) * cols, cols),
    };
  }

  render({ holes, lines, dots }: Scene): void {
    const tint = new Map<string, number>();
    for (const { color, path } of lines) {
      if (path.length > 1) for (const cell of path) tint.set(cellKey(cell), color);
    }
    for (const { cell, color } of dots) tint.set(cellKey(cell), color);
    const cells: string[] = [];
    for (let row = 0; row < this.#size.rows; row++) {
      for (let col = 0; col < this.#size.cols; col++) {
        // 빵구 낸 칸은 판에서 빠진 자리(배경만)
        if (holes.has(cellKey({ row, col }))) continue;
        const color = tint.get(cellKey({ row, col }));
        const fill = color === undefined ? '' : ` style="fill:${COLORS[color]}"`;
        cells.push(`<rect class="cell${color === undefined ? '' : ' filled'}" x="${col}" y="${row}" width="1" height="1"${fill}/>`);
      }
    }
    const lineMarks = lines
      .filter(({ path }) => path.length > 1)
      .map(({ color, path, short }) => {
        const points = path.map(({ row, col }) => `${col + 0.5},${row + 0.5}`).join(' ');
        return `<polyline class="line${short ? ' short' : ''}" points="${points}" stroke="${COLORS[color]}" stroke-width="${LINE_WIDTH}"/>`;
      });
    const dotMarks = dots.map(({ cell: { row, col }, color, done }) => `
      <circle class="dot${done ? ' done' : ''}" cx="${col + 0.5}" cy="${row + 0.5}" r="${DOT_RADIUS}" fill="${COLORS[color]}"/>
      <text class="letter" x="${col + 0.5}" y="${row + 0.53}" fill="${letterColor(color)}">${LETTERS[color]}</text>`);
    this.#svg.innerHTML = `<g>${cells.join('')}</g><g>${lineMarks.join('')}</g><g>${dotMarks.join('')}</g>`;
  }
}
