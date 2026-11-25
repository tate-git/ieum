// 두 사람 대결(한 컴퓨터): 설정 → 동전 던지기 → 번갈아 놓기(차례마다 제한 시간) → ⚡ 도전이면 상대가 다 이어 증명 → 라운드 결과 · 다음 라운드는 진 사람이 선후공을 고름
import { BOARD_SIZE } from '../game/stages';
import { other, Versus, type Player, type VersusPlaceResult } from '../game/versus';
import { BoardView, boardScene, COLORS, LETTERS, letterColor } from './board-view';
import { Board } from '../game/board';
import { openDialog } from './dialog';
import { escapeHtml } from './html';
import { t } from './i18n';
import { formatSeconds, showPlay } from './play-screen';

const COLOR_CHOICES = [14, 26] as const;
const TURN_CHOICES = [60, 120, 180] as const;
const TICK_MS = 200;
const LOW_TIME_SECONDS = 20;
const NAME_MAX = 10;

export interface VersusSettings {
  names: [string, string];
  colors: number;
  turnSeconds: number;
}

interface Match {
  readonly settings: VersusSettings;
  round: number;
  scores: [number, number];
}

type Tool = 'dot' | 'line' | 'erase';

/** 화면 바꿀 때 돌던 시계를 멈추려고 */
let stopCurrent: (() => void) | null = null;

export function stopVersus(): void {
  stopCurrent?.();
  stopCurrent = null;
}

/** 화면(innerHTML)에 넣는 이름 */
const nameOf = (match: Match, player: Player) => escapeHtml(match.settings.names[player]);

export function showVersusSetup(app: HTMLElement, settings: VersusSettings): void {
  stopVersus();
  const render = () => {
    app.innerHTML = `
      <section class="play versus-setup">
        <header class="play-bar">
          <button type="button" class="back" data-action="home">← ${t('처음', 'Home')}</button>
          <b>⚔️ ${t('둘이 대결', 'Two-player match')}</b>
          <span></span>
        </header>
        <ol class="rules card">
          <li>${t('선 플레이어가 말 1개로 열고, 그다음부터 차례마다 서로 다른 색 말 2개를 놓아요.', 'The first player opens with 1 piece; after that each turn places 2 pieces of different colors.')}</li>
          <li>${t('놓는 목표: 같은 색 두 말을 잇는 선(6칸 이상)이 서로 겹치지 않게.', 'Goal: every same-color pair must stay linkable (6+ cells) without crossing.')}</li>
          <li>${t('⚡ 도전: 내 차례에 「이제 못 이어요」라고 외치면, 방금 놓은 상대가 제한 시간 안에 모두 이어 보여야 해요. 이으면 상대 승, 못 이으면 내 승.', '⚡ Challenge: on your turn, claim "it can’t be linked" — your opponent must link every pair in time. If they do, they win; if not, you win.')}</li>
          <li>${t('차례 시간이 끝나면 그 사람이 져요. 말을 다 놓으면 다음 사람이 도전하거나 비김을 인정해요.', 'Run out of time on your turn and you lose. When all pieces are down, the next player challenges or accepts a draw.')}</li>
        </ol>
        <label class="field">${t('플레이어 1', 'Player 1')}<input id="name-0" maxlength="${NAME_MAX}" placeholder="${t('플레이어 1', 'Player 1')}" value="${escapeHtml(settings.names[0])}"></label>
        <label class="field">${t('플레이어 2', 'Player 2')}<input id="name-1" maxlength="${NAME_MAX}" placeholder="${t('플레이어 2', 'Player 2')}" value="${escapeHtml(settings.names[1])}"></label>
        <p class="muted small">${t('말 색', 'Colors')}</p>
        <div class="segmented two">${COLOR_CHOICES.map(count => `<button type="button" data-colors="${count}" aria-selected="${count === settings.colors}">${count === 14 ? 'A~N · 28' : 'A~Z · 52'}${t('개', '')}</button>`).join('')}</div>
        <p class="muted small">${t('한 차례 시간', 'Time per turn')}</p>
        <div class="segmented three">${TURN_CHOICES.map(seconds => `<button type="button" data-turn="${seconds}" aria-selected="${seconds === settings.turnSeconds}">⏱ ${seconds / 60}${t('분', ' min')}</button>`).join('')}</div>
        <button type="button" class="primary wide" data-vs="start">🪙 ${t('동전 던지고 시작', 'Toss a coin and start')}</button>
      </section>`;
  };
  const readNames = () => {
    for (const player of [0, 1] as const) {
      const value = app.querySelector<HTMLInputElement>(`#name-${player}`)!.value.trim();
      settings.names[player] = value || (player === 0 ? t('플레이어 1', 'Player 1') : t('플레이어 2', 'Player 2'));
    }
  };
  render();
  app.querySelector('.versus-setup')!.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-colors], [data-turn], [data-vs]');
    if (!target) return;
    readNames();
    if (target.dataset.colors) settings.colors = Number(target.dataset.colors);
    if (target.dataset.turn) settings.turnSeconds = Number(target.dataset.turn);
    if (target.dataset.vs === 'start') return tossCoin(app, { settings, round: 1, scores: [0, 0] });
    showVersusSetup(app, settings);
  });
}

