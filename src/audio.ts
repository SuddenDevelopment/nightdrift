export type AudioStatus = 'idle' | 'running' | 'suspended' | 'blocked' | 'closed';

export const AUDIO_MESSAGES: Record<AudioStatus, string> = {
  idle: 'Sound has not started yet.',
  running: 'Sound on.',
  suspended: 'Sound is paused by the browser.',
  blocked: 'Sound could not start. The drive continues without it.',
  closed: 'Sound stopped.',
};

/**
 * Owns the application's AudioContext and its single master gain. Foundation
 * keeps the graph silent; the Sound checkpoint attaches instruments to
 * `master` without changing this lifecycle.
 *
 * `activate()` must be called synchronously from a user gesture: the context
 * is constructed before the first await so the browser credits the gesture.
 */
export class AudioEngine {
  #context: AudioContext | null = null;
  #master: GainNode | null = null;
  #status: AudioStatus = 'idle';
  /** Bumped on dispose so a late activation cannot revive a dead engine. */
  #generation = 0;

  get status(): AudioStatus {
    return this.#status;
  }

  get context(): AudioContext | null {
    return this.#context;
  }

  get master(): GainNode | null {
    return this.#master;
  }

  async activate(): Promise<AudioStatus> {
    const generation = this.#generation;
    try {
      if (!this.#context || this.#context.state === 'closed') {
        const Constructor = globalThis.AudioContext;
        if (!Constructor) throw new Error('Web Audio is unavailable');
        const context = new Constructor();
        const master = context.createGain();
        // Silent by default. Volume is introduced with the instruments.
        master.gain.value = 0;
        master.connect(context.destination);
        if (generation !== this.#generation) {
          await context.close();
          return this.#status;
        }
        this.#context = context;
        this.#master = master;
      }
      await this.#context.resume();
      if (generation !== this.#generation) return this.#status;
      this.#status = this.#context.state === 'running' ? 'running' : 'suspended';
    } catch {
      if (generation !== this.#generation) return this.#status;
      this.#status = 'blocked';
    }
    return this.#status;
  }

  async dispose(): Promise<void> {
    this.#generation += 1;
    const context = this.#context;
    this.#context = null;
    this.#master = null;
    this.#status = 'closed';
    if (context && context.state !== 'closed') {
      await context.close().catch(() => undefined);
    }
  }
}
