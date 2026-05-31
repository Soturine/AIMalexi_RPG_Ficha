/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-event-ontology.js
   Cobertura do event-ontology.js — Sprint 7

   Testa:
   1. Estrutura do CATALOG (campos obrigatórios, valores válidos)
   2. Consistência entre CATALOG e RENDER_MAP derivado
   3. Funções de consulta (byStatus, byDomain, bySacred)
   4. Concordância com store.js (ações 'live' têm reducers)
   5. Concordância com persist-middleware PERSIST_ACTIONS

   Carregado por runner.js (assert, assertEq, group como globais).
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const _onto    = window.CoC.core.eventOntology;
const _catalog = _onto.CATALOG;
const _rmap    = _onto.RENDER_MAP;
const _pipeline = window.CoC.core.renderPipeline;

// ── Estrutura do CATALOG ──────────────────────────────────────────────────
group('event-ontology — estrutura do catálogo');

const VALID_AGGREGATES = ['character', 'session', 'encounter', 'campaign'];
const VALID_STATUSES   = ['live', 'planned', 'gap'];

const _allTypes = Object.keys(_catalog);

assert(_allTypes.length > 0, 'CATALOG tem entradas');
assert(_allTypes.length >= 20, 'CATALOG tem pelo menos 20 ações documentadas');

let _structOk = true;
_allTypes.forEach(function (type) {
  const e = _catalog[type];
  if (!VALID_AGGREGATES.includes(e.aggregate)) { _structOk = false; }
  if (!VALID_STATUSES.includes(e.status))       { _structOk = false; }
  if (typeof e.persists !== 'boolean')           { _structOk = false; }
  if (typeof e.sacred   !== 'boolean')           { _structOk = false; }
  if (!Array.isArray(e.effects))                 { _structOk = false; }
});
assert(_structOk, 'todas as entradas têm aggregate, status, persists, sacred, effects válidos');

// renders pode ser 'ALL', array ou null — mas nunca undefined
let _rendersOk = true;
_allTypes.forEach(function (type) {
  const r = _catalog[type].renders;
  if (r !== 'ALL' && r !== null && !Array.isArray(r)) { _rendersOk = false; }
});
assert(_rendersOk, 'renders é sempre "ALL", [] ou null em cada entrada');

// ── RENDER_MAP derivado ────────────────────────────────────────────────────
group('event-ontology — RENDER_MAP derivado');

// Apenas ações 'live' com renders !== null devem estar no mapa
const _liveWithRenders = _allTypes.filter(function (t) {
  return _catalog[t].status === 'live' && _catalog[t].renders !== null;
});
const _rmapKeys = Object.keys(_rmap);

assert(_rmapKeys.length > 0, 'RENDER_MAP tem entradas');

// Toda chave do RENDER_MAP deve ser 'live' na ontologia
let _onlyLive = true;
_rmapKeys.forEach(function (t) {
  if (_catalog[t] && _catalog[t].status !== 'live') { _onlyLive = false; }
});
assert(_onlyLive, 'RENDER_MAP não contém ações não-live');

// Cada ação 'live' com renders !== null deve estar em RENDER_MAP
let _allLiveMapped = true;
_liveWithRenders.forEach(function (t) {
  if (_rmap[t] === undefined) { _allLiveMapped = false; }
});
assert(_allLiveMapped, 'todas as ações live com renders estão no RENDER_MAP');

// Render_MAP e ontologia concordam nos valores
let _valuesMatch = true;
_rmapKeys.forEach(function (t) {
  const ontologyRenders = _catalog[t] ? _catalog[t].renders : undefined;
  const mapRenders      = _rmap[t];
  if (JSON.stringify(ontologyRenders) !== JSON.stringify(mapRenders)) {
    _valuesMatch = false;
  }
});
assert(_valuesMatch, 'valores de RENDER_MAP concordam com CATALOG.renders');

// Ações 'planned' NÃO devem aparecer em RENDER_MAP (evita dead code)
const _planned = _allTypes.filter(function (t) { return _catalog[t].status === 'planned'; });
let _noPlannedInMap = true;
_planned.forEach(function (t) {
  if (_rmap[t] !== undefined) { _noPlannedInMap = false; }
});
assert(_noPlannedInMap, 'ações planned ausentes do RENDER_MAP (sem dead code)');

// Pipeline usa o mesmo RENDER_MAP
assert(_pipeline.RENDER_MAP === _rmap,
  'render-pipeline usa exatamente o RENDER_MAP da ontologia');

// ── Consultas utilitárias ─────────────────────────────────────────────────
group('event-ontology — byStatus / byDomain / bySacred');

