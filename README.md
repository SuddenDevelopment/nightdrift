# Nightdrift

An endless, slow night drive through a procedurally generated city, with a
generative ambient score. No backend, no external runtime assets: geometry,
textures and sound are generated in code.

## Requirements

- Node 24 (`>=24.0.0 <25`, enforced by `engines` in `package.json`)
- Desktop Chrome and Firefox for the browser checks

## Setup

```sh
npm ci                                   # locked install
npx playwright install chrome firefox    # browsers for the e2e projects
npm run dev                              # http://localhost:5173
```

On Linux add system libraries with `npx playwright install --with-deps chrome firefox`.

## Quality scripts

| Script | What it does |
| --- | --- |
| `npm run lint` | ESLint over application code, configuration, scripts and tests. |
| `npm run typecheck` | `tsc --noEmit` over `src`, `tests`, `scripts` and the TypeScript configs. |
| `npm run test` | Vitest once over `tests/**/*.test.ts`. |
| `npm run build` | Vite production build into `dist/`. |
| `npm run test:e2e` | Playwright over `tests/e2e/**/*.spec.ts` against a freshly built preview. |
| `npm run size` | Bundle budget gate (see below). |
| `npm run verify` | All six above, in that order, stopping at the first failure. |

Run one file: `npm run test -- tests/tooling.test.ts`,
`npm run test:e2e -- tests/e2e/tooling.spec.ts`.

Unit and browser tests never overlap: Vitest only collects `tests/**/*.test.ts`
and explicitly excludes `tests/e2e`, while Playwright's `testDir` is
`tests/e2e` with `testMatch` `**/*.spec.ts`.

## Bundle budget

`npm run size` sums the gzipped size of **every** emitted JavaScript file in
`dist/` — entry, vendor and lazy chunks alike — and requires the total to be
strictly below 300,000 bytes. Missing output, or output with no JavaScript,
fails. Runtime dependencies must not be moved to a CDN to dodge the
measurement.

## Browser coverage

`playwright.config.ts` defines two projects:

- **chrome** — the real Chrome release via `channel: 'chrome'`, launched with
  `--enable-unsafe-swiftshader` so a WebGL 2 context exists on machines with no
  usable GPU.
- **firefox** — Playwright's bundled Firefox, with `webgl.force-enabled` so the
  same holds there.

Record the versions actually used with `npx playwright --version` and the
browser's own `--version`; CI prints both before running `verify`. Automated
Firefox evidence does **not** replace a manual smoke check against the current
stock Firefox release before a release is accepted — the bundled build can lag
or differ from what users run. Do the same for stock Chrome.

## Process cleanup

Playwright owns its preview server. `webServer` builds first (so a targeted run
can never inspect stale `dist/` output), binds port 4173 with `--strictPort`,
and sets `reuseExistingServer: false` so the run refuses to attach to a server
it did not start and fails loudly if the port is busy. Playwright stops what it
started when the run ends. If a stray server survives a hard kill, free the port
before re-running:

```sh
npx kill-port 4173            # or: Get-NetTCPConnection -LocalPort 4173
```

`npm run verify` builds twice — once directly, once inside the Playwright web
server — which is accepted in exchange for that guarantee.

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests. It
installs locked dependencies with `npm ci`, installs Chrome and Firefox with
their system dependencies, records browser versions, runs `npm run verify`, and
uploads `playwright-report/` and `test-results/` when the run fails.
