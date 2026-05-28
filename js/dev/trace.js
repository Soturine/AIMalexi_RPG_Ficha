/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/dev/trace.js
   Dev Trace Middleware — observabilidade desde o dia 1 (flag off em produção).

   M0.5: ESQUELETO.
   M1: em cada dispatch, emite:
       console.groupCollapsed(action.type)
         · timings por middleware
         · diff do estado (antes/depois)
         · reducers afetados
         · "sync queued?"

   Razão: middleware inflation mata projetos Redux-like — sem trace, o fluxo
   fica opaco e o debug vira inferno. Por isso ele nasce junto com o dispatcher.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.dev = window.CoC.dev || {};
window.CoC.dev.trace = window.CoC.dev.trace || null;   // preenchido no M1
