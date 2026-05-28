/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/investigator.js
   Orquestrador da Ficha do Investigador
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  // ─── Atalhos ──────────────────────────────────────────────────────────
  const { $, $$, el, toast, toastRoll, modal, confirm, prompt, appendRoll, clearLog, exportLogAsMarkdown, escapeHtml, copyToClipboard, bottomSheet } = window.CoC.ui;

  // Wrapper: sempre que registramos uma rolagem no log, também dispara um
  // toast colorido na tela atual (resolve UX mobile sem precisar trocar de aba).
  function logAndToast(entry) {
    appendRoll($("#roll-log"), entry);
    if (entry && entry.level) toastRoll(entry);
    if (state.logFab && typeof state.logFab.setBadge === "function") {
      state.rollCount = (state.rollCount || 0) + 1;
      state.logFab.setBadge(state.rollCount);
    }
  }
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

  // Persistência: a disponibilidade REAL do storage só é conhecida após store.ready
  // resolver — o IndexedDB abre de forma assíncrona e, até lá, backend === "memory".
  // A checagem correta (e o aviso, se for o caso) vive no boot(), DEPOIS do await.
  // O toast antigo aqui no topo era um falso-positivo que disparava em quase todo load.
  // Aqui registramos apenas o handler de erros reais de gravação (ex.: quota cheia).
  if (store.onError) {
    store.onError((info) => {
      if (info && info.type === "quota") {
        toast("⚠ Armazenamento cheio. Exporte o personagem (💾 Exportar JSON) e remova fichas antigas para liberar espaço.", { type: "error", duration: 8000 });
      }
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // BOOT
  // ═════════════════════════════════════════════════════════════════════

  async function boot() {
    populateOccupationDropdown();
    bindToolbar();
    bindModifiers();
    bindMobileTabs();
    bindRollLog();
    bindDirtyTracking();
    if (window.CoC.sanityFx) window.CoC.sanityFx.init();   // overlay + modo de efeitos

    // Aguarda o storage carregar cache (IndexedDB é assíncrono no boot)
    if (store.ready) {
      try { await store.ready; } catch (e) { /* fallback já cuidado pelo storage.js */ }
    }

    // Resiliência: se alguma entrada corrompida foi posta em quarentena no load,
    // avisa o usuário (sem tela branca — os demais dados continuam intactos).
    const corrupted = store.getCorruptedEntries ? store.getCorruptedEntries() : [];
    if (corrupted.length > 0) {
      toast(`⚠ ${corrupted.length} registro(s) corrompido(s) foram isolados para proteger o app. Seus demais dados estão intactos.`, { type: "warn", duration: 8000 });
    }

    // Tenta carregar último ativo, ou abre wizard
    const active = store.getActiveCharacter();
    if (active) {
      loadCharacter(active);
    } else {
      // Ficha vazia inicial — mostra wizard se for primeira visita
      const list = store.listCharacters();
      if (list.length === 0) {
        // Backup-fantasma: se não há nenhum personagem mas existe um snapshot do
        // último salvo, oferece restaurá-lo antes de cair no wizard.
        const ghost = store.getGhost ? store.getGhost() : null;
        if (ghost && await confirm("Encontramos um backup do seu último personagem salvo. Deseja restaurá-lo?", { title: "Recuperar personagem", confirmLabel: "Restaurar" })) {
          const restored = store.recoverGhost();
          if (restored) { loadCharacter(restored); toast("Personagem restaurado do backup.", { type: "success" }); }
          else openWizard();
        } else {
          openWizard();
        }
      } else {
        toast("Nenhum personagem ativo. Selecione um na barra superior ou crie um novo.", { type: "info" });
      }
    }

    refreshCharacterSelector();
    validators.bindBeforeUnload({
      hasUnsavedChanges: () => !!state.character,
      minutesThreshold: 10
    });

    // Informa qual backend de persistência está em uso (só se for relevante)
    if (store.backend === "memory") {
      toast("⚠ Persistência indisponível neste navegador. Use 💾 Exportar JSON para salvar.", { type: "warn", duration: 7000 });
    }

    // Lembrete de backup: alerta se o usuário não exportou nos últimos 7 dias
    // e tem pelo menos um personagem salvo.
    const BACKUP_REMINDER_DAYS = 7;
    const minutesSince = store.minutesSinceLastExport();
    if (
      minutesSince > BACKUP_REMINDER_DAYS * 24 * 60 &&
      store.listCharacters().length > 0
    ) {
      setTimeout(() => {
        toast(
          `💾 Dica de segurança: você não faz backup há ${minutesSince === Infinity ? "um bom tempo" : Math.floor(minutesSince / (60 * 24)) + " dias"}. Use o botão 💾 Exportar JSON para guardar seus personagens.`,
          { type: "warn", duration: 9000 }
        );
      }, 3000);
    }
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
    applySanityAtmosphere();   // ajusta filtro CSS de SAN baixa ao carregar
  }

  function clearUI() {
    $("#attr-grid").innerHTML = "<p class='dim center'>Nenhum personagem carregado.</p>";
    $("#derived-bar").innerHTML = "";
    $("#skills-groups").innerHTML = "";
    $("#weapons-list").innerHTML = "";
    if (window.CoC.sanityFx) window.CoC.sanityFx.clear();
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
      const card = el("div", {
        class: "derived-card" + (isTracker ? " tracker " + key.toLowerCase() : ""),
        "data-key": key
      });

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
        logAndToast({ skill: `Perda ${key}`, d100: null, level: "fail", dmg: `${trimmed} → ${r.total}` });
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
    flashDerivedCard(key, delta);   // feedback visual: vermelho perdeu, verde ganhou
    applySanityAtmosphere();        // filtro sutil quando SAN < 50% do máximo
    persistCurrent();
  }

  /**
   * Adiciona classe transiente .flash-loss / .flash-gain ao card derivado.
   * Cleanup automático após animação CSS terminar.
   */
  function flashDerivedCard(key, delta) {
    if (!delta) return;
    const card = $(`#derived-bar .derived-card[data-key="${key}"]`);
    if (!card) return;
    const cls = delta < 0 ? "flash-loss" : "flash-gain";
    card.classList.remove("flash-loss", "flash-gain");
    // Força reflow para reiniciar a animação se chamada em sequência rápida
    void card.offsetWidth;
    card.classList.add(cls);
    setTimeout(() => card.classList.remove(cls), 900);
  }

  /**
   * Atualiza os efeitos visuais de insanidade conforme a SAN atual/máxima.
   * A lógica de níveis (0-4), camadas e acessibilidade vive em js/shared/sanity-fx.js.
   */
  function applySanityAtmosphere() {
    const fx = window.CoC.sanityFx;
    if (!fx) return;
    const c = state.character;
    if (!c?.derived?.SAN) { fx.clear(); return; }
    const cur = Number(c.derived.SAN.current) || 0;
    const max = Number(c.derived.SAN.max) || 99;
    fx.apply(cur, max);
  }

  // ─── PERÍCIAS ─────────────────────────────────────────────────────────
  function renderSkills() {
    const c = state.character;
    if (!c) return;
    const groups = window.CoCData.skillsByCategory();
    const labels = window.CoCData.categoryLabels;

    // Computar pool e perícias da ocupação.
    // occupationSkills = perícias livres designadas pelo jogador (chave do fix de
    // ocupação personalizada). O conjunto EFETIVO = obrigatórias ∪ designadas.
    c.occupationSkills = Array.isArray(c.occupationSkills) ? c.occupationSkills : [];
    const occName = c.investigator?.occupation;
    const occ = occName ? window.CoCData.findOccupation(occName) : null;
    const occCtx = rules.buildOccupationContext(occ, c);
    const occSkills = occCtx.effective;

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
    badgeOcc.textContent = "Ocupação: " + occState.label + occFreePicksHint(occCtx);
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
        const occMark = occToggleHTML(s.name, occCtx.mandatory.has(s.name), occCtx.chosen.has(s.name));
        row.innerHTML = `
          <div class="skill-name">${occMark}${escapeHtml(s.name)}${specTag}${baseFormula}</div>
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
          const occMark = occToggleHTML(name, occCtx.mandatory.has(name), occCtx.chosen.has(name));
          row.innerHTML = `
            <div class="skill-name">${occMark}${escapeHtml(name)}${parentTag}</div>
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

    // Bind inputs — usa updateSkillUI (light update) em vez de renderSkills (rebuild)
    // para evitar perda de foco enquanto o usuário digita.
    $$("input[data-skill]").forEach(input => {
      input.oninput = () => {
        const name = input.dataset.skill;
        const v = Math.max(0, Math.min(99, parseInt(input.value, 10) || 0));
        c.skills = c.skills || {};
        c.skills[name] = c.skills[name] || {};
        c.skills[name].value = v;
        updateSkillUI(name);   // não recria o DOM — só atualiza ½/⅕ e badges
        markDirty();
      };
      input.onblur = persistCurrent;
    });

    // Bind botões de rolar
    $$("[data-roll-skill]").forEach(btn => {
      btn.onclick = () => rollSkill(btn.dataset.rollSkill);
    });

    // Bind toggles de "perícia da ocupação" (designação de perícias livres)
    $$("[data-occ-toggle]").forEach(btn => {
      btn.onclick = (e) => { e.preventDefault(); toggleOccupationSkill(btn.dataset.occToggle); };
    });
  }

  /**
   * HTML do marcador de ocupação numa linha de perícia.
   *  - obrigatória → diamante travado (◆), não clicável.
   *  - designada (livre) → botão ◆ (clique para virar Interesse Pessoal).
   *  - disponível → botão ◇ (clique para contar no pool da ocupação).
   */
  function occToggleHTML(name, isMandatory, isChosen) {
    if (isMandatory) {
      return `<span class="skill-occ mandatory" title="Perícia obrigatória da ocupação — já conta no pool de pontos da ocupação">◆</span>`;
    }
    const on = !!isChosen;
    const title = on
      ? "Perícia livre da ocupação (conta no pool). Clique para devolver ao Interesse Pessoal."
      : "Marcar como perícia livre da ocupação (os pontos passam a contar no pool da ocupação).";
    return `<button class="skill-occ-toggle${on ? " on" : ""}" data-occ-toggle="${escapeHtml(name)}" title="${title}" aria-pressed="${on}">${on ? "◆" : "◇"}</button>`;
  }

  /** Texto auxiliar do badge: quantas perícias livres da ocupação já foram usadas. */
  function occFreePicksHint(ctx) {
    if (!ctx || !ctx.freeBudget) return "";
    return ` · livres ${ctx.freeUsed}/${ctx.freeBudget}`;
  }

  /**
   * Alterna a designação de uma perícia como "perícia livre da ocupação".
   * É o que faz os pontos gastos nela contarem no pool da OCUPAÇÃO (e não no
   * de Interesse Pessoal). Não-bloqueante: o jogador pode exceder anySkillsCount —
   * o badge apenas sinaliza. Resolve o bug da ocupação Personalizada.
   */
  function toggleOccupationSkill(name) {
    const c = state.character;
    if (!c || !name) return;
    c.occupationSkills = Array.isArray(c.occupationSkills) ? c.occupationSkills : [];
    const idx = c.occupationSkills.indexOf(name);
    if (idx >= 0) c.occupationSkills.splice(idx, 1);
    else c.occupationSkills.push(name);
    renderSkills();
    persistCurrent();
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
   * Light update: atualiza ½/⅕ na linha da perícia e os badges de pool,
   * SEM recriar o DOM. Mantém o foco no input atual.
   *
   * Reservado para mudanças "value-only" durante digitação.
   * Mudanças estruturais (ocupação, filtro, busca, add) ainda chamam renderSkills().
   */
  function updateSkillUI(name) {
    const c = state.character;
    if (!c) return;

    // 1) Atualiza a linha (1/2 e 1/5 da perícia editada)
    const input = document.querySelector(`input[data-skill="${cssEscape(name)}"]`);
    if (input) {
      const v = Number(input.value) || 0;
      const row = input.closest(".skill-row");
      const frac = row?.querySelector(".skill-frac");
      if (frac) frac.textContent = `${dice.half(v)} · ${dice.fifth(v)}`;

      // Atualiza marcação de cap excedido
      if (row) {
        const cap = validators.skillCapStatus(v, state.editMode);
        row.classList.toggle("over-cap", cap.level === "err");
        row.classList.toggle("over-cap-warn", cap.level === "warn" && !cap.ok);
      }
    }

    // 2) Recalcula badges de pool (Ocupação / Interesse)
    refreshSkillBadges();
  }

  /**
   * Recalcula os badges Ocupação/Interesse sem tocar nos inputs.
   */
  function refreshSkillBadges() {
    const c = state.character;
    if (!c) return;
    c.occupationSkills = Array.isArray(c.occupationSkills) ? c.occupationSkills : [];
    const occName = c.investigator?.occupation;
    const occ = occName ? window.CoCData.findOccupation(occName) : null;
    const occCtx = rules.buildOccupationContext(occ, c);
    const occSkills = occCtx.effective;

    const attrs = Object.fromEntries(Object.entries(c.attributes || {}).map(([k, v]) => [k, v.value]));
    const occBudget = occ ? rules.calcOccupationPoints(occ.pointsFormula, attrs).points : 0;
    const piBudget  = rules.calcPersonalInterestPoints(attrs.INT || 0);
    const { occSpent, piSpent } = sumSkillSpend(c, occSkills);

    const occState = validators.pointsBadgeState(occSpent, occBudget);
    const piState  = validators.pointsBadgeState(piSpent, piBudget);
    const badgeOcc = $("#badge-occ");
    const badgePi  = $("#badge-pi");
    if (badgeOcc) {
      badgeOcc.classList.remove("ok", "warn", "err");
      if (occState.level === "ok")   badgeOcc.classList.add("ok");
      if (occState.level === "warn") badgeOcc.classList.add("warn");
      if (occState.level === "err")  badgeOcc.classList.add("err");
      badgeOcc.textContent = "Ocupação: " + occState.label + occFreePicksHint(occCtx);
    }
    if (badgePi) {
      badgePi.classList.remove("ok", "warn", "err");
      if (piState.level === "ok")    badgePi.classList.add("ok");
      if (piState.level === "warn")  badgePi.classList.add("warn");
      if (piState.level === "err")   badgePi.classList.add("err");
      badgePi.textContent = "Interesse: " + piState.label;
    }
  }

  /**
   * Escape de seletor CSS para nomes com parênteses, espaços, etc.
   * (CSS.escape() pode não existir em browsers antigos — fallback manual)
   */
  function cssEscape(s) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(s);
    return String(s).replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
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
      <div style="margin-top: 0.5rem;">
        <label><input type="checkbox" id="cs-occ" /> Conta para a ocupação (perícia livre)</label>
        <p class="dim" style="font-size: 0.8em; margin-top: 0.2rem;">Marque para os pontos desta perícia contarem no pool da OCUPAÇÃO em vez do Interesse Pessoal. Essencial para a ocupação "Personalizada".</p>
      </div>
    `;

    const parentSel = wrapper.querySelector("#cs-parent");
    const specInput = wrapper.querySelector("#cs-spec");
    const nameInput = wrapper.querySelector("#cs-name");
    const examples = wrapper.querySelector("#cs-examples");
    const valueInput = wrapper.querySelector("#cs-value");
    const occCheck = wrapper.querySelector("#cs-occ");

    // Pré-marca quando a ocupação atual ainda tem perícias livres disponíveis.
    const occNow = state.character.investigator?.occupation ? window.CoCData.findOccupation(state.character.investigator.occupation) : null;
    const ctxNow = rules.buildOccupationContext(occNow, state.character);
    if (occCheck) occCheck.checked = ctxNow.freeBudget > 0 && ctxNow.freeUsed < ctxNow.freeBudget;

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
          if (occCheck && occCheck.checked) {
            state.character.occupationSkills = Array.isArray(state.character.occupationSkills) ? state.character.occupationSkills : [];
            if (!state.character.occupationSkills.includes(name)) state.character.occupationSkills.push(name);
          }
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
    logAndToast({
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
    const entry = {
      kind: "attribute",
      skill: code,
      skillRaw: code,
      target,
      targetRaw: v,
      label: difficulty === "regular" ? v : `${v} → ${difficulty === "hard" ? "Difícil" : "Extremo"} ${target}`,
      d100: result.value,
      level,
      pushed: false
    };
    registerRoll(entry);
  }

  function rollSkill(name, opts = {}) {
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
    const entry = {
      kind: "skill",
      skill: name + (opts.pushed ? "  ⚠ PUSHED" : ""),
      skillRaw: name,
      target: v,
      targetRaw: v,
      d100: result.value,
      level,
      note: state.rollMods.bp ? `[${state.rollMods.bp}]` : "",
      pushed: !!opts.pushed
    };
    registerRoll(entry);
  }

  /**
   * Pipeline central: registra a rolagem no estado + log + toast,
   * e oferece ações pós-rolagem (Gastar Sorte / Forçar) quando aplicável.
   */
  function registerRoll(entry) {
    state.lastRoll = entry;
    logAndToast(entry);
    persistCurrent();
    presentPostRollActions(entry);
  }

  /**
   * Apresenta no roll-log o card de ações pós-rolagem:
   *  - Gastar Sorte (se falha + Sorte ≥ diferença)
   *  - Forçar (se já não foi forçada; só faz sentido em sucessos menores OU falhas)
   *
   * O card é EFÊMERO: some quando uma nova rolagem entra (substituído).
   */
  function presentPostRollActions(entry) {
    // Remove qualquer card de ação anterior
    const old = $("#post-roll-actions");
    if (old) old.remove();
    if (!entry || entry.kind === "weapon-attack") return;  // ataques têm fluxo próprio

    const c = state.character;
    const luck = Number(c?.attributes?.Sorte?.value) || 0;
    const diff = entry.d100 - (Number(entry.target) || 0);
    const canSpendLuck =
      !entry.pushed
      && (entry.level === "fail" || entry.level === "fumble" || entry.level === "regular")
      && diff > 0
      && luck >= diff
      && entry.level !== "fumble";  // fumble não pode ser convertido (regra do livro)
    const canPush =
      !entry.pushed
      && entry.kind === "skill"
      && (entry.level === "fail" || entry.level === "regular" || entry.level === "hard");

    if (!canSpendLuck && !canPush) return;

    const panel = el("div", {
      id: "post-roll-actions",
      class: "post-roll-actions",
      style: {
        marginTop: "0.5rem", padding: "0.5rem 0.6rem",
        background: "var(--bg-card-hi)",
        borderLeft: "3px solid var(--brass)",
        borderRadius: "var(--radius)",
        fontSize: "0.8rem"
      }
    });
    const dimEntry = entry.skillRaw || entry.skill || "rolagem";
    const header = el("div", {
      style: { color: "var(--ink-dim)", marginBottom: "0.35rem", fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }
    }, [`Ações pós-rolagem · ${dimEntry}`]);
    panel.appendChild(header);

    const row = el("div", { style: { display: "flex", gap: "0.35rem", flexWrap: "wrap" } });

    if (canSpendLuck) {
      const cost = diff;
      const btn = el("button", {
        class: "btn-primary",
        title: `Reduz sua Sorte em ${cost} para tornar este teste um sucesso Regular.`,
        on: { click: () => spendLuck(entry, cost) }
      }, [`🍀 Gastar ${cost} Sorte (vira Regular)`]);
      row.appendChild(btn);
    }

    if (canPush) {
      const btn = el("button", {
        class: "btn-danger",
        title: "Forçar a rolagem — relança com risco de consequência grave em caso de falha.",
        on: { click: () => pushRoll(entry) }
      }, ["⚡ Forçar Rolagem"]);
      row.appendChild(btn);
    }

    const dismiss = el("button", {
      class: "btn-ghost",
      on: { click: () => panel.remove() }
    }, ["Dispensar"]);
    row.appendChild(dismiss);

    panel.appendChild(row);
    const log = $("#roll-log");
    if (log) log.insertBefore(panel, log.firstChild.nextSibling || null);
  }

  /**
   * Gasta Sorte para converter uma falha em sucesso Regular.
   */
  function spendLuck(entry, cost) {
    const c = state.character;
    if (!c?.attributes?.Sorte) return;
    c.attributes.Sorte.value = Math.max(0, Number(c.attributes.Sorte.value) - cost);
    const old = $("#post-roll-actions");
    if (old) old.remove();
    logAndToast({
      skill: `🍀 Sorte gasta: ${entry.skillRaw || entry.skill}`,
      target: cost,
      d100: null,
      level: "regular",
      note: `${cost} pontos de Sorte usados para virar Regular`
    });
    renderAttributes();   // atualiza o card de Sorte
    persistCurrent();
  }

  /**
   * Forçar Rolagem (Push) — relança com flag pushed=true.
   * Em CoC 7E, falhar uma rolagem forçada = consequência narrativa decidida pelo Guardião.
   */
  async function pushRoll(entry) {
    const old = $("#post-roll-actions");
    if (old) old.remove();
    const confirmed = await confirm(
      `Forçar a rolagem de "${entry.skillRaw || entry.skill}"? Falha numa rolagem forçada gera consequência narrativa GRAVE decidida pelo Guardião.`,
      { title: "Forçar Rolagem", danger: true, confirmLabel: "Forçar" }
    );
    if (!confirmed) return;
    if (entry.kind === "skill") {
      rollSkill(entry.skillRaw, { pushed: true });
    } else if (entry.kind === "attribute") {
      // Reaplica rolagem de atributo com flag de pushed
      const code = entry.skillRaw;
      const c = state.character;
      const v = Number(c?.attributes?.[code]?.value) || 0;
      const result = dice.rollD100(state.rollMods.bp || null);
      const level = dice.classifyRoll(result.value, v);
      const e = {
        kind: "attribute",
        skill: code + "  ⚠ PUSHED",
        skillRaw: code,
        target: v,
        targetRaw: v,
        label: v,
        d100: result.value,
        level,
        pushed: true
      };
      registerRoll(e);
    }
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

        // Detecta envelope versionado (exportado por esta versão ou posterior).
        // Formato: { _format: "aimalexi-rpg", _schemaVersion: N, investigator: {...}, ... }
        // Legado: objeto de personagem direto, sem _format.
        const isEnvelope = data._format === "aimalexi-rpg";

        // Extrai o objeto de personagem:
        //   1. envelope com "investigator" no root (export direto do personagem)
        //   2. wrapper { character: {...} } (formato intermediário antigo)
        //   3. objeto direto sem wrapper (formato legacy)
        const char = isEnvelope && data.investigator ? data
                   : data.character
                   ? data.character
                   : data;

        if (!char || !char.investigator) {
          toast("Arquivo não parece ser uma ficha de investigador válida.", { type: "error" });
          return;
        }

        // Avisa se versão de schema do arquivo é mais nova que a do app
        if (isEnvelope && data._schemaVersion > store.SAVE_SCHEMA_VERSION) {
          toast(`⚠ Arquivo foi criado por uma versão mais nova do app (schema v${data._schemaVersion}). Alguns dados podem ser ignorados.`, { type: "warn", duration: 7000 });
        }

        // Aplica migrações antes de carregar
        store.runMigrations(char);
        char.id = null; // gera novo ID local
        state.character = char;
        persistCurrent();
        renderAll();
        toast("Personagem importado com sucesso!", { type: "success" });
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

    const btnSanFx = $("#btn-sanity-fx");
    if (btnSanFx) btnSanFx.onclick = () => window.CoC.sanityFx && window.CoC.sanityFx.openSettings();

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
        state.rollCount = 0;
        if (state.logFab && state.logFab.setBadge) state.logFab.setBadge(0);
      }
    };

    // FAB Mobile — botão flutuante de log + modificadores acessível em qualquer aba
    state.rollCount = 0;
    state.logFab = bottomSheet({
      id: "rolllog",
      icon: "🎲",
      label: "Log de Rolagens",
      content: () => {
        const wrap = el("div", {});
        wrap.appendChild(el("h3", {
          style: { fontFamily: "var(--font-serif)", color: "var(--brass-bright)", marginBottom: "0.75rem" },
          text: "Log & Modificadores"
        }));
        // Clona o painel de modificadores (sem realocar o existente do desktop)
        const modPanel = $(".modifier-panel");
        if (modPanel) wrap.appendChild(modPanel.cloneNode(true));
        // Espelho do log atual
        const logMirror = el("div", { class: "roll-log" });
        const ul = el("ul", { style: { listStyle: "none", padding: 0, margin: 0 } });
        // Copia entries do log principal
        $$("#roll-log ul li").forEach(li => ul.appendChild(li.cloneNode(true)));
        logMirror.appendChild(ul);
        wrap.appendChild(logMirror);
        // Bind os botões clonados de difficulty/bp ao mesmo state
        wrap.querySelectorAll("[data-difficulty]").forEach(b => {
          b.onclick = () => {
            wrap.querySelectorAll("[data-difficulty]").forEach(x => x.classList.remove("active"));
            b.classList.add("active");
            state.rollMods.difficulty = b.dataset.difficulty;
            // Espelha no painel desktop
            $$("#modifier-difficulty button").forEach(x => {
              x.classList.toggle("active", x.dataset.difficulty === state.rollMods.difficulty);
            });
          };
        });
        wrap.querySelectorAll("[data-bp]").forEach(b => {
          b.onclick = () => {
            wrap.querySelectorAll("[data-bp]").forEach(x => x.classList.remove("active"));
            b.classList.add("active");
            state.rollMods.bp = b.dataset.bp || "";
            $$("#modifier-bonus button").forEach(x => {
              x.classList.toggle("active", (x.dataset.bp || "") === state.rollMods.bp);
            });
          };
        });
        return wrap;
      }
    });
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

  function startBoot() {
    Promise.resolve(boot()).catch(err => console.error("[investigator] boot failed", err));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startBoot);
  } else {
    startBoot();
  }

})();
