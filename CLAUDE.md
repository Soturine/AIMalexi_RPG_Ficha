# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ⚠️ **Fonte oficial de verdade: [`Melhorias/DIRETRIZ_OFICIAL_V1.md`](Melhorias/DIRETRIZ_OFICIAL_V1.md).**
> Este arquivo é subordinado a ela. As seções de *roadmap/milestones* abaixo podem estar
> desatualizadas — a diretriz prevalece. As decisões de arquitetura e a Constituição
> operacional seguem válidas.

## What this is

AIMalexi RPG is a browser-based character sheet tool for **Call of Cthulhu 7th Edition** (PT-BR). Main HTML pages: `index.html` (portal), `investigator.html` (player sheet), `keeper.html` (GM tool), `guia-iniciante.html` (beginner guide), and `compendium.html` (reference). Deployed as a static site on GitHub Pages.

## Running locally

No build step, no npm, no Node.js. Just open files:

```sh
# Option A — direct file (most things work)
open index.html

# Option B — local server (avoids CORS on future features)
python -m http.server 8765
# then open http://localhost:8765/
```

Automated tests: `node js/tests/runner.js` - zero-dep Node runner + 19 `test-*.js` suites, gated in CI via `.github/workflows/ci.yml`. In the 2026-06-07 audit the local suite passed with `889/889`. Manual browser test: `test-engine.html`.

## Deployment

Push to `main`. GitHub Pages serves from the root of `main` automatically. After adding any new JS/CSS file, add its path to `PRECACHE_URLS` in `sw.js` **and** bump `CACHE_VERSION` (currently `"v51"`). The SW uses cache-first with no `skipWaiting` (intentional - avoids interrupting a live session).

## Architecture

All code lives under the `window.CoC` global namespace. No modules, no bundler.

```
index.html              ← portal
investigator.html       ← player sheet (js/investigator.js)
keeper.html             ← GM tool (js/keeper.js)

js/engine/              ← pure functions, stable
  coc7e-rules.js        ← CoC 7e derived stats, RPN arithmetic parser (no eval)
  dice.js               ← crypto.getRandomValues (never Math.random)
  storage.js            ← IndexedDB with localStorage fallback, cache-first reads
  name-generator.js

js/core/                ← reactive core (LIVE: store/signals/bus/executor/event-log/render-pipeline wired)
  actions.js            ← domain intent catalog (APPLY_DAMAGE, LOSE_SANITY…)
  store.js              ← will hold signals by slice (character/session/rollLog/ui)
  signals.js            ← bridge to vendored Preact Signals
  dispatch.js           ← fixed middleware chain: trace→validate→reduce→persist→sync→log→notify
  bus.js                ← event bus (decoupled from Store)
  lifecycle.js          ← scope/teardown primitives (ObjectURLs, listeners, subscriptions)
  schema.js             ← payload validation (also a schema/ dir)

js/shared/              ← shared UI utilities
  ui-components.js
  media-picker.js       ← banner/portrait Blob handling
  sanity-fx.js          ← sanity degradation effects
  validators.js

js/campaign/            ← multiplayer (BroadcastChannel + Supabase Realtime "Model A", no persist yet)
  transport.js · supabase-transport.js · player-sync.js · keeper-dashboard.js
  pin-system.js · campaign-store.js · campaign-ontology.js

js/views/               ← 13 sheet-section views (identity, attributes, skills, combat, rolls…)
js/tests/               ← runner.js + 19 test suites (Node, CI-gated)

js/vendor/              ← vendored, never edit
  signals-core.js       ← Preact Signals
  supabase.js           ← slot for Supabase SDK

js/dev/
  trace.js              ← dispatch trace (groupCollapsed, timings, diffs)
  perf.js               ← performance instrumentation

data/                   ← plain JS objects, safe to edit
  skills.js, occupations.js, bestiary.js, npc-archetypes.js…
  presets/              ← empty.js
```

**Data flow (target):** `UI → dispatch(action) → middleware → store(signals) → views react`

The runtime is always the local Store. The UI **never reads from Supabase**. Supabase is transport only.

## Current milestone status

> ⚠️ Superseded by `Melhorias/DIRETRIZ_OFICIAL_V1.md` (phased roadmap there). Real state as of 2026-06-01:
- **M0–M3 — DONE:** crypto RNG, media picker, reactive core (store/signals/bus/executor/event-log), append-only log, views strangled out of `investigator.js`.
- **M4–M5 — PARTIAL:** local keeper-dashboard; Supabase Realtime "Model A" (no persistence yet).
- **Next (per directive):** durable **free multiplayer** (event-sourced persistence) is the top priority — Fase M.

Detailed roadmap: `Melhorias/ARQUITETURA_V3.md`. Known rule bugs backlog: `Melhorias/TODO_AUDIT_CoC7e.md`.

## Hard constraints (from `Melhorias/CONSTITUICAO_OPERACIONAL_V1.md`)

- **Zero eval.** Arithmetic is parsed via the Shunting-Yard RPN in `coc7e-rules.js`.
- **Zero `Math.random`.** All dice use `crypto.getRandomValues` via `dice.js`.
- **Offline-first.** Every critical action must work without network. Sync is opportunistic.
- **1–2 taps max** for any critical action. No deep menus or bureaucratic modals.
- **No VTT features:** no maps, tokens, dynamic lighting, or chat. Narrative over technology.
- **State tiers:** if it doesn't survive a page reload, it does not go in the main Store (use local component state instead).
- **Sacred fields** (`APPLY_DAMAGE`, `LOSE_SANITY`, `RESOLVE_COMBAT`, status changes): in future multiplayer, only the GM's authoritative client applies these. Defined in `js/core/actions.js` as `SACRED`.
- **`skipWaiting` disabled in SW** — intentional, do not change without understanding the session impact.

## Key storage details

- Schema version tracked in `storage.js` as `SAVE_SCHEMA_VERSION` (currently `3`). Increment and add a migration block in `runMigrations()` whenever the persisted data structure changes.
- Storage key prefix: `"aimalexi-rpg/"`.
- Blob assets (banner/portrait images) stored separately via `saveBlob`/`getBlob` and loaded lazily on boot.
