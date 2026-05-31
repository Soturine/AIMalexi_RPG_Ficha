/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/event-log.js
   Log append-only de ações do store — observabilidade antes do M3.

   Subscreve bus('store:dispatch'). Desacoplado do store: pode ser removido
   em produção sem tocar em nenhum módulo de domínio.

   V1 — cada entrada: { id, ts, type, payload, durationMs, changed }
   Sem: undo, redo, snapshots, time-travel (adiar até necessidade comprovada).

   API pública (window.CoC.eventLog):
     getLog()      → cópia do log completo (array)
     tail(n)       → últimas n entradas
     getMetrics()  → { dispatches, effective, noop, avgDurationMs }
     clear()       → limpa log e reseta contadores

   Depende de: js/core/bus.js (carregado antes)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  const MAX_ENTRIES = 500;

  let _log     = [];
  let _seq     = 0;
  let _metrics = { dispatches: 0, effective: 0, noop: 0, totalDurationMs: 0 };

  // Subscreve os eventos publicados pelo store.dispatch
  window.CoC.bus.subscribe("store:dispatch", function (event) {
    const { action, changed, durationMs } = event;

    _metrics.dispatches++;
    if (changed) _metrics.effective++;
    else         _metrics.noop++;
    _metrics.totalDurationMs += durationMs || 0;

    _log.push({
      id:         ++_seq,
      ts:         Date.now(),
      type:       action.type,
      payload:    action.payload,
      durationMs: durationMs || 0,
      changed:    changed,
    });

    // Descarta entradas antigas se ultrapassar o limite
    if (_log.length > MAX_ENTRIES) _log = _log.slice(-MAX_ENTRIES);
  });

  function getLog() {
    return _log.slice();
  }

  function tail(n) {
    return _log.slice(-Math.max(1, n | 0));
  }

  function clear() {
    _log     = [];
    _seq     = 0;
    _metrics = { dispatches: 0, effective: 0, noop: 0, totalDurationMs: 0 };
  }

  function getMetrics() {
    const avg = _metrics.dispatches > 0
      ? _metrics.totalDurationMs / _metrics.dispatches
      : 0;
    return Object.assign({}, _metrics, { avgDurationMs: Math.round(avg * 100) / 100 });
  }

  window.CoC.eventLog = Object.freeze({ getLog, tail, clear, getMetrics });

})();
