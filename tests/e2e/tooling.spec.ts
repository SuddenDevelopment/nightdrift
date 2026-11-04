import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

test('serves the production build', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok(), 'the preview server must serve the built page').toBe(true);
  await expect(page).toHaveTitle(/Nightdrift/);
  // A served production build has its module entry rewritten to a hashed asset.
  const entry = await page.locator('script[type="module"]').first().getAttribute('src');
  expect(entry).toMatch(/^\/assets\/.+\.js$/);
});

test('injects the package version into the page', async ({ page }) => {
  await page.goto('/');
  const meta = page.locator('meta[name="nightdrift-version"]');
  await expect(meta).toHaveAttribute('content', version);
});

test('provides a real WebGL 2 context', async ({ page }) => {
  await page.goto('/');
  const report = await page.evaluate(() => {
    const context = document.createElement('canvas').getContext('webgl2');
    if (!context) return { ok: false, renderer: null };
    return { ok: true, renderer: context.getParameter(context.RENDERER) as string };
  });
  expect(report.ok, 'this browser project must expose WebGL 2').toBe(true);
  expect(report.renderer).toBeTruthy();
});

test('loads no external runtime resources', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== 'localhost' && url.protocol !== 'data:') external.push(request.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});
