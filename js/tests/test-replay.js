/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-replay.js
   Validação empírica do Replay Consumer — Sprint 17

   Hipótese:
     initialState + executionTrace → estado reconstruído == estado live

   Se a hipótese for verdadeira:
     replay = implementação (não objetivo arquitetural)

   Se divergir em campos de domínio (HP/SAN/status/luck):
     existe buraco arquitetural (evento faltando, reducer não-determinístico
     ou mutação lateral sobrevivente).

   Testa:
     - Ações que mudam estado (APPLY_DAMAGE, LOSE_SANITY, SPEND_LUCK, ADD_MYTHOS)
     - Ações de sessão sem estado (ROLL_SKILL — no-op no reducer)
     - Ações com efeitos secundários (APPLY_DAMAGE → ADD_STATUS{majorWound})
     - Limpeza de trace entre sessões
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const _store    = window.CoC.store;
const _exec     = window.CoC.core.executor;
const _trace    = window.CoC.executionTrace;
const _consumer = window.CoC.core.replayConsumer;

// ── Personagem de sessão para o replay ──────────────────────────────────────

const _SESSION_CHAR = {
  investigator: { name: 'Replay Validator', age: 30 },
  attributes: {
    FOR: { value: 60 }, CON: { value: 60 }, TAM: { value: 60 }, DES: { value: 50 },
    APA: { value: 50 }, INT: { value: 70 }, POD: { value: 60 }, EDU: { value: 75 },
    Sorte: { value: 60 },
  },
  derived: {
    PV:    { value: 12, current: 12 },
    SAN:   { value: 60, current: 60, max: 99 },
    PM:    { value: 12, current: 12 },
    Mitos: { value: 0, label: 'Mythos de Cthulhu' },
    MOV:   { value: 8 }, DB: { label: '+0' }, Build: { value: 0 },
  },
  status: {
    majorWound: false, unconscious: false, dying: false, dead: false,
    tempInsane: false, indefInsane: false, incurablyInsane: false, sanLossesToday: 0,
  },
  skills: {}, weapons: [], inventory: [], journal: [], spells: [], tomes: [],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function deepEqualSanitized(a, b, label) {
  var as = JSON.stringify(a);
  var bs = JSON.stringify(b);
  assert(as === bs, label + '\n      live     : ' + as + '\n      replayed : ' + bs);
}

// ── Grupo 1: replay básico (sem efeitos) ────────────────────────────────────

group('replay-consumer — replaySession: hipótese initialState + trace = estado final');

_store.dispatch({ type: 'SET_CHARACTER', payload: _SESSION_CHAR });
const _initialState = _store.getState();  // snapshot antes de qualquer ação
_trace.clear();

// Sessão de domínio
_exec.execute({ type: 'APPLY_DAMAGE',  payload: { amount: 3 } });
_exec.execute({ type: 'LOSE_SANITY',  payload: { amount: 2 } });
_exec.execute({ type: 'SPEND_LUCK',   payload: { amount: 5 } });
_exec.execute({ type: 'ADD_MYTHOS',   payload: { delta: 1 } });
_exec.execute({ type: 'ROLL_SKILL',   payload: {
  skillName: 'Biblioteca', skillValue: 60, roll: 34, level: 'regular',
  difficulty: 'regular', bp: null, pushed: false,
}});

const _liveState = _store.getState();
const _sessionTrace = _trace.getTrace();

assert(_sessionTrace.length >= 5, 'trace capturou ≥5 eventos da sessão');

// Reseta store para initial e replaya
_store.dispatch({ type: 'SET_CHARACTER', payload: _initialState.character });
const _replayed = _consumer.replaySession(_initialState, _sessionTrace);

const _liveSan  = _consumer.sanitize(_liveState);
const _replaySan = _consumer.sanitize(_replayed);

deepEqualSanitized(_liveSan, _replaySan,
  'replay: estado sanitizado após sessão básica == estado live');

// Verificações individuais dos campos de domínio
assert(_replaySan.pvCurrent === _liveSan.pvCurrent,
  'replay: PV.current idêntico (' + _replaySan.pvCurrent + ')');
assert(_replaySan.sanCurrent === _liveSan.sanCurrent,
  'replay: SAN.current idêntico (' + _replaySan.sanCurrent + ')');
assert(_replaySan.luck === _liveSan.luck,
  'replay: Sorte idêntica (' + _replaySan.luck + ')');
assert(_replaySan.mitos === _liveSan.mitos,
  'replay: Mitos idêntico (' + _replaySan.mitos + ')');
assert(_replaySan.sanMax === _liveSan.sanMax,
  'replay: SAN.max idêntico após ADD_MYTHOS (' + _replaySan.sanMax + ')');

// ── Grupo 2: replay com efeitos secundários (state machine effects) ──────────

group('replay-consumer — replaySession: efeitos secundários reproduzidos');

// Nova sessão com APPLY_DAMAGE suficiente para disparar majorWound
_store.dispatch({ type: 'SET_CHARACTER', payload: _SESSION_CHAR });
const _initState2 = _store.getState();
_trace.clear();

// PV=12, majorWound = dano ≥ PV.value/2 = 6
_exec.execute({ type: 'APPLY_DAMAGE', payload: { amount: 7 } });

const _liveState2   = _store.getState();
const _sessionTrace2 = _trace.getTrace();

// Verifica que o live state tem majorWound
assert(_liveState2.character.status.majorWound === true,
  'live state: APPLY_DAMAGE(7) → majorWound=true (efeito SM)');

// Verifica que o trace capturou o efeito com payload completo
const _traceEntry = _sessionTrace2.find(function(e) { return e.type === 'APPLY_DAMAGE'; });
assert(_traceEntry !== undefined, 'trace contém APPLY_DAMAGE');
assert(Array.isArray(_traceEntry.effects), 'trace.effects é array de objetos');
assert(_traceEntry.effects.length >= 1,    'trace.effects tem ≥1 efeito (majorWound)');
assert(_traceEntry.effects[0] && _traceEntry.effects[0].type === 'ADD_STATUS',
  'trace.effects[0].type = ADD_STATUS (objeto completo, não string)');
assert(_traceEntry.effects[0].payload && _traceEntry.effects[0].payload.status === 'majorWound',
  'trace.effects[0].payload.status = majorWound');

// Replay: reseta e aplica trace
_store.dispatch({ type: 'SET_CHARACTER', payload: _initState2.character });
_consumer.replaySession(_initState2, _sessionTrace2);
const _replayedState2 = _store.getState();

assert(_replayedState2.character.status.majorWound === true,
  'replay: majorWound=true reproduzido via efeito do trace');
assert(_replayedState2.character.derived.PV.current === _liveState2.character.derived.PV.current,
  'replay: PV.current idêntico após APPLY_DAMAGE com efeito SM');

deepEqualSanitized(
  _consumer.sanitize(_liveState2),
  _consumer.sanitize(_replayedState2),
  'replay: estado com efeitos SM == estado live'
);

// ── Grupo 3: sanitize remove apenas campos derivados/temporais ──────────────

group('replay-consumer — sanitize: campos de domínio preservados');

const _sanResult = _consumer.sanitize(_liveState);
assert(_sanResult !== null,                    'sanitize: retorna objeto');
assert('pvCurrent'  in _sanResult,             'sanitize: pvCurrent presente');
assert('sanCurrent' in _sanResult,             'sanitize: sanCurrent presente');
assert('sanMax'     in _sanResult,             'sanitize: sanMax presente');
assert('pmCurrent'  in _sanResult,             'sanitize: pmCurrent presente');
assert('luck'       in _sanResult,             'sanitize: luck presente');
assert('mitos'      in _sanResult,             'sanitize: mitos presente');
assert('majorWound' in _sanResult,             'sanitize: majorWound presente');
assert('sanLossesToday' in _sanResult,         'sanitize: sanLossesToday presente');
assert(!('investigator' in _sanResult),        'sanitize: investigator excluído (não-domínio)');
assert(!('skills' in _sanResult),              'sanitize: skills excluídos (não-domínio de sessão)');

// sanitize(null) → null
assert(_consumer.sanitize(null) === null,      'sanitize(null) → null seguro');

// ── Grupo 4: API do consumer ─────────────────────────────────────────────────

group('replay-consumer — API pública');

assert(typeof _consumer === 'object' && _consumer !== null, 'replayConsumer existe');
assert(typeof _consumer.replaySession === 'function',       'replaySession é função');
assert(typeof _consumer.sanitize === 'function',            'sanitize é função');
assert(Object.isFrozen(_consumer),                          'replayConsumer é frozen');

// replaySession não muta o trace original
const _traceBefore = JSON.stringify(_sessionTrace2);
_store.dispatch({ type: 'SET_CHARACTER', payload: _initState2.character });
_consumer.replaySession(_initState2, _sessionTrace2);
assert(JSON.stringify(_sessionTrace2) === _traceBefore,
  'replaySession não muta o trace original');