const _live = _onto.byStatus('live');
assert(Array.isArray(_live) && _live.length > 0, 'byStatus("live") retorna array não vazio');
assert(_live.includes('SET_CHARACTER'),   'byStatus("live") inclui SET_CHARACTER');
assert(_live.includes('APPLY_DAMAGE'),    'byStatus("live") inclui APPLY_DAMAGE');
assert(_live.includes('ADD_WEAPON'),      'byStatus("live") inclui ADD_WEAPON');

const _planned2 = _onto.byStatus('planned');
assert(Array.isArray(_planned2) && _planned2.length > 0, 'byStatus("planned") retorna entradas');
assert(_planned2.includes('SET_ATTRIBUTE'), 'byStatus("planned") inclui SET_ATTRIBUTE');

const _gaps = _onto.byStatus('gap');
assert(Array.isArray(_gaps) && _gaps.length > 0, 'byStatus("gap") retorna lacunas documentadas');
assert(_gaps.includes('GAIN_LUCK'), 'byStatus("gap") inclui GAIN_LUCK');

const _vitals = _onto.byDomain('vitals');
assert(Array.isArray(_vitals) && _vitals.length > 0, 'byDomain("vitals") tem entradas');
assert(_vitals.includes('APPLY_DAMAGE'),  'byDomain("vitals") inclui APPLY_DAMAGE');
assert(_vitals.includes('ADD_STATUS'),    'byDomain("vitals") inclui ADD_STATUS (planned)');

const _sacred = _onto.bySacred();
assert(Array.isArray(_sacred) && _sacred.length > 0, 'bySacred() retorna ações sagradas');
assert(_sacred.includes('APPLY_DAMAGE'),  'bySacred() inclui APPLY_DAMAGE');
assert(_sacred.includes('LOSE_SANITY'),   'bySacred() inclui LOSE_SANITY');
assert(!_sacred.includes('SET_SKILL'),    'bySacred() não inclui SET_SKILL (não sagrada)');

// ── Concordância com store.js — ações 'live' têm reducers ─────────────────
group('event-ontology — ações live têm reducers em store.js (smoke)');

const _store = window.CoC.store;

// Cada ação 'live' que muta estado deve produzir changed=true no store
// (testa via dispatch com personagem mínimo em memória)
const _minChar = {
  investigator: { name: 'Ontologia Test' },
  attributes: {
    FOR: { value: 60 }, CON: { value: 55 }, TAM: { value: 65 },
    DES: { value: 50 }, APA: { value: 50 }, INT: { value: 70 },
    POD: { value: 60 }, EDU: { value: 75 }, Sorte: { value: 60 }
  },
  derived: { PV: { value: 12, current: 12 }, PM: { value: 12, current: 12 },
             SAN: { value: 60, current: 60, max: 100 }, Sorte: { value: 60 },
             Mitos: { value: 0 }, MOV: { value: 8 }, DB: { label: '+0' }, Build: { value: 0 } },
  skills: {}, weapons: [], inventory: [], journal: [], spells: [], tomes: [],
};
_store.dispatch({ type: 'SET_CHARACTER', payload: _minChar });

// Verificações pontuais — cada ação 'live' muta algo
let _applyBefore = _store.getState().character.derived.PV.current;
_store.dispatch({ type: 'APPLY_DAMAGE', payload: { amount: 1 } });
assert(_store.getState().character.derived.PV.current === _applyBefore - 1,
  'store: APPLY_DAMAGE muta PV.current (reducer live)');

let _sanBefore = _store.getState().character.derived.SAN.current;
_store.dispatch({ type: 'LOSE_SANITY', payload: { amount: 1 } });
assert(_store.getState().character.derived.SAN.current === _sanBefore - 1,
  'store: LOSE_SANITY muta SAN.current (reducer live)');

let _luckBefore = _store.getState().character.attributes.Sorte.value;
_store.dispatch({ type: 'SPEND_LUCK', payload: { amount: 5 } });
assert(_store.getState().character.attributes.Sorte.value === _luckBefore - 5,
  'store: SPEND_LUCK muta Sorte.value (reducer live)');

// ── Contagem de gaps (documental) ────────────────────────────────────────
group('event-ontology — gap analysis (documental)');

