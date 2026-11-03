I read the goal, the saved draft, the 14 backlog task records, the global AGENTS.md, and the Factory screenshot runner. Findings that changed the document are in **Decisions and changes**; the main one is that the strong reading of "never repeats exactly" is provably impossible, so the plan builds and proves the only satisfiable reading rather than blocking on it.

---

# Nightdrift v0.1.0 — First drive

## Plan

Nightdrift is a browser toy: an endless, slow night drive through a procedurally generated city, accompanied by generative ambient music. Opening the page shows a start screen. Pressing Start begins the drive and unlocks sound. The same seed recreates the same city and the same score.

This release adds the complete experience using Vite, TypeScript, three.js and the Web Audio API. It has no backend and loads no external runtime assets. Geometry, textures and sound are generated in code.

The workspace contains the original goal (`.factory/goals/2fd2a8ea.md`), a saved PRD draft (`.factory/drafts/2fd2a8ea-plan.md`) and fourteen backlog task records, all with `status: "backlog"` and none belonging to v0.1.0. There is no application code, no `package.json` and no `.factory/architecture.md`. This revision preserves the draft's T1–T13 checkpoints and their phase membership. No checkpoint has recorded completion, and no existing eight-character task ID covers this plan's work.

Follow the existing [AGENTS.md](C:/Users/Admin/AGENTS.md): deterministic functions over heuristics, rules in shared data rather than branches, minimal dependencies, fewest files, and explicit teardown of anything started for verification. Do not create a separate constitution.

### Requirements

| ID | Required behaviour |
|---|---|
| R1 | **Seeded experience.** `?seed=nightdrive` recreates identical city descriptors and score events across reloads, independent of chunk generation order and frame rate. A missing or empty seed generates one and writes it into the URL. |
| R2 | **Infinite city.** Instanced buildings have varied heights and lit windows, with streets between blocks. Chunks stream in ahead of the camera and are disposed behind it. Chunk boundaries have no gaps, including at negative coordinates. Revisiting coordinates recreates the same buildings. Resident city resources stay bounded. |
| R3 | **Drift camera.** The camera glides slowly along avenues, turns smoothly at intersections and never clips through buildings. Space and the pause control pause and resume without jumping forward. |
| R4 | **Atmosphere and comfort.** A night sky gradient, distance fog, emissive windows and street lights establish the mood. A slow time-of-day cycle runs from dusk through night. Reduced motion lowers speed and turn rate with no sudden turns. |
| R5 | **Generative music.** A pad, slow arpeggio and low city hum form an ambient score that never repeats exactly and always fits the mood. The score is a pure function from seed and time to note events, separate from the audio graph. |
| R6 | **Audio lifecycle.** Sound starts only after Start. The audio context runs after that gesture. Volume changes output, and mute silences every layer while retaining the chosen volume. Pause, resume and seed changes do not duplicate voices or leave old sound running. |
| R7 | **Interface.** A start screen and a minimal HUD with pause, volume/mute, time of day, new seed and fullscreen. Volume and mute are remembered in localStorage. An About panel shows the version. Controls have labels, keyboard access and visible focus. |
| R8 | **Failure handling.** Unavailable WebGL produces a readable fallback. Storage failure does not prevent driving. Audio or fullscreen rejection produces understandable feedback with no uncaught error. |
| R9 | **Diagnostics and identity.** `?debug=1` shows FPS and draw calls. `?test=1` exposes `window.__nightdrift` with renderer statistics and a simulated driving speed. Ordinary visits expose no test API. About and `<meta name="nightdrift-version">` use the version from `package.json`. |
| R10 | **Delivery.** The production build works in current desktop Chrome and Firefox. All required quality scripts exist. The main application bundle is below 300 KB gzipped. Factory captures the experience after Start, its first frame and audio unlock. Overall acceptance is `npm run verify`. |

### Behaviour examples

