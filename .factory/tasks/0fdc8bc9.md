---
id: "0fdc8bc9"
title: "Postcard export"
status: "needs_input"
priority: 1
depends_on: []
files: ["src/postcard.ts","src/ui.ts","src/app.ts","src/scene.ts","src/test-api.ts","src/style.css","tests/postcard.test.ts","tests/e2e/postcard.spec.ts"]
acceptance: "npm run test:e2e -- tests/e2e/postcard.spec.ts"
last_acceptance: null
source_run_id: "66588ec0-11b7-4a39-a32d-7c79ca425194"
source_ref: "proposed:postcard-export"
created_at: "2026-11-03T21:36:54.055Z"
updated_at: "2026-11-03T22:47:22.614Z"
---

Canvas capture to PNG with seed and odometer stamped in a corner, downloaded or copied to clipboard.
A drive that leaves an artifact gets shown to someone else.

#

## Analysis

### What the repository actually contains

There is no application code. `C:\Users\Admin\Documents\nightdrift` holds only tool configuration (`.zcode/`, `.agents/`, `.claude/`, `.codex/`, `.mcp.json`) and the Factory records: fourteen standalone backlog tasks under `.factory/tasks/`, the goal `.factory/goals/2fd2a8ea.md`, two drafts, the saved plan `.factory/plans/035a973a.md`, and three migration backups under `.factory/backups/`. I checked explicitly for `package.json`, `index.html`, `src/`, `tests/`, `.factory/ui.json` and `.factory/architecture.md` — none exist. The plan says the same thing at line 46: "There is no application code, `package.json` or `.factory/architecture.md`."

So the Files line below is not read off existing files; it is read off the module layout that plan `035a973a` fixes for the application, checkpoint by checkpoint. That layout is a repository fact — it is written down here, with per-module ownership — but the files themselves are created by T1–T13, which are all still `backlog`. The goal file anticipates exactly this state: "The repository does not exist yet (a later run creates it), so acceptance commands that fail with 'package.json missing' or exit non-zero today are exactly right."

The module ownership I am relying on, all from `.factory/plans/035a973a.md`:

- `src/scene.ts` — T3 line 366: "Create the renderer, camera, empty scene and resize handling." The renderer, and therefore `renderer.domElement`, lives here.
- `src/app.ts` — T3/T8: lifecycle, pause, and (T8 line 438) "Connect motion to streaming" — the frame loop and the per-frame update/render call.
- `src/ui.ts` — T3 line 366 creates the Start button here, T10 line 472 adds volume/mute here, T12 line 502 completes the HUD. Controls are constructed in `ui.ts`, not declared in `index.html` (T3's file list includes `src/ui.ts` and `src/style.css` but not `index.html`, and T10 adds working volume/mute without touching `index.html` either). A new HUD control therefore belongs in `ui.ts`, and `index.html` does not change.
- `src/test-api.ts` — the `window.__nightdrift` surface, present only under `?test=1` (R9, line 297).
- `src/settings.ts` — T11: resolved seed and persisted settings.
- `src/drive.ts` — T7/T8: route, position, movement time, speed.
- Test conventions: unit specs are `tests/<topic>.test.ts` run by Vitest (`npm run test -- tests/city.test.ts`); browser specs are `tests/e2e/<topic>.spec.ts` run by Playwright against a fresh production build (`npm run test:e2e -- tests/e2e/foundation.spec.ts`). Both script names are defined by T2 — the verification-contract table at lines 254–262, implemented by T2's checkpoint at lines 344–358.

### Ordering

This task cannot start until plan `035a973a` has delivered through T12: it needs a rendering canvas (T3/T5), a resolved seed (T11), driving distance (T7/T8), a HUD to hang a control on (T12 — the completed Space handling and the New Seed control the e2e scenario below drives both land there), and the `?test=1` surface (T3/T6/T8). That ordering is real but it is not expressible on the Depends line: `depends_on` names task records, and plan `035a973a` is a peer plan, not a task, so there is no id to name. (A dependency outside the selected implementation batch is legal and simply blocks — the Factory skill: "Dependencies inside one selected batch run first and unlock their dependants; an unfinished dependency outside the batch still blocks the task" — which is what makes the non-dependency decision in "Odometer source" below a choice rather than a forced move.)

Within this batch, neither sibling is a dependency:

- **e06bde4c (Seed permalink)** changes where the seed is *carried* (query → hash), not whether a resolved seed exists. The base release already requires `?seed=` round-tripping (R1, T11). Postcard must read the resolved seed from `settings.ts`, never from `location.search` or `location.hash` — see E17 below — and with that rule the two tasks compose in either order.
- **ad546188 (Camera presets)** changes what the camera sees. Postcard captures whatever the canvas currently shows. No coupling.

The one record Postcard's wording points at, **35524bdd (Odometer and trip log)**, is deliberately not named as a dependency — see the assumption in "Odometer source" below; it resolves without one.

### Approach

Three pieces, one new module.

1. **A pure stamp module, `src/postcard.ts`.** It owns the stamp copy, layout constants and the world-unit→kilometre conversion as data, plus two small functions: `formatStamp({seed, distanceUnits})` returning the stamped string, and `stampLayout({width, height})` returning the box, font size and padding. A third function `drawStamp(ctx, text, layout)` does the actual 2D drawing. The first two are pure and node-runnable; only `drawStamp` touches a canvas context. This split is what makes `tests/postcard.test.ts` possible under Vitest in node, which has no `CanvasRenderingContext2D`.

2. **A post-render capture hook.** A WebGL canvas's drawing buffer is cleared after compositing unless the context was created with `preserveDrawingBuffer: true`. Setting that flag costs a buffer copy on *every* frame, against a release that has a measured draw-call budget (e2e check 3, "draw calls below 150") and a fixed resource contract (check 4). So do not set it. Instead: `src/scene.ts` gains `requestCapture(): Promise<HTMLCanvasElement>` which records a one-shot callback; the frame loop in `src/app.ts`, immediately after `renderer.render(...)` in the same synchronous task, drains that callback with the live canvas. `src/postcard.ts` then copies the pixels into a fresh 2D canvas (`ctx.drawImage(glCanvas, 0, 0)`), draws the stamp onto the copy, and calls `toBlob('image/png')`. The live canvas is never mutated, so the stamp never appears on screen.

3. **A HUD control and a test entry point.** `src/ui.ts` adds a labelled, keyboard-reachable Postcard button with visible focus (R7, and consistent with 64496677's later pass), plus reuse of the existing status line that T3 introduced for audio failures — the postcard failure paths report there. `src/app.ts` wires the click to: resolve seed from `settings.ts`, resolve distance from `drive.ts`, call the capture, then deliver the blob (download and/or clipboard — see Q1). `src/test-api.ts` exposes `postcard()` under `?test=1` returning `{width, height, bytes, stamp}` so the e2e spec can assert the capture deterministically without touching the filesystem or system clipboard.

### File by file

**`src/postcard.ts` (new).** Exports:
- A data constant holding stamp copy and layout rules: padding fraction, font-size fraction of canvas height, minimum font size in device pixels, text colour and shadow, maximum seed length in code points, the `UNITS_PER_KM` conversion, and the distance format (one decimal, `km` suffix). Adding a new stamped field should be an edit to this constant plus one line in `formatStamp`, not a new branch.
- `formatStamp({seed, distanceUnits}): string` — pure. Truncates the seed by code points with an ellipsis when it exceeds the maximum (never by code units, so surrogate pairs and combining sequences are not split), converts distance and formats it, joins the fields with the separator from the constant.
- `stampLayout({width, height}): {x, y, fontPx, padPx}` — pure. Derives from the backing-store dimensions, clamps `fontPx` to the floor, and clamps the box inside the canvas for small canvases.
- `drawStamp(ctx, text, layout): void` — sets font, baseline and alignment, draws a subtle shadow or backing scrim so the text stays readable over bright neon, draws the text in the corner.
- `capturePostcard(glCanvas, {seed, distanceUnits}): Promise<Blob>` — allocates a 2D canvas at `glCanvas.width × glCanvas.height`, `drawImage`s the source, calls `formatStamp`/`stampLayout`/`drawStamp`, then wraps `toBlob` in a promise that rejects when the callback is handed `null`.

**`src/scene.ts`.** Add `getCanvas(): HTMLCanvasElement` (returning `renderer.domElement`) and `requestCapture(): Promise<HTMLCanvasElement>`, storing at most one pending resolver. Add `drainCapture()`, called by the frame loop right after render, which resolves the pending resolver with the canvas and clears it. Teardown and context-loss handling are T3 obligations (line 368: "Implement WebGL fallback, context-loss feedback and application teardown"), and the renderer and its context-loss path live in this module, so rejecting any pending resolver there — at both teardown and context loss — attaches to paths T3 already creates; no promise is left hanging. The renderer construction is untouched — `preserveDrawingBuffer` stays at its default.

**`src/app.ts`.** Three changes. (a) In the frame callback, call `scene.drainCapture()` immediately after the render call, in the same task. (b) Add `takePostcard()`: guards on readiness and on an already-pending capture, reads seed from `settings.ts` and distance from the drive state, calls `scene.requestCapture()`, passes the canvas to `capturePostcard`, and delivers the blob. When the app is paused, it issues a single render-only tick before draining — rendering a frame without advancing drive, atmosphere or score time — because otherwise no `requestAnimationFrame` fires and the capture never resolves. (c) Reset (new seed) and teardown clear the pending capture and re-evaluate the button's enabled state.

**`src/ui.ts`.** Create the Postcard button with an accessible name, keyboard activation, and `aria-disabled` reflecting readiness. Route every failure to the existing status line with a specific message (clipboard refused, encoding failed, not ready yet). The button must not also fire the global Space pause handler — the plan already calls this out at line 198, "A button activation must not also trigger the global pause handler"; the existing mechanism applies unchanged.

**`src/test-api.ts`.** Add `postcard()` to the `?test=1` object: awaits `app.takePostcard()` in a capture-only mode that returns `{width, height, bytes, stamp}` rather than downloading. It must not exist on ordinary visits (R9, line 297) — the e2e spec asserts that too.

**`src/style.css`.** Button and focus-ring rules matching the existing HUD controls. No new design system.

**`tests/postcard.test.ts` (new, Vitest).** Covers `formatStamp` and `stampLayout` only — the pure logic:
- seed preserved verbatim including case and Unicode when within the limit;
- over-length seed truncated by code points with an ellipsis, never splitting a surrogate pair;
- distance conversion and one-decimal rounding, including a value that rounds up across a tenth;
- zero, negative and non-finite distance all yielding the `0.0 km` fallback rather than `NaN km`;
- layout font size scaling with height, hitting the clamp floor on a very small canvas, and the box staying inside the canvas at extreme aspect ratios.

**`tests/e2e/postcard.spec.ts` (new, Playwright, both configured browser projects).** Against the production build, with console-error and page-error listeners attached before navigation (e2e check 1):
- load `?test=1&seed=marlowe`, click Start, wait for `canvas[data-ready='true']`;
- call `window.__nightdrift.postcard()` and assert a positive `bytes`, dimensions equal to the canvas backing store, and `stamp` containing `marlowe` and a `km` figure;
- assert the delivered bytes begin with the PNG signature (`89 50 4E 47`);
- assert the captured image is not blank — the same pixel test e2e check 2 already uses, which distinguishes city geometry from a flat clear colour. This is the assertion that catches the drawing-buffer trap: capture outside the post-render window produces a transparent or cleared image and this fails.
- assert the stamp corner of the capture differs from the corresponding region of a screenshot of the live canvas — both cropped to the same canvas region and scaled to the same pixel size, with no HUD element over that corner — so a capture that silently skips `drawStamp` fails;
- pause (Space), take a postcard, assert it still succeeds and that movement time did not advance;
- change seed, take a postcard, assert the stamp carries the new seed;
- click the button twice in quick succession and assert exactly one capture is produced;
- assert `window.__nightdrift` is absent without `?test=1` and that the button is disabled before Start;
- assert no console or page errors across every scenario, including the failure paths.

### Edge cases and behaviour at each

- **E1 Drawing buffer cleared.** A WebGL canvas read outside the post-render window yields a blank image. Handled by `drainCapture()` running synchronously after `renderer.render(...)`; `preserveDrawingBuffer` is deliberately left off to protect the frame budget. The non-blank assertion in the e2e spec is the regression guard.
- **E2 Paused.** No animation frames are scheduled, so a pending capture would never resolve. The app issues one render-only tick and drains in it, without advancing drive, atmosphere or score time (the plan freezes all three on pause, line 138).
- **E3 Hidden page.** The plan pauses on visibility change. The button is not reachable while hidden, so there is no new case; but teardown and reset must still reject a pending resolver so nothing leaks.
- **E4 Before Start / before the first frame.** The button is disabled until `canvas[data-ready='true']` — the readiness contract T3 already defines for Factory capture. Reusing it means no second notion of readiness.
- **E5 Context loss.** Readiness is cleared (plan line 314: "Clear readiness during reset, context loss or failed activation"), the button goes disabled, and any pending capture rejects into the status line. No uncaught error.
- **E6 `toBlob` returns null.** The spec permits it. The promise rejects, the status line reports an encoding failure, nothing throws.
- **E7 Clipboard unsupported, refused, or insecure context.** `http://localhost` is a secure context so the Playwright preview is fine, but a LAN `http://` origin is not. Catch, report in the status line, fall back to download. R8's failure-feedback pattern requires understandable feedback, and e2e check 1 (line 274) forbids console/page errors in every scenario, so the rejection must not surface as an uncaught error.
- **E8 Transient activation lost across the await.** `toBlob` is asynchronous, and a clipboard write attempted after that hop can be rejected for a missing user gesture. The write must be initiated inside the click handler's task. If the browser still refuses, the status line says so and the download path remains available. This is a behaviour to measure in the e2e run, not to assume.
- **E9 Download filename.** Derived as `nightdrift-<sanitised seed>-<km>.png`. The seed is an arbitrary case-sensitive Unicode string (T11), so the filename copy strips path separators, control characters and leading dots, and clamps length; an empty result falls back to a fixed token. The *stamped* text keeps the original seed verbatim — sanitising is a filename concern only. The object URL is revoked after the click.
- **E10 Distance units.** The drive advances in world units (6 per second by default, line 140) while 35524bdd phrases the reading as "12.4 km". The plan fixes no metres-per-world-unit anywhere, so one `UNITS_PER_KM` constant in the stamp data owns the mapping and its value is a display default chosen at implementation at a plausible city scale (e.g. 1 unit = 1 metre); one decimal place; non-finite or negative input gives `0.0 km`.
- **E11 Long seed.** Truncated by code points with an ellipsis against the maximum in the stamp data, so a pasted paragraph cannot run the stamp off the frame.
- **E12 Device pixel ratio and canvas size.** Capture at `canvas.width`/`canvas.height` (backing store), not CSS size, so a retina capture is full resolution. Font size derives from backing-store height with a floor, so the stamp stays legible on both a 4K fullscreen canvas and a narrow window.
- **E13 Reduced motion / photosensitivity.** Nothing animates. No variant needed, unlike ad546188.
- **E14 HUD in the image.** Only the WebGL canvas is read, so DOM overlays are never captured regardless of HUD or About state. The image is the drive, not the page.
- **E15 Stamp on screen.** The stamp is drawn onto a throwaway 2D copy; the live canvas is never written to.
- **E16 Test API isolation.** `postcard()` exists only under `?test=1`, asserted both present and absent.
- **E17 Seed source.** Read the resolved seed from `settings.ts`, never from `location`. This keeps the stamp correct after a New Seed reset (which the plan requires not to reload — T12: reset "updates only the seed portion of the URL") and makes the task independent of e06bde4c moving the seed into the hash.
- **E18 Repeated clicks.** One pending capture at a time; clicks while pending are ignored. Prevents a queue of captures from a nervous double-click.
- **E19 Resource bounds.** The 2D copy is a local DOM canvas, not a three.js texture or geometry, so it does not enter the renderer counters that T13's bounded-resource regression asserts. Object URLs are revoked. Nothing is retained between captures.
- **E20 No console errors.** Every failure path reports through the status line. The e2e spec's error listeners would catch any that throws instead.

### Odometer source (assumption carried, no dependency added)

The operator writes "odometer", and there is a separate backlog record 35524bdd "Odometer and trip log" that accumulates distance per seed in localStorage and shows it on the start screen. Naming that record on the Depends line is possible — an unfinished dependency outside the selected batch blocks the task until it lands — but wrong: this task does not require it, and naming it would stall Postcard behind an unanalysed sibling. The distance for *this* drive is already derivable from live state: T7/T8 own route position and movement time, and the plan's test API already exposes "position, movement time, active/score time" (line 297). The postcard therefore stamps the current session's distance, read from the drive module through a single accessor. If 35524bdd later lands, it changes what that one accessor returns (session distance becomes the persisted per-seed total) and the postcard inherits the better number with no further edit. That is why the dependency is an assumption rather than a blocker, and why the accessor is deliberately a single call site.

### Why the Acceptance command fails before and passes after

`npm run test:e2e -- tests/e2e/postcard.spec.ts` is the command shape T2 defines for the Playwright script and that T3, T5 and T12 use for their own acceptance. Today it fails at the first step: there is no `package.json`, so npm cannot resolve the script. Once plan `035a973a` has run through T12, the script exists and the preview server builds and serves, but the named spec file still does not exist — Playwright exits non-zero when a path filter matches no tests. Only after this task creates `tests/e2e/postcard.spec.ts` and the implementation behind it does the command exit zero. Each of the spec's core assertions fails against a partial implementation: a missing button fails the click, a capture taken outside the post-render window fails the non-blank pixel check, a capture that skips the stamp fails the corner-difference check, and a seed read from the URL rather than settings fails the post-reset stamp check.

I deliberately did not use `npm run verify` here, even though this task ships both a unit test and an e2e spec and plan decision D15 steers mixed checkpoints toward `verify`. D15 works for T2, T8 and T10 because those sit inside the plan's build-up, where `verify` is already failing for other reasons. This task arrives after T13, when `verify` passes. A passing-before command proves nothing, and the rule that acceptance must fail before the work outranks the convention. The unit test in `tests/postcard.test.ts` is still gated in CI, because `verify` runs the whole Vitest suite.

## Questions

**Q1 — Download, clipboard, or both?** The operator's wording is "downloaded or copied to clipboard", which leaves the delivery mechanism open, and the two have different costs.
- **O1 Download only.** `toBlob` → object URL → synthesised anchor click → revoke. Works identically in Chrome and Firefox, no permissions, no secure-context requirement, and Playwright's download API asserts it directly in both projects. Cheapest and most testable. The user gets a file they must then attach somewhere.
- **O2 Clipboard only.** `navigator.clipboard.write` with a `ClipboardItem`. Best sharing experience — paste straight into a chat — but requires a secure context, a live user gesture across the encode hop (E8), and a permission the user can refuse. Leaves nothing behind if the paste target is wrong.
- **O3 Both**, with download as the primary control and clipboard as a secondary one (or clipboard primary with automatic download fallback on refusal). Best outcome for the stated motivation — "gets shown to someone else" — at the cost of two controls, two failure messages, and the Firefox verification gap in Q2.

**Q2 — I cannot establish how the clipboard path would be proven in the Firefox project.** I read the plan's verification contract (lines 250–301) and its Playwright configuration notes: Chrome through the `chrome` channel, Playwright's Firefox project, a dedicated preview server, seven required e2e checks run in both projects. There is no `playwright.config.ts` in the repository to inspect — no application or tooling file exists at all — so I cannot see what permissions the Firefox project is configured to grant. Playwright's clipboard permission grants are documented as Chromium-only; whether the Firefox project can be configured to read back system clipboard contents, and whether an image written there can be asserted, is not something this repository tells me. If O2 or O3 is chosen, I need to be told either (a) that clipboard delivery is asserted in the Chromium project only, with Firefox covered by the manual stock-browser smoke check that T13 already requires, or (b) that a Firefox clipboard assertion is required, in which case the mechanism for it has to come from outside this repository. Under O1 the question does not arise — the download assertion works in both projects and the Acceptance command above proves the whole task.
