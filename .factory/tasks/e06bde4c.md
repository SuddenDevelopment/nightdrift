---
id: "e06bde4c"
title: "Seed permalink"
status: "needs_input"
priority: 1
depends_on: ["ad546188"]
files: ["src/settings.ts","src/app.ts","src/atmosphere.ts","src/ui.ts","src/test-api.ts","tests/permalink.test.ts","tests/e2e/permalink.spec.ts","README.md"]
acceptance: "npm run test:e2e -- tests/e2e/permalink.spec.ts"
last_acceptance: null
source_run_id: "66588ec0-11b7-4a39-a32d-7c79ca425194"
source_ref: "proposed:seed-permalink"
created_at: "2026-11-03T21:36:54.053Z"
updated_at: "2026-11-03T22:47:22.605Z"
---

URL hash carries seed + time-of-day + camera preset; a Shuffle button rerolls and rewrites the hash.
Someone finds a city they like and can hand the exact drive to a friend.

#

## Analysis

### What the repository actually contains

There is no application code. The working tree holds `.factory/goals/2fd2a8ea.md`, `.factory/drafts/2fd2a8ea-plan.md`, a second draft copy of the same plan revision (`.factory/drafts/37023840-optimize.md`), `.factory/plans/035a973a.md`, three `.factory/backups/work-*.json` manifests recording the creation of the fourteen records, fourteen standalone task records, and tool configuration. No `package.json`, no `src/`, no `tests/`, no `.factory/ui.json`.

So every file path and the acceptance command below are read out of `.factory/plans/035a973a.md`, the saved v0.1.0 plan, which fixes the module layout (`src/settings.ts`, `src/app.ts`, `src/ui.ts`, `src/atmosphere.ts`, `src/test-api.ts`, `tests/*.test.ts`, `tests/e2e/*.spec.ts`) and the per-checkpoint acceptance pattern (`npm run test:e2e -- tests/e2e/<name>.spec.ts`, used by T3, T5 and T12). They are not invented, but they are planned-not-yet-existing paths: this task is only implementable after plan `035a973a` (T1–T13) has been built, and if the implementing run deviates from the plan's module layout the Files line moves with it.

The plan also states the boundary for this record directly, at line 93 and line 95: the fourteen standalone records "remain separate. This plan neither implements nor deletes them", and "Basic seed URLs, keyboard access and reduced motion remain required here despite overlap with `e06bde4c`". So `?seed=` resolution (T11, `src/settings.ts`) and the New-seed HUD control (T12) are already owned by the plan. This task is strictly additive on top of them: it does not re-own seed resolution, it extends it.

### F1 — The one real conflict: the plan puts the seed in the query, the operator puts it in the hash

R1 in the plan requires `?seed=nightdrive`, requires a missing or empty seed to be generated and "written into the URL", and T12 requires New seed to update "only the seed portion of the URL". T11's tests assert percent-encoded, Unicode, case-preserved, repeated and empty `seed` query values. The operator's sentence here says "URL hash carries seed + time-of-day + camera preset". The operator's own goal (`.factory/goals/2fd2a8ea.md`) also says "a seeded PRNG (?seed=)", so the goal and the plan agree with each other and disagree with this record's sentence.

Both cannot be the single source of truth for the seed. This is the decision recorded in Q1 below. The analysis proceeds under this assumption, which the implementer should carry unless told otherwise:

**A1 (assumption): the hash is the permalink and wins for seed when it carries one; `?seed=` remains the documented R1 entry point and is used when the hash carries no seed.** This keeps every T11 and T12 test valid (they exercise URLs with no hash at all), keeps R1's literal `?seed=nightdrive` working, and gives the record's sentence its plain meaning. The cost is two seed inputs with a stated precedence, which must be documented in `README.md` and asserted once in the unit test.

### A2 — Approach

A permalink is one round-trip plus three wire-ups. The round-trip is pure and is where the bugs live; the wire-ups are each a few lines.

Do not add a module. `src/settings.ts` already owns "read state out of the URL, validate it, survive garbage, write state back into the URL" — that is exactly what T11 builds. Hash encoding is the same job on the fragment instead of the query, so it belongs in that file and reuses its validation helpers and its generated-seed path.

Do not hand-write a fragment parser. `URLSearchParams` parses `#s=x&t=0.25&c=hood` after stripping the leading `#`, and gives percent-decoding, Unicode, missing keys, repeated keys and serialisation for free. T11 already uses it for the query.

