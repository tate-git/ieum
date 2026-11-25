// 판 만들기 화면: ● 점 놓기(색마다 2개) · 〰 선 잇기(미리 이어 보기) · 🕳 빵구(칸 빼기) · 🧽 지우기(점·선·빵구 하나씩) · 시간 골라 풀기 시작
import { Board } from '../game/board';
import { BoardView, boardScene, COLORS, LETTERS, letterColor } from './board-view';
import { MIN_PAIRS, type Editor, type PlaceResult } from '../game/editor';
import type { Cell } from '../game/grid';
import { t } from './i18n';
import { MIN_SPAN } from '../game/rules';

export const TIME_CHOICES = [60, 120, 180, 300] as const;

export type Tool = 'dot' | 'line' | 'hole' | 'erase';

export interface EditorSettings {
  color: number;
  seconds: number;
  tool: Tool;
}

const timeLabel = (seconds: number) => t(`${seconds / 60}분`, `${seconds / 60} min`);

const TOOLS: readonly { id: Tool; label: () => string }[] = [
  { id: 'dot', label: () => `● ${t('점 놓기', 'Place')}` },
  { id: 'line', label: () => `〰 ${t('선 잇기', 'Draw')}` },
  { id: 'hole', label: () => `🕳 ${t('빵구', 'Hole')}` },
  { id: 'erase', label: () => `🧽 ${t('지우기', 'Erase')}` },
];

function placeMessage(result: PlaceResult): string {
  if (result === 'occupied') return t('이미 다른 색 점이 있어요', 'Another color is already there');
  if (result === 'hole') return t('빵구 낸 칸이에요. 지우기로 메울 수 있어요', 'That cell is a hole — erase it to fill it back');
  if (result === 'full') return t('이 색은 벌써 2개예요. 지우기로 치울 수 있어요', 'This color already has 2 — use Erase to remove one');
  return '';
}

