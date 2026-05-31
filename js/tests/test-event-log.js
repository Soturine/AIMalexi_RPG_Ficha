/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-event-log.js
   Suíte de testes para js/core/event-log.js

   Cobertura:
   - Entradas registradas após dispatch via store
   - Estrutura de cada entrada: { id, ts, type, payload, durationMs, changed }
   - getLog() retorna cópia (não referência mutável)
   - tail(n) retorna últimas n entradas; tail(0) retorna pelo menos 1
   - getMetrics(): dispatches, effective, noop, avgDurationMs
   - clear() reseta log e contadores
   - id auto-incrementa sequencialmente
   - Entradas de ações no-op (changed=false) registradas

   Depende de: window.CoC.eventLog, window.CoC.store (carregados antes pelo runner).
   Carregado por runner.js — assert/assertEq/group disponíveis como globais.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const _log   = window.CoC.eventLog;
const _store = window.CoC.store;

// Helper: dispatch e retorna última entrada do log
function _fire(type, payload) {
  _store.dispatch({ type: type, payload: payload });
  return _log.tail(1)[0];
}

// ─────────────────────────────────────────────────────────────────────────────
//  Estrutura básica de entrada
// ─────────────────────────────────────────────────────────────────────────────
group('eventLog — estrutura de entrada');

_log.clear();
var tsBeforeDispatch = Date.now();
var entry1 = _fire('SET_CHARACTER', { id: 'el-test-01', investigator: { name: 'Fulano' } });

assert(entry1 !== undefined,           'entrada registrada após dispatch');
assertEq(entry1.type, 'SET_CHARACTER', 'entry.type correto');
assert(typeof entry1.id === 'number',  'entry.id é número');
assert(entry1.id >= 1,                 'entry.id >= 1');
assert(typeof entry1.ts === 'number',  'entry.ts é number (timestamp)');
assert(entry1.ts >= tsBeforeDispatch,  'entry.ts >= timestamp antes do dispatch');
assert('payload'    in entry1,         'entry.payload presente');
assert('durationMs' in entry1,         'entry.durationMs presente');
assert('changed'    in entry1,         'entry.changed presente');
assert(typeof entry1.durationMs === 'number', 'entry.durationMs é number');

// ─────────────────────────────────────────────────────────────────────────────
//  changed=true vs changed=false
// ─────────────────────────────────────────────────────────────────────────────
group('eventLog — changed flag');

_log.clear();
// SET_CHARACTER com personagem novo → changed=true
_fire('SET_CHARACTER', { id: 'el-02', investigator: { name: 'A' } });
var entryChanged = _log.tail(1)[0];
assert(entryChanged.changed === true,  'SET_CHARACTER com novo char → changed=true');

// Dispatch de ação desconhecida com state inalterado → changed=false
_fire('__UNKNOWN_ACTION_NOOP__', null);
var entryNoop = _log.tail(1)[0];
assert(entryNoop.changed === false,    'ação desconhecida → changed=false');

// ─────────────────────────────────────────────────────────────────────────────
//  getLog() — retorna cópia, não referência mutável
// ─────────────────────────────────────────────────────────────────────────────
group('eventLog — getLog() retorna cópia');

_log.clear();
_fire('SET_CHARACTER', { id: 'el-03' });
var snap1 = _log.getLog();
snap1.push({ fake: true });           // muta a cópia
var snap2 = _log.getLog();
assertEq(snap2.length, 1,             'mutação da cópia não afeta log interno');
assert(!snap2[0].fake,                'entrada fake não aparece no log real');

// ─────────────────────────────────────────────────────────────────────────────
//  tail(n) — últimas N entradas
// ─────────────────────────────────────────────────────────────────────────────
group('eventLog — tail(n)');

_log.clear();
_fire('SET_CHARACTER', { id: 'el-t1' });
_fire('SET_CHARACTER', { id: 'el-t2' });
_fire('SET_CHARACTER', { id: 'el-t3' });

var tail3 = _log.tail(3);
assertEq(tail3.length, 3,             'tail(3) retorna 3 entradas');
assertEq(tail3[2].payload.id, 'el-t3','tail(3): última entrada é a mais recente');

var tail1 = _log.tail(1);
assertEq(tail1.length, 1,             'tail(1) retorna 1 entrada');
assertEq(tail1[0].payload.id, 'el-t3','tail(1): entrada correta');

// tail(0) → clamp a 1
var tail0 = _log.tail(0);
assert(tail0.length >= 1,             'tail(0): clampado a 1 (não retorna vazio)');

// tail além do tamanho do log → retorna tudo
var tailBig = _log.tail(999);
assertEq(tailBig.length, 3,           'tail(999) com 3 entradas retorna 3');

// ─────────────────────────────────────────────────────────────────────────────
//  id auto-incremental sequencial
// ─────────────────────────────────────────────────────────────────────────────
group('eventLog — id sequencial');

_log.clear();
_fire('SET_CHARACTER', { id: 'seq-a' });
_fire('SET_CHARACTER', { id: 'seq-b' });
_fire('SET_CHARACTER', { id: 'seq-c' });
var allIds = _log.getLog().map(function(e) { return e.id; });
assert(allIds[1] === allIds[0] + 1,   'id[1] = id[0]+1 (sequencial)');
assert(allIds[2] === allIds[1] + 1,   'id[2] = id[1]+1 (sequencial)');

// clear() reseta sequência — próximo id começa em 1 novamente
_log.clear();
_fire('SET_CHARACTER', { id: 'after-clear' });
assertEq(_log.tail(1)[0].id, 1,       'após clear(): id reinicia em 1');

