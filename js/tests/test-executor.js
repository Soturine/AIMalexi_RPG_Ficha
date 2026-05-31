/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-executor.js
   Cobertura do executor.js — Sprint 9

   Testa:
   1. Estrutura pública
   2. APPLY_DAMAGE — HP mutado + ADD_STATUS via state-machine (sem duplicação)
   3. HEAL_DAMAGE — HP curado + REMOVE_STATUS{unconscious/dying}
   4. LOSE_SANITY — SAN reduzida + ADD_STATUS{indefInsane} quando threshold
   5. RECOVER_SANITY — SAN recuperada + REMOVE_STATUS{indefInsane}
   6. Ação sem regras (SET_SKILL) — dispatch direto funciona
   7. sanLossesToday — acumula para TODOS os valores (fix da condição >4)
   8. Batch render — renderPipeline não expõe renders intermediários

   Carregado por runner.js (assert, assertEq, group disponíveis como globais).
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const _exec     = window.CoC.core.executor;
const _store    = window.CoC.store;
const _pipeline = window.CoC.core.renderPipeline;

// ── Helpers ────────────────────────────────────────────────────────────────

function _char(overrides) {
  return Object.assign({
    investigator: { name: 'Executor Test' },
    attributes: {
      FOR: { value: 60 }, CON: { value: 60 }, TAM: { value: 60 },
      DES: { value: 50 }, APA: { value: 50 }, INT: { value: 70 },
      POD: { value: 60 }, EDU: { value: 75 }, Sorte: { value: 50 }
    },
    derived: {
      PV:    { value: 12, current: 12 },
      SAN:   { value: 60, current: 60, max: 100 },
      PM:    { value: 12, current: 12 },
      Mitos: { value: 0 }, MOV: { value: 8 }, DB: { label: '+0' }, Build: { value: 0 }
    },
    status: {
      majorWound: false, unconscious: false, dying: false, dead: false,
      tempInsane: false, indefInsane: false, incurablyInsane: false, sanLossesToday: 0
    },
    skills: {}, weapons: [], inventory: [], journal: [], spells: [], tomes: [],
  }, overrides || {});
}

/** Carrega personagem completo sem RECALC_DERIVED (derived já definido em _char()). */
function _load(overrides) {
  _store.dispatch({ type: 'SET_CHARACTER', payload: _char(overrides) });
}

function _get() { return _store.getState().character; }

// ── Estrutura pública ──────────────────────────────────────────────────────
group('executor — estrutura pública');

assert(typeof _exec === 'object' && _exec !== null, 'executor é objeto');
assert(typeof _exec.execute === 'function',          'execute é função');

// ── APPLY_DAMAGE sem threshold — só mutação de HP ─────────────────────────
group('executor — APPLY_DAMAGE sem threshold de status');

_load();
_exec.execute({ type: 'APPLY_DAMAGE', payload: { amount: 3 } });
assertEq(_get().derived.PV.current, 9,  'execute APPLY_DAMAGE(3): PV 12→9');
assert(!_get().status.majorWound,       'dano < metade HP → sem majorWound');
assert(!_get().status.unconscious,      'HP positivo → sem unconscious');
assert(!_get().status.dying,            'HP positivo → sem dying');

// ── APPLY_DAMAGE — Major Wound + Inconsciente (cascata parcial) ───────────
group('executor — APPLY_DAMAGE Major Wound + Inconsciente');

// maxHP=12, ceil(12/2)=6. Dano=6: majorWound ✓, HP=12-6=6>0→unconscious ✗
_load();
_exec.execute({ type: 'APPLY_DAMAGE', payload: { amount: 6 } });
assertEq(_get().derived.PV.current, 6, 'execute APPLY_DAMAGE(6): PV 12→6');
assert(_get().status.majorWound,       'dano=metade HP → majorWound via ADD_STATUS');
assert(!_get().status.unconscious,     'HP=6 > 0 → sem unconscious');

