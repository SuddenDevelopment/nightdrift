import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Every scenario holds a live WebGL 2 context and an unthrottled render loop,
  // in two browsers, against one single-threaded preview server. Playwright's
  // default (half the CPU count) starved that server often enough that a page
  // load dropped its module script and the app never mounted. Two at a time
  // keeps the suite deterministic.
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        // Allows a software WebGL 2 context when no GPU is available.
        launchOptions: { args: ['--enable-unsafe-swiftshader'] },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          env: { ...process.env, LIBGL_ALWAYS_SOFTWARE: '1' },
          firefoxUserPrefs: { 'webgl.disabled': false, 'webgl.force-enabled': true },
        },
      },
    },
  ],
  // Builds first so a targeted run can never inspect stale output, owns a
  // strict port, and refuses to attach to a server it did not start.
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
