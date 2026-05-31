/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/vitals.js
   M3.1 — Fatia: Vitais (PV / PM / SAN / Mitos + derived bar)

   Responsabilidades:
     bind:   [data-derived] buttons → dispatch → store
     render: store.getState() → #derived-bar DOM

   Comunicação via Bus (sem acoplamento ao investigator.js):
     Publica:  "vitals:mitos-changed"  — para recalcDerived + persist
               "roll:logged"           — para append no roll-log do investigator
   Subscreve: "store:dispatch"         — para render/flash em SACRED actions

   Expõe: window.CoC.views.vitals = { init, render }

   Depende de: js/core/{signals,bus,store}.js  js/shared/ui-components.js
               js/engine/dice.js  js/shared/sanity-fx.js (opcional)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  const { $, $$, el, escapeHtml, toast, prompt: uiPrompt } = window.CoC.ui;
  const dice        = window.CoC.dice;
  const cocStore    = window.CoC.store;
  const cocExecutor = window.CoC.core.executor;
  const bus         = window.CoC.bus;

  // ── Render ──────────────────────────────────────────────────────────────

  function renderVitals() {
    const bar = $("#derived-bar");
    if (!bar) return;
    bar.innerHTML = "";
    const c = cocStore.getState().character;
    if (!c?.derived) return;

    const order = ["PV", "PM", "SAN", "Mitos", "MOV", "DB", "Build"];
    for (const key of order) {
      const d = c.derived[key];
      if (!d) continue;
      const isTracker = key === "PV" || key === "PM" || key === "SAN";
      const card = el("div", {
        class: "derived-card" + (isTracker ? " tracker " + key.toLowerCase() : ""),
        "data-key": key
      });

      const cur  = d.current ?? d.value;
      const max  = key === "SAN" ? d.max : d.value;
      const fill = (isTracker && max > 0) ? Math.max(0, Math.min(100, (cur / max) * 100)) : 100;
      if (isTracker) card.style.setProperty("--fill", fill + "%");

      let actions = "";
      if (isTracker) {
        actions = `<div class="derived-actions no-print">
          <button data-derived="${key}" data-op="-1">-1</button>
          <button data-derived="${key}" data-op="+1">+1</button>
          <button data-derived="${key}" data-op="X">-X</button>
        </div>`;
      } else if (key === "Mitos") {
        actions = `<div class="derived-actions no-print">
          <button data-derived="Mitos" data-op="-1">-1</button>
          <button data-derived="Mitos" data-op="+1">+1</button>
        </div>`;
      }

      const valueHTML = isTracker
        ? `<div class="derived-value">${cur}<span class="derived-max"> / ${max}</span></div>`
        : `<div class="derived-value">${d.value}</div>`;

      card.innerHTML = `
        <div class="derived-label">${escapeHtml(d.label || key)}</div>
        ${valueHTML}
        ${actions}
      `;
      bar.appendChild(card);
    }

    _bindButtons();
    _sanityAtmosphere();
    renderSidebarVitals();
  }

  function renderSidebarVitals() {
    const bar = $("#sidebar-vitals");
    if (!bar) return;
    bar.innerHTML = "";
    const c = cocStore.getState().character;
    if (!c) return;

    const trackers = [
      { key: "PV",  label: "PV"  },
      { key: "SAN", label: "SAN" },
      { key: "PM",  label: "PM"  },
    ];
    for (const { key, label } of trackers) {
      const d = c.derived?.[key];
      if (!d) continue;
      const cur  = d.current ?? d.value;
      const max  = key === "SAN" ? d.max : d.value;
      const fill = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
      const row  = el("div", { class: `svital svital-${key.toLowerCase()}`, "data-svital": key });
      row.innerHTML = `
        <div class="svital-header">
          <span class="svital-label">${label}</span>
          <span class="svital-value">${cur}<span class="svital-max"> / ${max}</span></span>
        </div>
        <div class="svital-track"><div class="svital-fill" style="width:${fill}%"></div></div>`;
      bar.appendChild(row);
    }

    const luck = c.attributes?.Sorte;
    if (luck != null) {
      const row = el("div", { class: "svital svital-luck" });
      row.innerHTML = `
        <div class="svital-header">
          <span class="svital-label">Sorte</span>
          <span class="svital-value">${Number(luck.value) || 0}</span>
        </div>`;
      bar.appendChild(row);
    }
  }

  function _flashCard(key, sign) {
    const card = $(`#derived-bar .derived-card[data-key="${key}"]`);
    if (!card) return;
    const cls = sign < 0 ? "flash-loss" : "flash-gain";
    card.classList.remove("flash-loss", "flash-gain");
    void card.offsetWidth;   // force reflow for rapid repeat calls
    card.classList.add(cls);
    setTimeout(() => card.classList.remove(cls), 900);
  }

  function _sanityAtmosphere() {
    const fx = window.CoC.sanityFx;
    if (!fx) return;
    const c = cocStore.getState().character;
    if (!c?.derived?.SAN) { fx.clear(); return; }
    fx.apply(Number(c.derived.SAN.current) || 0, Number(c.derived.SAN.max) || 99);
  }

  // ── Bind ────────────────────────────────────────────────────────────────

  async function _applyDelta(key, op) {
    const c = cocStore.getState().character;
    if (!c?.derived?.[key]) return;

    let delta = 0;
    if      (op === "+1") delta =  1;
    else if (op === "-1") delta = -1;
    else if (op === "X") {
      const v = await uiPrompt(
        `Quanto deduzir de ${key}? (aceita números, 1D6, 2D10+3)`,
        { title: `Ajustar ${key}` }
      );
      if (v == null || v.trim() === "") return;
      const trimmed = v.trim();
      if (/^-?\d+$/.test(trimmed)) {
        delta = -Math.abs(parseInt(trimmed, 10));
      } else {
        const r = dice.rollNotation(trimmed);
        delta = -Math.abs(r.total);
        // Roll log handled by investigator.js via bus subscription
        bus.publish("roll:logged", { skill: `Perda ${key}`, d100: null, level: "fail", dmg: `${trimmed} → ${r.total}` });
      }
    }
    if (delta === 0) return;

    if (key === "Mitos") {
      cocExecutor.execute({ type: 'ADD_MYTHOS', payload: { delta } });
      return;
    }

    const amount = Math.abs(delta);
    if      (key === "PV")  cocExecutor.execute({ type: delta < 0 ? "APPLY_DAMAGE"  : "HEAL_DAMAGE",    payload: { amount } });
    else if (key === "SAN") cocExecutor.execute({ type: delta < 0 ? "LOSE_SANITY"   : "RECOVER_SANITY", payload: { amount } });
    else if (key === "PM")  cocExecutor.execute({ type: delta < 0 ? "SPEND_MAGIC"   : "RESTORE_MAGIC",  payload: { amount } });

    if (key === "SAN" && delta < -4) {
      toast(`⚠ Perda de ${amount} SAN: Teste de Loucura Temporária (INT×5)!`, { type: "warn", duration: 6000 });
    }
    // renderVitals() + _flashCard() triggered reactively via bus subscription below
  }

  function _bindButtons() {
    $$("[data-derived]").forEach(btn => {
      btn.onclick = async () => { await _applyDelta(btn.dataset.derived, btn.dataset.op); };
    });
  }

  // ── Init ────────────────────────────────────────────────────────────────

  const FLASH_MAP = {
    APPLY_DAMAGE:   { key: "PV",  sign: -1 },
    HEAL_DAMAGE:    { key: "PV",  sign:  1 },
    LOSE_SANITY:    { key: "SAN", sign: -1 },
    RECOVER_SANITY: { key: "SAN", sign:  1 },
    SPEND_MAGIC:    { key: "PM",  sign: -1 },
    RESTORE_MAGIC:  { key: "PM",  sign:  1 },
    ADD_MYTHOS:     { key: "Mitos", sign: 1 },
  };

  function initVitals() {
    bus.subscribe("store:dispatch", function (event) {
      if (!event.changed) return;
      const mapping = FLASH_MAP[event.action.type];
      if (!mapping) return;
      // Render delegado ao render-pipeline (Sprint 6). Flash é efeito local desta view.
      _flashCard(mapping.key, mapping.sign);
    });
    // renderVitals() on first paint is called by render-pipeline via SET_CHARACTER
  }

  window.CoC.views.vitals = Object.freeze({ init: initVitals, render: renderVitals, renderSidebarVitals });

})();
