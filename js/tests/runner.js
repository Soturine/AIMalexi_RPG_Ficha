#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/runner.js
   Runner de testes — executável via Node.js sem dependências externas.

   Uso: node js/tests/runner.js
   Saída: . para aprovado, F para falha; relatório final com contagem.
   Exit code: 0 se tudo passou, 1 se algum falhou (CI-safe).

   Como funciona:
   - Define global.window = global para que os IIFEs do browser
     (window.CoC.rules = {}) funcionem em Node.js sem modificação.
   - Carrega os arquivos de fonte antes das suítes de teste.
   - assert() e assertEq() são globais — acessíveis em test-*.js sem import.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ── Shimming do ambiente browser ──────────────────────────────────────────
global.window    = global;
global.self      = global;   // dice.js usa self.crypto.getRandomValues
global.performance = global.performance || { now: () => Date.now() };

// ── Carregamento dos arquivos de fonte ────────────────────────────────────
const path = require('path');
const root = path.join(__dirname, '..', '..');

function load(rel) {
  require(path.join(root, rel));
}

// Ordem importa: CoCData antes das regras (calcDB lê window.CoCData em call time)
load('data/damage-bonus-table.js');
load('js/engine/coc7e-rules.js');
load('js/engine/dice.js');

// Core: signals → bus → store → schema → persist-middleware → safe-render → event-log → render-pipeline
load('js/core/signals.js');
load('js/core/bus.js');
load('js/core/store.js');
load('js/core/schema.js');
load('js/core/persist-middleware.js');
load('js/core/safe-render.js');
load('js/core/event-log.js');
load('js/core/event-ontology.js');
load('js/core/render-pipeline.js');
load('js/core/state-machine.js');
load('js/core/executor.js');
load('js/core/replay-consumer.js');

// Views (somente o necessário para testes; DOM não é chamado no carregamento)
load('js/views/combat.js');

// ── Framework de assertions ───────────────────────────────────────────────
let _passed = 0, _failed = 0;
const _failures = [];

/** Asserta que `condition` é truthy. Marca F e registra `label` se falhar. */
global.assert = function assert(condition, label) {
  if (condition) {
    _passed++;
    process.stdout.write('.');
  } else {
    _failed++;
    _failures.push(label);
    process.stdout.write('F');
  }
};

/** Asserta igualdade estrita (===). Exibe expected/received no relatório. */
global.assertEq = function assertEq(actual, expected, label) {
  if (actual === expected) {
    _passed++;
    process.stdout.write('.');
  } else {
    _failed++;
    _failures.push(
      `${label}\n    esperado : ${JSON.stringify(expected)}` +
      `\n    recebido : ${JSON.stringify(actual)}`
    );
    process.stdout.write('F');
  }
};

/** Cabeçalho de grupo — imprime nome da seção de testes. */
global.group = function group(name) {
  process.stdout.write(`\n\n  ${name}\n  `);
};

// ── Execução das suítes ───────────────────────────────────────────────────
const t0 = Date.now();
load('js/tests/test-rules.js');
load('js/tests/test-store.js');
load('js/tests/test-dice.js');
load('js/tests/test-schema.js');
load('js/tests/test-persist-middleware.js');
load('js/tests/test-error-boundary.js');
load('js/tests/test-combat.js');
load('js/tests/test-event-log.js');
load('js/tests/test-render-pipeline.js');
load('js/tests/test-event-ontology.js');
load('js/tests/test-state-machine.js');
load('js/tests/test-executor.js');
load('js/tests/test-replay.js');
load('js/tests/test-architecture.js');
const elapsed = Date.now() - t0;

// ── Relatório final ───────────────────────────────────────────────────────
const total = _passed + _failed;
const ok    = _failed === 0;

process.stdout.write('\n\n');
if (_failures.length) {
  process.stderr.write('FAILURES:\n');
  _failures.forEach(msg => process.stderr.write(`  ✗ ${msg}\n`));
  process.stdout.write('\n');
}
console.log(
  `${ok ? '✅' : '❌'}  ${_passed}/${total} passed` +
  (_failed > 0 ? ` · ${_failed} FAILED` : '') +
  `  (${elapsed}ms)`
);
process.exit(ok ? 0 : 1);
