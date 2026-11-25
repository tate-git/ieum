// 칸 좌표와 이웃 계산
export interface Cell {
  readonly row: number;
  readonly col: number;
}

/** 판 크기(세로 칸 수 × 가로 칸 수) */
export interface Size {
  readonly rows: number;
  readonly cols: number;
}

export const cellKey = ({ row, col }: Cell): string => `${row},${col}`;

export const sameCell = (a: Cell, b: Cell): boolean => a.row === b.row && a.col === b.col;

export const isAdjacent = (a: Cell, b: Cell): boolean => Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

/** 상하좌우 이웃 중 판 안에 있는 칸 */
export function neighbors({ row, col }: Cell, { rows, cols }: Size): Cell[] {
  return [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ].filter(cell => cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols);
}

/** from 에서 to 로 한 칸씩(가로 먼저 · 손가락이 빨라 칸을 건너뛴 경우 채움) */
export function stepsBetween(from: Cell, to: Cell): Cell[] {
  const steps: Cell[] = [];
  let { row, col } = from;
  while (col !== to.col) {
    col += Math.sign(to.col - col);
    steps.push({ row, col });
  }
  while (row !== to.row) {
    row += Math.sign(to.row - row);
    steps.push({ row, col });
  }
  return steps;
}
