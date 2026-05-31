/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/safe-render.js
   Error boundary para o pipeline de renderização de views.

   Isola falhas de render individuais: se uma view lança, as demais
   continuam sendo renderizadas normalmente. Contador por view habilita
   diagnóstico sem UI extra.

   Uso:
     const { safeRender, getErrorStats } = window.CoC.createSafeRenderer();
     safeRender('vitals',    () => views.vitals.render());
     safeRender('inventory', () => views.inventory.render());
     // se vitals lança, inventory ainda é executado

   Dev mode (window.__cocDebug = true): erros são relançados após registro.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  function createSafeRenderer() {
    const _errorStats = Object.create(null);

    /**
     * Executa fn() isolando exceções.
     * @param {string}   viewName  — identificador para log e _errorStats
     * @param {function} fn        — callback de render a executar
     */
    function safeRender(viewName, fn) {
      try {
        fn();
      } catch (e) {
        _errorStats[viewName] = (_errorStats[viewName] || 0) + 1;
        console.error('[render:' + viewName + '] ' + (e && e.message || String(e)), e);
        if (window.__cocDebug) throw e;
      }
    }

    /** Retorna cópia snapshot dos contadores de erro por view. */
    function getErrorStats() {
      return Object.assign(Object.create(null), _errorStats);
    }

    return Object.freeze({ safeRender, getErrorStats });
  }

  window.CoC.createSafeRenderer = createSafeRenderer;

})();