Keep the three fields in one table rather than three branches, so a fourth permalink field later (weather, district) is a data edit:

```
PERMALINK_FIELDS = {
  s: { read: () => state.seed,            parse: parseSeed,    write: applySeed },
  t: { read: () => atmosphere.phase(),    parse: parsePhase,   write: applyPhase },
  c: { read: () => camera.presetId(),     parse: parsePreset,  write: applyPreset },
}
```

`encodePermalink()` walks the table building a `URLSearchParams`; `decodePermalink(hash)` walks it collecting only fields whose `parse` returns a value, leaving the rest at their defaults. Two functions, one table, no per-field control flow.

The extension point is not hypothetical. Radio (`58b90e1f`) persists its station choice "in localStorage and the permalink", and Mixer (`ac5922e0`) is "persisted and included in the permalink". Both records treat the permalink as an existing shared mechanism they will extend, so this task's grammar — single-letter keys, first value wins, unknown keys dropped, one table entry per field — becomes URL grammar those records build on. An older build receiving a newer link simply drops the field it does not know, which is the correct degradation and is exactly what E4 specifies.

Shuffle is not a new reset. T12 already builds "New seed resets city, route, atmosphere and score to time zero … preserves volume, mute and running/paused state, and leaves no old voices or render loops". Shuffle is that same reset called with three freshly derived values instead of one. Reusing it inherits T12's guarantees about duplicate render loops and retained audio for free; writing a second reset path would have to re-earn them.

### A3 — Per-file changes

**`src/settings.ts`** — add the field table, `encodePermalink(state): string` and `decodePermalink(hash): Partial<PermalinkState>`, and `writePermalink(state)` which rewrites the fragment in place via `history.replaceState(null, '', url)` — never `location.hash` assignment, which would push a history entry and fire `hashchange`. Add the three field parsers:

- `parseSeed(v)`: reuse T11's existing seed validation unchanged — decoded, case-sensitive, untrimmed; empty string is treated as absent so T11's generate-a-seed path runs.
- `parsePhase(v)`: `Number(v)`; reject non-finite, reject outside `[0, 1]`; normalise `1` to `0` (the cycle wraps). Rounded to three decimals on encode — the plan's cycle is 20 minutes, so three decimals is ~1.2 s of resolution, which is below the visible step of a dusk-to-night gradient.
- `parsePreset(v)`: membership test against the preset id list exported by ad546188. Unknown id returns undefined, not a throw.

A rejected field never rejects the whole hash — each field falls back independently. `decodePermalink` must not throw on any input.

**`src/app.ts`** — four wire-ups.