// Dano=12: HP 12→0 → majorWound ✓ e unconscious ✓
_load();
_exec.execute({ type: 'APPLY_DAMAGE', payload: { amount: 12 } });
assertEq(_get().derived.PV.current, 0, 'execute APPLY_DAMAGE(12): PV 12→0');
assert(_get().status.majorWound,       'dano≥6 → majorWound via ADD_STATUS');
assert(_get().status.unconscious,      'HP=0 → unconscious via ADD_STATUS');
assert(!_get().status.dying,           'HP=0 ≠ ≤PV_MIN(-2) → sem dying');

// ── APPLY_DAMAGE — cascata total: majorWound + unconscious + dying ─────────
group('executor — APPLY_DAMAGE cascata de 3 efeitos simultâneos');

// Dano=14, HP=12: resultante=12-14=-2 ≤ PV_MIN=-2
// majorWound: 14 >= 6 ✓ | unconscious: -2 ≤ 0 ✓ | dying: -2 ≤ -2 ✓
_load();
_exec.execute({ type: 'APPLY_DAMAGE', payload: { amount: 14 } });
assertEq(_get().derived.PV.current, -2, 'APPLY_DAMAGE(14): PV clampado em PV_MIN=-2');
assert(_get().status.majorWound,        'cascata: majorWound (14 ≥ 6)');
assert(_get().status.unconscious,       'cascata: unconscious (12-14=-2 ≤ 0)');
assert(_get().status.dying,             'cascata: dying (12-14=-2 ≤ PV_MIN)');

// Reducer já havia removido a lógica duplicada — status vem APENAS do executor
// (sem status: o store.js puro não seta mais esses flags diretamente)
_load();
_store.dispatch({ type: 'APPLY_DAMAGE', payload: { amount: 14 } });
assertEq(_store.getState().character.derived.PV.current, -2,
  'dispatch direto: PV clampado (reducer ainda funciona)');
assert(!_store.getState().character.status.majorWound,
  'dispatch direto (sem executor): majorWound NÃO setado (reducer limpo)');
assert(!_store.getState().character.status.unconscious,
  'dispatch direto (sem executor): unconscious NÃO setado (reducer limpo)');

// ── HEAL_DAMAGE — remove unconscious quando HP volta > 0 ─────────────────
group('executor — HEAL_DAMAGE remove status unconscious');

_load({ derived: {
  PV:  { value: 12, current: -1 },
  SAN: { value: 60, current: 60, max: 100 },
  PM:  { value: 12, current: 12 },
  Mitos: { value: 0 }, MOV: { value: 8 }, DB: { label: '+0' }, Build: { value: 0 }
}, status: { unconscious: true, dying: false, majorWound: false, dead: false,
             tempInsane: false, indefInsane: false, incurablyInsane: false, sanLossesToday: 0 }});
_exec.execute({ type: 'HEAL_DAMAGE', payload: { amount: 2 } });
assertEq(_get().derived.PV.current, 1, 'HEAL_DAMAGE(2): PV -1→1');
assert(!_get().status.unconscious,     'HP>0 + era inconsciente → REMOVE_STATUS{unconscious}');

// ── HEAL_DAMAGE — estabiliza dying (HP volta acima de PV_MIN=-2) ──────────
group('executor — HEAL_DAMAGE estabiliza dying');

// HP=-3 (abaixo de PV_MIN, possível via SET_CHARACTER direto), dying=true
// Cura 2: HP = max(-2, -3+2) = max(-2,-1) = -1 > -2 → Estabilizado dispara
// Recobrou consciência: ctx.dying=true → bloqueado
_load({ derived: {
  PV:  { value: 12, current: -3 },
  SAN: { value: 60, current: 60, max: 100 },
  PM:  { value: 12, current: 12 },
  Mitos: { value: 0 }, MOV: { value: 8 }, DB: { label: '+0' }, Build: { value: 0 }
}, status: { unconscious: true, dying: true, majorWound: false, dead: false,
             tempInsane: false, indefInsane: false, incurablyInsane: false, sanLossesToday: 0 }});
