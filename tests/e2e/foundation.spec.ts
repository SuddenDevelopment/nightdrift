import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Importing the real module keeps the window augmentation and the shape of
// the API in one place.
import type { TestApi } from '../../src/test-api';

const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

const read = (page: Page): Promise<TestApi> =>
  page.evaluate(() => window.__nightdrift!.read());

/** Fails `count` AudioContext constructions, then behaves normally. */
async function blockAudio(page: Page, count: number): Promise<void> {
  await page.addInitScript((remaining: number) => {
    let left = remaining;
    const Real = window.AudioContext;
    class Blocking extends Real {
      constructor() {
        if (left > 0) {
          left -= 1;
          throw new Error('audio activation blocked for this test');
        }
        super();
      }
    }
    window.AudioContext = Blocking as unknown as typeof AudioContext;
  }, count);
}

/** Makes every WebGL context request fail, as a GPU-less browser would. */
async function disableWebgl(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patched(
      this: HTMLCanvasElement,
      id: string,
      ...rest: unknown[]
    ) {
      if (id === 'webgl2' || id === 'webgl' || id === 'experimental-webgl') return null;
      return (original as (...args: unknown[]) => unknown).call(this, id, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
}

/** Collects console errors and uncaught page errors for the whole scenario. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Shared skip reason for the WebGL-dependent scenarios: the gpu-less driver-exhaustion marker plus the browser name. */
const WEBGL_SKIP_REASON = (browser: string): string =>
  `FEATURE_FAILURE_WEBGL_EXHAUSTED_DRIVERS: ${browser} cannot create a WebGL 2 context`;

/** Skips the running test unless this browser really provides WebGL 2. */
async function requireWebgl2(page: Page): Promise<void> {
  const ok = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
  test.skip(!ok, WEBGL_SKIP_REASON(test.info().project.name));
}

test.describe('foundation lifecycle', () => {
  test('starts the drive and reaches Factory capture readiness', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/?test=1');
    await requireWebgl2(page);

    // Before Start: no drive, silent, not ready.
    await expect(page.locator('#start')).toBeVisible();
    const before = await read(page);
    expect(before.started).toBe(false);
    expect(before.audio).toBe('idle');
    expect(before.ready).toBe(false);
    await expect(page.locator('canvas#scene')).toHaveAttribute('data-ready', 'false');

    await page.locator('#start').click();

    // Both Factory selectors must resolve, in order.
    await expect(page.locator('#start')).toBeHidden();
    await expect(page.locator("canvas[data-ready='true']")).toBeVisible();

    const after = await read(page);
    expect(after.started).toBe(true);
    expect(after.audio).toBe('running');
    expect(after.ready).toBe(true);
    expect(after.stats.frames).toBeGreaterThan(0);
    await expect(page.locator('#audio-status')).toHaveAttribute('data-state', 'running');
    expect(errors).toEqual([]);
  });

  test('ignores repeated Start activation', async ({ page }) => {
    await page.goto('/?test=1');
    await requireWebgl2(page);
    const start = page.locator('#start');
    await start.click();
    await expect(page.locator("canvas[data-ready='true']")).toBeVisible();

    // The button is hidden with its screen; dispatching again must be inert.
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('#start')!.click());
    await page.waitForTimeout(200);

    const state = await read(page);
    expect(state.audio).toBe('running');
    expect(state.ready).toBe(true);
    // Exactly one canvas, so no second renderer was created.
    expect(await page.locator('canvas').count()).toBe(1);
  });

  test('continues the drive when audio activation fails, and recovers on retry', async ({ page }) => {
    const errors = watchErrors(page);
    await blockAudio(page, 1);
    await page.goto('/?test=1');
    await requireWebgl2(page);
    await page.locator('#start').click();

    await expect(page.locator('#audio-status')).toHaveAttribute('data-state', 'blocked');
    const blocked = await read(page);
    expect(blocked.started).toBe(true);
    expect(blocked.audio).toBe('blocked');
    // Visuals keep running, but readiness is withheld.
    expect(blocked.ready).toBe(false);
    await expect(page.locator("canvas[data-ready='false']")).toBeVisible();

    const framesWhileBlocked = blocked.stats.frames;
    await page.waitForTimeout(300);
    expect((await read(page)).stats.frames).toBeGreaterThan(framesWhileBlocked);

    await page.locator('#audio-retry').click();
    await expect(page.locator("canvas[data-ready='true']")).toBeVisible();
    expect((await read(page)).audio).toBe('running');
    // A handled failure must not surface as an uncaught error.
    expect(errors).toEqual([]);
  });

  test('shows a readable fallback when WebGL 2 is unavailable', async ({ page }) => {
    const errors = watchErrors(page);
    await disableWebgl(page);
    await page.goto('/?test=1');

    const notice = page.locator('#notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/WebGL 2/i);
    await expect(page.locator('#start')).toBeHidden();
    expect(await page.locator('canvas#scene').count()).toBe(0);
    expect((await read(page)).webgl2).toBe(false);
    expect(errors).toEqual([]);
  });

  test('stops the drive and offers reload after context loss', async ({ page }) => {
    await page.goto('/?test=1');
    await requireWebgl2(page);
    await page.locator('#start').click();
    await expect(page.locator("canvas[data-ready='true']")).toBeVisible();

    await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('canvas#scene')!;
      const context = canvas.getContext('webgl2')!;
      context.getExtension('WEBGL_lose_context')!.loseContext();
    });

    await expect(page.locator('#notice')).toBeVisible();
    await expect(page.locator('#reload')).toBeVisible();
    await expect(page.locator("canvas[data-ready='false']")).toBeAttached();
    expect((await read(page)).ready).toBe(false);
  });

  test('keeps rendering across a viewport resize', async ({ page }) => {
    await page.goto('/?test=1');
    await requireWebgl2(page);
    await page.locator('#start').click();
    await expect(page.locator("canvas[data-ready='true']")).toBeVisible();

    await page.setViewportSize({ width: 640, height: 900 });
    const box = await page.locator('canvas#scene').boundingBox();
    expect(box?.width).toBeCloseTo(640, 0);

    const before = (await read(page)).stats.frames;
    await page.waitForTimeout(250);
    expect((await read(page)).stats.frames).toBeGreaterThan(before);
    await expect(page.locator("canvas[data-ready='true']")).toBeVisible();
  });

  test('exposes no test API on an ordinary visit', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => '__nightdrift' in window)).toBe(false);
    // ?debug=1 alone must not expose test controls either.
    await page.goto('/?debug=1');
    expect(await page.evaluate(() => '__nightdrift' in window)).toBe(false);
  });

  test('reports the package version in the meta marker and the page', async ({ page }) => {
    await page.goto('/?test=1');
    await expect(page.locator('meta[name="nightdrift-version"]')).toHaveAttribute('content', version);
    await expect(page.locator('#about-version')).toContainText(version);
    expect((await read(page)).version).toBe(version);
  });
});
