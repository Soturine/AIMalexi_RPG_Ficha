/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-error-boundary.js
   Suíte de testes para js/core/safe-render.js

   Cobertura:
   - View que lança não impede execução das demais
   - View limpa executa normalmente
   - _errorStats: acúmulo correto por view
   - _errorStats: view limpa não aparece no mapa
   - Múltiplas views com falha são isoladas entre si
   - window.__cocDebug = true → relança o erro
   - window.__cocDebug = false (default) → absorve o erro
   - getErrorStats() retorna cópia (não referência mutável)

   Carregado por runner.js, que expõe assert(), assertEq() e group() como globais.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const createSR = window.CoC.createSafeRenderer;

// ─────────────────────────────────────────────────────────────────────────────
//  Isolamento — view que lança não impede as demais
// ─────────────────────────────────────────────────────────────────────────────
group('safeRender — isolamento de falhas');

const _sr1 = createSR();
const ran1 = [];

_sr1.safeRender('vitals',    function () { throw new Error('PV undefined'); });
_sr1.safeRender('inventory', function () { ran1.push('inventory'); });
_sr1.safeRender('spells',    function () { ran1.push('spells'); });

assertEq(ran1.length, 2,         'vitals lança → inventory e spells ainda executam');
assertEq(ran1[0], 'inventory',   'inventory executou após falha em vitals');
assertEq(ran1[1], 'spells',      'spells executou após falha em vitals');

// ─────────────────────────────────────────────────────────────────────────────
//  View limpa — execução normal
// ─────────────────────────────────────────────────────────────────────────────
group('safeRender — view limpa executa normalmente');

const _sr2 = createSR();
let _ran2 = false;

_sr2.safeRender('identity', function () { _ran2 = true; });
assert(_ran2, 'view sem erro: fn executada');
assertEq(Object.keys(_sr2.getErrorStats()).length, 0,
  'view limpa: nenhuma entrada em errorStats');

// ─────────────────────────────────────────────────────────────────────────────
//  _errorStats — acúmulo correto
// ─────────────────────────────────────────────────────────────────────────────
group('safeRender — _errorStats acúmulo');

const _sr3 = createSR();

_sr3.safeRender('skills', function () { throw new Error('boom'); });
assertEq(_sr3.getErrorStats()['skills'], 1, 'primeiro erro → count = 1');

_sr3.safeRender('skills', function () { throw new Error('boom again'); });
assertEq(_sr3.getErrorStats()['skills'], 2, 'segundo erro → count = 2');

_sr3.safeRender('vitals', function () { throw new Error('oops'); });
assertEq(_sr3.getErrorStats()['vitals'],  1, 'vitals: count independente de skills');
assertEq(_sr3.getErrorStats()['skills'], 2, 'skills: count não afetado por erro em vitals');

// View limpa não aparece no mapa de erros
_sr3.safeRender('background', function () {});
assert(!_sr3.getErrorStats()['background'], 'view limpa não aparece em errorStats');

// ─────────────────────────────────────────────────────────────────────────────
//  Múltiplas views com falha isoladas entre si
// ─────────────────────────────────────────────────────────────────────────────
group('safeRender — múltiplas falhas isoladas');

const _sr4 = createSR();
const ran4 = [];

_sr4.safeRender('a', function () { throw new Error('A failed'); });
_sr4.safeRender('b', function () { ran4.push('b'); throw new Error('B failed'); });
_sr4.safeRender('c', function () { ran4.push('c'); });

assertEq(ran4.length, 2,    'b e c executaram mesmo com a falhando');
assertEq(ran4[0], 'b',      'b executou (e depois lançou)');
assertEq(ran4[1], 'c',      'c executou após b lançar');
assertEq(_sr4.getErrorStats()['a'], 1, 'errorStats[a] = 1');
assertEq(_sr4.getErrorStats()['b'], 1, 'errorStats[b] = 1');
assert(!_sr4.getErrorStats()['c'],     'errorStats[c] inexistente (sem erro)');

// ─────────────────────────────────────────────────────────────────────────────
//  window.__cocDebug — absorve vs. relança
// ─────────────────────────────────────────────────────────────────────────────
group('safeRender — __cocDebug mode');

const _sr5 = createSR();

// Sem debug (default) — absorve
window.__cocDebug = false;
let _threw5 = false;
try {
  _sr5.safeRender('modal', function () { throw new Error('test err'); });
} catch (e) {
  _threw5 = true;
}
assert(!_threw5, '__cocDebug=false: erro absorvido (não propaga)');

// Com debug — relança
window.__cocDebug = true;
let _threwDebug = false;
let _debugMsg = '';
try {
  _sr5.safeRender('modal-debug', function () { throw new Error('debug err'); });
} catch (e) {
  _threwDebug = true;
  _debugMsg   = e.message;
}
assert(_threwDebug,                 '__cocDebug=true: erro relançado');
assertEq(_debugMsg, 'debug err',    '__cocDebug=true: mensagem original preservada');

// Cleanup — restaura para false para não afetar outros testes
window.__cocDebug = false;

// ─────────────────────────────────────────────────────────────────────────────
//  getErrorStats() — retorna cópia (não referência mutável)
// ─────────────────────────────────────────────────────────────────────────────
group('safeRender — getErrorStats retorna cópia');

const _sr6 = createSR();
_sr6.safeRender('x', function () { throw new Error('x'); });

const stats1 = _sr6.getErrorStats();
stats1['x'] = 999;   // muta a cópia

const stats2 = _sr6.getErrorStats();
assertEq(stats2['x'], 1, 'mutação da cópia não afeta o estado interno');
