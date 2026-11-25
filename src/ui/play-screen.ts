// 풀기 화면(랜덤 판 · 만든 판 공용): 같은 색끼리 끌어 잇기 · 시간 안에 다 이으면 이김, 시간이 끝나면 짐
import { Board, type Paths } from '../game/board';
import { BoardView, boardScene } from './board-view';
import { t } from './i18n';
import type { Puzzle } from '../game/puzzle';

const TICK_MS = 100;
const LOW_TIME_SECONDS = 10;

/** 결과 창 내용 · 버튼은 data-action 으로 화면 밖(main)에서 처리 */
export interface ResultContent {
  readonly icon: string;
  readonly title: string;
  readonly note: string;
  readonly actions: readonly { readonly action: string; readonly label: string; readonly primary?: boolean }[];
}

export interface PlayOptions {
  readonly title: string;
  readonly seconds: number;
  readonly result: (won: boolean, leftSeconds: number) => ResultContent;
  readonly onEnd?: (won: boolean) => void;
  /** 미리 그어 둔 선 */
  readonly paths?: Paths;
}

/** 화면을 그리고 시계를 돌림 · 돌려준 함수로 멈춤 */
export function showPlay(app: HTMLElement, puzzle: Puzzle, { title, seconds, result, onEnd, paths }: PlayOptions): () => void {
  const board = new Board(puzzle, paths);
  app.innerHTML = `
    <section class="play">
      <header class="play-bar">
        <button type="button" class="back" data-action="home">← ${t('처음', 'Home')}</button>
        <b>${title}</b>
        <span id="linked" class="muted"></span>
      </header>
      <div class="timer"><div id="timer-fill"></div><span id="timer-text"></span></div>
      <div id="board" class="board-wrap"></div>
      <div class="actions">
        <button type="button" data-action="eraser" aria-pressed="false">🧽 ${t('지우개', 'Eraser')}</button>
        <button type="button" data-action="clear-lines">🧹 ${t('선 다 지우기', 'Clear lines')}</button>
        <button type="button" data-action="give-up">🏳️ ${t('포기', 'Give up')}</button>
      </div>
      <dialog id="result" class="result"></dialog>
    </section>`;
  const view = new BoardView(app.querySelector('#board')!, puzzle.size);
  const eraser = app.querySelector<HTMLButtonElement>('[data-action="eraser"]')!;
  let erasing = false;
  if (import.meta.env.DEV) Object.assign(window, { ieumBoard: board });   // 로컬 시험에서 답 길을 따라 그어 보려고
  const linked = app.querySelector<HTMLElement>('#linked')!;
  const timerBox = app.querySelector<HTMLElement>('.timer')!;
  const timerFill = app.querySelector<HTMLElement>('#timer-fill')!;
  const timerText = app.querySelector<HTMLElement>('#timer-text')!;
  const deadline = performance.now() + seconds * 1000;
  let finished = false;

  const refresh = () => {
    view.render(boardScene(board));
    linked.textContent = `${board.connectedCount()} / ${puzzle.pairs.length}`;
  };

  const finish = (won: boolean) => {
    if (finished) return;
    finished = true;
    board.end();
    clearInterval(timer);
    onEnd?.(won);   // 기록 저장이 결과 글보다 먼저
    const dialog = app.querySelector<HTMLDialogElement>('#result')!;
    dialog.innerHTML = resultHtml(result(won, Math.ceil((deadline - performance.now()) / 1000)));
    dialog.showModal();
  };

  const tick = () => {
    const left = Math.max(deadline - performance.now(), 0);
    timerFill.style.width = `${(left / (seconds * 1000)) * 100}%`;
    timerText.textContent = formatSeconds(Math.ceil(left / 1000));
    timerBox.classList.toggle('low', left < LOW_TIME_SECONDS * 1000);
    if (left === 0) finish(false);
  };
  const timer = setInterval(tick, TICK_MS);

  const svg = view.element;
  svg.addEventListener('pointerdown', event => {
    if (finished) return;
    const cell = view.cellAt(event.clientX, event.clientY);
    // 지우개: 누른 선(또는 그 점의 선) 하나만 지움
    if (erasing) {
      const color = board.lineAt(cell) ?? board.dotAt(cell);
      if (color !== undefined) board.erase(color);
      return refresh();
    }
    if (!board.begin(cell)) return;
    svg.setPointerCapture(event.pointerId);
    refresh();
  });
  svg.addEventListener('pointermove', event => {
    if (finished || board.activeColor === null) return;
    if (board.drag(view.cellAt(event.clientX, event.clientY))) refresh();
  });
  const release = () => {
    board.end();
    if (board.isSolved()) finish(true);
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  eraser.addEventListener('click', () => {
    erasing = !erasing;
    eraser.setAttribute('aria-pressed', String(erasing));
  });
  app.querySelector('[data-action="clear-lines"]')!.addEventListener('click', () => {
    board.reset();
    refresh();
  });
  app.querySelector('[data-action="give-up"]')!.addEventListener('click', () => finish(false));

  refresh();
  tick();
  return () => clearInterval(timer);
}

function resultHtml({ icon, title, note, actions }: ResultContent): string {
  const buttons = actions.map(({ action, label, primary }) => `<button type="button"${primary ? ' class="primary"' : ''} data-action="${action}">${label}</button>`);
  return `<p class="icon">${icon}</p><h2>${title}</h2><p class="muted">${note}</p><div class="row">${buttons.join('')}</div>`;
}

/** 「2:05」 · 1분 안이면 「45초」 */
export function formatSeconds(total: number): string {
  if (total < 60) return t(`${total}초`, `${total}s`);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