assert(_gaps.length >= 4, 'pelo menos 4 lacunas de domínio documentadas');
assert(_gaps.includes('SKILL_IMPROVED'),  'lacuna: SKILL_IMPROVED (melhoria pós-sessão)');
assert(_gaps.includes('INITIATIVE_SET'),  'lacuna: INITIATIVE_SET (tracker de encounter)');
assert(_gaps.includes('SESSION_STARTED'), 'lacuna: SESSION_STARTED (M5)');
assert(_planned2.length >= 3, 'pelo menos 3 ações planejadas documentadas');
assert(_planned2.includes('SET_IDENTITY'), 'planejada: SET_IDENTITY (migração identity.js)');
assert(_planned2.includes('SET_ATTRIBUTE'), 'planejada: SET_ATTRIBUTE (migração atributos)');

// ── Action Schema — boundary_randomness + resolved_fields ──────────────────
group('event-ontology — Action Schema: boundary_randomness e BOUNDARY_FIELDS');

// API exposta
assert(typeof _onto.BOUNDARY_FIELDS      === 'object',   'BOUNDARY_FIELDS exportado');
assert(typeof _onto.byBoundaryRandomness === 'function',  'byBoundaryRandomness é função');
assert(typeof _onto.validatePayload      === 'function',  'validatePayload é função');
assert(Object.isFrozen(_onto.BOUNDARY_FIELDS),            'BOUNDARY_FIELDS é frozen');

// Ações live com boundary_randomness devem estar em BOUNDARY_FIELDS
const _brActions = _onto.byBoundaryRandomness();
assert(_brActions.length >= 3,                  'byBoundaryRandomness retorna ≥ 3 ações');
assert(_brActions.includes('ATTACK_RESOLVED'),  'ATTACK_RESOLVED é boundary_randomness');
assert(_brActions.includes('LOSE_SANITY'),      'LOSE_SANITY é boundary_randomness');
assert(_brActions.includes('SPEND_MAGIC'),      'SPEND_MAGIC é boundary_randomness');
assert(_brActions.includes('ROLL_SKILL'),       'ROLL_SKILL (planned) é boundary_randomness');

// BOUNDARY_FIELDS tem os campos corretos
assert(Array.isArray(_onto.BOUNDARY_FIELDS['ATTACK_RESOLVED']),        'ATTACK_RESOLVED tem resolved_fields');
assert(_onto.BOUNDARY_FIELDS['ATTACK_RESOLVED'].includes('roll'),       'ATTACK_RESOLVED.roll obrigatório');
assert(_onto.BOUNDARY_FIELDS['ATTACK_RESOLVED'].includes('hit'),        'ATTACK_RESOLVED.hit obrigatório');
assert(Array.isArray(_onto.BOUNDARY_FIELDS['LOSE_SANITY']),             'LOSE_SANITY tem resolved_fields');
assert(_onto.BOUNDARY_FIELDS['LOSE_SANITY'].includes('amount'),         'LOSE_SANITY.amount obrigatório');
assert(Array.isArray(_onto.BOUNDARY_FIELDS['ROLL_SKILL']),              'ROLL_SKILL tem resolved_fields');
assert(_onto.BOUNDARY_FIELDS['ROLL_SKILL'].includes('roll'),            'ROLL_SKILL.roll obrigatório');
assert(_onto.BOUNDARY_FIELDS['ROLL_SKILL'].includes('level'),           'ROLL_SKILL.level obrigatório');

// Ações sem boundary_randomness NÃO têm entrada em BOUNDARY_FIELDS
assert(!('APPLY_DAMAGE'  in _onto.BOUNDARY_FIELDS), 'APPLY_DAMAGE não é boundary (determinístico)');
assert(!('SET_CHARACTER' in _onto.BOUNDARY_FIELDS), 'SET_CHARACTER não é boundary');
assert(!('ADD_STATUS'    in _onto.BOUNDARY_FIELDS), 'ADD_STATUS não é boundary');

// validatePayload — payload válido
const _vOk = _onto.validatePayload('ATTACK_RESOLVED', { roll: 47, hit: true, level: 'regular', weaponId: 'x' });
assert(_vOk.valid,             'validatePayload: payload completo → valid=true');
assertEq(_vOk.missing.length, 0, 'validatePayload: sem campos faltando');

// validatePayload — payload inválido (falta roll)
const _vFail = _onto.validatePayload('ATTACK_RESOLVED', { hit: true });
assert(!_vFail.valid,               'validatePayload: payload incompleto → valid=false');
assert(_vFail.missing.includes('roll'), 'validatePayload: missing contém "roll"');

// validatePayload — ação sem boundary_randomness → sempre valid
const _vNoBR = _onto.validatePayload('APPLY_DAMAGE', { amount: 5 });
assert(_vNoBR.valid,             'validatePayload: ação sem boundary → always valid');

