/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/dev/perf.js
   Instrumentação de performance (flag off em produção).

   M0.5: ESQUELETO.
   M1+: mede tempo de dispatch, custo de render por slice e FPS no device-alvo;
        expõe regressões cedo. Metas da Constituição: 60fps, abrir instantâneo
        em celular antigo, "tela branca = falha crítica".
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.dev = window.CoC.dev || {};
window.CoC.dev.perf = window.CoC.dev.perf || null;   // preenchido no M1+