_exec.execute({ type: 'HEAL_DAMAGE', payload: { amount: 2 } });
assertEq(_get().derived.PV.current, -1,  'HEAL_DAMAGE(2) estabiliza: PV -3→-1');
assert(!_get().status.dying,             'HP>PV_MIN + era dying → REMOVE_STATUS{dying}');
assert(_get().status.unconscious,        'HP ainda ≤ 0 e dying bloqueou revive → unconscious persiste');

// ── LOSE_SANITY — alerta temporário (effects=[]) ──────────────────────────
group('executor — LOSE_SANITY alerta temporário (sem efeito direto)');

_load();
_exec.execute({ type: 'LOSE_SANITY', payload: { amount: 5 } });
assertEq(_get().derived.SAN.current, 55, 'LOSE_SANITY(5): SAN 60→55');
assert(!_get().status.indefInsane,       'SAN longe de 0 → sem indefInsane');
// Cheque de loucura temporária dispara mas effects=[] → sem status automático
assert(!_get().status.tempInsane,        'tempInsane não é setado automaticamente (Guardião decide)');

// ── LOSE_SANITY — loucura indefinida automática (SAN chega a 0) ──────────
group('executor — LOSE_SANITY loucura indefinida (SAN = 0)');

_load({ derived: {
  PV:  { value: 12, current: 12 },
  SAN: { value: 60, current: 3, max: 100 },
  PM:  { value: 12, current: 12 },
  Mitos: { value: 0 }, MOV: { value: 8 }, DB: { label: '+0' }, Build: { value: 0 }
}});
_exec.execute({ type: 'LOSE_SANITY', payload: { amount: 3 } });
assertEq(_get().derived.SAN.current, 0, 'LOSE_SANITY(3): SAN 3→0');
assert(_get().status.indefInsane,       'SAN=0 → indefInsane via ADD_STATUS');

// ── RECOVER_SANITY — remove indefInsane ──────────────────────────────────
group('executor — RECOVER_SANITY remove indefInsane');

_load({ derived: {
  PV:  { value: 12, current: 12 },
  SAN: { value: 60, current: 5, max: 100 },
  PM:  { value: 12, current: 12 },
  Mitos: { value: 0 }, MOV: { value: 8 }, DB: { label: '+0' }, Build: { value: 0 }
}, status: { indefInsane: true, incurablyInsane: false, majorWound: false, unconscious: false,
             dying: false, dead: false, tempInsane: false, sanLossesToday: 0 }});
_exec.execute({ type: 'RECOVER_SANITY', payload: { amount: 10 } });
assertEq(_get().derived.SAN.current, 15, 'RECOVER_SANITY(10): SAN 5→15');
assert(!_get().status.indefInsane,       'RECOVER_SANITY + indefInsane → REMOVE_STATUS{indefInsane}');

// ── Ação sem regras na state-machine → dispatch direto ────────────────────
group('executor — ação sem regras state-machine: dispatch normal');

_load();
_exec.execute({ type: 'SET_SKILL', payload: { name: 'Arqueologia', value: 50 } });
assertEq(_get().skills['Arqueologia'].value, 50,
  'executor: SET_SKILL sem regras → dispatch funciona normalmente');

_exec.execute({ type: 'SPEND_LUCK', payload: { amount: 10 } });
assertEq(_get().attributes.Sorte.value, 40,
  'executor: SPEND_LUCK → Sorte 50→40 (passthrough limpo)');

// ── sanLossesToday — acumula TODOS os valores (fix de regressão) ──────────
group('executor — sanLossesToday acumula todos os valores (não só > 4)');

_load();
_exec.execute({ type: 'LOSE_SANITY', payload: { amount: 2 } });
assertEq(_get().status.sanLossesToday, 2,
  'LOSE_SANITY(2): sanLossesToday=2 (antes só acumulava se >4)');

_exec.execute({ type: 'LOSE_SANITY', payload: { amount: 3 } });
assertEq(_get().status.sanLossesToday, 5,
  'LOSE_SANITY(3) acumulado: sanLossesToday=5');

