/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/schema/index.js
   Contratos de payload por action (validação).

   M0.5: ESQUELETO.
   M1: valida o payload de cada intent antes do reduce (ex.: APPLY_DAMAGE exige
       amount:number ≥ 0; SET_SKILL exige name:string + value 0..99). Rejeita
       malformados. Mesma disciplina na ingestão de sync (não confiar no remoto).
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.schema = window.CoC.schema || null;   // preenchido no M1
