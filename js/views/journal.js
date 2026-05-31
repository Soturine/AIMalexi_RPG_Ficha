/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/journal.js
   M4.2 — Fatia: Diário de Campanha

   Modelo: character.journal[] — posses narrativas da campanha.
   Campos: { id, title, category, date, content, createdAt }
   Estado de UI (colapsado): character._meta.journalCollapsed[catId]
     → preferência de exibição, não dado de domínio.

   Expõe: window.CoC.views.journal = { init, render }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  const { $, el, escapeHtml, toast, modal, confirm: uiConfirm } = window.CoC.ui;
  const cocStore    = window.CoC.store;
  const cocExecutor = window.CoC.core.executor;
  const bus         = window.CoC.bus;

  const CATEGORIES = [
    { id: "pista",  label: "Pistas"  },
    { id: "npc",    label: "NPCs"    },
    { id: "local",  label: "Locais"  },
    { id: "evento", label: "Eventos" },
    { id: "sessao", label: "Sessões" },
    { id: "outro",  label: "Outros"  },
  ];

  const _CAT_IDS = new Set(CATEGORIES.map(c => c.id));

  function _resolveCategory(cat) {
    return (cat && _CAT_IDS.has(cat)) ? cat : "outro";
  }

  // ── Render ──────────────────────────────────────────────────────────────

  function render() {
    const list = $("#journal-list");
    if (!list) return;
    list.innerHTML = "";

    const c = cocStore.getState().character;
    if (!c) return;

    const entries = Array.isArray(c.journal) ? c.journal : [];
    const collapsed = c._meta?.journalCollapsed || {};

    const countEl = $("#journal-count");
    if (countEl) {
      countEl.textContent = entries.length
        ? `${entries.length} ${entries.length === 1 ? "entrada" : "entradas"}`
        : "";
    }

    if (entries.length === 0) {
      list.appendChild(
        el("p", { class: "journal-empty" }, [
          "Nenhuma entrada. Use ", el("strong", {}, ["+ Nova Entrada"]), " para registrar descobertas."
        ])
      );
      return;
    }

    for (const cat of CATEGORIES) {
      const group = entries.filter(e => _resolveCategory(e.category) === cat.id);
      if (group.length === 0) continue;

      // Sorted: most recent createdAt first
      group.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const isCollapsed = !!collapsed[cat.id];
      const groupEl = el("div", { class: "journal-group" + (isCollapsed ? " collapsed" : ""), "data-category": cat.id });

      const header = el("div", { class: "journal-group-header", title: isCollapsed ? "Expandir" : "Recolher" });
      header.appendChild(document.createTextNode(cat.label + " "));
      header.appendChild(el("span", { class: "journal-count" }, [String(group.length)]));
      header.appendChild(el("span", { class: "journal-chevron" }, [isCollapsed ? "▶" : "▼"]));
      groupEl.appendChild(header);

      const rows = el("div", { class: "journal-rows" });
      for (const entry of group) {
        const row = el("div", { class: "journal-entry", "data-entry-id": entry.id });
        const main = el("div", { class: "journal-entry-main" });

        const titleLine = el("div", { class: "journal-entry-title-line" });
        titleLine.appendChild(el("span", { class: "journal-entry-title" }, [escapeHtml(entry.title || "—")]));
        if (entry.date) {
          titleLine.appendChild(el("span", { class: "journal-entry-date" }, [escapeHtml(entry.date)]));
        }
        main.appendChild(titleLine);

        if (entry.content) {
          const excerpt = entry.content.length > 100
            ? entry.content.slice(0, 100).trimEnd() + "…"
            : entry.content;
          main.appendChild(el("p", { class: "journal-entry-excerpt" }, [escapeHtml(excerpt)]));
        }

        const btns = el("div", { class: "journal-entry-actions no-print" });
        btns.appendChild(el("button", {
          class: "btn-ghost btn-icon",
          "data-journal-edit": entry.id,
          title: "Editar entrada",
          text: "✏️"
        }));
        btns.appendChild(el("button", {
          class: "btn-ghost btn-icon",
          "data-journal-del": entry.id,
          title: "Remover entrada",
          text: "🗑"
        }));

        row.appendChild(main);
        row.appendChild(btns);
        rows.appendChild(row);
      }

      groupEl.appendChild(rows);
      list.appendChild(groupEl);
    }
  }

  // ── Modal de entrada ─────────────────────────────────────────────────────

  function _openEntryModal(existing) {
    return new Promise(resolve => {
      let resolved = false;

      const titleInput = el("input", {
        type: "text", value: existing?.title || "",
        placeholder: "Ex: Símbolo encontrado na mansão", maxlength: "120"
      });

      const catSelect = el("select");
      for (const cat of CATEGORIES) {
        const opt = el("option", { value: cat.id, text: cat.label });
        if (_resolveCategory(existing?.category) === cat.id) opt.selected = true;
        catSelect.appendChild(opt);
      }

      const dateInput = el("input", {
        type: "text", value: existing?.date || "",
        placeholder: "Ex: 1926-04-15", maxlength: "30"
      });

      const contentArea = el("textarea", {
        placeholder: "Descrição detalhada...",
        rows: "5",
        style: { width: "100%", resize: "vertical", minHeight: "90px" }
      });
      contentArea.value = existing?.content || "";

      const mk = (labelText, inp) => {
        const g = el("div", { class: "form-group" });
        g.appendChild(el("label", {}, [labelText]));
        g.appendChild(inp);
        return g;
      };

      const form = el("div", { class: "journal-form" });
      form.appendChild(mk("Título *", titleInput));
      form.appendChild(mk("Categoria", catSelect));
      form.appendChild(mk("Data (opcional)", dateInput));
      form.appendChild(mk("Conteúdo", contentArea));

      modal({
        title: existing ? "Editar Entrada" : "Nova Entrada",
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
              const title = titleInput.value.trim();
              if (!title) {
                toast("Título é obrigatório.", { type: "warn" });
                titleInput.focus();
                return false;
              }
              resolved = true;
              resolve({
                id:        existing?.id,
                createdAt: existing?.createdAt,
                title,
                category:  catSelect.value,
                date:      dateInput.value.trim(),
                content:   contentArea.value.trim(),
              });
            }
          }
        ],
        onClose: () => { if (!resolved) resolve(null); }
      });

      setTimeout(() => titleInput.focus(), 50);
    });
  }

  // ── Init / delegation ────────────────────────────────────────────────────

  function init() {
    const list = $("#journal-list");
    if (!list) return;

    // ONE-TIME event delegation
    list.addEventListener("click", async (e) => {
      // Collapse/expand group header
      const header = e.target.closest(".journal-group-header");
      if (header) {
        const groupEl = header.closest(".journal-group");
        const catId = groupEl?.dataset.category;
        const isNowCollapsed = groupEl.classList.toggle("collapsed");
        const chevron = header.querySelector(".journal-chevron");
        if (chevron) chevron.textContent = isNowCollapsed ? "▶" : "▼";
        header.title = isNowCollapsed ? "Expandir" : "Recolher";
        // Persist collapsed preference in _meta (UI state, not domain)
        const c = cocStore.getState().character;
        if (c && catId) {
          c._meta = c._meta || {};
          c._meta.journalCollapsed = c._meta.journalCollapsed || {};
          c._meta.journalCollapsed[catId] = isNowCollapsed;
          bus.publish("journal:persist-requested", {});
        }
        return;
      }

      const editBtn = e.target.closest("[data-journal-edit]");
      const delBtn  = e.target.closest("[data-journal-del]");
      if (!editBtn && !delBtn) return;

      const entryId = editBtn ? editBtn.dataset.journalEdit : delBtn.dataset.journalDel;
      const c       = cocStore.getState().character;
      const entry   = c?.journal?.find(e => e.id === entryId);
      if (!entry) return;

      if (delBtn) {
        if (!await uiConfirm(`Remover "${entry.title}"?`, { danger: true, confirmLabel: "Remover" })) return;
        cocExecutor.execute({ type: "REMOVE_JOURNAL_ENTRY", payload: { id: entryId } });
        bus.publish("journal:persist-requested", {});
        return;
      }

      const updated = await _openEntryModal(entry);
      if (!updated) return;
      cocExecutor.execute({ type: "UPDATE_JOURNAL_ENTRY", payload: { entry: updated } });
      bus.publish("journal:persist-requested", {});
    });

    const btnAdd = $("#btn-add-entry");
    if (btnAdd) {
      btnAdd.addEventListener("click", async () => {
        const entry = await _openEntryModal(null);
        if (!entry) return;
        cocExecutor.execute({ type: "ADD_JOURNAL_ENTRY", payload: { entry } });
        bus.publish("journal:persist-requested", {});
      });
    }

    // Reactive re-render after journal dispatches
    bus.subscribe("store:dispatch", (event) => {
      if (!event.changed) return;
      const t = event.action.type;
      if (t === "ADD_JOURNAL_ENTRY" || t === "UPDATE_JOURNAL_ENTRY" || t === "REMOVE_JOURNAL_ENTRY") {
        render();
      }
    });
  }

  window.CoC.views.journal = Object.freeze({ init, render });

})();