_exec.execute({ type: 'LOSE_SANITY', payload: { amount: 1 } });
assertEq(_get().status.sanLossesToday, 6,
  'LOSE_SANITY(1) acumulado: sanLossesToday=6');

// ── Batch render — pipeline.beginTransaction/endTransaction exportados ─────
group('executor — renderPipeline expõe beginTransaction e endTransaction');

assert(typeof _pipeline.beginTransaction === 'function',
  'pipeline.beginTransaction é função');
assert(typeof _pipeline.endTransaction === 'function',
  'pipeline.endTransaction é função');

// Batch manual: renders dentro da transação devem ser suprimidos
let _batchRenderCount = 0;
_pipeline.register('__exec_batch_test__', function () { _batchRenderCount++; });

_pipeline.beginTransaction();
// Simula 2 renderForAction dentro da transação — apenas 1 flush esperado
_pipeline.renderForAction('APPLY_DAMAGE');   // renderiza 'vitals'
_pipeline.renderForAction('ADD_STATUS');     // também renderiza 'vitals'
_pipeline.endTransaction();                 // flush: 'vitals' uma vez... mas __exec_batch_test__ não está em RENDER_MAP

// Como __exec_batch_test__ não está em RENDER_MAP, não é chamado via renderForAction.
// O teste verifica que endTransaction não lança e que o contador não foi tocado
// (confirmando que a view não registrada em RENDER_MAP não é chamada acidentalmente).
assert(_batchRenderCount === 0,
  'view não no RENDER_MAP não é chamada durante endTransaction (deduplicação correta)');

// Agora verifica que renderAll() dentro de um SET_CHARACTER (maps 'ALL')
// vai colocar __exec_batch_test__ na fila durante batch
let _allBatchCount = 0;
_pipeline.register('__exec_all_test__', function () { _allBatchCount++; });

_pipeline.beginTransaction();
_pipeline.renderForAction('SET_CHARACTER');  // 'ALL' → queues all registered views
_pipeline.endTransaction();                 // flush: chama todas as views registradas

assert(_allBatchCount >= 1,
  'SET_CHARACTER→ALL durante batch: view registrada chamada no flush (endTransaction)');

// ── ADD_STATUS e REMOVE_STATUS têm reducers vivos ─────────────────────────
group('executor — ADD_STATUS e REMOVE_STATUS como reducers vivos');

_load();
_store.dispatch({ type: 'ADD_STATUS', payload: { status: 'majorWound' } });
assert(_get().status.majorWound === true, 'ADD_STATUS{majorWound}: store seta true');

_store.dispatch({ type: 'REMOVE_STATUS', payload: { status: 'majorWound' } });
assert(_get().status.majorWound === false, 'REMOVE_STATUS{majorWound}: store seta false');

_store.dispatch({ type: 'ADD_STATUS', payload: { status: 'indefInsane' } });
_store.dispatch({ type: 'ADD_STATUS', payload: { status: 'dying' } });
assert(_get().status.indefInsane === true, 'ADD_STATUS{indefInsane}: funciona independente');
assert(_get().status.dying === true,       'ADD_STATUS{dying}: funciona independente');

_store.dispatch({ type: 'REMOVE_STATUS', payload: { status: 'dying' } });
assert(_get().status.dying === false,      'REMOVE_STATUS{dying}: remove seletivamente');
assert(_get().status.indefInsane === true, 'REMOVE_STATUS{dying}: não afeta indefInsane');

// ── Imutabilidade: ADD_STATUS não muta estado anterior ─────────────────────
group('executor — ADD_STATUS imutabilidade');

_load();
const _stateBefore = _store.getState();
_store.dispatch({ type: 'ADD_STATUS', payload: { status: 'unconscious' } });
assert(_store.getState() !== _stateBefore,          'ADD_STATUS cria nova referência de estado');
assert(_stateBefore.character.status.unconscious !== true,
  'estado anterior não mutado por ADD_STATUS');
