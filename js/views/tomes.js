/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/tomes.js
   M4.4 — Fatia: Grimórios

   Modelo: character.tomes[] — grimórios em posse do investigador.
   Campos: { id, name, author, studyTime, studyRequired, studyProgress,
             sanLoss, notes }

   studyProgress / studyRequired: progresso de estudo em semanas.
   Ao completar o estudo, LOSE_SANITY é despachado via reducer existente.

   Sem vínculo obrigatório com character.spells[].
   spellIds[] é extensão futura (M4.5) — não introduzida aqui.

   Expõe: window.CoC.views.tomes = { init, render }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  const { $, el, escapeHtml, toast, modal, confirm: uiConfirm } = window.CoC.ui;
  const cocStore    = window.CoC.store;
  const cocExecutor = window.CoC.core.executor;
  const bus         = window.CoC.bus;
  const dice        = window.CoC.dice;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function _studyStatus(tome) {
    const prog = Number(tome.studyProgress) || 0;
    const req  = Number(tome.studyRequired) || 0;
    if (req === 0)      return { label: "Sem requisito", cls: "ts-none" };
    if (prog === 0)     return { label: "Não iniciado",  cls: "ts-idle" };
    if (prog >= req)    return { label: "Concluído",     cls: "ts-done" };
    return { label: `Em estudo (${prog}/${req} sem.)`,   cls: "ts-progress" };
  }

  function _evalSanLoss(notation) {
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
    const list = $("#tomes-list");
    if (!list) return;
    list.innerHTML = "";

    const c = cocStore.getState().character;
    if (!c) return;

    const tomes = Array.isArray(c.tomes) ? c.tomes : [];

    const countEl = $("#tomes-count");
    if (countEl) {
      countEl.textContent = tomes.length
        ? `${tomes.length} ${tomes.length === 1 ? "grimório" : "grimórios"}`
        : "";
    }

    if (tomes.length === 0) {
      list.appendChild(
        el("p", { class: "tomes-empty" }, [
          "Nenhum grimório. Use ", el("strong", {}, ["+ Adicionar Grimório"]), " para registrar tomos encontrados."
        ])
      );
      return;
    }

    for (const tome of tomes) {
      const status = _studyStatus(tome);
      const prog   = Number(tome.studyProgress) || 0;
      const req    = Number(tome.studyRequired)  || 0;
      const isDone = req > 0 && prog >= req;

      const card = el("div", { class: "tome-card", "data-tome-id": tome.id });

      // Header: name + status badge
      const header = el("div", { class: "tome-header" });
      header.appendChild(el("span", { class: "tome-name" }, [escapeHtml(tome.name || "—")]));
      header.appendChild(el("span", { class: `tome-status ${status.cls}` }, [status.label]));
      card.appendChild(header);

      // Author / study time meta
      const meta = el("div", { class: "tome-meta" });
      if (tome.author)    meta.appendChild(el("span", { class: "tome-meta-item" }, [escapeHtml(tome.author)]));
      if (tome.studyTime) meta.appendChild(el("span", { class: "tome-meta-item" }, [`⏱ ${escapeHtml(tome.studyTime)}`]));
      if (tome.sanLoss)   meta.appendChild(el("span", { class: "tome-meta-item tome-san" }, [`SAN: ${escapeHtml(tome.sanLoss)}`]));
      if (meta.children.length) card.appendChild(meta);

      // Study progress bar (when studyRequired > 0)
      if (req > 0) {
        const fill = Math.min(100, prog / req * 100);
        const progressEl = el("div", { class: "tome-progress" });
        progressEl.appendChild(el("div", { class: "tome-progress-bar" },
          [el("div", { class: "tome-progress-fill" + (isDone ? " done" : ""), style: { width: fill + "%" } })]
        ));

        const studyActions = el("div", { class: "tome-study-actions no-print" });
        if (!isDone) {
          studyActions.appendChild(el("button", {
            class: "btn-primary btn-sm",
            "data-tome-advance": tome.id,
            title: "Avançar uma semana de estudo"
          }, ["+ 1 Semana"]));
          if (prog > 0) {
            studyActions.appendChild(el("button", {
              class: "btn-ghost btn-sm",
              "data-tome-retreat": tome.id,
              title: "Desfazer uma semana de estudo"
            }, ["−"]));
          }
        }
        progressEl.appendChild(studyActions);
        card.appendChild(progressEl);
      }

      if (tome.notes) {
        card.appendChild(el("p", { class: "tome-notes" }, [escapeHtml(tome.notes)]));
      }

      // Magias vinculadas (M4.5)
      const spellIds = Array.isArray(tome.spellIds) ? tome.spellIds : [];
      if (spellIds.length > 0) {
        const allSpells = Array.isArray(c.spells) ? c.spells : [];
        const linked = allSpells.filter(s => spellIds.includes(s.id));
        if (linked.length > 0) {
          const spellsDiv = el("div", { class: "tome-spells" });
          spellsDiv.appendChild(el("span", { class: "tome-spells-label" }, ["Magias:"]));
          const ul = el("ul", { class: "tome-spells-list" });
          linked.forEach(s => ul.appendChild(el("li", {}, [escapeHtml(s.name || "—")])));
          spellsDiv.appendChild(ul);
          card.appendChild(spellsDiv);
        }
      }

      // Edit / delete (hover actions)
      const secondary = el("div", { class: "tome-secondary no-print" });
      secondary.appendChild(el("button", {
        class: "btn-ghost btn-icon",
        "data-tome-edit": tome.id,
        title: "Editar grimório",
        text: "✏️"
      }));
      secondary.appendChild(el("button", {
        class: "btn-ghost btn-icon",
        "data-tome-del": tome.id,
        title: "Remover grimório",
        text: "🗑"
      }));
      card.appendChild(secondary);

      list.appendChild(card);
    }
  }

  // ── Avançar estudo ───────────────────────────────────────────────────────

  function _advanceStudy(tome, delta) {
    const prog = Number(tome.studyProgress) || 0;
    const req  = Number(tome.studyRequired)  || 0;
    const wasComplete = req > 0 && prog >= req;
    const newProg = Math.max(0, prog + delta);
    const isNowComplete = req > 0 && newProg >= req && !wasComplete;

    cocStore.dispatch({ type: "UPDATE_TOME", payload: {
      tome: Object.assign({}, tome, { studyProgress: newProg })
    }});

    if (isNowComplete && tome.sanLoss) {
      const san = _evalSanLoss(tome.sanLoss);
      if (san.total > 0) {
        cocExecutor.execute({ type: "LOSE_SANITY", payload: { amount: san.total } });
        toast(
          `📖 "${escapeHtml(tome.name)}" — estudo concluído! −${san.label} SAN`,
          { type: "warn", duration: 7000 }
        );
      } else {
        toast(`📖 "${escapeHtml(tome.name)}" — estudo concluído!`, { type: "success", duration: 4000 });
      }
    }

    bus.publish("tomes:persist-requested", {});
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  function _openTomeModal(existing) {
    return new Promise(resolve => {
      let resolved = false;

      const nameInput = el("input", {
        type: "text", value: existing?.name || "",
        placeholder: "Ex: Necronomicon", maxlength: "120"
      });

      const authorInput = el("input", {
        type: "text", value: existing?.author || "",
        placeholder: "Ex: Abdul Alhazred", maxlength: "120"
      });

      const studyTimeInput = el("input", {
        type: "text", value: existing?.studyTime || "",
        placeholder: "Ex: 12 semanas", maxlength: "60"
      });

      const studyReqInput = el("input", {
        type: "number", min: "0", max: "999",
        value: String(existing?.studyRequired || 0),
        style: { width: "6rem", textAlign: "center" }
      });

      const sanInput = el("input", {
        type: "text", value: existing?.sanLoss || "",
        placeholder: "Ex: 1D10 ou 5", maxlength: "20",
        style: { width: "8rem" }
      });

      const notesArea = el("textarea", {
        placeholder: "Observações sobre o tomo...",
        rows: "3",
        style: { width: "100%", resize: "vertical" }
      });
      notesArea.value = existing?.notes || "";

      // Magias vinculadas (M4.5) — checkboxes dos spells do personagem
      const _spells = Array.isArray(cocStore.getState().character?.spells)
        ? cocStore.getState().character.spells : [];
      const _currentIds = new Set(existing?.spellIds || []);
      const checksContainer = el("div", { class: "tome-spell-checks" });
      if (_spells.length === 0) {
        checksContainer.appendChild(
          el("p", { class: "tomes-empty", style: { margin: "0" } }, ["Nenhuma magia cadastrada ainda."])
        );
      } else {
        for (const spell of _spells) {
          const row = el("div", { class: "tome-spell-check-row" });
          const cb = el("input", { type: "checkbox", value: spell.id });
          if (_currentIds.has(spell.id)) cb.checked = true;
          row.appendChild(cb);
          row.appendChild(el("label", {}, [escapeHtml(spell.name || "—")]));
          checksContainer.appendChild(row);
        }
      }

      const mk = (labelText, inp) => {
        const g = el("div", { class: "form-group" });
        g.appendChild(el("label", {}, [labelText]));
        g.appendChild(inp);
        return g;
      };

      const costsRow = el("div", { class: "form-row-2col" });
      costsRow.appendChild(mk("Semanas necessárias", studyReqInput));
      costsRow.appendChild(mk("Perda de SAN (conclusão)", sanInput));

      const form = el("div", { class: "tome-form" });
      form.appendChild(mk("Nome *", nameInput));
      form.appendChild(mk("Autor", authorInput));
      form.appendChild(mk("Tempo de estudo", studyTimeInput));
      form.appendChild(costsRow);
      form.appendChild(mk("Notas", notesArea));
      form.appendChild(mk("Magias vinculadas", checksContainer));

      modal({
        title: existing ? "Editar Grimório" : "Adicionar Grimório",
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
                toast("Nome do grimório é obrigatório.", { type: "warn" });
                nameInput.focus();
                return false;
              }
              resolved = true;
              resolve({
                id:            existing?.id,
                studyProgress: existing?.studyProgress ?? 0,
                name,
                author:        authorInput.value.trim(),
                studyTime:     studyTimeInput.value.trim(),
                studyRequired: Math.max(0, parseInt(studyReqInput.value, 10) || 0),
                sanLoss:       sanInput.value.trim(),
                notes:         notesArea.value.trim(),
                spellIds:      Array.from(checksContainer.querySelectorAll("input[type=checkbox]:checked"))
                                 .map(cb => cb.value),
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
    const list = $("#tomes-list");
    if (!list) return;

    list.addEventListener("click", async (e) => {
      const advBtn  = e.target.closest("[data-tome-advance]");
      const retBtn  = e.target.closest("[data-tome-retreat]");
      const editBtn = e.target.closest("[data-tome-edit]");
      const delBtn  = e.target.closest("[data-tome-del]");
      if (!advBtn && !retBtn && !editBtn && !delBtn) return;

      const tomeId = (advBtn || retBtn || editBtn || delBtn).dataset[
        advBtn ? "tomeAdvance" : retBtn ? "tomeRetreat" : editBtn ? "tomeEdit" : "tomeDel"
      ];
      const c    = cocStore.getState().character;
      const tome = c?.tomes?.find(t => t.id === tomeId);
      if (!tome) return;

      if (advBtn)  { _advanceStudy(tome, +1); return; }
      if (retBtn)  { _advanceStudy(tome, -1); return; }

      if (delBtn) {
        if (!await uiConfirm(`Remover "${tome.name}"?`, { danger: true, confirmLabel: "Remover" })) return;
        cocStore.dispatch({ type: "REMOVE_TOME", payload: { id: tomeId } });
        bus.publish("tomes:persist-requested", {});
        return;
      }

      const updated = await _openTomeModal(tome);
      if (!updated) return;
      cocStore.dispatch({ type: "UPDATE_TOME", payload: { tome: updated } });
      bus.publish("tomes:persist-requested", {});
    });

    const btnAdd = $("#btn-add-tome");
    if (btnAdd) {
      btnAdd.addEventListener("click", async () => {
        const tome = await _openTomeModal(null);
        if (!tome) return;
        cocStore.dispatch({ type: "ADD_TOME", payload: { tome } });
        bus.publish("tomes:persist-requested", {});
      });
    }

    bus.subscribe("store:dispatch", (event) => {
      if (!event.changed) return;
      const t = event.action.type;
      if (t === "ADD_TOME" || t === "UPDATE_TOME" || t === "REMOVE_TOME") render();
    });
  }

  window.CoC.views.tomes = Object.freeze({ init, render });

})();
