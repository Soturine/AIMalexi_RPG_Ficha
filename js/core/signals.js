/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/signals.js
   Ponte para a reatividade vendada (Preact Signals).

   M0.5: ESQUELETO — não plugado em lugar nenhum.
   M1: re-exporta signal/computed/effect/batch de js/vendor/signals-core.js e
       expõe em window.CoC.signals.

   Decisão travada: usar Preact Signals vendado — NÃO fazer signal próprio
   (debugging reativo/batching/subscriptions são traiçoeiros; não compensa).
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.signals = window.CoC.signals || null;   // preenchido no M1
