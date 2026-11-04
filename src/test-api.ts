import type { AudioStatus } from './audio';
import type { SceneStats } from './scene';

/** Real observations, not test flags. Present only under `?test=1`. */
export interface TestApi {
  version: string;
  started: boolean;
  ready: boolean;
  webgl2: boolean;
  audio: AudioStatus;
  stats: SceneStats;
}

declare global {
  interface Window {
    __nightdrift?: { read(): TestApi };
  }
}

export function testModeEnabled(search: string): boolean {
  return new URLSearchParams(search).get('test') === '1';
}

/** Returns a teardown that removes the API again. */
export function installTestApi(read: () => TestApi): () => void {
  window.__nightdrift = { read };
  return () => {
    delete window.__nightdrift;
  };
}
