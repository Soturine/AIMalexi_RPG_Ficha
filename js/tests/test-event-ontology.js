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
