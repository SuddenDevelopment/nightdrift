import { AUDIO_MESSAGES, type AudioStatus } from './audio';

export interface UiHandle {
  /** Resolves when the user asks to begin. Called synchronously on click. */
  onStart(handler: () => void): void;
  onRetryAudio(handler: () => void): void;
  hideStartScreen(): void;
  setAudioStatus(status: AudioStatus): void;
  showFallback(message: string): void;
  showContextLost(): void;
  dispose(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createUi(host: HTMLElement, version: string): UiHandle {
  const startScreen = element('div', { id: 'start-screen', class: 'overlay' });
  const startButton = element('button', { id: 'start', type: 'button' }, 'Start the drive');
  startScreen.append(
    element('h1', {}, 'Nightdrift'),
    element('p', { class: 'tagline' }, 'A slow night drive through a city that is never the same twice.'),
    startButton,
    element('p', { class: 'version', id: 'about-version' }, `Version ${version}`),
  );

  const hud = element('div', { id: 'hud', hidden: '' });
  // role=status announces changes without stealing focus from the scene.
  const audioStatus = element('p', { id: 'audio-status', role: 'status', 'aria-live': 'polite' });
  const retryButton = element('button', { id: 'audio-retry', type: 'button', hidden: '' }, 'Retry sound');
  hud.append(audioStatus, retryButton);

  const notice = element('div', { id: 'notice', class: 'overlay', role: 'alert', hidden: '' });

  host.append(startScreen, hud, notice);

  const startHandlers: (() => void)[] = [];
  const retryHandlers: (() => void)[] = [];
  // Dispatch synchronously so the AudioContext is created inside the gesture.
  const fireStart = () => startHandlers.forEach((handler) => handler());
  const fireRetry = () => retryHandlers.forEach((handler) => handler());
  startButton.addEventListener('click', fireStart);
  retryButton.addEventListener('click', fireRetry);

  return {
    onStart: (handler) => startHandlers.push(handler),
    onRetryAudio: (handler) => retryHandlers.push(handler),
    hideStartScreen() {
      startScreen.hidden = true;
      hud.hidden = false;
    },
    setAudioStatus(status) {
      audioStatus.textContent = AUDIO_MESSAGES[status];
      audioStatus.dataset.state = status;
      retryButton.hidden = !(status === 'blocked' || status === 'suspended');
    },
    showFallback(message) {
      startScreen.hidden = true;
      hud.hidden = true;
      notice.replaceChildren(
        element('h2', {}, 'Nightdrift cannot run here'),
        element('p', {}, message),
      );
      notice.hidden = false;
    },
    showContextLost() {
      const reload = element('button', { id: 'reload', type: 'button' }, 'Reload');
      reload.addEventListener('click', () => globalThis.location.reload());
      notice.replaceChildren(
        element('h2', {}, 'The drive stopped'),
        element('p', {}, 'The graphics context was lost. Reload to start a new drive.'),
        reload,
      );
      notice.hidden = false;
      reload.focus();
    },
    dispose() {
      startButton.removeEventListener('click', fireStart);
      retryButton.removeEventListener('click', fireRetry);
      startHandlers.length = 0;
      retryHandlers.length = 0;
      startScreen.remove();
      hud.remove();
      notice.remove();
    },
  };
}