// validatePayload — payload null → missing = todos required fields
const _vNull = _onto.validatePayload('LOSE_SANITY', null);
assert(!_vNull.valid,                   'validatePayload: null payload → invalid');
assert(_vNull.missing.includes('amount'), 'validatePayload: null → missing amount');

// executor:payload-warning disparado quando boundary fields ausentes
group('event-ontology — executor emite payload-warning para boundary violations');

const _exec2  = window.CoC.core.executor;
const _bus2   = window.CoC.bus;
const _store2 = window.CoC.store;
let _warnings = [];
_bus2.subscribe('executor:payload-warning', function(ev) { _warnings.push(ev); });

// Carrega personagem mínimo para executor poder operar
_store2.dispatch({ type: 'SET_CHARACTER', payload: {
  investigator: { name: 'Schema Test' },
  attributes: { FOR:{value:60}, CON:{value:60}, TAM:{value:60}, DES:{value:50},
    APA:{value:50}, INT:{value:70}, POD:{value:60}, EDU:{value:75}, Sorte:{value:50} },
  derived: { PV:{value:12,current:12}, SAN:{value:60,current:60,max:100},
    PM:{value:12,current:12}, Mitos:{value:0}, MOV:{value:8}, DB:{label:'+0'}, Build:{value:0} },
  status: { majorWound:false, unconscious:false, dying:false, dead:false,
    tempInsane:false, indefInsane:false, incurablyInsane:false, sanLossesToday:0 },
  skills:{}, weapons:[], inventory:[], journal:[], spells:[], tomes:[],
}});

// ATTACK_RESOLVED sem 'roll' → deve disparar warning
_exec2.execute({ type: 'ATTACK_RESOLVED', payload: { weaponId:'w1', hit:true, isFired:false } });
assert(_warnings.length >= 1,              'payload-warning disparado para ATTACK_RESOLVED sem roll');
assertEq(_warnings[0].type, 'ATTACK_RESOLVED', 'warning.type = ATTACK_RESOLVED');
assert(_warnings[0].missing.includes('roll'), 'warning.missing contém "roll"');

// ATTACK_RESOLVED com roll → NÃO deve disparar warning
_warnings = [];
_exec2.execute({ type: 'ATTACK_RESOLVED', payload: { weaponId:'w1', hit:true, isFired:false, roll:47, damage:0 } });
assertEq(_warnings.length, 0, 'payload completo → zero warnings');

// ── ROLL_SKILL e ROLL_ATTRIBUTE: status live (Sprint 14) ────────────────────
group('event-ontology — ROLL_SKILL e ROLL_ATTRIBUTE promovidos a live');

var _cLog    = window.CoC.eventLog;
var _ctrace  = window.CoC.executionTrace;
var _cExec   = window.CoC.core.executor;
var _cStore  = window.CoC.store;
var _cOnto   = window.CoC.core.eventOntology;

assert(_cOnto.CATALOG['ROLL_SKILL'].status === 'live',
  'ROLL_SKILL.status === "live" após Sprint 14');
assert(_cOnto.CATALOG['ROLL_ATTRIBUTE'].status === 'live',
  'ROLL_ATTRIBUTE.status === "live" após Sprint 14');

// ROLL_SKILL permanece em BOUNDARY_FIELDS (boundary_randomness:true)
assert(Array.isArray(_cOnto.BOUNDARY_FIELDS['ROLL_SKILL']),
  'ROLL_SKILL ainda tem entrada em BOUNDARY_FIELDS');
assert(_cOnto.BOUNDARY_FIELDS['ROLL_SKILL'].includes('roll'),
  'ROLL_SKILL.resolved_fields contém "roll"');
assert(_cOnto.BOUNDARY_FIELDS['ROLL_SKILL'].includes('skillValue'),
  'ROLL_SKILL.resolved_fields contém "skillValue"');
assert(_cOnto.BOUNDARY_FIELDS['ROLL_SKILL'].includes('level'),
  'ROLL_SKILL.resolved_fields contém "level"');

// executor.execute com ROLL_SKILL válido → zero warnings
_cStore.dispatch({ type: 'SET_CHARACTER', payload: {
  investigator: { name: 'Live Test' },
  attributes: { FOR:{value:60},CON:{value:60},TAM:{value:60},DES:{value:50},
    APA:{value:50},INT:{value:70},POD:{value:60},EDU:{value:75},Sorte:{value:50} },
  derived: { PV:{value:12,current:12},SAN:{value:60,current:60,max:100},
    PM:{value:12,current:12},Mitos:{value:0},MOV:{value:8},DB:{label:'+0'},Build:{value:0} },
  status:{majorWound:false,unconscious:false,dying:false,dead:false,
    tempInsane:false,indefInsane:false,incurablyInsane:false,sanLossesToday:0},
  skills:{},weapons:[],inventory:[],journal:[],spells:[],tomes:[],
}});

