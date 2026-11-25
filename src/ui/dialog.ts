// 가운데 결과 창(아이콘 · 제목 · 설명 · 버튼) · 버튼은 action(main 이 처리) 또는 run(바로 실행)
export interface DialogAction {
  readonly label: string;
  readonly primary?: boolean;
  /** data-action 으로 main 의 클릭 처리에 넘김 */
  readonly action?: string;
  readonly run?: () => void;
}

export interface DialogContent {
  readonly icon: string;
  readonly title: string;
  readonly note: string;
  readonly actions: readonly DialogAction[];
}

export function openDialog(container: HTMLElement, { icon, title, note, actions }: DialogContent): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.className = 'result';
  const buttons = actions.map(({ label, primary, action }, index) =>
    `<button type="button"${primary ? ' class="primary"' : ''} ${action ? `data-action="${action}"` : `data-run="${index}"`}>${label}</button>`);
  dialog.innerHTML = `<p class="icon">${icon}</p><h2>${title}</h2><p class="muted">${note}</p><div class="row">${buttons.join('')}</div>`;
  dialog.addEventListener('click', event => {
    const index = (event.target as HTMLElement).closest<HTMLElement>('[data-run]')?.dataset.run;
    if (index === undefined) return;
    dialog.close();
    dialog.remove();
    actions[Number(index)].run?.();
  });
  // Esc 로 닫히면 결과를 못 고르니 막음
  dialog.addEventListener('cancel', event => event.preventDefault());
  container.append(dialog);
  dialog.showModal();
  return dialog;
}
