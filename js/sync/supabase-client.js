/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/sync/supabase-client.js
   Cliente Supabase (vendado, atrás de flag).

   M0.5: ESQUELETO.
   M5: inicializa @supabase/supabase-js (js/vendor/supabase.js), auth anônima +
       entrada por link/QR/PIN. Supabase = transporte/persistência, NUNCA runtime
       (o runtime é window.CoC.store). Se cair, o jogo não percebe.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.sync = window.CoC.sync || {};
window.CoC.sync.client = window.CoC.sync.client || null;   // preenchido no M5
