/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/inventory.js
   M4.1 — Fatia: Inventário

   INVARIANTE ARQUITETURAL:
     character.inventory[] e character.weapons[] são domínios distintos.
     weapons[] = recursos mecânicos de combate (dano, munição, perícia).
     inventory[] = posses narrativas do personagem (nome, categoria, quantidade).
     Não existe sincronização entre os arrays. Não existe foreign key entre eles.
     A mesma arma pode aparecer em ambos — isso é intencional por design.

   Expõe: window.CoC.views.inventory = { init, render }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  const { $, el, escapeHtml, toast, modal, confirm: uiConfirm } = window.CoC.ui;
  const cocStore = window.CoC.store;
  const bus      = window.CoC.bus;

  const CATEGORIES = [
    { id: "arma",        label: "Armas" },
    { id: "equipamento", label: "Equipamentos" },
    { id: "documento",   label: "Documentos" },
    { id: "consumivel",  label: "Consumíveis" },
    { id: "pessoal",     label: "Objetos Pessoais" },
    { id: "outro",       label: "Outros" },
  ];

  const _CAT_IDS = new Set(CATEGORIES.map(c => c.id));

  // Normaliza categorias desconhecidas (import de JSON externo, futuros schemas) → "outro"
  function _resolveCategory(cat) {
    return (cat && _CAT_IDS.has(cat)) ? cat : "outro";
  }

  // ── Render ──────────────────────────────────────────────────────────────

  function render() {
    const list = $("#inventory-list");
    if (!list) return;
    list.innerHTML = "";

    const c = cocStore.getState().character;
    if (!c) return;

    const items = Array.isArray(c.inventory) ? c.inventory : [];

    // Capacity indicator — FOR ÷ 5, apenas informativo
    const capEl = $("#inventory-capacity");
    if (capEl) {
      const FOR = Number(c.attributes?.FOR?.value) || 0;
      const max = Math.max(1, Math.floor(FOR / 5));
      capEl.textContent = `${items.length} ${items.length === 1 ? "item" : "itens"} · sugerido: ${max} (FOR ${FOR} ÷ 5)`;
      capEl.classList.toggle("inv-over", items.length > max);
    }

    if (items.length === 0) {
      list.appendChild(
        el("p", { class: "inv-empty" }, [
          "Nenhum item. Use ", el("strong", {}, ["+ Adicionar"]), " para registrar posses."
        ])
      );
      return;
    }

    for (const cat of CATEGORIES) {
      const group = items.filter(it => _resolveCategory(it.category) === cat.id);
      if (group.length === 0) continue;

      const groupEl = el("div", { class: "inv-group" });
      const header  = el("div", { class: "inv-group-header" });
      header.appendChild(document.createTextNode(cat.label + " "));
      header.appendChild(el("span", { class: "inv-count" }, [String(group.length)]));
      groupEl.appendChild(header);

      const rows = el("div", { class: "inv-rows" });
      for (const item of group) {
        const row  = el("div", { class: "inv-item", "data-item-id": item.id });
        const main = el("div", { class: "inv-item-main" });
        main.appendChild(el("span", { class: "inv-item-name" }, [escapeHtml(item.name || "—")]));
        if (item.quantity > 1) {
          main.appendChild(el("span", { class: "inv-qty" }, [`×${item.quantity}`]));
        }
        if (item.notes) {
          main.appendChild(el("span", { class: "inv-notes" }, [escapeHtml(item.notes)]));
        }
        const btns = el("div", { class: "inv-item-actions no-print" });
        btns.appendChild(el("button", {
          class: "btn-ghost btn-icon",
          "data-inv-edit": item.id,
          title: "Editar item",
          text: "✏️"
        }));
        btns.appendChild(el("button", {
          class: "btn-ghost btn-icon",
          "data-inv-del": item.id,
          title: "Remover item",
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

  // ── Modal de item ────────────────────────────────────────────────────────

  function _openItemModal(existing) {
    return new Promise(resolve => {
      let resolved = false;

      const nameInput = el("input", {
        type: "text", value: existing?.name || "",
        placeholder: "Ex: Lanterna de bolso", maxlength: "80"
      });

      const catSelect = el("select");
      for (const cat of CATEGORIES) {
        const opt = el("option", { value: cat.id, text: cat.label });
        if ((existing?.category || "outro") === cat.id) opt.selected = true;
        catSelect.appendChild(opt);
      }

      const qtyInput = el("input", {
        type: "number", min: "1", max: "999",
        value: String(existing?.quantity || 1),
        style: { width: "6rem", textAlign: "center" }
      });

      const notesInput = el("input", {
        type: "text", value: existing?.notes || "",
        placeholder: "Opcional", maxlength: "200"
      });

      const mk = (labelText, inp) => {
        const g = el("div", { class: "form-group" });
        g.appendChild(el("label", {}, [labelText]));
        g.appendChild(inp);
        return g;
      };

      const form = el("div", { class: "inv-form" });
      form.appendChild(mk("Nome *", nameInput));
      form.appendChild(mk("Categoria", catSelect));
      form.appendChild(mk("Quantidade", qtyInput));
      form.appendChild(mk("Observações", notesInput));

      modal({
        title: existing ? "Editar Item" : "Adicionar Item",
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
                toast("Nome do item é obrigatório.", { type: "warn" });
                nameInput.focus();
                return false;
              }
              resolved = true;
              resolve({
                id:       existing?.id,
                name,
                category: catSelect.value,
                quantity: Math.max(1, parseInt(qtyInput.value, 10) || 1),
                notes:    notesInput.value.trim(),
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
    const list = $("#inventory-list");
    if (!list) return;

    // ONE-TIME event delegation — mesmo padrão de skills.js
    list.addEventListener("click", async (e) => {
      const editBtn = e.target.closest("[data-inv-edit]");
      const delBtn  = e.target.closest("[data-inv-del]");
      if (!editBtn && !delBtn) return;

      const itemId = editBtn ? editBtn.dataset.invEdit : delBtn.dataset.invDel;
      const c    = cocStore.getState().character;
      const item = c?.inventory?.find(it => it.id === itemId);
      if (!item) return;

      if (delBtn) {
        if (!await uiConfirm(`Remover "${item.name}" do inventário?`, { danger: true, confirmLabel: "Remover" })) return;
        cocStore.dispatch({ type: "REMOVE_INVENTORY_ITEM", payload: { id: itemId } });
        bus.publish("inventory:persist-requested", {});
        return;
      }

      const updated = await _openItemModal(item);
      if (!updated) return;
      cocStore.dispatch({ type: "UPDATE_INVENTORY_ITEM", payload: { item: updated } });
      bus.publish("inventory:persist-requested", {});
    });

    const btnAdd = $("#btn-add-item");
    if (btnAdd) {
      btnAdd.addEventListener("click", async () => {
        const item = await _openItemModal(null);
        if (!item) return;
        cocStore.dispatch({ type: "ADD_INVENTORY_ITEM", payload: { item } });
        bus.publish("inventory:persist-requested", {});
      });
    }

    // Reactive re-render
    bus.subscribe("store:dispatch", (event) => {
      if (!event.changed) return;
      const t = event.action.type;
      if (t === "ADD_INVENTORY_ITEM" || t === "UPDATE_INVENTORY_ITEM" || t === "REMOVE_INVENTORY_ITEM") {
        render();
      }
    });
  }

  window.CoC.views.inventory = Object.freeze({ init, render });

})();
