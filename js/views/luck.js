/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/luck.js
   M3.2 — Fatia: Sorte (SPEND_LUCK / gastar Sorte pós-rolagem)

   Responsabilidades:
     bind:   botão "Gastar Sorte" → dispatch SPEND_LUCK → store
     UI:     remove painel #post-roll-actions após gasto

   Side-effects via Bus (sem acoplamento ao investigator.js):
     "roll:logged"     → investigator.js logAndToast()
     "store:dispatch"  → investigator.js renderAttributes() + persistCurrent()
                         (subscription em boot, não aqui)

   Expõe: window.CoC.views.luck = { spendLuck }

   Depende de: js/core/{bus,store}.js  js/shared/ui-components.js ($)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  const { $ }       = window.CoC.ui;
  const cocStore    = window.CoC.store;
  const cocExecutor = window.CoC.core.executor;
  const bus         = window.CoC.bus;

  /**
   * spendLuck(entry, cost)
   * Chamado pelo painel pós-rolagem quando o jogador decide gastar Sorte
   * para transformar uma falha em sucesso Regular.
   *
   * @param {object} entry  — entrada do roll log (skillRaw, skill, etc.)
   * @param {number} cost   — pontos de Sorte a gastar (diff entre resultado e alvo)
   */
  function spendLuck(entry, cost) {
    if (!cocStore.getState().character?.attributes?.Sorte) return;

    // 1. Atualiza o estado no store (único ponto de mutação)
    cocExecutor.execute({ type: "SPEND_LUCK", payload: { amount: cost } });

    // 2. Remove painel pós-rolagem
    const panel = $("#post-roll-actions");
    if (panel) panel.remove();

    // 3. Registra no roll log (investigator.js logAndToast subscreve roll:logged)
    bus.publish("roll:logged", {
      skill:  `🍀 Sorte gasta: ${entry.skillRaw || entry.skill}`,
      target: cost,
      d100:   null,
      level:  "regular",
      note:   `${cost} pontos de Sorte usados para virar Regular`,
    });

    // renderAttributes() e persistCurrent() disparados via bus subscription
    // em boot() no investigator.js (pattern SPEND_LUCK → renderAttributes + persist)
  }

  window.CoC.views.luck = Object.freeze({ spendLuck });

})();