export function showEditor(app: HTMLElement, editor: Editor, settings: EditorSettings, onSolve: () => void): void {
  app.innerHTML = `
    <section class="play editor">
      <header class="play-bar">
        <button type="button" class="back" data-action="home">← ${t('처음', 'Home')}</button>
        <b>✏️ ${t('판 만들기', 'Build a board')}</b>
        <span id="pair-count" class="muted"></span>
      </header>
      <div class="segmented tools" role="radiogroup" aria-label="${t('도구', 'Tool')}">
        ${TOOLS.map(({ id, label }) => `<button type="button" data-tool="${id}">${label()}</button>`).join('')}
      </div>
      <div class="palette" role="radiogroup" aria-label="${t('색', 'Color')}"></div>
      <p id="hint" class="hint muted"></p>
      <div id="board" class="board-wrap tight"></div>
      <div class="segmented" role="radiogroup" aria-label="${t('제한 시간', 'Time limit')}">
        ${TIME_CHOICES.map(seconds => `<button type="button" data-seconds="${seconds}">⏱ ${timeLabel(seconds)}</button>`).join('')}
      </div>
      <div class="actions">
        <button type="button" data-action="clear-dots">🧹 ${t('다 지우기', 'Clear all')}</button>
        <button type="button" class="primary" data-action="solve">▶ ${t('풀기 시작', 'Start solving')}</button>
      </div>
    </section>`;
  const palette = app.querySelector<HTMLElement>('.palette')!;
  const hint = app.querySelector<HTMLElement>('#hint')!;
  const pairCount = app.querySelector<HTMLElement>('#pair-count')!;
  const solveButton = app.querySelector<HTMLButtonElement>('[data-action="solve"]')!;
  const view = new BoardView(app.querySelector('#board')!, editor.size);
  view.element.classList.add('editing');
  /** 선 긋기는 지금 놓인 짝으로 만든 판 위에서(점이 바뀌면 새로) */
  let board = new Board(editor.toPuzzle(), editor.paths);
  let message = '';

  const rebuildBoard = () => {
    board = new Board(editor.toPuzzle(), editor.paths);
  };

  const defaultHint = () => {
    if (settings.tool === 'line') return t(`같은 색 점끼리 끌어서 미리 이어 봐요 · 선은 ${MIN_SPAN}칸 이상`, `Drag to link matching dots · lines need ${MIN_SPAN}+ cells`);
    if (settings.tool === 'hole') return t('뺄 칸을 눌러 빵구를 내요 · 다시 누르면 메워요', 'Tap cells to knock holes · tap again to fill');
    if (settings.tool === 'erase') return t('지울 점·선·빵구를 눌러요(하나씩)', 'Tap a dot, line or hole to erase it');
    if (editor.hasHalfPair()) return t('한 개만 놓인 색이 있어요. 짝을 마저 놓아 주세요', 'A color has only one dot — place its partner');
    if (editor.isReady()) return t('준비됐어요! 시간을 고르고 풀기 시작', 'Ready! Pick a time and start');
    return t(`색을 고르고 칸을 눌러 점을 놓아요 · 색마다 2개 · ${MIN_PAIRS}쌍부터`, `Pick a color and tap cells · 2 per color · ${MIN_PAIRS}+ pairs`);
  };

  const render = () => {
    palette.innerHTML = COLORS.map((color, index) => `
      <button type="button" role="radio" aria-checked="${index === settings.color}" data-color="${index}" style="--swatch:${color};--letter:${letterColor(index)}" ${settings.tool === 'dot' ? '' : 'disabled'}>
        <span class="swatch">${LETTERS[index]}</span><small>${editor.dotsOf(index).length}/2</small>
      </button>`).join('');
    view.render(boardScene(board, editor.halfDots()));
    for (const button of app.querySelectorAll<HTMLElement>('[data-tool]')) button.setAttribute('aria-selected', String(button.dataset.tool === settings.tool));
    for (const button of app.querySelectorAll<HTMLElement>('[data-seconds]')) button.setAttribute('aria-selected', String(Number(button.dataset.seconds) === settings.seconds));
    pairCount.textContent = t(`${editor.pairCount()}쌍 · 이음 ${board.connectedCount()}`, `${editor.pairCount()} pairs · ${board.connectedCount()} linked`);
    solveButton.disabled = !editor.isReady();
    hint.textContent = message || defaultHint();
    hint.classList.toggle('warn', message !== '');
  };

  const placeDot = (cell: Cell) => {
    const owner = editor.colorAt(cell);
    // 다른 색 점을 누르면 그 색으로 바꿔 고름
    if (owner !== undefined && owner !== settings.color) {
      settings.color = owner;
      return;
    }
    const result = editor.place(cell, settings.color);
    message = placeMessage(result);
    if (result === 'placed' && editor.dotsOf(settings.color).length === 2) {
      const next = COLORS.findIndex((_, index) => editor.dotsOf(index).length < 2);
      if (next >= 0) settings.color = next;
    }
    rebuildBoard();
  };

  const eraseAt = (cell: Cell) => {
    const line = board.lineAt(cell);
    if (editor.isHole(cell)) {
      editor.toggleHole(cell);
    } else if (line !== undefined) {
      // 선이 있으면 선 먼저, 없으면 점
      editor.eraseLine(line);
    } else {
      editor.removeDot(cell);
    }
    rebuildBoard();
  };

  const svg = view.element;
  svg.addEventListener('pointerdown', event => {
    const cell = view.cellAt(event.clientX, event.clientY);
    message = '';
    if (settings.tool === 'dot') placeDot(cell);
    if (settings.tool === 'erase') eraseAt(cell);
    if (settings.tool === 'hole') {
      if (!editor.toggleHole(cell)) message = t('점이 있는 칸이에요. 점을 먼저 지워 주세요', 'There’s a dot here — erase it first');
      rebuildBoard();
    }
    if (settings.tool === 'line' && board.begin(cell)) svg.setPointerCapture(event.pointerId);
    render();
  });
  svg.addEventListener('pointermove', event => {
    if (settings.tool !== 'line' || board.activeColor === null) return;
    if (board.drag(view.cellAt(event.clientX, event.clientY))) render();
  });
  const release = () => {
    if (settings.tool !== 'line') return;
    board.end();
    editor.paths = board.paths();
    render();
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  app.querySelector('.play')!.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-color], [data-seconds], [data-tool], [data-action]');
    if (!target) return;
    if (target.dataset.color) settings.color = Number(target.dataset.color);
    if (target.dataset.seconds) settings.seconds = Number(target.dataset.seconds);
    if (target.dataset.tool) settings.tool = target.dataset.tool as Tool;
    if (target.dataset.action === 'clear-dots') {
      editor.clear();
      rebuildBoard();
    }
    if (target.dataset.action === 'solve') return onSolve();
    message = '';
    render();
  });
  render();
}
