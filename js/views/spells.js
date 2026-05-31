/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/spells.js
   M4.3 — Fatia: Magias e Rituais

   Modelo: character.spells[] — magias conhecidas pelo investigador.
   Campos: { id, name, category, mpCost, sanCost, castingTime, description, notes }

   Conjurar: despacha SPEND_MAGIC + LOSE_SANITY usando reducers existentes (M3.1).
   Custos aceitam notações de dado ("1D3", "2D6") ou valores fixos ("4", "0").
   Grimórios (tomes) são escopo de M4.4 — sem referência entre entidades aqui.

   Expõe: window.CoC.views.spells = { init, render }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  const { $, el, escapeHtml, toast, modal, confirm: uiConfirm } = window.CoC.ui;
  const cocStore    = window.CoC.store;
  const cocExecutor = window.CoC.core.executor;
  const bus         = window.CoC.bus;
  const dice        = window.CoC.dice;

  const CATEGORIES = [
    { id: "invocacao",    label: "Invocação" },
    { id: "contato",      label: "Contato" },
    { id: "protecao",     label: "Proteção" },
    { id: "conhecimento", label: "Conhecimento" },
    { id: "outro",        label: "Outros" },
  ];

  const _CAT_IDS = new Set(CATEGORIES.map(c => c.id));

  function _resolveCategory(cat) {
    return (cat && _CAT_IDS.has(cat)) ? cat : "outro";
  }

  // Avalia custo: notação de dado ou número fixo → { total, label }
  function _evalCost(notation) {
    if (!notation || notation === "" || notation === "0") return { total: 0, label: "0" };
    const n = Number(notation);
    if (!isNaN(n) && String(notation).trim() === String(n)) return { total: Math.max(0, n), label: String(Math.max(0, n)) };
    try {
      const r = dice.rollNotation(String(notation).trim());
      return { total: r.total, label: `${notation} → ${r.total}` };
    } catch (_) {
      return { total: 0, label: "0" };
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  function render() {
    const list = $("#spells-list");
    if (!list) return;
    list.innerHTML = "";

    const c = cocStore.getState().character;
    if (!c) return;

    const spells = Array.isArray(c.spells) ? c.spells : [];

    const countEl = $("#spells-count");
    if (countEl) {
      countEl.textContent = spells.length
        ? `${spells.length} ${spells.length === 1 ? "magia" : "magias"}`
        : "";
    }

    if (spells.length === 0) {
      list.appendChild(
        el("p", { class: "spells-empty" }, [
          "Nenhuma magia. Use ", el("strong", {}, ["+ Adicionar Magia"]), " para registrar rituais conhecidos."
        ])
      );
      return;
    }

    for (const cat of CATEGORIES) {
      const group = spells.filter(s => _resolveCategory(s.category) === cat.id);
      if (group.length === 0) continue;

      const groupEl = el("div", { class: "spells-group" });
      const header  = el("div", { class: "spells-group-header" });
      header.appendChild(document.createTextNode(cat.label + " "));
      header.appendChild(el("span", { class: "spells-count" }, [String(group.length)]));
      groupEl.appendChild(header);

      const rows = el("div", { class: "spells-rows" });
      for (const spell of group) {
        const row = el("div", { class: "spell-card", "data-spell-id": spell.id });

        // Cost badges
        const costs = el("div", { class: "spell-costs" });
        if (spell.mpCost && spell.mpCost !== "0") {
          costs.appendChild(el("span", { class: "spell-badge spell-mp", title: "Custo de Pontos de Magia" }, [`PM: ${spell.mpCost}`]));
        }
        if (spell.sanCost && spell.sanCost !== "0") {
          costs.appendChild(el("span", { class: "spell-badge spell-san", title: "Perda de Sanidade" }, [`SAN: ${spell.sanCost}`]));
        }
        if (spell.castingTime) {
          costs.appendChild(el("span", { class: "spell-badge spell-time", title: "Tempo de conjuração" }, [escapeHtml(spell.castingTime)]));
        }

        const main = el("div", { class: "spell-main" });
        main.appendChild(el("span", { class: "spell-name" }, [escapeHtml(spell.name || "—")]));
        main.appendChild(costs);
        if (spell.description) {
          const excerpt = spell.description.length > 120
            ? spell.description.slice(0, 120).trimEnd() + "…"
            : spell.description;
          main.appendChild(el("p", { class: "spell-excerpt" }, [escapeHtml(excerpt)]));
        }

        const actions = el("div", { class: "spell-actions no-print" });
        // Cast button — always visible, primary action
        const hasCost = (spell.mpCost && spell.mpCost !== "0") || (spell.sanCost && spell.sanCost !== "0");
        if (hasCost) {
          actions.appendChild(el("button", {
            class: "btn-primary btn-sm spell-cast",
            "data-spell-cast": spell.id,
            title: "Conjurar esta magia (gasta PM e SAN)"
          }, ["✦ Conjurar"]));
        }
        // Edit/delete — hover only
        const secondary = el("div", { class: "spell-secondary no-print" });
        secondary.appendChild(el("button", {
          class: "btn-ghost btn-icon",
          "data-spell-edit": spell.id,
          title: "Editar magia",
          text: "✏️"
        }));
        secondary.appendChild(el("button", {
          class: "btn-ghost btn-icon",
          "data-spell-del": spell.id,
          title: "Remover magia",
          text: "🗑"
        }));

        row.appendChild(main);
        row.appendChild(el("div", { class: "spell-row-right" }, [actions, secondary]));
        rows.appendChild(row);
      }

      groupEl.appendChild(rows);
      list.appendChild(groupEl);
    }
  }

  // ── Conjurar ─────────────────────────────────────────────────────────────

  function _castSpell(spell) {
    const mp  = _evalCost(spell.mpCost);
    const san = _evalCost(spell.sanCost);

    let parts = [];
    if (mp.total  > 0) {
      cocExecutor.execute({ type: "SPEND_MAGIC",  payload: { amount: mp.total  } });
      parts.push(`−${mp.label} PM`);
    }
    if (san.total > 0) {
      cocExecutor.execute({ type: "LOSE_SANITY", payload: { amount: san.total } });
      parts.push(`−${san.label} SAN`);
    }

    const summary = parts.length ? parts.join(" · ") : "sem custo";
    toast(`✦ ${escapeHtml(spell.name)}: ${summary}`, { type: "info", duration: 5000 });
    bus.publish("spells:persist-requested", {});
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  function _openSpellModal(existing) {
    return new Promise(resolve => {
      let resolved = false;

      const nameInput = el("input", {
        type: "text", value: existing?.name || "",
        placeholder: "Ex: Contactar Ghoul", maxlength: "120"
      });

      const catSelect = el("select");
      for (const cat of CATEGORIES) {
        const opt = el("option", { value: cat.id, text: cat.label });
        if (_resolveCategory(existing?.category) === cat.id) opt.selected = true;
        catSelect.appendChild(opt);
      }

      const mpInput = el("input", {
        type: "text", value: existing?.mpCost || "",
        placeholder: "Ex: 4 ou 1D6", maxlength: "20",
        style: { width: "8rem" }
      });

      const sanInput = el("input", {
        type: "text", value: existing?.sanCost || "",
        placeholder: "Ex: 1D3 ou 0", maxlength: "20",
        style: { width: "8rem" }
      });

      const timeInput = el("input", {
        type: "text", value: existing?.castingTime || "",
        placeholder: "Ex: 1 rodada", maxlength: "60"
      });

      const descArea = el("textarea", {
        placeholder: "Efeito da magia...",
        rows: "4",
        style: { width: "100%", resize: "vertical", minHeight: "80px" }
      });
      descArea.value = existing?.description || "";

      const notesInput = el("input", {
        type: "text", value: existing?.notes || "",
        placeholder: "Observações pessoais", maxlength: "200"
      });

      const mk = (labelText, inp) => {
        const g = el("div", { class: "form-group" });
        g.appendChild(el("label", {}, [labelText]));
        g.appendChild(inp);
        return g;
      };

      // Two-column row for costs
      const costsRow = el("div", { class: "form-row-2col" });
      costsRow.appendChild(mk("Custo PM", mpInput));
      costsRow.appendChild(mk("Custo SAN", sanInput));

      const form = el("div", { class: "spell-form" });
      form.appendChild(mk("Nome *", nameInput));
      form.appendChild(mk("Categoria", catSelect));
      form.appendChild(costsRow);
      form.appendChild(mk("Tempo de conjuração", timeInput));
      form.appendChild(mk("Descrição", descArea));
      form.appendChild(mk("Notas", notesInput));

      modal({
        title: existing ? "Editar Magia" : "Adicionar Magia",
        body: form,
        actions: [
          {
            label: "Cancelar",
            onClick: () => { resolved = true; resolve(null); }
          },
          {
            label: existing ? "Salvar" : "Adicionar",
            primary: true,
            onClick: () => {
              const name = nameInput.value.trim();
              if (!name) {
                toast("Nome da magia é obrigatório.", { type: "warn" });
                nameInput.focus();
                return false;
              }
              resolved = true;
              resolve({
                id:          existing?.id,
                name,
                category:    catSelect.value,
                mpCost:      mpInput.value.trim(),
                sanCost:     sanInput.value.trim(),
                castingTime: timeInput.value.trim(),
                description: descArea.value.trim(),
                notes:       notesInput.value.trim(),
              });
            }
          }
        ],
        onClose: () => { if (!resolved) resolve(null); }
      });

      setTimeout(() => nameInput.focus(), 50);
    });
  }

  // ── Init / delegation ────────────────────────────────────────────────────

  function init() {
    const list = $("#spells-list");
    if (!list) return;

    // ONE-TIME event delegation
    list.addEventListener("click", async (e) => {
      const castBtn = e.target.closest("[data-spell-cast]");
      const editBtn = e.target.closest("[data-spell-edit]");
      const delBtn  = e.target.closest("[data-spell-del]");
      if (!castBtn && !editBtn && !delBtn) return;

      const spellId = (castBtn || editBtn || delBtn).dataset[
        castBtn ? "spellCast" : editBtn ? "spellEdit" : "spellDel"
      ];
      const c     = cocStore.getState().character;
      const spell = c?.spells?.find(s => s.id === spellId);
      if (!spell) return;

      if (castBtn) { _castSpell(spell); return; }

      if (delBtn) {
        if (!await uiConfirm(`Remover "${spell.name}"?`, { danger: true, confirmLabel: "Remover" })) return;
        cocExecutor.execute({ type: "REMOVE_SPELL", payload: { id: spellId } });
        bus.publish("spells:persist-requested", {});
        return;
      }

      const updated = await _openSpellModal(spell);
      if (!updated) return;
      cocExecutor.execute({ type: "UPDATE_SPELL", payload: { spell: updated } });
      bus.publish("spells:persist-requested", {});
    });

    const btnAdd = $("#btn-add-spell");
    if (btnAdd) {
      btnAdd.addEventListener("click", async () => {
        const spell = await _openSpellModal(null);
        if (!spell) return;
        cocExecutor.execute({ type: "ADD_SPELL", payload: { spell } });
        bus.publish("spells:persist-requested", {});
      });
    }

    // Reactive re-render
    bus.subscribe("store:dispatch", (event) => {
      if (!event.changed) return;
      const t = event.action.type;
      if (t === "ADD_SPELL" || t === "UPDATE_SPELL" || t === "REMOVE_SPELL") render();
      // Cast dispatches SPEND_MAGIC / LOSE_SANITY — vitals.js already handles those
    });
  }

  window.CoC.views.spells = Object.freeze({ init, render });

})();
