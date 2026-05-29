/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/sync/syncMiddleware.js
   Middleware de sincronização (atrás de flag).

   M0.5: ESQUELETO.
   M5: empurra/recebe deltas entre o Store local e o Supabase (diffs por campo
       sujo, debounce). Campos SAGRADOS (ver window.CoC.actions.SACRED) passam
       pela autoridade do Mestre (host autoritativo). A UI jamais lê do Supabase.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.sync = window.CoC.sync || {};
window.CoC.sync.middleware = window.CoC.sync.middleware || null;   // preenchido no M5
