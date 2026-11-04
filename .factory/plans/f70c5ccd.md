---
format: 2
id: "f70c5ccd"
title: "Make the browser test suite pass on GitHub Actions Ubuntu runners, where Firefox has no GPU, without weakening any assertion.\n\nContext: this is a Vite + TypeScript three.js app. `playwright.config.ts` defines chromium and firefox projects that run the same e2e specs (`tests/e2e/*.spec.ts`). On this"
status: "ready"
priority: 50
files: ["playwright.config.ts"]
acceptance: "node -e \"const s=require('fs').readFileSync('playwright.config.ts','utf8'); const f=s.slice(s.indexOf(\\\"name: 'firefox'\\\")); if (!/env:\\\\s*\\\\{[\\\\s\\\\S]*\\\\.\\\\.\\\\.process\\\\.env[\\\\s\\\\S]*LIBGL_ALWAYS_SOFTWARE:\\\\s*['\\\"]1['\\\"]/.test(f)) process.exit(1)\" && npm run verify"
depends_on: []
source_run_id: "4ef47bda-7f89-44b7-b218-2794df1f3641"
created_at: "2026-11-04T05:47:40.774Z"
updated_at: "2026-11-04T05:47:40.777Z"
---

Files: `playwright.config.ts`  
Acceptance: `node -e "const s=require('fs').readFileSync('playwright.config.ts','utf8'); const f=s.slice(s.indexOf(\"name: 'firefox'\")); if (!/env:\\s*\\{[\\s\\S]*\\.\\.\\.process\\.env[\\s\\S]*LIBGL_ALWAYS_SOFTWARE:\\s*['\"]1['\"]/.test(f)) process.exit(1)" && npm run verify`

The fix belongs in the Firefox project’s `launchOptions`: preserve the child environment, force Mesa software rendering, and retain Firefox’s existing WebGL enablement prefs. Playwright officially supports per-project `launchOptions.env` and `firefoxUserPrefs`. [Playwright BrowserType documentation](https://playwright.dev/docs/api/class-browsertype)

No workflow, README, test, assertion, or test-selection changes are needed. The existing GitHub Actions `Verify` step remains the Ubuntu proof; local `npm run verify` covers lint, typecheck, unit tests, build, e2e, and size.

### Requirements

- R1: Firefox on Ubuntu must expose a real WebGL 2 context through software rendering.
- R2: All existing e2e tests and assertions remain unchanged, including the documented WebGL fallback test.
- R3: `npm run test:e2e` must continue passing the same local test set.
- R4: Only `playwright.config.ts` is changed unless Ubuntu evidence proves software WebGL genuinely cannot be enabled.
- R5: Local `npm run verify` passes before completion.
- R6: The existing CI workflow remains unchanged.

### Decisions

- Use Firefox-only `launchOptions.env`, spreading `process.env` so `PATH` and browser runtime variables are preserved.
- Set `LIBGL_ALWAYS_SOFTWARE=1`; keep `webgl.disabled: false` and `webgl.force-enabled: true`.
- Do not add conditional skips or weaken expectations. If Ubuntu proves this route impossible, only then add the smallest conditional fallback coverage to the affected specs.

### Current position

The repository already has Chrome software-WebGL handling and Firefox WebGL prefs. Firefox lacks only the software-rendering launch environment. The current local suite is green, so the acceptance command includes a configuration guard that fails before the change, followed by the required full verification.

<!-- factory:task -->
---
id: "3b02c57d"
title: "Enable Firefox software WebGL through Playwright"
status: "ready"
priority: 50
depends_on: []
files: ["playwright.config.ts"]
acceptance: "node -e \"const s=require('fs').readFileSync('playwright.config.ts','utf8'); const f=s.slice(s.indexOf(\\\"name: 'firefox'\\\")); if (!/env:\\\\s*\\\\{[\\\\s\\\\S]*\\\\.\\\\.\\\\.process\\\\.env[\\\\s\\\\S]*LIBGL_ALWAYS_SOFTWARE:\\\\s*['\\\"]1['\\\"]/.test(f)) process.exit(1)\" && npm run verify"
last_acceptance: null
source_run_id: "4ef47bda-7f89-44b7-b218-2794df1f3641"
source_ref: "T1"
created_at: "2026-11-04T05:47:40.776Z"
updated_at: "2026-11-04T05:47:40.776Z"
---

Extend the Firefox project’s existing `launchOptions` with `env: { ...process.env, LIBGL_ALWAYS_SOFTWARE: '1' }`, preserving the current `firefoxUserPrefs` values for enabled WebGL and forced blocklist bypass. Keep the existing worker configuration and all unrelated edits intact. Do not modify `.github/workflows/ci.yml`, `README.md`, or any e2e spec. Run the acceptance command locally, then confirm the existing GitHub Actions `Verify` job passes on `ubuntu-latest`; if software WebGL still cannot be created there, only then revise the six affected WebGL-dependent tests using the goal’s documented fallback without removing or weakening assertions.

Skipped: workflow, README, and spec edits unless CI proves the config-only route insufficient.  
Risk: Windows verification cannot prove Ubuntu’s Firefox/Mesa behavior; the GitHub Actions run is the final Linux evidence.
<!-- /factory:task -->