- **Same seed, same drive.** Load `?seed=marlowe`, drive one minute, reload. The same buildings appear at the same coordinates and the same chord arrives at the same score time. Reloading with `?seed=Marlowe` gives a different city: seeds are case-sensitive.
- **Chunk seam.** Driving north across the boundary between chunk `(0,0)` and `(0,1)` shows one continuous road surface and no visible gap, kerb step or missing block corner. The same holds crossing into `(0,-1)`.
- **Turn clearance.** Approaching an intersection, the camera follows a curve that stays inside the road area. At no frame of the curve does the camera position, or its near plane, lie inside a building volume.
- **Pause.** Pressing Space, waiting ten seconds, pressing Space again: the camera resumes from where it stopped, the sky is at the same point in its cycle, and the score continues from the same bar — it does not fast-forward ten seconds of music.
- **Mute.** Mute during a drive: the analyser after the master gain reads silence within the ramp time. The volume slider keeps its position. Unmute restores the previous level.
- **Failure case — WebGL off.** With WebGL context acquisition unavailable, the page shows readable fallback text explaining what is wrong and what to try. There is no uncaught exception and no blank page.
- **Failure case — storage denied.** With localStorage throwing on read and write, Start still works, the HUD still works, and settings simply do not persist across reload.
- **Failure case — audio blocked.** If `AudioContext` creation or resume is rejected, the visual drive continues and the HUD shows a sound status with a retry control.

### Scope and exclusions

Delivery remains in five phases:

1. **Foundation** — tooling, CI, empty scene, quality gates, Factory capture.
2. **City** — deterministic generation, rendering, streaming.
3. **Drive & atmosphere** — safe movement, comfort preferences, lighting.
4. **Sound** — pure score generation and audio playback.
5. **Interface** — settings, HUD, complete verification.

The fourteen backlog records (traffic, weather, districts, tunnels, signage, radio, mixer, camera presets, postcards, parking, odometer, seed permalink, adaptive quality, accessibility pass) stay separate. This plan neither implements nor deletes them. Basic seed URLs, keyboard access and reduced motion are required here despite overlapping with `e06bde4c` and `64496677`.

Not required: UI framework, physics engine, audio library, account system, asset service, service worker, deployment integration. Use system fonts. Bloom, reflections and real-time shadows are not needed for the requested atmosphere.

### Approach

#### Deterministic seed and world data

Treat the first `seed` query value as a case-sensitive string, preserved through URL encoding. Use nondeterministic randomness only when choosing a new seed.

Derive independent deterministic streams for city generation, route decisions and musical parameters from one seed hash. A chunk depends on the seed and its integer coordinates, never on the order chunks were requested. Musical events depend on absolute score position, never on scheduler polling order.

Test with structured fixtures, shuffled generation order, and representative *different* seeds as well as identical ones, so a constant generator cannot pass.

#### City layout, streaming and rendering

Keep chunk size, road width, building setbacks and intersection dimensions in one shared data definition. Use half-open ownership at boundaries so no feature is generated twice. Buildings stay inside block interiors; roads connect across adjacent chunks.

Hold a 5 × 5 chunk neighbourhood around the camera, which covers travel in every direction. Create entering chunks before the next render and evict outgoing chunks in the same update. Keep the visible distance inside the loaded region using fog and the camera far plane.

