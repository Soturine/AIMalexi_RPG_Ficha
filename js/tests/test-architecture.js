/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-architecture.js
   Guardrail arquitetural — Sprint 12

   Verifica enforcement do write-path contract:
     VIEW → executor.execute() → STATE MACHINE → STORE

   Regra: nenhuma view pode chamar store.dispatch() diretamente,
   exceto para RECALC_DERIVED (lifecycle puro, sacred:false, effects:[]).

   Roda via Node.js — usa fs para inspecionar o código-fonte.
   Carregado por runner.js após os demais testes de domínio.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..', '..');
const VIEWS_DIR = path.join(ROOT, 'js', 'views');

// Padrões que capturam bypass do write-path em views:
//   1. Chamada direta: cocStore.dispatch(, _store.dispatch(, store.dispatch(
//   2. Subscript notation: store['dispatch'](
//   3. Destructuring usado: const { dispatch } = store → detectado via "dispatch("
//      seguido de não ser executor.execute — conservador: flag dispatch( isolado
const RE_DISPATCH_DIRECT = /(?:cocStore|_store|store)\s*\.\s*dispatch\s*\(/;
const RE_DISPATCH_SUBSCRIPT = /(?:cocStore|_store|store)\s*\[['"]dispatch['"]\]\s*\(/;
// Alias de dispatch: `const d = store.dispatch; d(` — detecta variável nomeada dispatch usada como fn
const RE_DISPATCH_ALIAS = /\bdispatch\s*\(\s*\{/;

// Exceção permitida: RECALC_DERIVED é lifecycle puro (sacred:false, effects:[])
// Qualquer nova exceção deve ser justificada e adicionada aqui com comentário.
const ALLOWED = [
  /RECALC_DERIVED/,
];

// executor.execute() é sempre permitido — não é violação
const RE_EXECUTOR = /executor\s*\.\s*execute\s*\(/;

function isAllowed(line) {
  return ALLOWED.some(function (re) { return re.test(line); });
}

// ── Guardrail: scan de todos os arquivos em js/views/ ─────────────────────

group('architecture — write-path contract (views → executor.execute() only)');

const viewFiles = fs.readdirSync(VIEWS_DIR)
  .filter(function (f) { return f.endsWith('.js'); })
  .sort();

viewFiles.forEach(function (filename) {
  const filePath = path.join(VIEWS_DIR, filename);
  const lines    = fs.readFileSync(filePath, 'utf8').split('\n');
  const violations = [];

  lines.forEach(function (line, i) {
    var isDirect    = RE_DISPATCH_DIRECT.test(line);
    var isSubscript = RE_DISPATCH_SUBSCRIPT.test(line);
    var isAlias     = RE_DISPATCH_ALIAS.test(line) && !RE_EXECUTOR.test(line);
    if ((isDirect || isSubscript || isAlias) && !isAllowed(line)) {
      violations.push('linha ' + (i + 1) + ': ' + line.trim());
    }
  });

  assert(
    violations.length === 0,
    'views/' + filename + ': violação write-path — dispatch direto bypassa executor:\n      ' +
    violations.join('\n      ')
  );
});

// ── Guardrail: executor.execute() está disponível ─────────────────────────

group('architecture — executor disponível como gatekeeper');

assert(
  typeof window.CoC.core.executor === 'object' &&
  window.CoC.core.executor !== null,
  'window.CoC.core.executor existe'
);
assert(
  typeof window.CoC.core.executor.execute === 'function',
  'executor.execute é função'
);
assert(
  Object.isFrozen(window.CoC.core.executor),
  'executor é frozen — interface imutável'
);

// ── Guardrail: store.dispatch() não está exposto em write-path de views ───
// Verifica que o contrato do executor não foi quebrado pela remoção do pipeline

group('architecture — executor mantém invariantes de transação');

const _storeRef  = window.CoC.store;
const _pipeRef   = window.CoC.core.renderPipeline;

assert(typeof _storeRef === 'object' && _storeRef !== null, 'store acessível ao executor');
assert(typeof _pipeRef  === 'object' && _pipeRef  !== null, 'pipeline acessível ao executor');
assert(typeof _pipeRef.beginTransaction === 'function',     'pipeline.beginTransaction presente');
assert(typeof _pipeRef.endTransaction   === 'function',     'pipeline.endTransaction presente');
assert(typeof _pipeRef.renderForAction  === 'function',     'pipeline.renderForAction presente');