1. *Boot*: after T11 resolves settings, apply `decodePermalink(location.hash)` over the resolved state, then call `writePermalink` once so the address bar always holds a complete shareable link (this is the hash analogue of R1's "generate a missing seed and write it into the URL").
2. *Change*: call `writePermalink` whenever seed, preset or atmosphere phase changes through a control — New seed, Shuffle, a preset key press. Not every frame: the phase advances continuously and rewriting the URL per frame would be both wasteful and unreadable. The hash records the phase at the last deliberate change, which is what a recipient needs — the *starting* moment of the drive, not a live clock.
3. *`shuffle()`*: roll one new seed — the plan's only nondeterministic value ("Use nondeterministic randomness only to select a new seed") — and derive the phase in `[0,1)` and the preset id from that seed through two dedicated deterministic streams, the same derivation pattern the plan establishes for city, route and score parameters. Rolling three independent values would stretch the plan's randomness allowance beyond its letter, which this record has no authority to do; deriving from the seed keeps the constraint verbatim and makes a shuffle exactly as reproducible as the seed it lands on. (The derivation is a property of the shuffle action, not of boot: `?seed=<shuffled seed>` without the hash still starts at dusk on the default preset, exactly as R1 and the plan define.) Call T12's existing reset with the three values; write the hash. Preserves volume, mute, and running/paused state, exactly as New seed does.
4. *`hashchange`*: add a listener so a hand-edited hash applies as a reset. No self-authored-write filter is needed: every write goes through `history.replaceState`, which never fires `hashchange` and never creates a history entry.

**`src/atmosphere.ts`** — the plan's cycle is a pure function of elapsed active time with no way to start it anywhere but zero. Add a phase offset applied at construction and at reset, and a `phase(): number` reader returning the current position in `[0,1)`. **A4 (assumption): the hash's time-of-day is the drive's *starting* phase, and the cycle keeps running from there — it does not freeze the sky.** The drive is endless by definition; a frozen sky would contradict R4's "slow time-of-day cycle", and "hand the exact drive to a friend" means they start where you started. The HUD's time-of-day readout (T12) reads the same value and needs no change.

**`src/ui.ts`** — one Shuffle button beside New seed: accessible label, keyboard activation, visible focus, and it must not double-fire the global Space pause handler (T12 already establishes that rule for its own controls; follow it). If T12 declared the HUD controls as markup in `index.html` rather than building them in `src/ui.ts`, the button element is one more `<button>` there and `index.html` joins the Files line — the plan lists `index.html` under T12 but does not say which of the two it is, so this is settled by reading T12's output, not by guessing now.

**`src/test-api.ts`** — expose `seed`, `cyclePhase` and `cameraPresetId` on `window.__nightdrift` under `?test=1` only, so the e2e spec reads real state instead of re-parsing the URL it is trying to verify. Ordinary visits still expose nothing (R9).

**`tests/permalink.test.ts`** — unit coverage of the pure round-trip (runs under `npm run test` and so inside `npm run verify`).

**`tests/e2e/permalink.spec.ts`** — the acceptance spec.

**`README.md`** — document the two seed inputs and the precedence rule (A1): the hash seed wins when present; `?seed=` remains the documented entry point and applies when the hash carries no seed.

### A5 — What the hash does not carry

Volume and mute stay in localStorage (T11's versioned record). They are the recipient's comfort settings, not part of the drive, and putting them in a shared link would override a stranger's volume. Reduced motion likewise stays a user preference — ad546188 gives each preset its own reduced-motion variant, so the preset id in the hash stays valid and the variant is chosen by the recipient's preference, not by the link. Pause state is not carried either: a link should start driving.

### Edge cases

- **E1 — No hash.** All three fields default. Seed comes from `?seed=` or is generated (T11, unchanged). The hash is written once after boot so the URL becomes shareable without any user action.
- **E2 — Hash seed and query seed both present and different.** Hash wins (A1). The unit test asserts this precedence explicitly so the behaviour is recorded rather than emergent. This is the case Q1 may overturn.
- **E3 — Malformed phase** (`t=abc`, `t=5`, `t=-0.2`, `t=NaN`, `t=Infinity`, `t=`). Field rejected, default phase used, seed and preset from the same hash still apply. Rejected rather than clamped: clamping `t=5` to `1` invents a state the sender never had.
- **E4 — Unknown preset id** (`c=hovercraft`, or an id removed in a later version). Field rejected, default preset used. Unknown *keys* in the hash are dropped on the next rewrite rather than preserved — the hash is this app's state, not a general parameter bag, and preserving unknowns would make the grammar untestable. (This is also the correct degradation when an older build meets a Radio or Mixer link; see A2.)
- **E5 — Empty seed** (`#s=`). Treated as absent, matching T11's empty-seed rule: a seed is generated and written back.
- **E6 — Unicode and percent-encoded seeds** (`#s=夜`, `#s=marlowe%20city`). `URLSearchParams` round-trips both; case is preserved, since R1 makes seeds case-sensitive and `marlowe` ≠ `Marlowe` must still give different cities.
- **E7 — Junk fragment** (`#`, `#foo`, `#=`, `#&&&`). No recognised keys, no throw, defaults everywhere, drive starts normally.
- **E8 — Repeated keys** (`#s=a&s=b`). First value wins, matching T11's stated rule for repeated query parameters. One rule for both halves of the URL.
- **E9 — Shuffle while paused.** State resets, hash rewrites, the drive stays paused — identical to New seed, because it is the same reset.
- **E10 — Shuffle pressed repeatedly and quickly.** One reset each, no duplicate render loop, no retained voices. Inherited from T12's reset, which is already tested for this; the spec re-asserts it once at this level because Shuffle rolls three fields where New seed rolls one.
- **E11 — User edits the hash in the address bar.** `hashchange` fires, the new hash decodes, the app resets to it. Because every write uses `history.replaceState`, the module's own writes never fire `hashchange` and never create history entries, so no self-authored-write filter is needed; the consequence is that Back does not undo a Shuffle — it leaves the page entirely, since no per-change entries exist to traverse.
- **E12 — Phase precision.** Encoded to three decimals, so the round-trip test must compare against the rounded value, not the live float. Encoding at full float precision would make the hash ugly and the equality test flaky.
- **E13 — `t=1`.** Normalised to `0`. The cycle is continuous across its wrap (T8 tests that), so both ends name the same sky.
- **E14 — localStorage denied (R8).** Permalink is unaffected: it lives in the URL. Start, Shuffle and sharing all still work; only volume/mute fail to persist.
- **E15 — WebGL unavailable (R8).** The fallback renders and no hash is written, because no drive state was ever resolved. No uncaught error from the permalink code.
- **E16 — Seed permalink with `?test=1` or `?debug=1` also present.** Query parameters are untouched by hash writes; `history.replaceState` with a fragment-only URL rewrites only the fragment. T11's requirement to preserve unrelated parameters is not weakened.

### Why the acceptance command fails before and passes after

`npm run test:e2e -- tests/e2e/permalink.spec.ts` runs Playwright against a fresh production build, per the plan's verification contract (`test:e2e` builds first and owns a strict-port preview process).

**Before.** Today it exits non-zero immediately: there is no `package.json`, so npm reports a missing script. After plan `035a973a` and ad546188 are built but before this task, `tests/e2e/permalink.spec.ts` does not exist and Playwright exits non-zero with no tests found. There is no state in which this command passes without this task's work, because this task creates the only file it names.

**After.** The spec exists and asserts, in both configured browser projects:

1. Load `/?test=1#s=marlowe&t=0.250&c=hood`, click Start, read `window.__nightdrift`: seed is `marlowe`, cycle phase is `0.250` within one frame's advance, preset is `hood`. This fails without the decode path and without the atmosphere phase offset.
2. Click Shuffle: the fragment changes, the page does not navigate, and the new fragment decodes to the live `window.__nightdrift` values. This fails without the button, the roll, and the write path.
3. Copy the post-Shuffle fragment, open it in a fresh page, Start, and assert the same seed and preset exactly, and the phase within one encoded rounding step (`0.001`, per E12 — the phase keeps advancing while the second page boots and is read). This is the operator's actual sentence — "hand the exact drive to a friend" — and it fails unless encode and decode are inverse.
4. Load `/?test=1#s=&t=zzz&c=nope`: the drive starts, no console errors and no page errors, defaults applied, a seed generated and written back. This fails if any parser throws.

`tests/permalink.test.ts` covers the pure cases that an e2e run cannot reach cheaply — E2 through E8, E12, E13 — and runs inside `npm run test` and therefore inside the plan's overall `npm run verify`.

### Dependency

ad546188 (Camera presets) must land first: the `c` field needs a fixed set of stable preset ids to validate against and a way to apply one at boot. Without it the hash can only carry two of the record's three fields. 0fdc8bc9 (Postcard export) is independent — it stamps seed and odometer onto a PNG and does not read or write the hash, though a later run may reasonably want the postcard to carry the permalink.

## Questions

**Q1 — Does the seed live in the hash or the query?** The record's sentence says the hash carries the seed; the operator's goal and plan `035a973a` R1 require `?seed=nightdrive`, T11 tests the query form against Unicode, percent-encoding, case, repeats and empties, and T12 requires New seed to update "only the seed portion of the URL". Options: **O1** hash wins when present, query remains the R1 entry point (the assumption carried above) — costs one documented precedence rule and one extra unit test, changes no existing plan test; **O2** hash carries only time-of-day and preset, seed stays in the query (`?seed=x#t=0.25&c=hood`) — costs nothing in the plan and still produces one copy-pasteable URL, but contradicts this record's wording; **O3** the hash is the sole permalink and `?seed=` is removed — costs an edit to R1 and to T11/T12's tests, which the plan explicitly forbids this record from doing.

**Q2 — Who owns "apply a camera preset by id" and "start the atmosphere cycle at phase p"?** The plan's Approach describes `src/atmosphere.ts` only as a continuous 20-minute cycle advanced by elapsed active time, with the HUD *reading* it; nothing in the repository describes a settable phase, and nothing names the file, the export or the id scheme for camera presets — ad546188 is an unanalysed backlog record with `files: []` and `acceptance: null`, mentioning four presets by name, cycled by key, with no id scheme. This analysis has therefore named `src/atmosphere.ts` and `src/app.ts` as the places the change lands by plan inference, and left the preset module out of the Files line rather than invent a path. To close this: ad546188's analysis must fix the exported preset id strings (they become permanent URL grammar the moment a link is shared), and once ad546188 lands, its preset-application module joins this record's Files line, since applying a boot preset and reading the current id go through it. The implementer also needs confirmation that giving the atmosphere cycle a settable starting phase is acceptable rather than a change to T8's owned behaviour.
