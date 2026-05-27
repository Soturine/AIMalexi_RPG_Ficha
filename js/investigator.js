/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/investigator.js
   Orquestrador da Ficha do Investigador
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  // ─── Atalhos ──────────────────────────────────────────────────────────
  const { $, $$, el, toast, modal, confirm, prompt, appendRoll, clearLog, exportLogAsMarkdown, escapeHtml, copyToClipboard } = window.CoC.ui;
  const dice = window.CoC.dice;
  const rules = window.CoC.rules;
  const store = window.CoC.storage;
  const nameGen = window.CoC.names;
  const validators = window.CoC.validators;

  // ─── Estado ───────────────────────────────────────────────────────────
  const state = {
    character: null,           // dados do personagem ativo
    rollMods: {
      difficulty: "regular",   // regular | hard | extreme
      bp: ""                   // "" | "bonus" | "penalty"
    },
    editMode: false,
    skillFilter: "all",        // all | occupation | used
    skillSearch: "",
    mobileTab: "personagem",
    rollHistory: []
  };

  // Cap mínimo do PV antes de morrer
  const PV_MIN = -2;

  // Saúde do storage
  if (!store.isStorageAvailable()) {
    toast("⚠ Seu navegador não tem localStorage disponível. A ficha funciona mas o estado não será salvo.", { type: "warn", duration: 6000 });
  }

  // ═════════════════════════════════════════════════════════════════════
  // BOOT
  // ═════════════════════════════════════════════════════════════════════

  function boot() {
    populateOccupationDropdown();
    bindToolbar();
    bindModifiers();
    bindMobileTabs();
    bindRollLog();
    bindDirtyTracking();

    // Tenta carregar último ativo, ou abre wizard
    const active = store.getActiveCharacter();
    if (active) {
      loadCharacter(active);
    } else {
      // Ficha vazia inicial — mostra wizard se for primeira visita
      const list = store.listCharacters();
      if (list.length === 0) {
        openWizard();
      } else {
        toast("Nenhum personagem ativo. Selecione um na barra superior ou crie um novo.", { type: "info" });
      }
    }

    refreshCharacterSelector();
    validators.bindBeforeUnload({
      hasUnsavedChanges: () => !!state.character,
      minutesThreshold: 10
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // SELETOR DE PERSONAGEM
  // ═════════════════════════════════════════════════════════════════════

  function refreshCharacterSelector() {
    const sel = $("#character-select");
    const list = store.listCharacters().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    sel.innerHTML = '<option value="">— Nenhum personagem —</option>';
    for (const c of list) {
      const opt = el("option", { value: c.id, text: `${c.name} ${c.occupation ? "· " + c.occupation : ""}` });
      if (state.character && state.character.id === c.id) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // POPULAÇÃO DE OCUPAÇÕES NO DROPDOWN
  // ═════════════════════════════════════════════════════════════════════

  function populateOccupationDropdown() {
    const sel = $("#id-occupation");
    sel.innerHTML = '<option value="">— escolher ocupação —</option>';
    for (const occ of window.CoCData.occupations) {
      const opt = el("option", { value: occ.name, text: occ.name });
      sel.appendChild(opt);
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // CARREGAMENTO DE PERSONAGEM
  // ═════════════════════════════════════════════════════════════════════

  function loadCharacter(character) {
    state.character = JSON.parse(JSON.stringify(character));
    if (!state.character.id) state.character.id = null;
    store.setActiveCharacter(state.character.id);
    renderAll();
  }

  function loadPreset(presetName) {
    const preset = window.CoCData.presets?.[presetName];
    if (!preset) { toast("Preset não encontrado: " + presetName, { type: "error" }); return; }
    const fresh = JSON.parse(JSON.stringify(preset));
    fresh.id = null;
    fresh._meta = fresh._meta || {};
    fresh._meta.createdAt = new Date().toISOString();
    state.character = fresh;
    persistCurrent();
    renderAll();
    toast(`Preset "${presetName}" carregado e salvo como novo personagem.`, { type: "success" });
  }

  function persistCurrent() {
    if (!state.character) return;
    const id = store.saveCharacter(state.character);
    state.character.id = id;
    store.setActiveCharacter(id);
    refreshCharacterSelector();
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER GERAL
  // ═════════════════════════════════════════════════════════════════════

  function renderAll() {
    if (!state.character) return clearUI();
    renderIdentity();
    renderAttributes();
    recalcDerived();   // recalcular antes de renderizar
    renderDerived();
    renderSkills();
    renderWeapons();
    renderBackground();
  }

  function clearUI() {
    $("#attr-grid").innerHTML = "<p class='dim center'>Nenhum personagem carregado.</p>";
    $("#derived-bar").innerHTML = "";
    $("#skills-groups").innerHTML = "";
    $("#weapons-list").innerHTML = "";
  }

  // ─── IDENTIDADE ───────────────────────────────────────────────────────
  function renderIdentity() {
    const c = state.character;
    if (!c) return;
    const fields = ["name", "playerName", "occupation", "age", "sex", "residence", "birthplace", "tagline"];
    fields.forEach(f => {
      const node = $(`[data-bind="investigator.${f}"]`);
      if (node) node.value = c.investigator?.[f] ?? "";
    });
    const tagline = c.investigator?.tagline ? "“" + c.investigator.tagline + "”" : "";
    $("#identity-display").textContent = tagline;

    // Recalcular pontos ao mudar ocupação
    $("#id-occupation").onchange = () => {
      c.investigator.occupation = $("#id-occupation").value;
      renderSkills();
      persistCurrent();
    };

    // Bind genérico de inputs
    fields.forEach(f => {
      const node = $(`[data-bind="investigator.${f}"]`);
      if (!node) return;
      node.oninput = () => {
        c.investigator[f] = node.value;
        if (f === "tagline") $("#identity-display").textContent = node.value ? "“" + node.value + "”" : "";
        if (f === "age") recalcDerived(), renderDerived();
        markDirty();
      };
      node.onblur = persistCurrent;
    });
  }

  // ─── ATRIBUTOS ────────────────────────────────────────────────────────
  function renderAttributes() {
    const grid = $("#attr-grid");
    grid.innerHTML = "";
    const c = state.character;
    if (!c?.attributes) return;

    const ATTRS = ["FOR", "CON", "TAM", "DES", "APA", "INT", "POD", "EDU", "Sorte"];
    for (const code of ATTRS) {
      const attr = c.attributes[code];
      if (!attr) continue;
      const v = Number(attr.value) || 0;
      const card = el("div", { class: "attr-card", "data-attr": code });
      card.innerHTML = `
        <div class="attr-label">${escapeHtml(code)}</div>
        <div class="attr-name">${escapeHtml(attr.label || code)}</div>
        <div class="attr-value" contenteditable="false" title="${escapeHtml(attr.rolled || "")}">${v}</div>
        <div class="attr-fractions"><span class="half">½ ${dice.half(v)}</span> · <span class="fifth">⅕ ${dice.fifth(v)}</span></div>
        <div class="attr-actions">
          <button data-roll="${code}" data-difficulty="regular" title="Rolar Regular">R</button>
          <button data-roll="${code}" data-difficulty="hard" title="Rolar Difícil">D</button>
          <button data-roll="${code}" data-difficulty="extreme" title="Rolar Extremo">E</button>
        </div>`;
      grid.appendChild(card);
    }

    // Permite editar valor diretamente quando em Edit Mode
    $$(".attr-value").forEach(node => {
      node.contentEditable = state.editMode ? "true" : "false";
      node.onkeydown = (e) => {
        if (e.key === "Enter") { e.preventDefault(); node.blur(); }
        if (e.key === "Escape") { e.preventDefault(); node.textContent = state.character.attributes[node.closest(".attr-card").dataset.attr].value; node.blur(); }
      };
      node.onblur = () => {
        const code = node.closest(".attr-card").dataset.attr;
        const v = Math.max(0, Math.min(99, parseInt(node.textContent, 10) || 0));
        state.character.attributes[code].value = v;
        renderAttributes();
        recalcDerived();
        renderDerived();
        renderSkills();
        persistCurrent();
      };
    });

    // Botões R/D/E
    $$(".attr-actions [data-roll]").forEach(btn => {
      btn.onclick = () => {
        const code = btn.dataset.roll;
        const difficulty = btn.dataset.difficulty;
        rollAttribute(code, difficulty);
      };
    });
  }

  // ─── DERIVADOS ────────────────────────────────────────────────────────
  function recalcDerived() {
    const c = state.character;
    if (!c) return;
    const a = c.attributes;
    const v = (k) => Number(a?.[k]?.value) || 0;
    const age = Number(c.investigator?.age) || 25;

    c.derived = c.derived || {};
    c.derived.PV = c.derived.PV || { label: "Pontos de Vida" };
    c.derived.PM = c.derived.PM || { label: "Pontos de Magia" };
    c.derived.SAN = c.derived.SAN || { label: "Sanidade" };
    c.derived.Mitos = c.derived.Mitos || { label: "Mitos de Cthulhu", value: 0 };
    c.derived.MOV = c.derived.MOV || { label: "Movimento" };
    c.derived.DB = c.derived.DB || { label: "Bônus de Dano" };
    c.derived.Build = c.derived.Build || { label: "Corpo" };

    const newPV = rules.calcHP(v("CON"), v("TAM"));
    const newPM = rules.calcMP(v("POD"));
    const newSANMax = rules.calcSANMax(c.derived.Mitos.value || 0);

    // Mantém current se já existe; senão usa o máximo
    c.derived.PV.value = newPV;
    if (c.derived.PV.current == null || c.derived.PV.current > newPV) c.derived.PV.current = newPV;

    c.derived.PM.value = newPM;
    if (c.derived.PM.current == null || c.derived.PM.current > newPM) c.derived.PM.current = newPM;

    c.derived.SAN.max = newSANMax;
    c.derived.SAN.value = v("POD");
    if (c.derived.SAN.current == null) c.derived.SAN.current = v("POD");
    if (c.derived.SAN.current > newSANMax) c.derived.SAN.current = newSANMax;

    c.derived.MOV.value = rules.calcMOV(v("FOR"), v("DES"), v("TAM"), age);
    const db = rules.calcDB(v("FOR"), v("TAM"));
    c.derived.DB.value = db.db;
    c.derived.Build.value = db.build;
  }

  function renderDerived() {
    const bar = $("#derived-bar");
    bar.innerHTML = "";
    const c = state.character;
    if (!c?.derived) return;

    const order = ["PV", "PM", "SAN", "Mitos", "MOV", "DB", "Build"];
    for (const key of order) {
      const d = c.derived[key];
      if (!d) continue;
      const isTracker = key === "PV" || key === "PM" || key === "SAN";
      const card = el("div", { class: "derived-card" + (isTracker ? " tracker " + key.toLowerCase() : "") });

      const cur = d.current ?? d.value;
      const max = key === "SAN" ? d.max : d.value;
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

      let valueHTML;
      if (isTracker) {
        valueHTML = `<div class="derived-value">${cur}<span class="derived-max"> / ${max}</span></div>`;
      } else {
        valueHTML = `<div class="derived-value">${d.value}</div>`;
      }

      card.innerHTML = `
        <div class="derived-label">${escapeHtml(d.label || key)}</div>
        ${valueHTML}
        ${actions}
      `;
      bar.appendChild(card);
    }

    // Bind ações
    $$("[data-derived]").forEach(btn => {
      btn.onclick = async () => {
        const key = btn.dataset.derived;
        const op = btn.dataset.op;
        await applyDerivedDelta(key, op);
      };
    });
  }

  async function applyDerivedDelta(key, op) {
    const c = state.character;
    if (!c?.derived?.[key]) return;
    let delta = 0;
    if (op === "+1") delta = 1;
    else if (op === "-1") delta = -1;
    else if (op === "X") {
      const v = await prompt(`Quanto deduzir de ${key}? (aceita números, 1D6, 2D10+3)`, { title: `Ajustar ${key}` });
      if (v == null || v.trim() === "") return;
      const trimmed = v.trim();
      if (/^-?\d+$/.test(trimmed)) {
        delta = -Math.abs(parseInt(trimmed, 10));
      } else {
        const r = dice.rollNotation(trimmed);
        delta = -Math.abs(r.total);
        appendRoll($("#roll-log"), { skill: `Perda ${key}`, d100: null, level: null, dmg: `${trimmed} → ${r.total}` });
      }
    }

    if (key === "Mitos") {
      c.derived.Mitos.value = Math.max(0, (c.derived.Mitos.value || 0) + delta);
      recalcDerived();
    } else {
      const cur = c.derived[key].current ?? c.derived[key].value;
      let newVal = cur + delta;
      if (key === "PV") newVal = Math.max(PV_MIN, Math.min(c.derived.PV.value, newVal));
      else if (key === "PM") newVal = Math.max(0, Math.min(c.derived.PM.value, newVal));
      else if (key === "SAN") newVal = Math.max(0, Math.min(c.derived.SAN.max, newVal));
      c.derived[key].current = newVal;
      if (key === "SAN" && delta < -4) {
        c.status = c.status || {};
        c.status.sanLossesToday = (c.status.sanLossesToday || 0) + Math.abs(delta);
        toast(`⚠ Perda de ${Math.abs(delta)} SAN: Teste de Loucura Temporária (INT×5)!`, { type: "warn", duration: 6000 });
      }
    }

    renderDerived();
    persistCurrent();
  }

  // ─── PERÍCIAS ─────────────────────────────────────────────────────────
  function renderSkills() {
    const c = state.character;
    if (!c) return;
    const groups = window.CoCData.skillsByCategory();
    const labels = window.CoCData.categoryLabels;

    // Computar pool e perícias da ocupação
    const occName = c.investigator?.occupation;
    const occ = occName ? window.CoCData.findOccupation(occName) : null;
    const occSkills = new Set();
    if (occ) {
      for (const s of occ.skills) {
        // Aceita "Skill1 | Skill2" (escolha)
        s.split("|").map(x => x.trim()).forEach(x => occSkills.add(x));
      }
    }

    // Calcular pontos disponíveis
    const attrs = Object.fromEntries(Object.entries(c.attributes || {}).map(([k, v]) => [k, v.value]));
    const occBudget = occ ? rules.calcOccupationPoints(occ.pointsFormula, attrs).points : 0;
    const piBudget  = rules.calcPersonalInterestPoints(attrs.INT || 0);

    // Calcular gastos
    const { occSpent, piSpent } = sumSkillSpend(c, occSkills);

    // Atualiza badges
    const occState = validators.pointsBadgeState(occSpent, occBudget);
    const piState  = validators.pointsBadgeState(piSpent, piBudget);
    const badgeOcc = $("#badge-occ");
    const badgePi  = $("#badge-pi");
    badgeOcc.classList.remove("ok", "warn", "err");
    badgePi.classList.remove("ok", "warn", "err");
    if (occState.level === "ok")   badgeOcc.classList.add("ok");
    if (occState.level === "warn") badgeOcc.classList.add("warn");
    if (occState.level === "err")  badgeOcc.classList.add("err");
    if (piState.level === "ok")    badgePi.classList.add("ok");
    if (piState.level === "warn")  badgePi.classList.add("warn");
    if (piState.level === "err")   badgePi.classList.add("err");
    badgeOcc.textContent = "Ocupação: " + occState.label;
    badgePi.textContent  = "Interesse: " + piState.label;

    // Renderiza grupos
    const container = $("#skills-groups");
    container.innerHTML = "";

    const search = state.skillSearch.trim().toLowerCase();
    const filter = state.skillFilter;

    // Set para rastrear quais nomes já foram renderizados (evita duplicar em "Customizadas")
    const renderedNames = new Set();

    for (const [cat, list] of Object.entries(groups)) {
      const filtered = list.filter(s => {
        if (search && !s.name.toLowerCase().includes(search)) return false;
        if (filter === "occupation" && !occSkills.has(s.name)) return false;
        if (filter === "used") {
          const sk = c.skills?.[s.name];
          const base = computeBaseValue(s, attrs);
          if (!sk || (Number(sk.value) || base) === base) return false;
        }
        return true;
      });
      if (filtered.length === 0) continue;

      const group = el("div", { class: "skill-group" });
      group.innerHTML = `<h3 class="skill-group-title">${escapeHtml(labels[cat] || cat)}</h3>`;
      const inner = el("div", { class: "skills-list" });
      group.appendChild(inner);

      for (const s of filtered) {
        const base = computeBaseValue(s, attrs);
        const sk = c.skills?.[s.name];
        const value = sk?.value != null ? Number(sk.value) : base;
        const isOcc = occSkills.has(s.name);
        const capStatus = validators.skillCapStatus(value, state.editMode);

        renderedNames.add(s.name);
        const row = el("div", {
          class: "skill-row" +
            (isOcc ? " occupation" : "") +
            (capStatus.level === "err" ? " over-cap" : "") +
            (capStatus.level === "warn" && !capStatus.ok ? " over-cap-warn" : "")
        });
        const specTag = s.specializable ? `<span class="skill-tag">específica</span>` : "";
        const baseFormula = s.baseFormula ? ` <span class="skill-tag" title="Base derivada">${escapeHtml(s.baseFormula)}=${base}</span>` : "";
        row.innerHTML = `
          <div class="skill-name">${escapeHtml(s.name)}${specTag}${baseFormula}</div>
          <input class="skill-input" type="number" min="0" max="99" value="${value}" data-skill="${escapeHtml(s.name)}" title="Total da perícia (Base ${base} + alocados)" />
          <div class="skill-frac" title="Difícil · Extremo">${dice.half(value)} · ${dice.fifth(value)}</div>
          <button class="skill-roll btn-ghost" data-roll-skill="${escapeHtml(s.name)}" title="Rolar perícia">🎲</button>
        `;
        inner.appendChild(row);
      }
      container.appendChild(group);
    }

    // ── Perícias customizadas/específicas do personagem que não estão no dicionário base ──
    // Ex: "Lutar (Espada)", "Arte/Ofício (Atuação)", "Outra Língua (Hermes)"
    const customSkillNames = Object.keys(c.skills || {}).filter(n => !renderedNames.has(n));
    if (customSkillNames.length > 0) {
      const customFiltered = customSkillNames.filter(name => {
        if (search && !name.toLowerCase().includes(search)) return false;
        if (filter === "occupation" && !occSkills.has(name)) return false;
        if (filter === "used") {
          const v = Number(c.skills[name].value) || 0;
          if (v === 0) return false;
        }
        return true;
      });

      if (customFiltered.length > 0) {
        const group = el("div", { class: "skill-group" });
        group.innerHTML = `<h3 class="skill-group-title">Perícias Específicas</h3>`;
        const inner = el("div", { class: "skills-list" });
        group.appendChild(inner);

        for (const name of customFiltered) {
          const sk = c.skills[name];
          const value = Number(sk.value) || 0;
          const isOcc = occSkills.has(name);
          const capStatus = validators.skillCapStatus(value, state.editMode);
          // Tenta achar a base via parent skill (ex: "Lutar (Espada)" → "Lutar")
          const parent = window.CoCData.findSkill(name.replace(/\s*\(.+\)$/, ""));
          const parentBase = parent ? computeBaseValue(parent, attrs) : 0;

          const row = el("div", {
            class: "skill-row" +
              (isOcc ? " occupation" : "") +
              (capStatus.level === "err" ? " over-cap" : "") +
              (capStatus.level === "warn" && !capStatus.ok ? " over-cap-warn" : "")
          });
          const parentTag = parent ? `<span class="skill-tag" title="Base herdada de ${escapeHtml(parent.name)}">base ${parentBase}</span>` : "";
          row.innerHTML = `
            <div class="skill-name">${escapeHtml(name)}${parentTag}</div>
            <input class="skill-input" type="number" min="0" max="99" value="${value}" data-skill="${escapeHtml(name)}" />
            <div class="skill-frac" title="Difícil · Extremo">${dice.half(value)} · ${dice.fifth(value)}</div>
            <button class="skill-roll btn-ghost" data-roll-skill="${escapeHtml(name)}" title="Rolar perícia">🎲</button>
          `;
          inner.appendChild(row);
        }
        container.appendChild(group);
      }
    }

    // Botão para adicionar nova perícia específica (sub-especialização)
    const addBtn = el("button", {
      style: { marginTop: "0.75rem" },
      text: "+ Adicionar Perícia Específica",
      on: { click: () => addCustomSkill() }
    });
    container.appendChild(addBtn);

    // Bind inputs
    $$("input[data-skill]").forEach(input => {
      input.oninput = () => {
        const name = input.dataset.skill;
        const v = Math.max(0, Math.min(99, parseInt(input.value, 10) || 0));
        c.skills = c.skills || {};
        c.skills[name] = c.skills[name] || {};
        c.skills[name].value = v;
        renderSkills();   // recalcula badges e validação
        markDirty();
      };
      input.onblur = persistCurrent;
    });

    // Bind botões de rolar
    $$("[data-roll-skill]").forEach(btn => {
      btn.onclick = () => rollSkill(btn.dataset.rollSkill);
    });
  }

  function computeBaseValue(skill, attrs) {
    if (skill.baseFormula === "DES/2") return Math.floor((attrs.DES || 0) / 2);
    if (skill.baseFormula === "EDU")   return attrs.EDU || 0;
    return Number(skill.base) || 0;
  }

  function sumSkillSpend(c, occSkillSet) {
    let occSpent = 0, piSpent = 0;
    const attrs = Object.fromEntries(Object.entries(c.attributes || {}).map(([k, v]) => [k, v.value]));
    for (const [name, sk] of Object.entries(c.skills || {})) {
      const def = window.CoCData.findSkill(name) ||
                  // Tenta achar pela parte base (Lutar (Espada) → Lutar)
                  window.CoCData.findSkill(name.replace(/\s*\(.+\)$/, ""));
      const base = def ? computeBaseValue(def, attrs) : 0;
      const v = Number(sk.value) || 0;
      const spent = Math.max(0, v - base);
      if (spent <= 0) continue;
      if (occSkillSet && occSkillSet.has(name)) occSpent += spent;
      else piSpent += spent;
    }
    return { occSpent, piSpent };
  }

  /**
   * Adiciona uma perícia específica (sub-especialização) custom.
   * Ex: Arte/Ofício (Atuação), Lutar (Espada), Outra Língua (Latim).
   */
  async function addCustomSkill() {
    if (!state.character) return;

    // Mostra dropdown com perícias especializáveis + opção livre
    const specializable = window.CoCData.skills.filter(s => s.specializable);
    const wrapper = el("div", {});
    wrapper.innerHTML = `
      <p style="margin-bottom: 0.5rem; color: var(--ink-dim);">Escolha a perícia base e a especialização.</p>
      <label>Perícia base</label>
      <select id="cs-parent">
        <option value="">— Outra (digite o nome completo) —</option>
        ${specializable.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join("")}
      </select>
      <div style="margin-top: 0.5rem;">
        <label>Especialização</label>
        <input type="text" id="cs-spec" placeholder="Ex: Espada, Latim, Atuação" />
        <p id="cs-examples" class="dim" style="font-size: 0.8em; margin-top: 0.3rem;"></p>
      </div>
      <div style="margin-top: 0.5rem;">
        <label>Nome completo (auto-gerado, edite se quiser)</label>
        <input type="text" id="cs-name" placeholder="Lutar (Espada)" />
      </div>
      <div style="margin-top: 0.5rem;">
        <label>Valor inicial</label>
        <input type="number" id="cs-value" value="0" min="0" max="99" />
      </div>
    `;

    const parentSel = wrapper.querySelector("#cs-parent");
    const specInput = wrapper.querySelector("#cs-spec");
    const nameInput = wrapper.querySelector("#cs-name");
    const examples = wrapper.querySelector("#cs-examples");
    const valueInput = wrapper.querySelector("#cs-value");

    function syncName() {
      const p = parentSel.value;
      const s = specInput.value.trim();
      if (p && s) nameInput.value = `${p} (${s})`;
      else if (p) nameInput.value = p + " (...)";
    }
    parentSel.onchange = () => {
      const p = window.CoCData.findSkill(parentSel.value);
      examples.textContent = p?.examples ? "Ex: " + p.examples.join(", ") : "";
      // Pré-popula valor com base
      const attrs = Object.fromEntries(Object.entries(state.character.attributes || {}).map(([k, v]) => [k, v.value]));
      valueInput.value = p ? computeBaseValue(p, attrs) : 0;
      syncName();
    };
    specInput.oninput = syncName;

    modal({
      title: "Adicionar Perícia Específica",
      body: wrapper,
      actions: [
        { label: "Cancelar" },
        { label: "Adicionar", primary: true, onClick: () => {
          const name = nameInput.value.trim();
          if (!name) { toast("Nome obrigatório", { type: "warn" }); return false; }
          const v = Math.max(0, Math.min(99, parseInt(valueInput.value, 10) || 0));
          state.character.skills = state.character.skills || {};
          state.character.skills[name] = { value: v };
          renderSkills();
          persistCurrent();
          toast(`"${name}" adicionada`, { type: "success" });
        }}
      ]
    });
  }

  // ─── ARSENAL ──────────────────────────────────────────────────────────
  function renderWeapons() {
    const list = $("#weapons-list");
    list.innerHTML = "";
    const c = state.character;
    if (!c) return;
    c.weapons = c.weapons || [];

    if (c.weapons.length === 0) {
      list.innerHTML = `<p class="dim center" style="grid-column: 1/-1;">Sem armas. Clique em <b>+ Arma</b> para adicionar.</p>`;
      return;
    }

    c.weapons.forEach((w, idx) => {
      const card = el("div", { class: "weapon-card" + (w.magical ? " magical" : "") });
      const skillVal = c.skills?.[w.skill]?.value || (window.CoCData.findSkill(w.skill)?.base ?? 0);
      card.innerHTML = `
        <div class="weapon-header">
          <span class="weapon-icon">${escapeHtml(w.icon || "⚔️")}</span>
          <span class="weapon-name">${escapeHtml(w.name)}</span>
        </div>
        <div class="weapon-info">
          <b>Perícia:</b> ${escapeHtml(w.skill)} (${skillVal}%)<br>
          <b>Dano:</b> ${escapeHtml(w.damage || "—")} ${w.range ? "· <b>Alc:</b> " + escapeHtml(w.range) : ""}<br>
          ${w.ammo ? `<b>Munição:</b> ${escapeHtml(String(w.ammo))} ${w.shots ? "(×" + w.shots + "/rd)" : ""}<br>` : ""}
        </div>
        ${w.note ? `<div class="weapon-note">${escapeHtml(w.note)}</div>` : ""}
        <div class="weapon-actions no-print">
          <button data-weapon-attack="${idx}" class="btn-primary" title="Rolar ataque + dano">🎯 Atacar</button>
          <button data-weapon-edit="${idx}" class="btn-ghost btn-icon" title="Editar">✎</button>
          <button data-weapon-del="${idx}" class="btn-danger btn-icon" title="Remover">🗑️</button>
        </div>
      `;
      list.appendChild(card);
    });

    $$("[data-weapon-attack]").forEach(b => b.onclick = () => attackWithWeapon(parseInt(b.dataset.weaponAttack, 10)));
    $$("[data-weapon-edit]").forEach(b => b.onclick = () => editWeapon(parseInt(b.dataset.weaponEdit, 10)));
    $$("[data-weapon-del]").forEach(b => b.onclick = async () => {
      const idx = parseInt(b.dataset.weaponDel, 10);
      const w = c.weapons[idx];
      if (await confirm(`Remover "${w.name}"?`, { danger: true, title: "Remover arma" })) {
        c.weapons.splice(idx, 1);
        renderWeapons();
        persistCurrent();
      }
    });
  }

  function editWeapon(idx) {
    const c = state.character;
    const w = c.weapons[idx] || {};
    const formBody = el("div", { class: "background-grid" });
    formBody.innerHTML = `
      <div><label>Nome</label><input id="w-name" value="${escapeHtml(w.name || "")}" /></div>
      <div><label>Ícone (emoji)</label><input id="w-icon" value="${escapeHtml(w.icon || "")}" placeholder="🔫" /></div>
      <div><label>Perícia</label><input id="w-skill" value="${escapeHtml(w.skill || "")}" placeholder="Ex: Lutar" /></div>
      <div><label>Dano</label><input id="w-damage" value="${escapeHtml(w.damage || "")}" placeholder="1D8+DB" /></div>
      <div><label>Alcance</label><input id="w-range" value="${escapeHtml(w.range || "")}" placeholder="Toque, 15m, DES m" /></div>
      <div><label>Munição</label><input id="w-ammo" type="number" value="${w.ammo ?? ""}" /></div>
      <div><label>Tiros/rodada</label><input id="w-shots" type="number" value="${w.shots ?? ""}" /></div>
      <div class="full-width"><label>Nota</label><textarea id="w-note">${escapeHtml(w.note || "")}</textarea></div>
      <div class="full-width">
        <label><input type="checkbox" id="w-impale" ${w.impale ? "checked" : ""} /> Empala em Sucesso Extremo</label>
        <label style="margin-left: 1rem;"><input type="checkbox" id="w-magical" ${w.magical ? "checked" : ""} /> Item Mágico</label>
      </div>
    `;
    modal({
      title: w.name ? "Editar Arma" : "Nova Arma",
      body: formBody,
      actions: [
        { label: "Cancelar" },
        { label: "Salvar", primary: true, onClick: () => {
          const updated = {
            name: $("#w-name").value.trim() || "Sem nome",
            icon: $("#w-icon").value.trim(),
            skill: $("#w-skill").value.trim(),
            damage: $("#w-damage").value.trim(),
            range: $("#w-range").value.trim(),
            ammo: parseInt($("#w-ammo").value, 10) || null,
            shots: parseInt($("#w-shots").value, 10) || null,
            note: $("#w-note").value.trim(),
            impale: $("#w-impale").checked,
            magical: $("#w-magical").checked
          };
          if (idx >= 0 && idx < c.weapons.length) c.weapons[idx] = updated;
          else c.weapons.push(updated);
          renderWeapons();
          persistCurrent();
        }}
      ]
    });
  }

  function attackWithWeapon(idx) {
    const c = state.character;
    const w = c.weapons[idx];
    if (!w) return;
    const skillVal = Number(c.skills?.[w.skill]?.value) || (window.CoCData.findSkill(w.skill)?.base || 0);
    // Rola ataque
    const result = dice.rollD100(state.rollMods.bp || null);
    const level = dice.classifyRoll(result.value, skillVal);
    const ok = ["crit", "extreme", "hard", "regular"].includes(level);
    let dmgStr = "—";
    let dmgTotal = 0;
    if (ok) {
      const dbVal = c.derived?.DB?.value || "0";
      const isImpale = (level === "extreme" || level === "crit") && w.impale;
      const d = dice.rollDamage(w.damage || "0", dbVal, isImpale);
      dmgTotal = d.total;
      const diceStr = d.rolls.map(r => `(${r.dice.join("+")})`).join("+");
      dmgStr = `${w.damage} → ${dmgTotal}${isImpale ? " ⚡EMPALA" : ""} ${diceStr}`;
    }
    appendRoll($("#roll-log"), {
      skill: `⚔ ${w.name}`,
      target: skillVal,
      d100: result.value,
      level,
      dmg: ok ? dmgStr : "(miss)",
      note: state.rollMods.bp ? `[${state.rollMods.bp}]` : ""
    });
    persistCurrent();
  }

  // ─── BACKGROUND ───────────────────────────────────────────────────────
  function renderBackground() {
    const c = state.character;
    if (!c) return;
    c.background = c.background || {};
    const fields = ["description", "ideology", "significantPeople", "meaningfulLocations",
                    "treasuredPossessions", "traits", "injuriesScars", "phobiasManias",
                    "tomes", "encounters"];
    fields.forEach(f => {
      const node = $(`[data-bind="background.${f}"]`);
      if (!node) return;
      node.value = c.background[f] || "";
      node.oninput = () => { c.background[f] = node.value; markDirty(); };
      node.onblur = persistCurrent;
    });

    // Status toggles
    c.status = c.status || {};
    ["majorWound", "unconscious", "dying"].forEach(f => {
      const node = $(`[data-bind="status.${f}"]`);
      if (!node) return;
      node.checked = !!c.status[f];
      node.onchange = () => { c.status[f] = node.checked; persistCurrent(); };
    });
    ["temporaryInsanity", "indefiniteInsanity"].forEach(f => {
      const node = $(`[data-bind="status.${f}"]`);
      if (!node) return;
      node.value = c.status[f] || "";
      node.oninput = () => { c.status[f] = node.value; markDirty(); };
      node.onblur = persistCurrent;
    });

    // Equipment como textarea
    const equipNode = $("#bg-equipment");
    if (equipNode) {
      equipNode.value = (c.equipment || []).join("\n");
      equipNode.oninput = () => {
        c.equipment = equipNode.value.split("\n").map(s => s.trim()).filter(Boolean);
        markDirty();
      };
      equipNode.onblur = persistCurrent;
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // ROLAGENS
  // ═════════════════════════════════════════════════════════════════════

  function rollAttribute(code, difficultyOverride) {
    const c = state.character;
    const v = Number(c?.attributes?.[code]?.value) || 0;
    const difficulty = difficultyOverride || state.rollMods.difficulty;
    const target = difficulty === "hard" ? dice.half(v) : (difficulty === "extreme" ? dice.fifth(v) : v);
    const result = dice.rollD100(state.rollMods.bp || null);
    const level = dice.classifyRoll(result.value, v);
    appendRoll($("#roll-log"), {
      skill: code,
      target: difficulty === "regular" ? v : `${v} → ${difficulty === "hard" ? "Difícil" : "Extremo"} ${target}`,
      d100: result.value,
      level
    });
    persistCurrent();
  }

  function rollSkill(name) {
    const c = state.character;
    const skillVal = Number(c?.skills?.[name]?.value);
    let v = skillVal;
    if (isNaN(v) || v === undefined) {
      const def = window.CoCData.findSkill(name) || window.CoCData.findSkill(name.replace(/\s*\(.+\)$/, ""));
      const attrs = Object.fromEntries(Object.entries(c.attributes || {}).map(([k, x]) => [k, x.value]));
      v = def ? computeBaseValue(def, attrs) : 0;
    }
    const result = dice.rollD100(state.rollMods.bp || null);
    const level = dice.classifyRoll(result.value, v);
    appendRoll($("#roll-log"), {
      skill: name,
      target: v,
      d100: result.value,
      level,
      note: state.rollMods.bp ? `[${state.rollMods.bp}]` : ""
    });
    persistCurrent();
  }

  // ═════════════════════════════════════════════════════════════════════
  // TOOLBAR BINDINGS
  // ═════════════════════════════════════════════════════════════════════

  function bindToolbar() {
    $("#character-select").onchange = (e) => {
      const id = e.target.value;
      if (!id) { state.character = null; store.setActiveCharacter(null); clearUI(); return; }
      const c = store.loadCharacter(id);
      if (c) loadCharacter(c);
    };

    $("#btn-new").onclick = openWizard;
    $("#btn-load-klein").onclick = () => loadPreset("klein");
    $("#btn-import").onclick = () => $("#file-import").click();
    $("#file-import").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = await store.importJSONFromFile(file);
        // Aceita formato direto ou wrapper
        const char = data.investigator ? data : (data.character || data);
        if (!char.investigator) { toast("Arquivo não parece ser uma ficha válida", { type: "error" }); return; }
        char.id = null; // gera novo ID local
        state.character = char;
        persistCurrent();
        renderAll();
        toast("Personagem importado com sucesso", { type: "success" });
      } catch (err) {
        toast("Erro ao importar: " + err.message, { type: "error" });
      }
      e.target.value = ""; // reset
    };

    $("#btn-edit-mode").onclick = () => {
      state.editMode = !state.editMode;
      $("#btn-edit-mode").classList.toggle("active", state.editMode);
      $("#btn-edit-mode").style.background = state.editMode ? "var(--brass)" : "";
      $("#btn-edit-mode").style.color = state.editMode ? "var(--bg-deep)" : "";
      renderAttributes();
      renderSkills();
      toast(state.editMode ? "Modo Editar ATIVO — atributos editáveis, caps até 90%" : "Modo Editar desligado", { type: "info" });
    };

    $("#btn-print").onclick = () => window.print();

    $("#btn-export").onclick = () => {
      if (!state.character) return toast("Nenhum personagem para exportar", { type: "warn" });
      const filename = `${(state.character.investigator?.name || "personagem").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.json`;
      const ok = store.exportJSON(state.character, filename);
      if (ok) toast("✓ JSON exportado — guarde este arquivo como backup!", { type: "success", duration: 4000 });
    };

    $("#btn-delete").onclick = async () => {
      if (!state.character) return;
      const name = state.character.investigator?.name || "(sem nome)";
      if (await confirm(`Deletar "${name}" permanentemente? Esta ação NÃO pode ser desfeita.`,
                        { danger: true, confirmLabel: "Deletar", title: "Deletar personagem" })) {
        store.deleteCharacter(state.character.id);
        state.character = null;
        clearUI();
        refreshCharacterSelector();
        toast("Personagem deletado", { type: "warn" });
      }
    };

    $("#btn-roll-all").onclick = async () => {
      if (!state.character) return openWizard();
      if (state.character.attributes && Object.values(state.character.attributes).some(a => a.value > 0)) {
        if (!await confirm("Substituir os atributos atuais por novos valores rolados aleatoriamente?", { danger: true })) return;
      }
      rollAllAttributes();
    };

    $("#btn-add-weapon").onclick = () => editWeapon(state.character?.weapons?.length || 0);

    // Filtros de perícia
    $$(".filter-chip").forEach(chip => {
      chip.onclick = () => {
        $$(".filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        state.skillFilter = chip.dataset.filter;
        renderSkills();
      };
    });
    $$(".filter-chip[data-filter='all']").forEach(c => c.classList.add("active"));

    $("#skill-search-input").oninput = (e) => {
      state.skillSearch = e.target.value;
      renderSkills();
    };
  }

  function rollAllAttributes() {
    const c = state.character;
    if (!c) return;
    c.attributes = c.attributes || {};
    const formulas = {
      FOR: "3d6x5", CON: "3d6x5", TAM: "2d6+6x5", DES: "3d6x5",
      APA: "3d6x5", INT: "2d6+6x5", POD: "3d6x5", EDU: "2d6+6x5", Sorte: "3d6x5"
    };
    for (const [code, formula] of Object.entries(formulas)) {
      const r = dice.rollAttribute(formula);
      c.attributes[code] = c.attributes[code] || {};
      c.attributes[code].label = c.attributes[code].label || codeToLabel(code);
      c.attributes[code].value = r.total;
      c.attributes[code].rolled = `${formula} → ${r.raw.join("+")}=${r.rawSum}, ×5 = ${r.total}`;
    }
    recalcDerived();
    renderAttributes();
    renderDerived();
    renderSkills();
    persistCurrent();
    toast("Atributos rolados! PV, MP, SAN, MOV, DB recalculados.", { type: "success" });
  }

  function codeToLabel(code) {
    const map = { FOR: "Força", CON: "Constituição", TAM: "Tamanho", DES: "Destreza",
                  APA: "Aparência", INT: "Inteligência", POD: "Poder", EDU: "Educação",
                  Sorte: "Sorte" };
    return map[code] || code;
  }

  // ═════════════════════════════════════════════════════════════════════
  // WIZARD
  // ═════════════════════════════════════════════════════════════════════

  function openWizard() {
    const body = el("div", {});
    body.innerHTML = `
      <p style="margin-bottom: 1rem; color: var(--ink-dim);">Como você quer começar?</p>
      <div class="wizard-options">
        <div class="wizard-option" data-choice="empty">
          <span class="icon">🆕</span>
          <h4>Novo do Zero</h4>
          <p>Ficha em branco. Você rola atributos, escolhe ocupação e distribui pontos.</p>
        </div>
        <div class="wizard-option" data-choice="quick">
          <span class="icon">⚡</span>
          <h4>Rápido</h4>
          <p>Ficha em branco + atributos já rolados aleatoriamente. Você só escolhe ocupação e distribui.</p>
        </div>
        <div class="wizard-option" data-choice="klein">
          <span class="icon">📜</span>
          <h4>Carregar Klein</h4>
          <p>Klein Moretti (Lord of the Mysteries) como exemplo de ficha completa.</p>
        </div>
      </div>
    `;
    const m = modal({
      title: "Novo Personagem",
      body,
      actions: [{ label: "Cancelar" }]
    });

    $$("[data-choice]", body).forEach(card => {
      card.onclick = () => {
        const choice = card.dataset.choice;
        m.close();
        if (choice === "klein") {
          loadPreset("klein");
        } else {
          loadPreset("empty");
          if (choice === "quick") {
            setTimeout(() => rollAllAttributes(), 200);
          } else {
            toast("Ficha criada. Use 🎲 Rolar Tudo ou edite manualmente os atributos.", { type: "info" });
          }
          // Foco no nome
          setTimeout(() => $("#id-name")?.focus(), 250);
        }
      };
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // MODIFICADORES DE ROLAGEM
  // ═════════════════════════════════════════════════════════════════════

  function bindModifiers() {
    $$("#modifier-difficulty button").forEach(b => {
      b.onclick = () => {
        $$("#modifier-difficulty button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        state.rollMods.difficulty = b.dataset.difficulty;
      };
    });
    $$("#modifier-bonus button").forEach(b => {
      b.onclick = () => {
        $$("#modifier-bonus button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        state.rollMods.bp = b.dataset.bp || "";
      };
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // ROLL LOG
  // ═════════════════════════════════════════════════════════════════════

  function bindRollLog() {
    $("#btn-copy-log").onclick = () => {
      const html = $("#roll-log ul").innerHTML;
      // Extrai texto de cada li
      const items = $$("#roll-log li").map(li => "- " + (li.textContent || "").replace(/\s+/g, " ").trim());
      const md = "# Roll Log — " + new Date().toLocaleString("pt-BR") + "\n\n" + items.join("\n");
      copyToClipboard(md);
    };
    $("#btn-clear-log").onclick = async () => {
      if (await confirm("Limpar todo o log de rolagens?", { title: "Limpar log" })) {
        clearLog($("#roll-log"));
      }
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // MOBILE TABS
  // ═════════════════════════════════════════════════════════════════════

  function bindMobileTabs() {
    $$(".mobile-tab").forEach(t => {
      t.onclick = () => {
        $$(".mobile-tab").forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        state.mobileTab = t.dataset.tab;
        applyMobileTab();
      };
    });
    applyMobileTab();
  }

  function applyMobileTab() {
    const tab = state.mobileTab;
    // No desktop, todas as sections estão visíveis. No mobile, só a ativa.
    $$("[data-tab]").forEach(s => s.classList.toggle("tab-active", s.dataset.tab === tab));
  }

  // ═════════════════════════════════════════════════════════════════════
  // DIRTY TRACKING
  // ═════════════════════════════════════════════════════════════════════

  let dirtyTimer = null;
  function markDirty() {
    // Debounced persist
    if (dirtyTimer) clearTimeout(dirtyTimer);
    dirtyTimer = setTimeout(persistCurrent, 800);
  }

  function bindDirtyTracking() {
    // Cada input do background, identidade, skill já tem onblur que persiste.
    // markDirty existe para campos com digitação contínua (taglines, textareas grandes).
  }

  // ═════════════════════════════════════════════════════════════════════
  // GO
  // ═════════════════════════════════════════════════════════════════════

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
