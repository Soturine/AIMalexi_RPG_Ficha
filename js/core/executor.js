/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/executor.js
   Executor transacional — Sprint 9

   Resolve o dual-write path entre store.js (mutação bruta de HP/SAN/PM)
   e state-machine.js (decisão de status narrativo: unconscious, dying, etc.).

   execute(action):
     1. Captura contexto PRE-mutação (guards calculam "o que VAI acontecer")
     2. Avalia state-machine → { effects: [ADD_STATUS{unconscious}, ...] }
     3. Abre transação de render no pipeline (suprime renders intermediários)
     4. Despacha ação primária → reducer aplica mutação bruta
     5. Despacha cada efeito → reducer ADD_STATUS / REMOVE_STATUS aplicam status
     6. Fecha transação → pipeline renderiza views afetadas UMA única vez

   Dependências: js/core/state-machine.js, js/core/store.js,
                 js/core/render-pipeline.js (carregados antes)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC      = window.CoC      || {};
window.CoC.core = window.CoC.core || {};

(function () {

  function execute(action) {
    var sm       = window.CoC.core && window.CoC.core.stateMachine;
    var store    = window.CoC.store;
    var pipeline = window.CoC.core && window.CoC.core.renderPipeline;

    // Fallback: sem state-machine ou pipeline, dispatch direto sem transação
    if (!sm || !pipeline || typeof pipeline.beginTransaction !== 'function') {
      store.dispatch(action);
      return;
    }

    // 1. Contexto PRE-mutação — guards recebem o estado ANTES do reducer rodar
    var ctx    = sm.buildContext(store.getState().character);
    var result = ctx
      ? sm.evaluate(action.type, action, ctx)
      : { transitions: [], effects: [] };

    // 2. Transação: ação primária + efeitos em lote, renders suprimidos até o fim
    pipeline.beginTransaction();
    try {
      store.dispatch(action);
      var effects = result.effects || [];
      for (var i = 0; i < effects.length; i++) {
        store.dispatch(effects[i]);
      }
    } finally {
      // Sempre fecha a transação, mesmo se um dispatch lançar
      pipeline.endTransaction();
    }
  }

  window.CoC.core.executor = Object.freeze({ execute: execute });

})();
