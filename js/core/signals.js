/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/signals.js
   Sinal reativo mínimo — get / set / subscribe.
   API deliberadamente restrita: sem computed, sem effect, sem batch.
   Quando uma necessidade comprovada surgir, expanda aqui.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

/**
 * createSignal(initialValue) → { get, set, subscribe }
 *
 *   get()         → valor atual
 *   set(v)        → atualiza e notifica listeners (compara por referência)
 *   subscribe(fn) → registra listener; retorna função de cancelamento
 */
window.CoC.createSignal = function createSignal(initialValue) {
  let value = initialValue;
  const listeners = [];

  function get() {
    return value;
  }

  function set(newValue) {
    if (newValue === value) return;
    value = newValue;
    // Cópia defensiva: permite que um listener cancele a si mesmo durante notify
    listeners.slice().forEach(function (fn) { fn(value); });
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  return { get, set, subscribe };
};
