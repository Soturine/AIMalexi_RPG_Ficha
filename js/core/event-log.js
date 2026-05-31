/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/event-log.js
   Duas APIs de observabilidade complementares:

   window.CoC.eventLog  — "storeEvents": fatos consumados (o que mudou)
     Subscreve bus('store:dispatch'). Cada entrada registra o resultado
     concreto de uma mutação: { type, payload, changed, durationMs }.
     Responde: "o que o store absorveu?"

   window.CoC.executionTrace — "executionTrace": decisões de domínio (o por quê)
     Subscreve bus('executor:action'). Cada entrada registra a decisão
     da state machine: { type, payload, effects[] }.
     Responde: "o que o executor decidiu fazer e quais efeitos gerou?"

   Distinção crítica para debug de combate/sanidade:
     storeEvents  → APPLY_DAMAGE + ADD_STATUS{majorWound} + ADD_STATUS{unconscious}
     executionTrace → APPLY_DAMAGE → effects: [ADD_STATUS{majorWound}, ADD_STATUS{unconscious}]

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

  // ── executionTrace — decisões de domínio (executor:action) ───────────────
  // Separado do eventLog: captura o MOTIVO de uma mudança, não só o fato.
  // Cada entrada: { id, ts, type, payload, effects[] }
  var _trace    = [];
  var _traceSeq = 0;

  window.CoC.bus.subscribe('executor:action', function (ev) {
    _trace.push({
      id:      ++_traceSeq,
      ts:      ev.ts || Date.now(),
      type:    ev.type,
      payload: ev.payload,
      effects: ev.effects || [],
    });
    if (_trace.length > MAX_ENTRIES) _trace = _trace.slice(-MAX_ENTRIES);
  });

  window.CoC.executionTrace = Object.freeze({
    /** Cópia do trace completo. */
    getTrace: function () { return _trace.slice(); },
    /** Últimas n decisões do executor. */
    tail:     function (n) { return _trace.slice(-Math.max(1, n | 0)); },
    /** Limpa o trace. */
    clear:    function () { _trace = []; _traceSeq = 0; },
  });

})();
