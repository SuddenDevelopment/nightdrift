Plan Nightdrift v0.1.0 "First drive" for implementation through Factory.

Nightdrift is a browser toy: an endless, slow night drive through a procedurally generated city, with generative ambient music. Open the page, press Start, and the camera drifts down neon-lit avenues forever; the music never repeats exactly but always fits the mood. Same seed, same city and same score.

v0.1.0 must have:
- Infinite city: city blocks generated per chunk from a seeded PRNG (?seed=), buildings as instanced meshes with varied heights and lit windows, streets between blocks. Chunks stream in ahead of the camera and are disposed behind it, with no gaps at chunk edges and bounded memory.
- Drift camera: glides along avenues, turns smoothly at intersections, never clips through buildings. Space pauses and resumes. Respects prefers-reduced-motion (slower, no sudden turns).
- Atmosphere: night sky gradient, distance fog, emissive windows and street lights, and a slow time-of-day cycle from dusk through night.
- Music: a generative ambient score built with the Web Audio API (pad, slow arpeggio, low city hum). The score is a pure function from seed and time to note events, separate from the audio graph. Sound starts only after the Start click. Volume and mute controls.
- Interface: start screen; minimal HUD (pause, volume/mute, time of day, new seed, fullscreen); settings remembered in localStorage; an About panel showing the version; a debug overlay with FPS and draw calls at ?debug=1; a readable fallback when WebGL is unavailable.

Constraints: Vite + TypeScript + three.js, no backend, no external runtime assets (everything is generated in code), works in current desktop Chrome and Firefox. Test mode ?test=1 exposes window.__nightdrift with renderer stats and a simulated speed, so behaviour can be checked headlessly. The version from package.json appears in the About panel and in <meta name="nightdrift-version">.

Quality gates, each a script in package.json:
- lint (ESLint)
- typecheck (tsc)
- test (Vitest unit tests: city and score are deterministic per seed; chunk streaming and disposal logic)
- build (Vite)
- test:e2e (Playwright against the production build: no console errors; the canvas renders non-blank after Start; draw calls stay under 150; geometries and textures stay bounded after two simulated minutes of driving; the audio context runs after Start and mute silences it; the WebGL fallback shows when WebGL is disabled; the version marker matches package.json)
- size (main bundle under 300 KB gzipped)
- verify (all of the above, in order)
npm run verify is the plan's overall acceptance.

Deliver it in five phases: Foundation (tooling, CI, empty scene, quality gates), City, Drive & atmosphere, Sound, Interface. Foundation also writes .factory/ui.json so Factory screenshots can capture the app: url http://localhost:5173, start "npm run dev -- --port 5173 --strictPort", routes ["/"], and a click on the start button, so the capture happens after the first frame and the audio unlock.

Planning requirements: every task names the files it changes and exactly one acceptance command that FAILS today and passes after the task; tasks are small enough to review; determinism tests for city and score; e2e checks exactly as listed above. The repository does not exist yet (a later run creates it), so acceptance commands that fail with "package.json missing" or exit non-zero today are exactly right.