function tossCoin(app: HTMLElement, match: Match): void {
  const first: Player = Math.random() < 0.5 ? 0 : 1;
  openDialog(app.querySelector('section')!, {
    icon: '🪙',
    title: t(`${nameOf(match, first)} 먼저!`, `${nameOf(match, first)} goes first!`),
    note: t(`라운드 ${match.round} · 동전 던지기 결과`, `Round ${match.round} · coin toss`),
    actions: [{ label: t('시작', 'Start'), primary: true, run: () => playRound(app, match, first) }],
  });
}

function playRound(app: HTMLElement, match: Match, first: Player): void {
  const game = new Versus(BOARD_SIZE, match.settings.colors, first);
  playTurn(app, match, game);
}

function placeMessage(result: VersusPlaceResult): string {
  switch (result) {
    case 'occupied':
    case 'notMine':
      return t('이미 말이 있어요(이번 차례에 놓은 말만 되돌릴 수 있어요)', 'Taken — you can only take back pieces from this turn');
    case 'full':
      return t('이 색은 2개 다 놓였어요', 'Both pieces of this color are down');
    case 'sameColor':
      return t('한 차례엔 서로 다른 색 2개예요', 'Two different colors per turn');
    case 'enough':
      return t('이번 차례 말은 다 놓았어요. 차례를 넘겨 주세요', 'You’ve placed enough — end your turn');
    default:
      return '';
  }
}

