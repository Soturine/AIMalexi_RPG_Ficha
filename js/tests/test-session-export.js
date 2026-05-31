/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-session-export.js
   Testes para js/core/session-export.js — Sprint 18
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const _se    = window.CoC.core.sessionExport;
const _store = window.CoC.store;
const _exec  = window.CoC.core.executor;
const _trace = window.CoC.executionTrace;

const _BASE_CHAR = {
  investigator: { name: 'Export Test', age: 30 },
  attributes: {
    FOR:{value:60},CON:{value:60},TAM:{value:60},DES:{value:50},
    APA:{value:50},INT:{value:70},POD:{value:60},EDU:{value:75},Sorte:{value:60},
  },
  derived: {
    PV:{value:12,current:12},SAN:{value:60,current:60,max:99},
    PM:{value:12,current:12},Mitos:{value:0,label:'Mythos de Cthulhu'},
    MOV:{value:8},DB:{label:'+0'},Build:{value:0},
  },
  status:{majorWound:false,unconscious:false,dying:false,dead:false,
    tempInsane:false,indefInsane:false,incurablyInsane:false,sanLossesToday:0},
  skills:{},weapons:[],inventory:[],journal:[],spells:[],tomes:[],
};

// ── API pública ──────────────────────────────────────────────────────────────

group('session-export — API pública');

assert(typeof _se === 'object' && _se !== null,           'sessionExport existe');
assert(typeof _se.buildSessionData === 'function',        'buildSessionData é função');
assert(typeof _se.exportSession    === 'function',        'exportSession é função');
assert(typeof _se.importSession    === 'function',        'importSession é função');
assert(Object.isFrozen(_se),                              'sessionExport é frozen');

// ── buildSessionData — shape e campos obrigatórios ───────────────────────────

group('session-export — buildSessionData: shape e metadados');

_store.dispatch({ type: 'SET_CHARACTER', payload: _BASE_CHAR });
_trace.clear();

_exec.execute({ type: 'APPLY_DAMAGE',  payload: { amount: 3 } });
_exec.execute({ type: 'LOSE_SANITY',  payload: { amount: 2 } });
_exec.execute({ type: 'SPEND_LUCK',   payload: { amount: 5 } });
_exec.execute({ type: 'ROLL_SKILL',   payload: { skillName: 'Lutar', skillValue: 50, roll: 34, level: 'regular', difficulty: 'regular', bp: null, pushed: false }});
_exec.execute({ type: 'PUSH_ROLL',    payload: { skillName: 'Lutar', skillValue: 50, roll: 22, level: 'regular', difficulty: 'regular', bp: null, pushed: true, originalRoll: 34, originalLevel: 'regular' }});
_exec.execute({ type: 'ATTACK_RESOLVED', payload: { weaponId: 'w1', hit: true, isFired: false, roll: 30, damage: 5, level: 'regular' }});
_exec.execute({ type: 'ADD_MYTHOS',   payload: { delta: 2 } });

const _data = _se.buildSessionData();

assert(_data !== null,                            'buildSessionData: retorna objeto com personagem');
assertEq(_data.version, 1,                        'buildSessionData: version = 1');
assertEq(_data.system, 'AIMalexi RPG Ficha',      'buildSessionData: system identificado');
assert(typeof _data.createdAt === 'string',       'buildSessionData: createdAt é string ISO');
assert(_data.createdAt.includes('T'),             'buildSessionData: createdAt parece ISO 8601');
assert(typeof _data.character === 'object',       'buildSessionData: character presente');
assert(Array.isArray(_data.trace),               'buildSessionData: trace é array');
assert(typeof _data.summary === 'object',        'buildSessionData: summary presente');

// character é cópia profunda (não referência)
_data.character.investigator.name = 'MUTATED';
const _data2 = _se.buildSessionData();
assert(_data2.character.investigator.name === 'Export Test',
  'buildSessionData: character é deepClone (mutação não afeta próxima chamada)');

// ── buildSessionData — summary calculado do trace ────────────────────────────

group('session-export — buildSessionData: summary derivado do trace');

const _sum = _data.summary;

assertEq(_sum.hpLost,       3, 'summary.hpLost = 3 (APPLY_DAMAGE)');
assertEq(_sum.sanLost,      2, 'summary.sanLost = 2 (LOSE_SANITY)');
assertEq(_sum.luckSpent,    5, 'summary.luckSpent = 5 (SPEND_LUCK)');
assertEq(_sum.rolls,        2, 'summary.rolls = 2 (ROLL_SKILL + PUSH_ROLL)');
assertEq(_sum.pushes,       1, 'summary.pushes = 1 (PUSH_ROLL)');
assertEq(_sum.attacksTotal, 1, 'summary.attacksTotal = 1 (ATTACK_RESOLVED)');
assertEq(_sum.attacksHit,   1, 'summary.attacksHit = 1 (hit:true)');
assertEq(_sum.mythosGained, 2, 'summary.mythosGained = 2 (ADD_MYTHOS delta:2)');
assertEq(_sum.mpSpent,      0, 'summary.mpSpent = 0 (sem SPEND_MAGIC)');

// Sessão vazia → summary zerado
_trace.clear();
const _empty = _se.buildSessionData();
assertEq(_empty.summary.rolls, 0,    'sessão vazia: summary.rolls = 0');
assertEq(_empty.summary.hpLost, 0,   'sessão vazia: summary.hpLost = 0');

// ── importSession — round-trip ───────────────────────────────────────────────

group('session-export — importSession: round-trip JSON');

// Serializa dados de sessão e reimporta
const _json = JSON.stringify(_data);
const _result = _se.importSession(_json);

assert(_result.ok === true,                'importSession: ok=true para JSON válido');
assert(typeof _result.character === 'object', 'importSession: character presente');
assert(Array.isArray(_result.trace),       'importSession: trace presente');
assert(typeof _result.summary === 'object','importSession: summary presente');
assertEq(_result.version, 1,              'importSession: version preservado');

// Store recebe SET_CHARACTER
const _imported = _store.getState().character;
assert(_imported !== null,                 'importSession: store atualizado com SET_CHARACTER');

// ── importSession — validação de erros ───────────────────────────────────────

group('session-export — importSession: rejeita dados inválidos');

const _badJson = _se.importSession('{ invalid json ');
assert(_badJson.ok === false,             'importSession: JSON inválido → ok=false');
assert(typeof _badJson.error === 'string','importSession: error descritivo');

const _wrongSys = _se.importSession(JSON.stringify({ version: 1, system: 'OutroSistema', character: {} }));
assert(_wrongSys.ok === false,            'importSession: system errado → ok=false');

const _futureVer = _se.importSession(JSON.stringify({ version: 99, system: 'AIMalexi RPG Ficha', character: {} }));
assert(_futureVer.ok === false,           'importSession: version futura → ok=false');

const _noChar = _se.importSession(JSON.stringify({ version: 1, system: 'AIMalexi RPG Ficha' }));
assert(_noChar.ok === false,              'importSession: sem character → ok=false');

// buildSessionData sem personagem → null
_store.dispatch({ type: 'SET_CHARACTER', payload: null });
assert(_se.buildSessionData() === null,   'buildSessionData sem personagem → null');
