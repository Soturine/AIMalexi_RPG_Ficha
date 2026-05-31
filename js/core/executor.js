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
    var sm        = window.CoC.core && window.CoC.core.stateMachine;
    var store     = window.CoC.store;
    var pipeline  = window.CoC.core && window.CoC.core.renderPipeline;
    var bus       = window.CoC.bus;
    var ontology  = window.CoC.core && window.CoC.core.eventOntology;

    // Fallback: sem state-machine ou pipeline, dispatch direto sem transação
    if (!sm || !pipeline || typeof pipeline.beginTransaction !== 'function') {
      store.dispatch(action);
      return;
    }

    // 1. Action Schema — valida boundary_randomness antes de qualquer mutação
    //    Ações com dados na borda (ex: ATTACK_RESOLVED, LOSE_SANITY) devem
    //    trazer os campos resolved_fields no payload. Emite aviso via bus
    //    sem interromper o fluxo (graceful degradation durante transição).
    if (ontology && typeof ontology.validatePayload === 'function') {
      var validation = ontology.validatePayload(action.type, action.payload);
      if (!validation.valid && bus && typeof bus.publish === 'function') {
        bus.publish('executor:payload-warning', {
          type:    action.type,
          missing: validation.missing,
          payload: action.payload,
        });
      }
    }

    // 2. Contexto PRE-mutação — guards recebem o estado ANTES do reducer rodar
    var ctx    = sm.buildContext(store.getState().character);
    var result = ctx
      ? sm.evaluate(action.type, action, ctx)
      : { transitions: [], effects: [] };

    var effects = result.effects || [];

    // 3. Trace do execute (ação + decisão SM) — separado do store:dispatch log
    if (bus && typeof bus.publish === 'function') {
      bus.publish('executor:action', {
        type:    action.type,
        payload: action.payload,
        effects: effects.map(function (e) { return e.type; }),
        ts:      (typeof performance !== 'undefined' ? performance.now() : Date.now()),
      });
    }

    // 4. Transação: ação primária + efeitos em lote, renders suprimidos até o fim
    pipeline.beginTransaction();
    try {
      store.dispatch(action);
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