**Render from fixed shared instance pools, not per-chunk meshes.** Create one `InstancedMesh` per visual kind — building shells, windows, road surface, kerbs, street lights — each sized for the worst-case 5 × 5 neighbourhood. A chunk allocates a slice of each pool, writes its instance matrices, and returns the slice on eviction. [three.js InstancedMesh documentation](https://threejs.org/docs/pages/InstancedMesh.html)

This single choice satisfies three budgets at once: draw calls become a small constant (roughly 6–10 including the sky, far under 150), geometry and texture counts never change after startup, and eviction allocates and frees nothing on the GPU. Measure the budget from real rendered frames regardless; instancing is an argument, not evidence.

Pool slices are the chunk-owned resource. Shared geometries, materials and generated textures live from startup to teardown, where they are disposed explicitly. Removing objects from the scene does not release GPU resources, and disposing a material does not dispose its textures. [three.js disposal guidance](https://threejs.org/manual/pages/how-to-dispose-of-objects.html)

Keep absolute chunk coordinates separate from local rendering coordinates, and rebase the rendering origin during travel so floating-point error does not grow with distance.

#### Camera, pause and atmosphere

Use a deterministic route generator with a bounded queue of upcoming road segments. Build intersection curves inside the road area with clearance for the camera's near plane. Constructing safe paths avoids adding a physics engine or collision recovery.

Advance on elapsed active time, not frame counts or wall-clock time. Pause freezes movement, atmosphere and score position; resume continues from that position without replaying elapsed wall-clock time. Hiding the page pauses it, and returning leaves it paused until the user resumes.

Initial tuning values: 6 world units per second, halved under reduced motion, with turns traversed more slowly rather than removed from the route. Ease the change if the preference flips mid-drive. Detect it with `prefers-reduced-motion`. [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)

Use a continuous 20-minute dusk–night–dusk cycle with no daylight phase and no discontinuity at the wrap. The HUD reads the same state the renderer uses. These are implementation defaults, not recorded operator decisions.

#### Music: what "never repeats exactly" can mean, and how it is met

R5 keeps the operator's wording. The previous draft's substitute ("no fixed short soundtrack loop", with short-horizon regression tests) is withdrawn and must not return.

Two readings exist, and one of them is impossible:

- **(a) No finite passage ever recurs.** Unsatisfiable by any score, not merely by this one. The audible score draws its events from a finite set of pitches, durations and timbres. Over a finite alphabet, some symbol occurs infinitely often, so a one-event passage recurs; by pigeonhole the same holds for passages of any fixed length. Avoiding it would require encoding the difference in continuously varying values too small to hear, which is the inaudible-metadata dodge this plan rejects.
- **(b) The score never becomes periodic — it never settles into a loop, at any loop length, from any point onward.** Satisfiable, provable, and what a listener means by "it never repeats".

The plan is built to reading (b), stated here so the operator can overrule it rather than discover it later (Q1). This is not a weakening: (a) is refused by mathematics, not by effort, and (b) is delivered with an argument rather than with a short listening test.

Construction for T9:

1. Derive each phrase's control symbol from the Thue–Morse sequence at absolute phrase index *n*: `t(n) = parity of the number of 1-bits in n`, combined with the seed. The Thue–Morse sequence is not ultimately periodic. [Allouche and Shallit, *The ubiquitous Prouhet–Thue–Morse sequence*, §4](https://cs.uwaterloo.ca/~shallit/Papers/ubiq15.pdf)
2. Map the symbol to two audibly distinct, harmonically compatible phrase treatments — for instance two pad voicings, or two arpeggio contours over the same chord — chosen so both fit the mood.
3. Make that mapping injective on audible event parameters: the two treatments must differ in emitted note events, not only in event IDs or timestamps.
4. The argument follows: if the emitted score were ultimately periodic with period *p* phrases, the phrase treatments would be ultimately periodic with period *p*; injectivity would make the Thue–Morse sequence ultimately periodic, which it is not.

Each step is a unit test: correctness of `t(n)` against an independently computed reference over a large index range, injectivity of the mapping on audible parameters, and agreement between `t(n)` and the events actually emitted for phrase *n*. Together they are the evidence; the argument itself lives as a comment block at the top of `src/score.ts` beside the code it describes.

A plain `number` phrase index is sufficient. At one phrase per eight seconds, `Number.MAX_SAFE_INTEGER` is reached after more than two billion years of continuous driving, so `BigInt` and its `Number` round-trip precision hazards are not needed. The index is asserted to stay integral and safe; the test exercises values near that bound.

#### Pure score and audio graph

Represent the score as a pure interval query over seed and musical time. Onsets fall in half-open intervals, and adjacent interval results concatenate to the same onsets as one combined interval. Supply sustained-note state separately so resuming inside a note does not duplicate its onset.

Keep harmony, instrument parameters and duration rules in data. Synthesize pad, arpeggio and hum without downloaded samples; any generated noise uses a deterministic source.

Create or resume the AudioContext directly inside the Start gesture, before awaiting anything else. Foundation provides a silent unlocked graph; Sound adds instruments. [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)

Use a short scheduling horizon, bounded voices and explicit stop/disconnect. Pause silences playback and freezes score position; resume reconstructs sustained notes from that position rather than replaying missed events. Route every layer and effect through one final master gain, with short ramps for mute, volume and stop. If activation fails, the drive continues with a visible audio status and a retry; the normal acceptance path still requires successful activation.

#### Interface and failure behaviour

New seed resets city, route, atmosphere and score to time zero while preserving volume, mute and whether the drive was running or paused. It updates only the `seed` query value and leaves other parameters alone.

Persist volume and mute in one versioned localStorage record. Validate types and ranges, survive malformed JSON, and catch read and write failures. Do not persist fullscreen, autoplay permission or an active session.

Space toggles pause when focus is on the page or the scene. Native controls keep their own keyboard behaviour: a focused button or slider must not also fire the global action. About supports Escape and returns focus to its opener.

Fullscreen runs from a user gesture, reflects actual fullscreen state and handles rejection. WebGL initialization failure shows the fallback with recovery advice. Context loss stops the experience and offers a reload.

Current three.js `WebGLRenderer` requires WebGL 2, so a browser exposing only WebGL 1 receives the fallback. [three.js WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html)

#### Version and shared files

Set `package.json` to `0.1.0`. Read that version in the Vite config and inject it into both the HTML meta marker and the About value. Do not keep a second handwritten version string.

Files: `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `playwright.config.ts`, `.gitignore`, `.github/workflows/ci.yml`, `.factory/ui.json`, `src/`, `tests/`, `scripts/size.mjs`, `README.md`.

Each checkpoint narrows this scope. Backlog records stay unchanged.

Acceptance: `npm run verify`

#### Risks

- **R-a Bundle size.** three.js core dominates the 300 KB gzipped budget. Mitigate by importing named modules only, no examples/ add-ons, no post-processing. If the budget is exceeded, cut features rather than raise the limit or move code into an uncounted chunk.
- **R-b Instance pool capacity.** Pools are sized for the worst-case neighbourhood. An underestimate drops buildings silently. T6 asserts that allocation never exceeds capacity and fails loudly if it does.
- **R-c Headless rendering in CI.** Draw-call and pixel checks need a working WebGL 2 context in both Playwright browsers. T2 confirms this early, in Foundation, rather than at T13.

### Decisions and changes

The operator's stack, five phases, features, quality scripts, budgets, Factory capture contract and overall acceptance command are unchanged. T1–T13 and their phase membership are preserved, with no completed work claimed.

| ID | Change and reason |
|---|---|
| D1 | **R5 keeps the operator's wording.** The earlier short-loop substitute is removed and must not be reintroduced. |
| D2 | **The strong reading of R5 is impossible, so the plan builds the satisfiable one.** The previous revision left R5 unresolved and blocked T9, Sound and release on an operator answer. That stalls the plan over a pigeonhole argument: a score with finitely many audible events must repeat *some* finite passage. The plan therefore delivers non-periodicity with a stated proof, and T9 is not blocked. Q1 records the reading for the operator to overrule. |
| D3 | **Thue–Morse control with an injective audible mapping** replaces "investigate a candidate construction". The property is proved by the construction and checked by three unit tests. |
| D4 | **`docs/score-design.md` is dropped**; the argument lives in a comment at the top of `src/score.ts`, where tests verify the code it describes. A document-presence assertion is not evidence, and a separate file drifts from the code. |
| D5 | **`BigInt` is dropped** from the score. A safe-integer phrase index covers over two billion years of driving; the test exercises the bound. |
| D6 | **Shared instance pools replace per-chunk meshes.** Draw calls become a small constant, geometry and texture counts are fixed after startup, and eviction performs no GPU allocation. This also simplifies disposal to slice accounting plus one teardown. |
| D7 | **The "at most 100 chunk-owned scene meshes" ceiling is removed** — D6 makes per-chunk meshes nonexistent. It is replaced by pool-slice accounting and a constant-after-startup check on geometry and texture counts. |
| D8 | **Internal resource ceilings are plan defaults, not operator numbers.** 25 resident chunks is fixed by the 5 × 5 neighbourhood. The geometry and texture caps may be set once in T6 to the real post-startup values; what is verified is that they do not grow during the drive. The draw-call limit of 150 is the operator's and does not move. |
| D9 | **Factory capture failures are quiet.** The screenshot runner logs `could not click <selector>` and photographs the page as it stands ([ui-screenshots.mjs:338-347](C:/Users/Admin/Documents/factory/scripts/ui-screenshots.mjs#L338)). A missing readiness selector therefore yields a start-screen screenshot, not a failed run. T3 asserts the selectors in the e2e suite, where failure is visible. |
| D10 | **T4 depends on T2, not T1,** because its acceptance command needs the Vitest tooling T2 establishes. |
| D11 | **Behaviour examples and a risk list were added**; several passages of the previous revision's prose about what does not constitute proof were compressed, since the verification contract already states the rules once. |

No operator answers were supplied with this run; the `{{input.answers}}` placeholder resolved to nothing.

### Verification contract

Every acceptance command below is a planned deliverable and fails in today's workspace because `package.json` and the application are absent. This baseline comes from inspection; no command was run during this read-only pass.

| Script | Required behaviour |
|---|---|
| `lint` | ESLint over application code, configuration, scripts and tests. |
| `typecheck` | `tsc` without emitting application files. |
| `test` | Vitest once, including city and score determinism, streaming and disposal. A missing selected test fails. |
| `build` | Vite production build. |
| `test:e2e` | Playwright against a fresh production build served locally. |
| `size` | Fails unless application JavaScript is strictly below 300,000 gzipped bytes. |
| `verify` | lint, typecheck, test, build, test:e2e, size — in that order, stopping on failure. |

The size checker uses Node's filesystem and gzip APIs and counts every emitted application JavaScript file, including three.js and split chunks, once each. The limit may not be evaded through an uncounted vendor bundle, a lazy chunk or a CDN. Missing output fails. Unit tests cover missing output, split bundles and both sides of the threshold.

Playwright owns a Vite preview process on a strict dedicated port, refuses an existing server, and tears the process down afterwards. Its server command builds first, so per-task acceptance never inspects stale output; the repeated build inside `verify` is accepted. Vite preview serves production output locally and is not a hosting service. [Vite preview](https://vite.dev/guide/static-deploy.html), [Playwright web server](https://playwright.dev/docs/test-webserver)

Configure Chrome stable through the `chrome` channel plus Playwright Firefox, and record both versions. Playwright ships its own Firefox build, so keep a release smoke check in current stock Firefox rather than claiming the binaries are identical. [Playwright browsers](https://playwright.dev/docs/browsers)

The production e2e suite retains all seven required checks:

1. **No console errors.** Attach console-error and page-error listeners before navigation and keep them for the whole scenario. Do not suppress application failures.
2. **Non-blank canvas after Start.** Inspect real canvas screenshot pixels and require rendered city content — not merely a canvas element, nonzero dimensions, a readiness flag, or a sky gradient.
3. **Draw calls below 150.** Sample completed frames throughout driving, including turns and chunk changes. Require a positive count and a maximum below 150.
4. **Bounded geometries and textures after two simulated minutes.** Drive 120 simulated seconds through the real update and render loop, proving chunks were both created and evicted. Check intermediate samples as well as the final one.
5. **Running audio, silent mute.** After a real Start click, require a running context and measurable signal. After mute settles, require silence; unmute restores signal. Measure after the final master gain so every layer and effect is included. [MDN getFloatTimeDomainData](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData)
6. **WebGL fallback.** Disable WebGL context acquisition before application code runs, then verify readable fallback text and no uncaught error. Do not call a test-only fallback shortcut.
7. **Version match.** Compare the built meta marker and the About text with `package.json`.

Resource ceilings enforced at rendered checkpoints:

- At most 25 resident chunks.
- Geometry and texture counts constant after startup, at or below the values recorded in the shared limits data.
- Every allocated instance-pool slice returned on eviction; allocation never exceeds pool capacity.
- No retained evicted-chunk records and no growing route or event history.

Keep these limits in one shared data definition. Disposal tests also cover slice ownership and repeated load/evict cycles. Renderer counters are resource counts, not memory measurements, and do not by themselves prove the absence of CPU-side or instance-buffer leaks.

Use fixed seeds covering straight travel, both turn directions, negative coordinates and revisits. Accelerated driving processes bounded steps and renders intermediate states rather than teleporting to the endpoint.

`window.__nightdrift` exists only under `?test=1` and exposes real renderer counters, frame count, resident chunks, creation and eviction counts, drive time and position, audio state and output level. Its simulated-speed control accelerates driving only; score scheduling stays on normal audio time, and audio tests run at normal speed. `?debug=1` alone exposes no test controls.

Further tests cover pause and resume, reduced motion, seams, camera clearance, storage failure, seed reset, scheduler cleanup and keyboard behaviour.

**On R5 evidence:** the T9 tests verify that the implementation matches the construction in D3. The non-periodicity claim rests on that construction plus the Thue–Morse result, not on any finite sample. Do not substitute a short uniqueness sample, unique event IDs, a skipped test or a document-presence assertion.

### Factory screenshots

Foundation writes `.factory/ui.json`:

- `url`: `http://localhost:5173`
- `start`: `npm run dev -- --port 5173 --strictPort`
- `routes`: `["/"]`
- `click`: `{"/":["#start","canvas[data-ready='true']"]}`

The first click starts the experience and unlocks audio. The second is an inert canvas click whose selector only matches after a rendered frame and a successful audio unlock, so it acts as the readiness wait before the shutter.

Factory supports route-keyed click arrays and waits 600 ms after each click, which is not itself proof of readiness — hence the readiness selector. A click that never resolves is logged and the page is photographed anyway, so the selectors are additionally asserted in the e2e suite where failure is loud. [Factory screenshot implementation](C:/Users/Admin/Documents/factory/scripts/ui-screenshots.mjs#L315)

Foundation unlocks a silent context; Sound adds instruments without changing this contract. Screenshots establish appearance, audio tests establish audio behaviour.

### Current position

Reviewed: the goal, the saved draft, all fourteen backlog records, the applicable AGENTS.md, the Factory screenshot runner, and the cited platform documentation. No application code, no build and no acceptance result exists.

The first fidelity review rejected the original draft for weakening R5. The following revision restored the wording but blocked T9, Sound and release on an operator ruling. This revision keeps the wording, establishes that the strong reading is unsatisfiable by any score, specifies a construction that delivers and proves the satisfiable reading, and unblocks T9. Nothing is deferred to the operator before implementation can start.

Foundation is the next implementable phase after approval. No files or Factory state were changed during this review.

## Implementation tasks

All checkpoints are required and keep their existing phase membership. Each has exactly one acceptance command that fails today. Dependencies name real prerequisites; phase order is the requested delivery sequence.

## Foundation

### T1 Bootstrap the application and production build

Requirements: R10
Depends: none
Files: `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `src/main.ts`, `src/style.css`, `src/env.d.ts`

Create the smallest Vite + TypeScript application with three.js, package version `0.1.0`, a root page and a production build. Pin compatible dependencies in the lockfile and declare the supported Node version. Establish package-version injection for both HTML and application code.

Acceptance: `npm run build`

### T2 Establish quality scripts and CI

Requirements: R10
Depends: T1
Files: `package.json`, `package-lock.json`, `eslint.config.js`, `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`, `scripts/size.mjs`, `tests/tooling.test.ts`, `.github/workflows/ci.yml`, `README.md`

Implement all seven scripts and their fail-fast order. Configure Vitest and the production-preview Playwright projects for Chrome stable and Playwright Firefox, and confirm both get a working WebGL 2 context headlessly (risk R-c). Add size-check tests for missing output, split bundles and both sides of the threshold.

CI installs dependencies and browsers, runs `npm run verify`, and keeps failure diagnostics. Document setup, process cleanup and the difference between automated Firefox and the stock-browser smoke check.

No placeholder passing tests, no `passWithNoTests`.

Acceptance: `npm run test -- tests/tooling.test.ts`

### T3 Add the empty scene, Start lifecycle and Factory capture

Requirements: R6, R8, R9, R10
Depends: T2
Files: `src/main.ts`, `src/app.ts`, `src/scene.ts`, `src/audio.ts`, `src/test-api.ts`, `src/env.d.ts`, `src/style.css`, `.factory/ui.json`, `tests/e2e/foundation.spec.ts`

Create the renderer, camera, empty scene and resize handling. Add an accessible Start button that creates or resumes a silent AudioContext directly in its gesture. Prevent duplicate initialization.

Implement the WebGL fallback, context-loss feedback and teardown. Add initial renderer statistics under `?test=1`, the built version meta marker, and the `canvas[data-ready='true']` readiness attribute set only after a rendered frame and a successful audio unlock.

Test Start, the silent running context, the disabled-WebGL fallback, resize, absence of the test API in normal mode, the meta version, and both Factory selectors. City adds the non-blank scene check.

Acceptance: `npm run test:e2e -- tests/e2e/foundation.spec.ts`

## City

### T4 Generate deterministic chunks and a shared road grid

Requirements: R1, R2
Depends: T2
Files: `src/random.ts`, `src/city.ts`, `tests/city.test.ts`

Implement seed derivation and pure chunk descriptors. Keep layout rules — chunk size, road width, setbacks, intersection dimensions — in one shared data definition. Include varied building dimensions and deterministic window parameters.

Test equal seeds, representative different seeds, shuffled generation order, negative coordinates, half-open boundary ownership, street continuity across boundaries, and building setbacks.

Acceptance: `npm run test -- tests/city.test.ts`

### T5 Render instanced buildings, windows and streets

Requirements: R2, R4
Depends: T3, T4
Files: `src/city-renderer.ts`, `src/scene.ts`, `src/app.ts`, `tests/e2e/city.spec.ts`

Build the fixed shared instance pools (building shells, windows, road, kerbs, street lights), sized for the worst-case 5 × 5 neighbourhood, and write one chunk's instances into allocated slices. Generate window appearance in code; provide street-light geometry. Stay within the draw-call budget with no shadows and no post-processing.

Test real city pixels after Start, visible building variation, boundary views, correct instance bounds, and draw calls below 150.

Acceptance: `npm run test:e2e -- tests/e2e/city.spec.ts`

### T6 Stream chunks and release owned resources

Requirements: R2, R9
Depends: T5
Files: `src/streaming.ts`, `src/city-renderer.ts`, `src/app.ts`, `src/test-api.ts`, `tests/streaming.test.ts`

Maintain the bounded neighbourhood: allocate and fill incoming chunk slices before the next render, free outgoing slices in the same update. Shared pools, geometries, materials and textures live until teardown, where they are disposed once. Add absolute chunk coordinates and local-origin rebasing. Record the real post-startup geometry and texture counts in the shared limits data (D8), and fail loudly if pool capacity is ever exceeded (risk R-b).

Test repeated crossings, negative coordinates, revisits, resident-record bounds, exactly-once slice release, no release of shared resources while chunks are resident, teardown disposal, and rebasing that does not change city identity. Expose real lifecycle counters for integration checks.

Acceptance: `npm run test -- tests/streaming.test.ts`

## Drive & atmosphere

### T7 Build a deterministic road-following camera

Requirements: R1, R3, R4
Depends: T4
Files: `src/drive.ts`, `tests/drive.test.ts`

Generate a bounded queue of upcoming road segments and smooth intersection curves from the shared grid. Implement elapsed-time advancement, pause and speed handling.

Test straight travel, left and right turns, frame-step independence, paused time, segment transitions, and clearance throughout curves including the near plane. Verify that reduced speed lowers angular velocity without changing route decisions.

Acceptance: `npm run test -- tests/drive.test.ts`

### T8 Integrate the drive, comfort preferences and atmosphere

Requirements: R2, R3, R4, R9
Depends: T6, T7
Files: `src/app.ts`, `src/scene.ts`, `src/drive.ts`, `src/atmosphere.ts`, `src/test-api.ts`, `tests/atmosphere.test.ts`, `tests/e2e/drive.spec.ts`

Connect camera motion to streaming. Add the sky gradient, fog, the 20-minute dusk–night–dusk cycle and street-light appearance. Implement pause, visibility pause and live reduced-motion preference changes.

Complete the simulated driving speed in the test API. Unit-test cycle continuity across the wrap and colour ranges. E2e-test movement, turns, pause and resume without jumps, reduced motion, and visible atmosphere change over time.

Acceptance: `npm run test:e2e -- tests/e2e/drive.spec.ts`

### T9 Define the pure seeded score and its non-repetition

Requirements: R1, R5
Depends: T4
Files: `src/score.ts`, `tests/score.test.ts`

Generate pad, arpeggio and hum events or control envelopes from seed and absolute score time, with musical rules in data, stable event identities and explicit sustained-note state.

Implement the construction in Approach: Thue–Morse control symbol at the absolute phrase index, combined with the seed, mapped injectively to two audibly distinct and harmonically compatible phrase treatments. State the non-periodicity argument in a comment block at the top of `src/score.ts`. Use a safe-integer phrase index with an assertion on its range; do not introduce `BigInt`.

Test: seed determinism; representative variation across seeds; event ordering and valid values; interval partition equivalence; phrase boundaries; sustained notes; `t(n)` against an independent reference over a large index range; injectivity of the symbol-to-treatment mapping on audible parameters; agreement between `t(n)` and the events emitted for phrase *n*; and behaviour at the safe-integer bound.

These tests verify the construction. The non-periodicity claim follows from the construction, not from sample length — do not substitute a short-horizon variation test.

Acceptance: `npm run test -- tests/score.test.ts`

## Sound

### T10 Synthesize and schedule the score safely

Requirements: R5, R6, R8
Depends: T8, T9
Files: `src/audio.ts`, `src/app.ts`, `src/test-api.ts`, `tests/audio.test.ts`, `tests/e2e/audio.spec.ts`

Extend Foundation's audio lifecycle with the three instruments, bounded look-ahead scheduling, envelopes and one final master gain. Connect pause, resume and seed-reset cleanup.

Synthesis must preserve the audible distinction T9's mapping depends on: the two phrase treatments must sound different, not merely carry different metadata.

Test scheduler interval boundaries, duplicate prevention, stopped and disconnected voices, and bounded scheduling state. E2e-test silence before Start, a running context after it, nonzero output, volume response, mute silence, unmute recovery, and pause/resume at the same score position. Cover handled activation failure.

Acceptance: `npm run test:e2e -- tests/e2e/audio.spec.ts`

## Interface

### T11 Resolve seeds and persist settings safely

Requirements: R1, R7, R8
Depends: T4
Files: `src/settings.ts`, `tests/settings.test.ts`

Implement seed URL handling and validated volume/mute persistence. Preserve unrelated query parameters and distinguish an explicit seed from an absent or empty one.

Test Unicode and percent-encoded seeds, repeated parameters, missing values, malformed stored records, out-of-range settings, and storage operations that throw.

Acceptance: `npm run test -- tests/settings.test.ts`

### T12 Complete the HUD, About and interaction lifecycle

Requirements: R1, R3, R6, R7, R8, R9
Depends: T10, T11
Files: `index.html`, `src/main.ts`, `src/app.ts`, `src/ui.ts`, `src/style.css`, `src/test-api.ts`, `tests/e2e/interface.spec.ts`

Finish the start screen and every required HUD control. Apply persisted settings before sound begins. Add About, fullscreen handling, the time-of-day readout, and the `?debug=1` FPS and draw-call overlay.

New seed resets the whole experience with no duplicate render loop and no retained audio, preserving paused/running state and settings. Add labels, visible focus, Escape handling, and Space behaviour that does not double-fire from focused controls.

E2e-test every control, reload persistence, storage denial, seed URL changes, fullscreen success and denial, About/meta version equality, debug visibility, and absence of the test API in normal mode.

Acceptance: `npm run test:e2e -- tests/e2e/interface.spec.ts`

### T13 Complete resource regression checks and release verification

Requirements: R1–R10
Depends: T2, T3, T5, T6, T8, T10, T12
Files: `tests/e2e/performance.spec.ts`, `tests/e2e/foundation.spec.ts`, `tests/e2e/city.spec.ts`, `tests/e2e/drive.spec.ts`, `tests/e2e/audio.spec.ts`, `tests/e2e/interface.spec.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `README.md`

Add the two-minute simulated drive with intermediate renderer samples, confirmed chunk creation and eviction, and the resource ceilings. Cover turns, revisits and repeated seed changes. Collect console and page errors consistently across the suite.

Keep all seven required e2e checks enabled in both browser projects. Run every quality gate, including the final bundle size. Record browser versions and run the stock Chrome/Firefox smoke check for appearance, audible comfort, smooth turns, fullscreen and reduced motion. Capture Factory's started scene.

Fix failures in their owning checkpoints. Do not raise budgets, suppress errors, or replace real observations with test flags.

Acceptance: `npm run verify`

## Questions

- **Q1 — Confirm the reading of "never repeats exactly" (non-blocking).** The plan delivers: *the score never becomes periodic*, proved by the Thue–Morse construction in T9. The stronger reading — *no finite passage ever recurs* — is not achievable by any score built from a finite set of audible events, since some passage must recur by pigeonhole; it is satisfiable only through differences too small to hear, which this plan rejects as a dodge. Implementation proceeds under the non-periodicity reading. If the operator wants something different, the alternative must name an audible property that a finite-alphabet score can have.

Review limits: no files were changed, and no build, browser or acceptance command was run. Bundle size, rendering performance, instance-pool capacity and musical quality remain implementation risks until there is evidence from a real run.
