/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/store.js
   Store reativo — o RUNTIME LOCAL SOBERANO (a UI lê daqui, nunca do Supabase).

   M0.5: ESQUELETO.
   M1: árvore de signals por SLICE (character / session / rollLog / ui).
       - Leitura imutável: getState() → Proxy readonly (barato);
         snapshot() → structuredClone + Object.freeze só em fronteiras (export/sync).
       - Granularidade no nível de SLICE, não de microcampo.

   Riscos vigiados:
   - Store inflation: se não precisa sobreviver a reload, NÃO entra no Store
     principal (vai p/ estado local do componente). Futuro: store/{domain,
     session, sync, ui-persistent}.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.store = window.CoC.store || null;   // preenchido no M1
