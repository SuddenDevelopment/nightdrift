import { AudioEngine, type AudioStatus } from './audio';
import { createScene, webgl2Available, type SceneHandle, type SceneStats } from './scene';
import { installTestApi, testModeEnabled, type TestApi } from './test-api';
import { createUi } from './ui';

const EMPTY_STATS: SceneStats = { frames: 0, drawCalls: 0, geometries: 0, textures: 0 };

export interface App {
  dispose(): Promise<void>;
}

export function startApp(host: HTMLElement, version: string): App {
  const ui = createUi(host, version);
  const audio = new AudioEngine();

  let scene: SceneHandle | null = null;
  let frameRequest = 0;
  let started = false;
  let framesSinceStart = 0;
  let disposed = false;
  /** Guards against a slow activation landing after teardown or a reset. */
  let activation = 0;

  const webgl2 = webgl2Available();

  const currentStats = (): SceneStats => scene?.stats() ?? EMPTY_STATS;
  const isReady = (): boolean => started && framesSinceStart > 0 && audio.status === 'running';

  function refreshReadiness(): void {
    if (!scene) return;
    const value = isReady() ? 'true' : 'false';
    if (scene.canvas.dataset.ready !== value) scene.canvas.dataset.ready = value;
  }

  const removeTestApi = testModeEnabled(globalThis.location.search)
    ? installTestApi((): TestApi => ({
      version,
      started,
      ready: isReady(),
      webgl2,
      audio: audio.status,
      stats: currentStats(),
    }))
    : () => undefined;

  if (!webgl2) {
    ui.showFallback(
      'This browser could not provide a WebGL 2 graphics context. Enable hardware acceleration, update the browser, or try another one.',
    );
    return {
      async dispose() {
        removeTestApi();
        ui.dispose();
      },
    };
  }

  function stopLoop(): void {
    if (frameRequest) cancelAnimationFrame(frameRequest);
    frameRequest = 0;
  }

  function onContextLost(): void {
    stopLoop();
    started = false;
    framesSinceStart = 0;
    if (scene) scene.canvas.dataset.ready = 'false';
    void audio.dispose();
    ui.setAudioStatus('closed');
    ui.showContextLost();
  }

  scene = createScene(host, { onContextLost });

  const tick = (): void => {
    if (disposed || !scene) return;
    scene.render();
    if (started) {
      framesSinceStart += 1;
      // Readiness needs a rendered frame of the current scene, so it can only
      // be granted from inside the loop.
      refreshReadiness();
    }
    frameRequest = requestAnimationFrame(tick);
  };
  frameRequest = requestAnimationFrame(tick);

  const onResize = (): void => scene?.resize();
  globalThis.addEventListener('resize', onResize);

  function applyAudioStatus(status: AudioStatus): void {
    ui.setAudioStatus(status);
    refreshReadiness();
  }

  function requestAudio(): void {
    // Called synchronously from the click handler: AudioEngine constructs the
    // context before its first await so the gesture still counts.
    const generation = (activation += 1);
    void audio.activate().then((status) => {
      if (disposed || generation !== activation) return;
      applyAudioStatus(status);
    });
  }

  ui.onStart(() => {
    if (started) return; // repeated clicks must not initialise twice
    started = true;
    framesSinceStart = 0;
    ui.hideStartScreen();
    requestAudio();
  });

  ui.onRetryAudio(() => {
    if (!started) return;
    requestAudio();
  });

  return {
    async dispose() {
      if (disposed) return;
      disposed = true;
      activation += 1;
      stopLoop();
      globalThis.removeEventListener('resize', onResize);
      removeTestApi();
      ui.dispose();
      scene?.dispose();
      scene = null;
      await audio.dispose();
    },
  };
}
