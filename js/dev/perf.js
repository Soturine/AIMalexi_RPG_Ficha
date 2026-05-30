/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/dev/perf.js
   Dev Performance — resumo de métricas para o M3 (Strangler Pattern).

   Expõe window.CoC.dev.perf com helpers de console.
   Não coleta dados sozinho — consome o store.getMetrics() e eventLog.getMetrics().

   Depende de: js/core/store.js, js/core/event-log.js (carregados antes)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC      = window.CoC      || {};
window.CoC.dev  = window.CoC.dev  || {};

(function () {

  /**
   * report() — imprime resumo completo no console.
   * Útil para comparar "antes/depois" de cada fatia do Strangler Pattern.
   */
  function report() {
    const store = window.CoC.store;
    const log   = window.CoC.eventLog;
    if (!store && !log) { console.warn("[CoC perf] módulos não disponíveis"); return; }

    console.group("[CoC perf] Relatório");

    if (store) {
      const m = store.getMetrics();
      console.log(
        "store — dispatches: %d | efetivos: %d | no-ops: %d | avg: %sms",
        m.dispatches, m.effective, m.noop, m.avgDurationMs
      );
    }

    if (log) {
      const m = log.getMetrics();
      console.log(
        "event-log — entradas: %d | efetivas: %d | no-ops: %d | avg: %sms",
        m.dispatches, m.effective, m.noop, m.avgDurationMs
      );
    }

    console.groupEnd();
  }

  /**
   * snapshot(label) — grava estado atual das métricas para comparação posterior.
   * Uso típico durante M3:
   *   perf.snapshot("antes-fatia-1")
   *   ... extrair renderSkills() ...
   *   perf.snapshot("depois-fatia-1")
   *   perf.diff("antes-fatia-1", "depois-fatia-1")
   */
  const _snapshots = {};

  function snapshot(label) {
    const store = window.CoC.store;
    const log   = window.CoC.eventLog;
    _snapshots[label] = {
      ts:    Date.now(),
      store: store ? store.getMetrics() : null,
      log:   log   ? log.getMetrics()   : null,
    };
    console.log("[CoC perf] snapshot salvo:", label);
  }

  function diff(labelA, labelB) {
    const a = _snapshots[labelA];
    const b = _snapshots[labelB];
    if (!a || !b) { console.warn("[CoC perf] snapshot não encontrado"); return; }

    console.group("[CoC perf] diff " + labelA + " → " + labelB);
    const dt = ((b.ts - a.ts) / 1000).toFixed(1);
    console.log("intervalo: " + dt + "s");

    if (a.store && b.store) {
      console.table({
        dispatches:    { antes: a.store.dispatches,    depois: b.store.dispatches,    delta: b.store.dispatches    - a.store.dispatches },
        effective:     { antes: a.store.effective,     depois: b.store.effective,     delta: b.store.effective     - a.store.effective },
        noop:          { antes: a.store.noop,          depois: b.store.noop,          delta: b.store.noop          - a.store.noop },
        avgDurationMs: { antes: a.store.avgDurationMs, depois: b.store.avgDurationMs, delta: Math.round((b.store.avgDurationMs - a.store.avgDurationMs) * 100) / 100 },
      });
    }
    console.groupEnd();
  }

  window.CoC.dev.perf = Object.freeze({ report, snapshot, diff });

})();
