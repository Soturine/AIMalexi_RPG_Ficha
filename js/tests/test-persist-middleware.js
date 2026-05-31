/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-persist-middleware.js
   Suíte de testes para js/core/persist-middleware.js

   Cobertura:
   - PERSIST_ACTIONS disparam save
   - Ações fora da whitelist não disparam save
   - event.changed=false não dispara save
   - JSON diff: mudança semântica → save; mesmo conteúdo → skip
   - saveCharacter recebe exatamente o character do estado atual
   - Erro em saveCharacter é absorvido (não propaga)
   - dispose() cancela subscrição
   - updateBaseline() sincroniza baseline manual

   Usa bus e store reais (já carregados pelo runner). Mocka getState e saveCharacter.
   Carregado por runner.js, que expõe assert(), assertEq() e group() como globais.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const _bus = window.CoC.bus;
const _createPM = window.CoC.createPersistMiddleware;

// Helpers
function _makeState(char) {
  return { character: char };
}

// Limpa listeners do bus após cada grupo para isolar testes
function _withMiddleware(charFn, saveFn) {
  let _currentState = { character: null };
  const pm = _createPM({
    bus:           _bus,
    getState:      function () { return _currentState; },
    saveCharacter: saveFn || function () {}
  });
  pm.init();
  return {
    pm,
    setState: function (char) { _currentState = { character: char }; },
    dispose:  function () { pm.dispose(); }
  };
}

