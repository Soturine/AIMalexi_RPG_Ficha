/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/dispatch.js
   Dispatcher + cadeia de middleware — FIXA e pequena (anti middleware-inflation).

   M0.5: ESQUELETO.
   M1: cadeia trace → validate → reduce → persist → sync → log → notify.
       Reducers PUROS, reusando window.CoC.rules. Único ponto de mutação do estado.

   Risco vigiado: middleware inflation (cadeia opaca, tracing quebrado).
   Mitigação: trace desde o dia 1 (js/dev/trace.js) + cadeia curta e fixa.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.dispatch = window.CoC.dispatch || null;   // preenchido no M1
