/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/shared/validators.js
   Validação de pontos em tempo real + alerta de saída
   Atribui a window.CoC.validators
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  // ─── Validação de Pontos de Ocupação / Interesse ──────────────────────
  /**
   * Calcula o estado do badge: cor e texto.
   *
   * @param {number} spent - pontos gastos
   * @param {number} budget - orçamento total
   * @returns {{ level: "ok"|"warn"|"err"|"under", label: string, percent: number }}
   */
  function pointsBadgeState(spent, budget) {
    spent = Number(spent) || 0;
    budget = Number(budget) || 0;
    if (budget === 0) {
      return { level: "under", label: `${spent} pontos`, percent: 0 };
    }
    const remaining = budget - spent;
    const percent = Math.round((spent / budget) * 100);

    if (spent === budget) {
      return { level: "ok", label: `${spent} / ${budget} (perfeito)`, percent };
    }
    if (spent > budget) {
      return { level: "err", label: `${spent} / ${budget} (${remaining} excedente)`, percent };
    }
    if (percent >= 80) {
      return { level: "warn", label: `${spent} / ${budget} (faltam ${remaining})`, percent };
    }
    return { level: "under", label: `${spent} / ${budget} (faltam ${remaining})`, percent };
  }

  /**
   * Aplica visualmente o estado a um elemento badge.
   * Adiciona classes 'ok', 'warn', 'err'; atualiza textContent.
   */
  function applyBadge(badgeEl, state) {
    if (!badgeEl) return;
    badgeEl.classList.remove("ok", "warn", "err");
    if (state.level === "ok")   badgeEl.classList.add("ok");
    if (state.level === "warn") badgeEl.classList.add("warn");
    if (state.level === "err")  badgeEl.classList.add("err");
    badgeEl.textContent = state.label;
  }

  // ─── Validação de Cap por Perícia ────────────────────────────────────
  /**
   * Verifica se um valor de perícia respeita o cap da criação.
   * Regra: 75% padrão, 90% com aprovação do Guardião (Modo Editar).
   */
  function skillCapStatus(value, editMode = false) {
    value = Number(value) || 0;
    if (value <= 75) return { ok: true, level: "ok" };
    if (value <= 90 && editMode) return { ok: true, level: "warn", reason: "Acima do cap padrão (75), aprovado pelo Guardião." };
    if (value <= 90) return { ok: false, level: "warn", reason: "Acima do cap padrão (75). Ative o Modo Editar para aprovar." };
    return { ok: false, level: "err", reason: "Excede o cap absoluto (90% mesmo com aprovação)." };
  }

  // ─── Alerta de Saída ──────────────────────────────────────────────────
  /**
   * Liga o alerta de saída — pergunta antes de fechar/recarregar se houver
   * mudanças não exportadas há mais de `minutesThreshold` minutos.
   *
   * @param {Object} opts
   * @param {() => boolean} opts.hasUnsavedChanges - retorna true se há o que avisar
   * @param {number} opts.minutesThreshold - default 10
   */
  let beforeUnloadHandler = null;
  function bindBeforeUnload({ hasUnsavedChanges, minutesThreshold = 10 } = {}) {
    if (beforeUnloadHandler) window.removeEventListener("beforeunload", beforeUnloadHandler);
    beforeUnloadHandler = function (e) {
      const minutes = window.CoC?.storage?.minutesSinceLastExport
        ? window.CoC.storage.minutesSinceLastExport()
        : Infinity;
      const unsaved = typeof hasUnsavedChanges === "function" ? hasUnsavedChanges() : true;
      if (unsaved && minutes > minutesThreshold) {
        const msg = "Você tem alterações não exportadas. Quer mesmo sair sem baixar o JSON do personagem?";
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener("beforeunload", beforeUnloadHandler);
  }

  function unbindBeforeUnload() {
    if (beforeUnloadHandler) {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      beforeUnloadHandler = null;
    }
  }

  // ─── Validação geral de personagem (delega para coc7e-rules) ──────────
  function validateCharacter(character, opts = {}) {
    const editMode = !!opts.editMode;
    const result = (window.CoC?.rules?.validateCharacter || (() => ({ valid: true, issues: [], warnings: [] })))(character);

    // Adiciona checks específicos de criação
    if (character.investigator) {
      if (!character.investigator.name || character.investigator.name.trim() === "") {
        result.warnings.push("Personagem sem nome.");
      }
      if (!character.investigator.occupation || character.investigator.occupation.trim() === "") {
        result.warnings.push("Personagem sem ocupação definida.");
      }
    }

    // Atributos zerados?
    if (character.attributes) {
      const allZero = Object.values(character.attributes).every(a => {
        const v = typeof a === "object" ? Number(a.value) : Number(a);
        return !v || v === 0;
      });
      if (allZero) {
        result.warnings.push("Todos os atributos estão em 0. Use 'Rolar Tudo' para gerar.");
      }
    }

    return result;
  }

  // ─── Expor ────────────────────────────────────────────────────────────
  window.CoC.validators = {
    pointsBadgeState,
    applyBadge,
    skillCapStatus,
    bindBeforeUnload,
    unbindBeforeUnload,
    validateCharacter
  };

})();
