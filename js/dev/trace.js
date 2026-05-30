/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/dev/trace.js
   Dev Trace — console trace de cada dispatch via bus.

   Ativo quando: window.__cocTrace === true  (ou localStorage cocTrace = "1")
   Desativar em runtime: window.__cocTrace = false

   Subscreve bus('store:dispatch'). Removível sem tocar no store.

   Depende de: js/core/bus.js, js/core/event-log.js (carregados antes)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC      = window.CoC      || {};
window.CoC.dev  = window.CoC.dev  || {};

(function () {

  // Persiste preferência de trace entre reloads
  function isEnabled() {
    return window.__cocTrace === true ||
      (typeof localStorage !== "undefined" && localStorage.getItem("cocTrace") === "1");
  }

  window.CoC.bus.subscribe("store:dispatch", function (event) {
    if (!isEnabled()) return;
    const { action, changed, durationMs } = event;
    const label = (changed ? "✎" : "·") + " " + action.type +
      "  (" + durationMs.toFixed(2) + "ms)";

    if (typeof console.groupCollapsed === "function") {
      console.groupCollapsed("[CoC store] " + label);
      console.log("payload:", action.payload);
      console.log("changed:", changed);
      const log = window.CoC.eventLog;
      if (log) console.log("log size:", log.getLog().length);
      console.groupEnd();
    } else {
      console.log("[CoC store]", label, action.payload);
    }
  });

  // Expõe helpers de console para debug manual durante M3
  window.CoC.dev.trace = Object.freeze({
    enable()   { window.__cocTrace = true;  localStorage.setItem("cocTrace", "1"); },
    disable()  { window.__cocTrace = false; localStorage.removeItem("cocTrace");   },
    isEnabled,
    // Dump rápido das últimas N ações
    tail(n) {
      const log = window.CoC.eventLog;
      if (!log) { console.warn("eventLog não disponível"); return; }
      console.table(log.tail(n || 10));
    },
    metrics() {
      const store = window.CoC.store;
      const log   = window.CoC.eventLog;
      console.group("[CoC] Métricas");
      if (store) console.table(store.getMetrics());
      if (log)   console.table(log.getMetrics());
      console.groupEnd();
    }
  });

})();