function playTurn(app: HTMLElement, match: Match, game: Versus): void {
  stopVersus();
  const me = game.current;
  const full = game.isFull();
  const { colors, turnSeconds } = match.settings;
  const settings = { tool: 'dot' as Tool, color: COLORS.findIndex((_, index) => index < colors && game.editor.dotsOf(index).length < 2) };
  app.innerHTML = `
    <section class="play versus">
      <header class="play-bar">
        <button type="button" class="back" data-action="home">← ${t('처음', 'Home')}</button>
        <b>⚔️ ${t(`라운드 ${match.round}`, `Round ${match.round}`)}</b>
        <span id="remaining" class="muted"></span>
      </header>
      <div class="players">
        ${([0, 1] as const).map(player => `<div class="player${player === me ? ' turn' : ''}"><b>${nameOf(match, player)}</b><span>${match.scores[player]}</span></div>`).join('')}
      </div>
      <div class="timer"><div id="timer-fill"></div><span id="timer-text"></span></div>
      <p id="hint" class="hint"></p>
      <div class="segmented tools three">
        <button type="button" data-tool="dot">● ${t('말 놓기', 'Place')}</button>
        <button type="button" data-tool="line">〰 ${t('선 그어 보기', 'Sketch')}</button>
        <button type="button" data-tool="erase">🧽 ${t('지우기', 'Erase')}</button>
      </div>
      <div class="palette"></div>
      <div id="board" class="board-wrap tight"></div>
      <div class="actions">
        <button type="button" data-vs="challenge">⚡ ${t('도전: 못 이어요!', 'Challenge!')}</button>
        ${full
          ? `<button type="button" data-vs="draw">🤝 ${t('비김 인정', 'Accept draw')}</button>`
          : `<button type="button" class="primary" data-vs="end-turn">✅ ${t('차례 넘기기', 'End turn')}</button>`}
      </div>
    </section>`;
  const section = app.querySelector<HTMLElement>('.versus')!;
  const hint = section.querySelector<HTMLElement>('#hint')!;
  const palette = section.querySelector<HTMLElement>('.palette')!;
  const view = new BoardView(section.querySelector('#board')!, BOARD_SIZE);
  let board = new Board(game.editor.toPuzzle(), game.editor.paths);
  let message = '';

  const rebuild = () => {
    board = new Board(game.editor.toPuzzle(), game.editor.paths);
  };

  const render = () => {
    palette.innerHTML = COLORS.slice(0, colors).map((color, index) => {
      const left = 2 - game.editor.dotsOf(index).length;
      return `<button type="button" role="radio" aria-checked="${index === settings.color}" data-color="${index}" style="--swatch:${color};--letter:${letterColor(index)}" ${left === 0 || settings.tool !== 'dot' ? 'disabled' : ''}>
        <span class="swatch">${LETTERS[index]}</span><small>${left}</small></button>`;
    }).join('');
    view.render(boardScene(board));
    section.querySelector('#remaining')!.textContent = t(`남은 말 ${game.remaining()}`, `${game.remaining()} left`);
    for (const button of section.querySelectorAll<HTMLElement>('[data-tool]')) button.setAttribute('aria-selected', String(button.dataset.tool === settings.tool));
    section.querySelector<HTMLButtonElement>('[data-vs="challenge"]')!.disabled = !game.canChallenge();
    const endTurn = section.querySelector<HTMLButtonElement>('[data-vs="end-turn"]');
    if (endTurn) endTurn.disabled = !game.canEndTurn();
    // textContent 라 이름을 그대로(이스케이프하면 &lt; 가 보임)
    const name = match.settings.names[me];
    const status = full
      ? t(`${name} 차례 · 말을 다 놓았어요. 도전하거나 비김을 인정해요`, `${name}: all pieces are down — challenge or accept a draw`)
      : t(`${name} 차례 · ${game.turn === 1 ? '첫 말 1개' : '서로 다른 색 말'} (${game.placedThisTurn.length}/${game.required()})`, `${name}'s turn · ${game.turn === 1 ? 'opening piece' : 'different colors'} (${game.placedThisTurn.length}/${game.required()})`);
    hint.textContent = message || status;
    hint.classList.toggle('warn', message !== '');
  };

  // 차례 시계: 끝나면 지금 차례인 사람이 짐
  const deadline = performance.now() + turnSeconds * 1000;
  const timerFill = section.querySelector<HTMLElement>('#timer-fill')!;
  const timerText = section.querySelector<HTMLElement>('#timer-text')!;
  const tick = () => {
    const left = Math.max(deadline - performance.now(), 0);
    timerFill.style.width = `${(left / (turnSeconds * 1000)) * 100}%`;
    timerText.textContent = formatSeconds(Math.ceil(left / 1000));
    section.querySelector('.timer')!.classList.toggle('low', left < LOW_TIME_SECONDS * 1000);
    if (left === 0) {
      stopVersus();
      finishRound(app, match, other(me), t(`${nameOf(match, me)} 시간 초과`, `${nameOf(match, me)} ran out of time`));
    }
  };
  const timer = setInterval(tick, TICK_MS);
  stopCurrent = () => clearInterval(timer);

  const svg = view.element;
  svg.addEventListener('pointerdown', event => {
    const cell = view.cellAt(event.clientX, event.clientY);
    message = '';
    if (settings.tool === 'dot' && !full) {
      message = placeMessage(game.place(cell, settings.color));
      // 놓은 색은 이번 차례에 다시 못 쓰니 다음 색으로
      if (game.placedThisTurn.some(piece => piece.color === settings.color)) {
        const next = COLORS.findIndex((_, index) => index < colors && game.editor.dotsOf(index).length < 2 && !game.placedThisTurn.some(piece => piece.color === index));
        if (next >= 0) settings.color = next;
      }
      rebuild();
    }
    if (settings.tool === 'erase') {
      const line = board.lineAt(cell);
      if (line !== undefined) game.editor.eraseLine(line);
      else game.takeBack(cell);
      rebuild();
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
    game.editor.paths = board.paths();
    render();
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  section.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-color], [data-tool], [data-vs]');
    if (!target) return;
    message = '';
    if (target.dataset.color) settings.color = Number(target.dataset.color);
    if (target.dataset.tool) settings.tool = target.dataset.tool as Tool;
    switch (target.dataset.vs) {
      case 'end-turn':
        game.endTurn();
        return playTurn(app, match, game);
      case 'challenge':
        return challenge(app, match, game);
      case 'draw':
        stopVersus();
        return finishRound(app, match, null, t('말을 다 놓고 비김을 인정했어요', 'All pieces down — draw accepted'));
    }
    render();
  });
  render();
  tick();
}

