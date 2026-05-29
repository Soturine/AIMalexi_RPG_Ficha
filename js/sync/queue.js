/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/sync/queue.js
   Fila de intents offline (reenvio na reconexão).

   M0.5: ESQUELETO (atrás de flag — sync não plugado).
   M5: enfileira actions/intents quando offline e reenvia ao voltar a conexão.
       Base do offline-first + reconexão automática. Persistida no storage local.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.sync = window.CoC.sync || {};
window.CoC.sync.queue = window.CoC.sync.queue || null;   // preenchido no M5
