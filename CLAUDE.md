# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AIMalexi RPG is a browser-based character sheet tool for **Call of Cthulhu 7th Edition** (PT-BR). Three HTML pages: `investigator.html` (player sheet), `keeper.html` (GM tool), `guia-iniciante.html` (beginner guide). Deployed as a static site on GitHub Pages.

## Running locally

No build step, no npm, no Node.js. Just open files:

```sh
# Option A — direct file (most things work)
open index.html

# Option B — local server (avoids CORS on future features)
python -m http.server 8765
# then open http://localhost:8765/
```

Manual browser tests live in `test-engine.html` and `test-hotfix.html` — open them directly in a browser.

## Deployment

Push to `main`. GitHub Pages serves from the root of `main` automatically. After adding any new JS/CSS file, add its path to `PRECACHE_URLS` in `sw.js` **and** bump `CACHE_VERSION` (currently `"v5"`). The SW uses cache-first with no `skipWaiting` (intentional — avoids interrupting a live session).

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

js/core/                ← reactive core (M0 scaffold, wiring starts M1)
  actions.js            ← domain intent catalog (APPLY_DAMAGE, LOSE_SANITY…)
  store.js              ← will hold signals by slice (character/session/rollLog/ui)
  signals.js            ← bridge to vendored Preact Signals
  dispatch.js           ← fixed middleware chain: trace→validate→reduce→persist→sync→log→notify
  bus.js                ← event bus (decoupled from Store)
  lifecycle.js          ← scope/teardown primitives (ObjectURLs, listeners, subscriptions)
  schema/index.js       ← payload validation

js/shared/              ← shared UI utilities
  ui-components.js
  media-picker.js       ← banner/portrait Blob handling
  sanity-fx.js          ← sanity degradation effects
  validators.js

js/sync/                ← Supabase sync (M0 scaffold, wires at M5)
  supabase-client.js
  syncMiddleware.js
  queue.js              ← offline queue + reconnect

js/vendor/              ← vendored, never edit
  signals-core.js       ← Preact Signals
  supabase.js           ← slot for Supabase SDK

js/dev/
  trace.js              ← dispatch trace (groupCollapsed, timings, diffs)
  perf.js               ← performance instrumentation

data/                   ← plain JS objects, safe to edit
  skills.js, occupations.js, bestiary.js, npc-archetypes.js…
  presets/              ← empty.js, klein-moretti.js (example character)
```

**Data flow (target):** `UI → dispatch(action) → middleware → store(signals) → views react`

The runtime is always the local Store. The UI **never reads from Supabase**. Supabase is transport only.

## Current milestone status

- **M0 — DONE:** RNG crypto, event delegation, media picker (banner/portrait), scaffold of `js/core/`, `js/sync/`, `js/vendor/` (files exist but most are stubs).
- **M1 — NEXT:** Wire up store/signals/dispatcher/bus + schema + trace. Reducers go here.
- **M2–M7:** append-only log → strangle investigator → local dashboard → Supabase sync → security hardening → polish.

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
