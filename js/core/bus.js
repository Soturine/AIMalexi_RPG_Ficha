/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/bus.js
   Event Bus — DESACOPLADO da Store (evita "Redux monstruoso").

   M0.5: ESQUELETO.
   M1: pub/sub para eventos transversais (roll:resolved, san:lost, status:changed)
       que alimentam dashboard, sanity-fx, háptico e session_log SEM acoplar à
       store principal.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.bus = window.CoC.bus || null;   // preenchido no M1