// ─────────────────────────────────────────────────────────────────────────────
//  getMetrics()
// ─────────────────────────────────────────────────────────────────────────────
group('eventLog — getMetrics()');

_log.clear();
_fire('SET_CHARACTER', { id: 'met-1' });       // effective
_fire('__NOOP_A__', null);                      // noop
_fire('__NOOP_B__', null);                      // noop
_fire('SET_CHARACTER', { id: 'met-2' });        // effective (muda char)

var m = _log.getMetrics();
assertEq(m.dispatches, 4,             'getMetrics: dispatches = 4');
assert(m.effective >= 1,              'getMetrics: effective >= 1');
assert(m.noop >= 2,                   'getMetrics: noop >= 2');
assertEq(m.effective + m.noop, 4,     'getMetrics: effective + noop = dispatches');
assert(typeof m.avgDurationMs === 'number', 'getMetrics: avgDurationMs é number');
assert(m.avgDurationMs >= 0,          'getMetrics: avgDurationMs >= 0');

// getMetrics() retorna cópia
var m2 = _log.getMetrics();
m2.dispatches = 9999;
assertEq(_log.getMetrics().dispatches, 4, 'getMetrics() retorna cópia (mutação não afeta)');

// ─────────────────────────────────────────────────────────────────────────────
//  clear() — reseta log e métricas
// ─────────────────────────────────────────────────────────────────────────────
group('eventLog — clear()');

_log.clear();
_fire('SET_CHARACTER', { id: 'clr-1' });
_fire('SET_CHARACTER', { id: 'clr-2' });
assertEq(_log.getLog().length, 2,     'antes do clear: 2 entradas');

_log.clear();
assertEq(_log.getLog().length, 0,     'após clear: 0 entradas');
assertEq(_log.getMetrics().dispatches, 0, 'após clear: dispatches = 0');
assertEq(_log.getMetrics().effective,  0, 'após clear: effective = 0');
assertEq(_log.getMetrics().noop,       0, 'após clear: noop = 0');
assertEq(_log.getMetrics().avgDurationMs, 0, 'após clear: avgDurationMs = 0');

// getLog() após clear() retorna array (não null/undefined)
assert(Array.isArray(_log.getLog()),  'getLog() após clear: retorna array');

// ─────────────────────────────────────────────────────────────────────────────
//  executionTrace — decisões de domínio (executor:action)
// ─────────────────────────────────────────────────────────────────────────────
group('executionTrace — estrutura e API');

const _trace   = window.CoC.executionTrace;
const _exec    = window.CoC.core.executor;
const _storeET = window.CoC.store;

assert(typeof _trace === 'object' && _trace !== null, 'executionTrace existe');
assert(typeof _trace.getTrace === 'function',         'getTrace é função');
assert(typeof _trace.tail     === 'function',         'tail é função');
assert(typeof _trace.clear    === 'function',         'clear é função');
assert(Object.isFrozen(_trace),                       'executionTrace é frozen');

// Limpa estado antes do teste
_trace.clear();
_storeET.dispatch({ type: 'SET_CHARACTER', payload: {
  investigator: { name: 'Trace Test' },
  attributes: { FOR: { value: 60 }, CON: { value: 60 }, TAM: { value: 60 },
    DES: { value: 50 }, APA: { value: 50 }, INT: { value: 70 },
    POD: { value: 60 }, EDU: { value: 75 }, Sorte: { value: 50 } },
  derived: { PV: { value: 12, current: 12 }, SAN: { value: 60, current: 60, max: 100 },
    PM: { value: 12, current: 12 }, Mitos: { value: 0 }, MOV: { value: 8 },
    DB: { label: '+0' }, Build: { value: 0 } },
  status: { majorWound: false, unconscious: false, dying: false, dead: false,
    tempInsane: false, indefInsane: false, incurablyInsane: false, sanLossesToday: 0 },
  skills: {}, weapons: [], inventory: [], journal: [], spells: [], tomes: [],
}});

// Executa uma ação via executor — deve criar entrada no trace
_exec.execute({ type: 'APPLY_DAMAGE', payload: { amount: 3 } });
const tEntry = _trace.tail(1)[0];

assert(tEntry !== undefined,            'trace registra entrada após executor.execute()');
assertEq(tEntry.type, 'APPLY_DAMAGE',  'trace.type = APPLY_DAMAGE');
assert(Array.isArray(tEntry.effects),  'trace.effects é array');
assert('payload' in tEntry,            'trace.payload presente');
assert(typeof tEntry.ts === 'number',  'trace.ts é número');
assert(typeof tEntry.id === 'number',  'trace.id é número');

// Executa ação SACRED com effects — deve capturar effects no trace
_exec.execute({ type: 'APPLY_DAMAGE', payload: { amount: 12 } }); // majorWound + unconscious
const tFull = _trace.tail(1)[0];
assert(tFull.effects.length >= 2,
  'APPLY_DAMAGE(12) → trace.effects inclui ADD_STATUS effects (≥2)');

// clear() reseta trace
_trace.clear();
assertEq(_trace.getTrace().length, 0,  'clear() reseta trace');
assert(Array.isArray(_trace.getTrace()), 'getTrace() pós-clear retorna array');

// getTrace() retorna cópia
_exec.execute({ type: 'SPEND_LUCK', payload: { amount: 5 } });
const copy1 = _trace.getTrace();
const copy2 = _trace.getTrace();
assert(copy1 !== copy2,  'getTrace() retorna nova cópia a cada chamada');