var _warnCount = 0;
var _warnUnsub = _cExec ? null : null;
// Subscription para capturar warnings desta seção
var _warnsBatch = [];
window.CoC.bus.subscribe('executor:payload-warning', function(ev) { _warnsBatch.push(ev); });

_ctrace.clear();
_cExec.execute({ type: 'ROLL_SKILL', payload: {
  skillName: 'Biblioteca', skillValue: 60, roll: 34, level: 'regular',
  difficulty: 'regular', bp: null, pushed: false,
}});

var _trace14 = _ctrace.tail(1);
assert(_trace14.length === 1,           'executionTrace captura ROLL_SKILL live');
assert(_trace14[0].type === 'ROLL_SKILL', 'trace entry.type === ROLL_SKILL');
assert(_trace14[0].payload.skillName === 'Biblioteca', 'trace payload.skillName preservado');
assert(_trace14[0].payload.roll === 34, 'trace payload.roll = 34 (boundary value)');
assert(_trace14[0].payload.level === 'regular', 'trace payload.level preservado');

// Estado não muda (persists:false, no-op no reducer)
var _stateAfterRoll = _cStore.getState();
_cExec.execute({ type: 'ROLL_SKILL', payload: {
  skillName: 'Lutar', skillValue: 50, roll: 1, level: 'crit',
  difficulty: 'regular', bp: null, pushed: false,
}});
assert(_cStore.getState() === _stateAfterRoll,
  'ROLL_SKILL live não muta estado do store (no-op)');

// ROLL_SKILL sem resolved_fields → warning (mas não quebra runtime)
var _warnsBefore = _warnsBatch.length;
_cExec.execute({ type: 'ROLL_SKILL', payload: { skillName: 'Esquiva' }});
assert(_warnsBatch.length > _warnsBefore,
  'ROLL_SKILL sem roll/skillValue/level → executor:payload-warning emitido');

// ── PUSH_ROLL live + luckCost snapshot (Sprint 15) ──────────────────────────
group('event-ontology — PUSH_ROLL promovido a live');

assert(_cOnto.CATALOG['PUSH_ROLL'].status === 'live',
  'PUSH_ROLL.status === "live" após Sprint 15');
assert(_cOnto.CATALOG['PUSH_ROLL'].boundary_randomness === true,
  'PUSH_ROLL.boundary_randomness é true');
assert(Array.isArray(_cOnto.BOUNDARY_FIELDS['PUSH_ROLL']),
  'PUSH_ROLL está em BOUNDARY_FIELDS');
assert(_cOnto.BOUNDARY_FIELDS['PUSH_ROLL'].includes('roll'),
  'PUSH_ROLL.resolved_fields contém "roll"');
assert(_cOnto.BOUNDARY_FIELDS['PUSH_ROLL'].includes('skillValue'),
  'PUSH_ROLL.resolved_fields contém "skillValue"');
assert(_cOnto.BOUNDARY_FIELDS['PUSH_ROLL'].includes('level'),
  'PUSH_ROLL.resolved_fields contém "level"');

// executor.execute com PUSH_ROLL válido → zero warnings adicionais
var _warnsBefore2 = _warnsBatch.length;
_cExec.execute({ type: 'PUSH_ROLL', payload: {
  skillName: 'Lutar', skillValue: 50, roll: 34, level: 'regular',
  difficulty: 'regular', bp: null, pushed: true, originalRoll: 78, originalLevel: 'fail',
}});
assert(_warnsBatch.length === _warnsBefore2,
  'PUSH_ROLL com payload completo → zero warnings');

// PUSH_ROLL sem campos obrigatórios → warning
var _warnsBefore3 = _warnsBatch.length;
_cExec.execute({ type: 'PUSH_ROLL', payload: { skillName: 'Lutar' }});
assert(_warnsBatch.length > _warnsBefore3,
  'PUSH_ROLL sem roll/skillValue/level → executor:payload-warning');

// PUSH_ROLL no-op no reducer
var _stateAfterPush = _cStore.getState();
_cExec.execute({ type: 'PUSH_ROLL', payload: {
  skillName: 'Lutar', skillValue: 50, roll: 44, level: 'regular',
  difficulty: 'regular', bp: null, pushed: true, originalRoll: 78, originalLevel: 'fail',
}});
assert(_cStore.getState() === _stateAfterPush,
  'PUSH_ROLL live não muta estado do store');
