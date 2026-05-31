/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-render-pipeline.js
   Cobertura do render-pipeline.js — Sprint 6

   Carregado por runner.js (assert, assertEq, group disponíveis como globais).
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const _pipeline = window.CoC.core.renderPipeline;
const _store    = window.CoC.store;
const _RMAP     = _pipeline.RENDER_MAP;

// ── RENDER_MAP coverage ────────────────────────────────────────────────────
group('render-pipeline — RENDER_MAP coverage');

assert(typeof _RMAP === 'object' && _RMAP !== null,
  'RENDER_MAP é um objeto');
assert(_RMAP.SET_CHARACTER === 'ALL',
  'SET_CHARACTER → ALL');
assert(Array.isArray(_RMAP.RECALC_DERIVED) && _RMAP.RECALC_DERIVED.includes('vitals'),
  'RECALC_DERIVED inclui vitals');
assert(Array.isArray(_RMAP.RECALC_DERIVED) && _RMAP.RECALC_DERIVED.includes('attributes'),
  'RECALC_DERIVED inclui attributes');
assert(Array.isArray(_RMAP.APPLY_DAMAGE) && _RMAP.APPLY_DAMAGE.includes('vitals'),
  'APPLY_DAMAGE → vitals');
assert(Array.isArray(_RMAP.LOSE_SANITY) && _RMAP.LOSE_SANITY.includes('vitals'),
  'LOSE_SANITY → vitals');
assert(Array.isArray(_RMAP.SPEND_LUCK) && _RMAP.SPEND_LUCK.includes('attributes'),
  'SPEND_LUCK inclui attributes');
assert(Array.isArray(_RMAP.SPEND_LUCK) && _RMAP.SPEND_LUCK.includes('vitals'),
  'SPEND_LUCK inclui vitals');
assert(Array.isArray(_RMAP.ADD_WEAPON) && _RMAP.ADD_WEAPON.includes('combat'),
  'ADD_WEAPON → combat');
assert(Array.isArray(_RMAP.REMOVE_WEAPON) && _RMAP.REMOVE_WEAPON.includes('combat'),
  'REMOVE_WEAPON → combat');
assert(Array.isArray(_RMAP.ATTACK_RESOLVED) && _RMAP.ATTACK_RESOLVED.includes('combat'),
  'ATTACK_RESOLVED → combat');
// SET_IDENTITY é 'planned' na ontologia (sem reducer em store.js) — ausente do live RENDER_MAP.
// A cobertura de renders está em test-event-ontology.js (CATALOG.SET_IDENTITY.renders).
assert(_RMAP.SET_IDENTITY === undefined,
  'SET_IDENTITY ausente do live RENDER_MAP (status=planned, sem reducer)');
assert(Array.isArray(_RMAP.SET_CHARACTER_ID) && _RMAP.SET_CHARACTER_ID.length === 0,
  'SET_CHARACTER_ID → [] (sem render)');

// ── register + renderView ─────────────────────────────────────────────────
group('render-pipeline — register + renderView');

let _rp_calls = { a: 0, b: 0 };
_pipeline.register('__test_a__', function () { _rp_calls.a++; });
_pipeline.register('__test_b__', function () { _rp_calls.b++; });

_pipeline.renderView('__test_a__');
assert(_rp_calls.a === 1, 'renderView chama a função registrada');
_pipeline.renderView('__test_a__');
assert(_rp_calls.a === 2, 'renderView pode ser chamado múltiplas vezes');
_pipeline.renderView('__test_view_inexistente__');
assert(true, 'renderView de view não-registrada não lança erro');

// ── renderAll chama todas as views registradas ─────────────────────────────
group('render-pipeline — renderAll');

let _rp_all = { x: 0, y: 0 };
_pipeline.register('__test_x__', function () { _rp_all.x++; });
_pipeline.register('__test_y__', function () { _rp_all.y++; });

_pipeline.renderAll();
assert(_rp_all.x >= 1 && _rp_all.y >= 1,
  'renderAll() chama todas as views registradas');

// ── renderForAction — action desconhecida e SET_CHARACTER_ID ──────────────
group('render-pipeline — renderForAction');

let _rp_fa = { w: 0 };
_pipeline.register('__test_w__', function () { _rp_fa.w++; });

const _beforeUnknown = _rp_fa.w;
_pipeline.renderForAction('ACAO_DESCONHECIDA_XYZ');
assert(_rp_fa.w === _beforeUnknown,
  'action desconhecida não dispara renders');

const _beforeId = _rp_fa.w;
_pipeline.renderForAction('SET_CHARACTER_ID');
assert(_rp_fa.w === _beforeId,
  'SET_CHARACTER_ID não dispara renders');

// ── pipeline.init() garante RECALC_DERIVED antes de renderAll (integração) ──
// O cascade não é no store.js — é na pipeline.init() que despacha RECALC_DERIVED
// quando SET_CHARACTER chega, garantindo que vitals veja derivados frescos.
// Este grupo testa o RECALC_DERIVED isolado (sem pipeline.init, só store.dispatch).
group('render-pipeline — RECALC_DERIVED via dispatch explícito');

const _rcharBase = {
  investigator: { name: 'Teste Pipeline RECALC' },
  attributes: {
    FOR: { value: 60 }, CON: { value: 55 }, TAM: { value: 65 },
    DES: { value: 50 }, APA: { value: 50 }, INT: { value: 70 },
    POD: { value: 60 }, EDU: { value: 75 }, Sorte: { value: 50 }
  },
  derived: {}
};
_store.dispatch({ type: 'SET_CHARACTER', payload: _rcharBase });
_store.dispatch({ type: 'RECALC_DERIVED' });
const _rs = _store.getState();

assert(_rs.character !== null, 'SET_CHARACTER carrega o personagem');
assert(_rs.character.derived && typeof _rs.character.derived.PV === 'object',
  'RECALC_DERIVED: derived.PV presente');
assert(typeof _rs.character.derived.PV.value === 'number' && _rs.character.derived.PV.value > 0,
  'RECALC_DERIVED: PV > 0 (CON 55 + TAM 65 → esperado 12)');
assertEq(_rs.character.derived.PM.value, 12,
  'RECALC_DERIVED: PM = POD/5 = 60/5 = 12');
assert(_rs.character.derived.SAN && _rs.character.derived.SAN.value > 0,
  'RECALC_DERIVED: SAN calculado');
assert(_rs.character.derived.MOV && _rs.character.derived.MOV.value > 0,
  'RECALC_DERIVED: MOV calculado');

_store.dispatch({ type: 'SET_CHARACTER', payload: null });
assert(_store.getState().character === null,
  'SET_CHARACTER null → character nulo sem crash');