/** 도전받은 사람(방금 놓은 사람)이 모든 짝을 이어 보여야 함 · 그은 선은 지우고 새로 */
function challenge(app: HTMLElement, match: Match, game: Versus): void {
  stopVersus();
  const challenger = game.current;
  const prover = other(challenger);
  const puzzle = game.editor.toPuzzle();
  if (puzzle.pairs.length === 0) {
    return finishRound(app, match, prover, t('아직 이을 짝이 없어서 도전이 틀렸어요', 'No pairs to link yet — the challenge fails'));
  }
  const proverName = nameOf(match, prover);
  stopCurrent = showPlay(app, puzzle, {
    title: `🔍 ${t(`${proverName} 증명`, `${proverName} proves`)}`,
    seconds: match.settings.turnSeconds,
    result: won => ({
      icon: won ? '✅' : '❌',
      title: won ? t(`${proverName} 다 이었어요!`, `${proverName} linked them all!`) : t(`${proverName} 못 이었어요`, `${proverName} couldn’t link them`),
      note: won ? t('도전 실패', 'The challenge fails') : t('도전 성공', 'The challenge succeeds'),
      actions: [{
        label: t('결과 보기', 'See result'),
        primary: true,
        run: () => finishRound(app, match, won ? prover : challenger, won ? t(`${proverName} 증명 성공`, `${proverName} proved it`) : t(`${proverName} 증명 실패`, `${proverName} failed to prove it`)),
      }],
    }),
  });
}

/** 라운드 끝: 점수 올리고, 진 사람이 다음 라운드 선후공을 고름(비기면 동전) */
function finishRound(app: HTMLElement, match: Match, winner: Player | null, reason: string): void {
  if (winner !== null) match.scores[winner]++;
  const score = `${nameOf(match, 0)} ${match.scores[0]} : ${match.scores[1]} ${nameOf(match, 1)}`;
  const nextRound = (first: Player | 'coin') => {
    match.round++;
    if (first === 'coin') tossCoin(app, match);
    else playRound(app, match, first);
  };
  const loser = winner === null ? null : other(winner);
  openDialog(app.querySelector('section')!, {
    icon: winner === null ? '🤝' : '🏆',
    title: winner === null ? t('비겼어요', 'Draw') : t(`${nameOf(match, winner)} 승리!`, `${nameOf(match, winner)} wins!`),
    note: `${reason} · ${score}`,
    actions: loser === null
      ? [
          { label: t('처음으로', 'Home'), action: 'home' },
          { label: `🪙 ${t('다음 라운드', 'Next round')}`, primary: true, run: () => nextRound('coin') },
        ]
      : [
          { label: t(`${nameOf(match, loser)} 먼저`, `${nameOf(match, loser)} first`), primary: true, run: () => nextRound(loser) },
          { label: t(`${nameOf(match, loser)} 나중에`, `${nameOf(match, loser)} second`), run: () => nextRound(other(loser)) },
          { label: t('처음으로', 'Home'), action: 'home' },
        ],
  });
}