function _fireDispatch(actionType, changed) {
  _bus.publish('store:dispatch', {
    action:  { type: actionType, payload: {} },
    changed: changed !== false   // default true
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ações na whitelist → save
// ─────────────────────────────────────────────────────────────────────────────
group('persistMiddleware — PERSIST_ACTIONS disparam save');

const _char1 = { id: null, name: 'Mabel', derived: { PV: { current: 8 } } };
let _saves1 = [];
const _ctx1 = _withMiddleware(null, function (c) { _saves1.push(c); });
_ctx1.setState(_char1);

_fireDispatch('APPLY_DAMAGE');
assertEq(_saves1.length, 1, 'APPLY_DAMAGE → save chamado');
assertEq(_saves1[0].name, 'Mabel', 'saveCharacter recebe character do estado atual');

// Novo conteúdo → novo save
const _char1b = { id: null, name: 'Mabel', derived: { PV: { current: 5 } } };
_ctx1.setState(_char1b);
_fireDispatch('HEAL_DAMAGE');
assertEq(_saves1.length, 2, 'HEAL_DAMAGE com novo conteúdo → segundo save');

_ctx1.dispose();

// ─────────────────────────────────────────────────────────────────────────────
//  Ações fora da whitelist → sem save
// ─────────────────────────────────────────────────────────────────────────────
group('persistMiddleware — ações não-PERSIST não salvam');

let _saves2 = [];
const _ctx2 = _withMiddleware(null, function (c) { _saves2.push(c); });
_ctx2.setState({ id: '001', name: 'Test' });

_fireDispatch('SET_CHARACTER_ID');     // excluído para evitar loop
_fireDispatch('UNKNOWN_ACTION');       // ação arbitrária
_fireDispatch('UI_TAB_CHANGED');       // hipotética UI action
assertEq(_saves2.length, 0, 'SET_CHARACTER_ID / ações fora da lista → zero saves');

_ctx2.dispose();

// ─────────────────────────────────────────────────────────────────────────────
//  event.changed = false → sem save
// ─────────────────────────────────────────────────────────────────────────────
group('persistMiddleware — event.changed=false ignorado');

let _saves3 = [];
const _ctx3 = _withMiddleware(null, function (c) { _saves3.push(c); });
_ctx3.setState({ id: null, name: 'X' });

// Dispara com changed=false (reducer retornou mesmo estado)
_bus.publish('store:dispatch', {
  action:  { type: 'APPLY_DAMAGE', payload: {} },
  changed: false
});
assertEq(_saves3.length, 0, 'event.changed=false → save não chamado');

_ctx3.dispose();

// ─────────────────────────────────────────────────────────────────────────────
//  JSON diff — mesmo conteúdo → skip
// ─────────────────────────────────────────────────────────────────────────────
group('persistMiddleware — JSON diff evita saves redundantes');

const _sharedChar = { id: 'x', derived: { PV: { current: 10 } } };
let _saves4 = [];
const _ctx4 = _withMiddleware(null, function (c) { _saves4.push(c); });
_ctx4.setState(_sharedChar);

_fireDispatch('APPLY_DAMAGE');   // primeiro dispatch → save (baseline vazia)
assertEq(_saves4.length, 1, 'primeiro dispatch → save');

_fireDispatch('APPLY_DAMAGE');   // mesmo estado → JSON diff detecta → skip
assertEq(_saves4.length, 1, 'segundo dispatch com mesmo conteúdo → sem save extra (diff)');

// Muda conteúdo → save ocorre
_ctx4.setState({ id: 'x', derived: { PV: { current: 7 } } });
_fireDispatch('APPLY_DAMAGE');
assertEq(_saves4.length, 2, 'conteúdo diferente → save chamado');

_ctx4.dispose();

// ─────────────────────────────────────────────────────────────────────────────
//  Erro em saveCharacter é absorvido
// ─────────────────────────────────────────────────────────────────────────────
group('persistMiddleware — erro em saveCharacter não propaga');

const _ctx5 = _withMiddleware(null, function () { throw new Error('disk full'); });
_ctx5.setState({ id: null, name: 'Crash' });

let _threw = false;
try {
  _fireDispatch('LOSE_SANITY');
} catch (e) {
  _threw = true;
}
assert(!_threw, 'erro em saveCharacter não propaga para o caller do dispatch');
_ctx5.dispose();

// ─────────────────────────────────────────────────────────────────────────────
//  dispose() cancela subscrição
// ─────────────────────────────────────────────────────────────────────────────
group('persistMiddleware — dispose() cancela listener');

let _saves6 = [];
const _ctx6 = _withMiddleware(null, function (c) { _saves6.push(c); });
_ctx6.setState({ id: null, name: 'Disposed' });

_fireDispatch('ADD_SPELL');
assertEq(_saves6.length, 1, 'before dispose: save chamado');

_ctx6.dispose();
_ctx6.setState({ id: null, name: 'Disposed Changed' });
_fireDispatch('ADD_SPELL');
assertEq(_saves6.length, 1, 'after dispose: save NÃO chamado');

// ─────────────────────────────────────────────────────────────────────────────
//  updateBaseline() sincroniza baseline para próximo dispatch
// ─────────────────────────────────────────────────────────────────────────────
group('persistMiddleware — updateBaseline()');

const _baseChar = { id: null, name: 'Alice' };
let _saves7 = [];
const _ctx7 = _withMiddleware(null, function (c) { _saves7.push(c); });
_ctx7.setState(_baseChar);

// Disparo inicial — salva e baseline = _baseChar
_fireDispatch('ADD_INVENTORY_ITEM');
assertEq(_saves7.length, 1, 'primeiro dispatch → save');

// Sem mudar estado, dispara de novo → diff detecta, skip
_fireDispatch('ADD_INVENTORY_ITEM');
assertEq(_saves7.length, 1, 'mesmo estado → skip');

// Simula save manual externo (baseline desatualizada antes de updateBaseline):
// muda estado para _baseChar2 mas NÃO dispara updateBaseline
const _baseChar2 = { id: 'ext-001', name: 'Alice' };  // id mudou fora do middleware
_ctx7.setState(_baseChar2);
// Dispara um action — middleware vai ver JSON diferente → save (correto)
_fireDispatch('ADD_INVENTORY_ITEM');
assertEq(_saves7.length, 2, 'estado mudou externamente → save ocorre');

// Agora atualiza baseline
_ctx7.pm.updateBaseline();
// Disparo com mesmo estado → skip por diff
_fireDispatch('ADD_INVENTORY_ITEM');
assertEq(_saves7.length, 2, 'após updateBaseline: mesmo estado → skip');

_ctx7.dispose();
