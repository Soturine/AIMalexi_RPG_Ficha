/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/bus.js
   Event Bus pub/sub — desacoplado da Store.
   Usado para eventos transversais (roll:resolved, san:lost, status:changed)
   que alimentam dashboard, sanity-fx e session_log SEM acoplar à store.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  const channels = Object.create(null);

  /**
   * publish(event, data) — dispara todos os listeners do canal.
   */
  function publish(event, data) {
    const fns = channels[event];
    if (!fns || fns.length === 0) return;
    fns.slice().forEach(function (fn) { fn(data); });
  }

  /**
   * subscribe(event, fn) — registra listener; retorna função de cancelamento.
   */
  function subscribe(event, fn) {
    if (!channels[event]) channels[event] = [];
    channels[event].push(fn);
    return function unsubscribe() {
      const ch = channels[event];
      if (!ch) return;
      const i = ch.indexOf(fn);
      if (i >= 0) ch.splice(i, 1);
    };
  }

  /**
   * clear(event?) — remove todos os listeners de um canal (ou de todos os canais).
   */
  function clear(event) {
    if (event) {
      channels[event] = [];
    } else {
      Object.keys(channels).forEach(function (k) { channels[k] = []; });
    }
  }

  window.CoC.bus = Object.freeze({ publish, subscribe, clear });

})();
