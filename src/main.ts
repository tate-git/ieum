// 이음: 같은 색 점을 겹치지 않는 선으로 잇기 · 내가 판을 만들어 풀거나 랜덤 단계 도전 · 시간 안에 못 이으면 짐
import { loadBest, saveBest } from './ui/best';
import { COLORS } from './ui/board-view';
import { Editor } from './game/editor';
import { showEditor, type EditorSettings } from './ui/editor-screen';
import { lang, setLang, t } from './ui/i18n';
import { showPlay } from './ui/play-screen';
import { showVersusSetup, stopVersus, type VersusSettings } from './ui/versus-screen';
import { generatePuzzle } from './game/puzzle';
import { MIN_SPAN } from './game/rules';
import { BOARD_SIZE, stage as stageFor } from './game/stages';

const app = document.querySelector<HTMLElement>('#app')!;
const editor = new Editor(BOARD_SIZE, COLORS.length);
const editorSettings: EditorSettings = { color: 0, seconds: 180, tool: 'dot' };
let stopPlay: (() => void) | null = null;
let currentStage = 1;

const lostTitle = () => t('못 이었어요 · 졌어요', 'Not linked — you lose');

const versusSettings: VersusSettings = { names: ['', ''], colors: 14, turnSeconds: 180 };

function showHome(): void {
  stopPlay?.();
  stopVersus();
  const best = loadBest();
  app.innerHTML = `
    <section class="home">
      <nav class="topnav"><button type="button" class="pill" data-action="lang">🌐 ${lang === 'ko' ? 'English' : '한국어'}</button></nav>
      <div class="logo">${COLORS.slice(0, 4).map(color => `<span style="background:${color}"></span>`).join('')}</div>
      <h1>${t('이음', 'Ieum')}</h1>
      <p class="tagline">${t('같은 색 점을 선으로 이어요', 'Link every pair of matching dots')}</p>
      <ol class="rules card">
        <li>${t('판에 A~N 색 점을 놓아요. 같은 색은 2개씩.', 'Place A–N colored dots, 2 of each color.')}</li>
        <li>${t(`같은 색 점끼리 끌어서 이어요. 선은 자기 칸 포함 ${MIN_SPAN}칸 이상, 선끼리는 겹칠 수 없어요.`, `Drag to link matching dots. Each line spans ${MIN_SPAN}+ cells and lines can’t cross.`)}</li>
        <li>${t('시간 안에 모든 색을 이으면 이기고, 못 이으면 져요.', 'Link every color in time to win — otherwise you lose.')}</li>
      </ol>
      <button type="button" class="primary wide" data-action="build">✏️ ${t('판 만들기', 'Build a board')}</button>
      <button type="button" class="wide" data-action="versus">⚔️ ${t('둘이 대결', 'Two-player match')}</button>
      <button type="button" class="wide" data-action="random">🎲 ${t('랜덤 판 도전', 'Random challenge')}${best > 0 ? ` <small class="muted">· ${t(`최고 ${best}단계`, `best: stage ${best}`)}</small>` : ''}</button>
    </section>`;
}

function showBuild(): void {
  stopPlay?.();
  showEditor(app, editor, editorSettings, solveBuilt);
}

function solveBuilt(): void {
  stopPlay = showPlay(app, editor.toPuzzle(), {
    title: `✏️ ${t('내가 만든 판', 'My board')}`,
    seconds: editorSettings.seconds,
    paths: editor.paths,
    result: (won, left) => ({
      icon: won ? '🎉' : '💥',
      title: won ? t('다 이었어요!', 'All linked!') : lostTitle(),
      note: won ? t(`${left}초 남기고 성공`, `${left}s to spare`) : t('같은 판을 다시 풀거나 점을 고쳐 보세요', 'Try the same board again or edit the dots'),
      actions: [
        { action: 'build', label: `✏️ ${t('판 고치기', 'Edit board')}` },
        { action: 'solve-again', label: t('다시 풀기', 'Solve again'), primary: true },
      ],
    }),
  });
}

function playStage(number: number): void {
  stopPlay?.();
  currentStage = number;
  const stage = stageFor(number);
  stopPlay = showPlay(app, generatePuzzle(stage.puzzle, Math.random), {
    title: `🎲 ${t(`${number}단계`, `Stage ${number}`)}`,
    seconds: stage.seconds,
    onEnd: won => saveBest(won ? number + 1 : number),
    result: (won, left) => ({
      icon: won ? '🎉' : '💥',
      title: won ? t(`${number}단계 성공!`, `Stage ${number} cleared!`) : lostTitle(),
      note: won
        ? t(`${left}초 남기고 다 이었어요`, `Linked with ${left}s to spare`)
        : t(`${number}단계에서 멈췄어요 · 최고 기록 ${loadBest()}단계`, `Stopped at stage ${number} · best: stage ${loadBest()}`),
      actions: [
        { action: 'home', label: t('처음으로', 'Home') },
        won ? { action: 'next', label: t('다음 단계', 'Next stage'), primary: true } : { action: 'random', label: t('1단계부터 다시', 'Restart from 1'), primary: true },
      ],
    }),
  });
}

app.addEventListener('click', event => {
  const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
  switch (action) {
    case 'lang':
      setLang(lang === 'ko' ? 'en' : 'ko');
      return showHome();
    case 'home':
      return showHome();
    case 'build':
      return showBuild();
    case 'solve-again':
      return solveBuilt();
    case 'random':
      return playStage(1);
    case 'versus':
      stopPlay?.();
      return showVersusSetup(app, versusSettings);
    case 'next':
      return playStage(currentStage + 1);
  }
});

setLang(lang);
showHome();
