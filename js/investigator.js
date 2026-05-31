/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/investigator.js
   Orquestrador da Ficha do Investigador
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  // ─── Atalhos ──────────────────────────────────────────────────────────
  const { $, $$, el, toast, modal, confirm, prompt, clearLog, exportLogAsMarkdown, escapeHtml, copyToClipboard, bottomSheet } = window.CoC.ui;
  const dice = window.CoC.dice;
  const rules = window.CoC.rules;
  const store = window.CoC.storage;
  const nameGen = window.CoC.names;
  const validators = window.CoC.validators;
  const cocStore = window.CoC.store;

  // ─── Estado ───────────────────────────────────────────────────────────
  const state = {
    // character é exposto via getter/setter abaixo — cocStore é a fonte de verdade
    rollMods: {
      difficulty: "regular",   // regular | hard | extreme
      bp: ""                   // "" | "bonus" | "penalty"
    },
    editMode: false,
    mobileTab: "personagem",
    rollHistory: []
  };

  // Cap mínimo do PV antes de morrer
  const PV_MIN = -2;

  // state.character lê e escreve no cocStore (única fonte de verdade).
  // Todos os `state.character = X` auto-dispatcham SET_CHARACTER.
  // Todos os `state.character` lidos retornam o estado atual do store.
  Object.defineProperty(state, "character", {
    get()  { return cocStore.getState().character; },
    set(v) { cocStore.dispatch({ type: "SET_CHARACTER", payload: v }); },
    configurable: true,
    enumerable:   true,
  });

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

  // SACRED vitals actions that need persist + Mitos side-effects (decoupled from vitals module)
  const _VITALS_PERSIST = new Set(["APPLY_DAMAGE", "HEAL_DAMAGE", "LOSE_SANITY", "RECOVER_SANITY", "SPEND_MAGIC", "RESTORE_MAGIC"]);

  async function boot() {
    // M3.1 — Vitals slice init + bus hooks (wired before character load)
    window.CoC.views.vitals.init();
    window.CoC.bus.subscribe("store:dispatch", function (event) {
      if (event.changed && _VITALS_PERSIST.has(event.action.type)) persistCurrent();
    });
    window.CoC.bus.subscribe("vitals:mitos-changed", function () {
      recalcDerived();
      persistCurrent();
    });
    // M3.2 — Luck slice: re-render Sorte in sidebar + persist after spend
    window.CoC.bus.subscribe("store:dispatch", function (event) {
      if (event.changed && event.action.type === "SPEND_LUCK") {
        renderAttributes();
        window.CoC.views.vitals.renderSidebarVitals();
        persistCurrent();
      }
    });
    // M3.3 — Skills slice init + bus hooks
    window.CoC.views.skills.init();
    window.CoC.bus.subscribe("skill:persist-requested", function () { persistCurrent(); });
    window.CoC.bus.subscribe("skill:dirty",            function () { markDirty(); });
    window.CoC.bus.subscribe("store:dispatch", function (event) {
      if (!event.changed) return;
      const t = event.action.type;
      if (t === "TOGGLE_OCCUPATION_SKILL" || t === "ADD_CUSTOM_SKILL") persistCurrent();
    });
    // M3.4 — Rolls slice init + bus hooks
    window.CoC.views.rolls.init();       // wires roll:logged → logAndToast
    window.CoC.views.rolls.setRollMods(state.rollMods);  // sync inicial
    window.CoC.bus.subscribe("skill:roll-requested", function (data) {
      window.CoC.views.rolls.rollSkill(data.name, {
        difficulty: state.rollMods.difficulty,
        bp: state.rollMods.bp
      });
    });
    window.CoC.bus.subscribe("roll:badge-inc", function () {
      state.rollCount = (state.rollCount || 0) + 1;
      if (state.logFab?.setBadge) state.logFab.setBadge(state.rollCount);
    });
    window.CoC.bus.subscribe("rolls:persist-requested", function () { persistCurrent(); });

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
      // BUG-01 fix: surface hard rule violations from previous session
      const vBoot = validators.validateCharacter(state.character, { editMode: state.editMode });
      if (vBoot.issues.length > 0) {
        const summary = vBoot.issues.length === 1
          ? vBoot.issues[0]
          : `${vBoot.issues.length} violações de regra — primeira: ${vBoot.issues[0]}`;
        toast("⚠ " + summary, { type: "warn", duration: 7000 });
      }
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
    // BUG-01 fix: validate before persisting — surface hard cap violations
    const vPersist = validators.validateCharacter(state.character, { editMode: state.editMode });
    if (vPersist.issues.length > 0) {
      const summary = vPersist.issues.length === 1
        ? vPersist.issues[0]
        : `${vPersist.issues.length} violações de regra — primeira: ${vPersist.issues[0]}`;
      toast("⚠ " + summary, { type: "warn", duration: 5000 });
    }
    const id = store.saveCharacter(state.character);
    cocStore.dispatch({ type: "SET_CHARACTER_ID", payload: id });
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
    window.CoC.views.vitals.render();
    renderSkills();
    renderWeapons();
    renderFinances();
    renderBackground();
  }

  function clearUI() {
    const sAttr = $("#sidebar-attributes");
    if (sAttr) sAttr.innerHTML = "";
    const sVitals = $("#sidebar-vitals");
    if (sVitals) sVitals.innerHTML = "";
    const sName = $("#sidebar-name");
    if (sName) sName.textContent = "—";
    const sOcc  = $("#sidebar-occupation");
    if (sOcc)  sOcc.textContent  = "—";
    $("#derived-bar").innerHTML = "";
    $("#skills-groups").innerHTML = "";
    $("#weapons-list").innerHTML = "";
    const finCard = $("#finances-card");
    if (finCard) finCard.innerHTML = "";
    if (window.CoC.mediaPicker) {
      window.CoC.mediaPicker.render($("#character-banner"), null);
      window.CoC.mediaPicker.render($("#character-portrait"), null);
    }
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

    // Sync sidebar identity display
    const sName = $("#sidebar-name");
    const sOcc  = $("#sidebar-occupation");
    if (sName) sName.textContent = c.investigator?.name       || "—";
    if (sOcc)  sOcc.textContent  = c.investigator?.occupation || "—";

    // Recalcular pontos ao mudar ocupação
    $("#id-occupation").onchange = () => {
      c.investigator.occupation = $("#id-occupation").value;
      const _sOcc = $("#sidebar-occupation");
      if (_sOcc) _sOcc.textContent = c.investigator.occupation || "—";
      renderSkills();
      renderFinances();
      persistCurrent();
    };

    // Bind genérico de inputs
    fields.forEach(f => {
      const node = $(`[data-bind="investigator.${f}"]`);
      if (!node) return;
      node.oninput = () => {
        c.investigator[f] = node.value;
        if (f === "name") {
          const _sName = $("#sidebar-name");
          if (_sName) _sName.textContent = node.value || "—";
        }
        if (f === "occupation") {
          const _sOcc = $("#sidebar-occupation");
          if (_sOcc) _sOcc.textContent = node.value || "—";
        }
        if (f === "tagline") $("#identity-display").textContent = node.value ? "“" + node.value + "”" : "";
        if (f === "age") {
          recalcDerived();
          window.CoC.views.vitals.render();
          const newAge = Number(node.value) || 25;
          const adj = rules.calcAgeAdjustments(newAge);
          if (adj) {
            toast(
              `Idade ${newAge} anos: redistribua -${adj.totalReduction} pts entre ${adj.attrs.join("/")} manualmente ou clique "Rolar Tudo".`,
              { type: "info", duration: 8000 }
            );
          }
        }
        markDirty();
      };
      node.onblur = persistCurrent;
    });

    bindCharacterImages();
  }

  // ─── IMAGENS (banner + retrato) ───────────────────────────────────────
  // Clique no slot → mediaPicker.pick (persiste blob) → render. Botão ✕ remove.
  function bindCharacterImages() {
    if (!window.CoC.mediaPicker) return;
    setupImageSlot($("#character-banner"),   "bannerId",   { maxDim: 1280, label: "banner" });
    setupImageSlot($("#character-portrait"), "portraitId", { maxDim: 640,  label: "retrato" });
  }

  function setupImageSlot(slotEl, field, opts) {
    if (!slotEl) return;
    const c = state.character;
    const mp = window.CoC.mediaPicker;
    mp.render(slotEl, c.investigator?.[field] || null);
    refreshImageRemoveBtn(slotEl, field, opts);

    slotEl.onclick = async (e) => {
      // cliques no botão remover são tratados por ele mesmo
      if (e.target && e.target.classList && e.target.classList.contains("img-remove")) return;
      const blobId = await mp.pick({ maxDim: opts.maxDim });
      if (!blobId) return;
      c.investigator = c.investigator || {};
      c.investigator[field] = blobId;
      persistCurrent();
      mp.render(slotEl, blobId);
      refreshImageRemoveBtn(slotEl, field, opts);
      toast(`Imagem de ${opts.label} atualizada.`, { type: "success", duration: 1800 });
    };
  }

  function refreshImageRemoveBtn(slotEl, field, opts) {
    const c = state.character;
    const hasImg = !!(c.investigator && c.investigator[field]);
    let btn = slotEl.querySelector(".img-remove");
    if (hasImg && !btn) {
      btn = el("button", { class: "img-remove no-print", title: `Remover ${opts.label}`, text: "✕", type: "button" });
      btn.onclick = (e) => {
        e.stopPropagation();
        const oldId = c.investigator[field];
        c.investigator[field] = null;
        persistCurrent();
        window.CoC.mediaPicker.render(slotEl, null);
        // templates (data-URI) não vivem no storage; só blobIds de upload são apagáveis
        if (oldId && typeof oldId === "string" && !oldId.startsWith("data:") && store.deleteBlob) {
          store.deleteBlob(oldId);
        }
        refreshImageRemoveBtn(slotEl, field, opts);
      };
      slotEl.appendChild(btn);
    } else if (!hasImg && btn) {
      btn.remove();
    }
  }

  // ─── ATRIBUTOS — renderiza para #sidebar-attributes (M3.5.1) ─────────
  function renderAttributes() {
    const grid = $("#sidebar-attributes");
    if (!grid) return;
    grid.innerHTML = "";
    const c = state.character;
    if (!c?.attributes) return;

    const ATTRS = ["FOR", "CON", "TAM", "DES", "APA", "INT", "POD", "EDU", "Sorte"];
    for (const code of ATTRS) {
      const attr = c.attributes[code];
      if (!attr) continue;
      const v = Number(attr.value) || 0;
      const row = el("div", { class: "sattr-row", "data-attr": code });
      const valNode = el("span", {
        class: "sattr-value",
        contenteditable: state.editMode ? "true" : "false",
        title: escapeHtml(attr.rolled || "")
      }, [String(v)]);
      row.appendChild(el("span", { class: "sattr-label" }, [escapeHtml(code)]));
      row.appendChild(valNode);
      row.appendChild(el("span", { class: "sattr-fracs" }, [`½${dice.half(v)} · ⅕${dice.fifth(v)}`]));
      grid.appendChild(row);
    }

    if (state.editMode) {
      $$(".sattr-value").forEach(node => {
        node.onkeydown = (e) => {
          if (e.key === "Enter")  { e.preventDefault(); node.blur(); }
          if (e.key === "Escape") {
            e.preventDefault();
            const code = node.closest(".sattr-row").dataset.attr;
            node.textContent = String(state.character.attributes[code].value);
            node.blur();
          }
        };
        node.onblur = () => {
          const code = node.closest(".sattr-row").dataset.attr;
          const v = Math.max(0, Math.min(99, parseInt(node.textContent, 10) || 0));
          state.character.attributes[code].value = v;
          renderAttributes();
          recalcDerived();
          window.CoC.views.vitals.render();
          renderSkills();
          persistCurrent();
        };
      });
    }
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
    c.derived.Mitos = c.derived.Mitos || { label: "Mythos de Cthulhu", value: 0 };
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

  // ─── PERÍCIAS — extraído para js/views/skills.js (M3.3) ──────────────────
  // Delegações locais para compatibilidade com renderAll() e outros call sites.
  function renderSkills()      { window.CoC.views.skills.render(); }
  function refreshSkillBadges(){ window.CoC.views.skills.refreshBadges(); }

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

    const skillVal = getSkillValue(c, w.skill);
    const difficulty = state.rollMods.difficulty || "regular";

    const target =
      difficulty === "hard"    ? dice.half(skillVal)  :
      difficulty === "extreme" ? dice.fifth(skillVal) :
                                 skillVal;

    const result = dice.rollD100(state.rollMods.bp || null);
    const level  = dice.classifyRoll(result.value, skillVal);
    const ok     = dice.meetsDifficulty(difficulty, level);

    let dmgStr = "—";
    if (ok) {
      const dbVal    = c.derived?.DB?.value || "0";
      const isImpale = (level === "extreme" || level === "crit") && w.impale;
      const d        = dice.rollDamage(w.damage || "0", dbVal, isImpale);
      const diceStr  = d.rolls.map(r => `(${r.dice.join("+")})`).join("+");
      dmgStr = `${w.damage} → ${d.total}${isImpale ? " ⚡EMPALA" : ""} ${diceStr}`;
    }

    window.CoC.views.rolls.registerRoll({
      kind: "weapon-attack",
      skill: `⚔ ${w.name}`,
      skillRaw: w.skill,
      target,
      targetRaw: skillVal,
      label: difficulty === "regular"
        ? skillVal
        : `${skillVal} → ${difficulty === "hard" ? "Difícil" : "Extremo"} ${target}`,
      d100: result.value,
      level,
      dmg: ok ? dmgStr : "(miss)",
      note: [
        state.rollMods.bp ? `[${state.rollMods.bp}]` : "",
        difficulty !== "regular" ? `[${difficulty}]` : ""
      ].filter(Boolean).join(" ")
    });
  }

  // ─── FINANÇAS ─────────────────────────────────────────────────────────
  // Carteira do investigador: Crédito (Posses) → Caixa/Gasto/Patrimônio (regra
  // CoC 7E em rules.calcFinances). "cash" é o dinheiro à mão, ajustável em jogo
  // pelos botões ±100/±10/±1. Tudo vive em c.finances (viaja no JSON/backup).

  function ensureFinances(c) {
    if (!c.finances || typeof c.finances !== "object") c.finances = { cash: 0 };
    c.finances.cash = Number(c.finances.cash) || 0;
    return c.finances;
  }

  // Nível de Crédito é uma PERÍCIA (CoC 7E) — a carteira e os derivados leem dela.
  function getCreditRating(c) {
    return Number(c && c.skills && c.skills["Nível de Crédito"] && c.skills["Nível de Crédito"].value) || 0;
  }
  function setCreditRating(c, v) {
    c.skills = c.skills || {};
    c.skills["Nível de Crédito"] = c.skills["Nível de Crédito"] || {};
    c.skills["Nível de Crédito"].value = v;
  }

  // Formata em pt-BR com prefixo "$" (milhar com ".", decimal só se fracionário).
  function formatMoney(n) {
    const v = Number(n) || 0;
    const str = Number.isInteger(v)
      ? v.toLocaleString("pt-BR")
      : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return "$" + str;
  }

  function renderFinances() {
    const host = $("#finances-card");
    if (!host) return;
    const c = state.character;
    if (!c) { host.innerHTML = ""; return; }
    const fin = ensureFinances(c);

    const occName = c.investigator?.occupation;
    const occ = occName ? window.CoCData.findOccupation(occName) : null;
    const range = occ && Array.isArray(occ.credit) ? occ.credit : null;
    const cr = getCreditRating(c);
    const derived = window.CoC.rules.calcFinances(cr);

    host.innerHTML = `
      <div class="fin-credit-row">
        <label class="fin-credit">Nível de Crédito
          <input type="number" id="fin-cr" min="0" max="99" step="1" inputmode="numeric" value="${cr}" />
          <span class="dim">/ 99</span>
        </label>
        ${range
          ? `<span class="fin-hint">Faixa da ocupação: <b>${range[0]}–${range[1]}%</b></span>`
          : `<span class="fin-hint dim">Defina a ocupação para ver a faixa de Posses</span>`}
      </div>

      <div class="fin-derived">
        Nível: <b id="fin-tier">${derived.tierLabel}</b>
        · Nível de Gastos: <b id="fin-spend">${formatMoney(derived.spending)}</b>
        · Patrimônio: <b id="fin-assets">${formatMoney(derived.assets)}</b>
      </div>

      <div class="fin-wallet">
        <span class="fin-wallet-label">Dinheiro em Mãos</span>
        <span class="fin-wallet-value" id="fin-cash">${formatMoney(fin.cash)}</span>
        <button id="fin-seed" class="btn-ghost no-print" title="Definir o dinheiro à mão com a Caixa inicial do Crédito">↻ inicial</button>
      </div>

      <div class="fin-buttons no-print">
        <div class="fin-btn-row">
          <button type="button" data-cash="100" class="btn-cash gain">+100</button>
          <button type="button" data-cash="10"  class="btn-cash gain">+10</button>
          <button type="button" data-cash="1"   class="btn-cash gain">+1</button>
        </div>
        <div class="fin-btn-row">
          <button type="button" data-cash="-100" class="btn-cash spend">−100</button>
          <button type="button" data-cash="-10"  class="btn-cash spend">−10</button>
          <button type="button" data-cash="-1"   class="btn-cash spend">−1</button>
        </div>
      </div>
    `;

    // Crédito: aplica no change (não no input) → não perde foco nem re-renderiza tudo.
    const crInput = $("#fin-cr", host);
    crInput.onchange = () => {
      let v = Math.round(Number(crInput.value));
      if (!isFinite(v) || v < 0) v = 0;
      if (v > 99) v = 99;
      crInput.value = v;
      setCreditRating(c, v);
      const d = window.CoC.rules.calcFinances(v);
      $("#fin-tier", host).textContent = d.tierLabel;
      $("#fin-spend", host).textContent = formatMoney(d.spending);
      $("#fin-assets", host).textContent = formatMoney(d.assets);
      renderSkills();        // "Nível de Crédito" é perícia — mantém a aba sincronizada
      persistCurrent();
    };

    // Semeia a carteira com a Caixa inicial derivada do Crédito.
    $("#fin-seed", host).onclick = () => {
      const d = window.CoC.rules.calcFinances(getCreditRating(c));
      fin.cash = d.cash;
      $("#fin-cash", host).textContent = formatMoney(fin.cash);
      persistCurrent();
      toast(`Dinheiro em Mãos definido em ${formatMoney(fin.cash)} (inicial do Nível de Crédito ${getCreditRating(c)}).`, { type: "success", duration: 2600 });
    };

    // ±100/±10/±1: muta cash e atualiza só o display (rápido, sem perder foco).
    $$("[data-cash]", host).forEach(b => {
      b.onclick = () => adjustCash(parseInt(b.dataset.cash, 10));
    });
  }

  function adjustCash(delta) {
    const c = state.character;
    if (!c) return;
    const fin = ensureFinances(c);
    let next = fin.cash + delta;
    if (next < 0) next = 0;   // dinheiro à mão não negativa
    fin.cash = next;
    const span = $("#fin-cash");
    if (span) span.textContent = formatMoney(fin.cash);
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

  // ─── ROLLS — extraído para js/views/rolls.js (M3.4) ─────────────────────
  // getSkillValue() mantida aqui: usada por attackWithWeapon() (domínio Weapons)
  function getSkillValue(c, name) {
    const direct = Number(c?.skills?.[name]?.value);
    if (!isNaN(direct)) return direct;
    const def = window.CoCData.findSkill(name) || window.CoCData.findSkill(name.replace(/\s*\(.+\)$/, ""));
    if (!def) return 0;
    const attrs = Object.fromEntries(Object.entries(c?.attributes || {}).map(([k, x]) => [k, x.value]));
    if (def.baseFormula === "DES/2") return Math.floor((attrs.DES || 0) / 2);
    if (def.baseFormula === "EDU")   return attrs.EDU || 0;
    return Number(def.base) || 0;
  }
  // Stub local: passes current mods to rolls.js
  function rollAttribute(code, difficultyOverride) {
    window.CoC.views.rolls.rollAttribute(code, {
      difficulty: difficultyOverride || state.rollMods.difficulty,
      bp: state.rollMods.bp
    });
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

        // Híbrido: imagens chegam embutidas como data-URI; re-hidrata em Blob
        // local (novo blobId). Sem storage de blob, mantém o data-URI (render lida).
        const mp = window.CoC.mediaPicker;
        if (mp && char.investigator) {
          for (const f of ["bannerId", "portraitId"]) {
            if (char.investigator[f]) {
              char.investigator[f] = await mp.dataURIToBlobId(char.investigator[f]);
            }
          }
        }

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

    $("#btn-export").onclick = async () => {
      if (!state.character) return toast("Nenhum personagem para exportar", { type: "warn" });
      const filename = `${(state.character.investigator?.name || "personagem").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.json`;
      // Híbrido: embute as imagens (blobId → data-URI) para o backup ser portátil.
      const exportData = JSON.parse(JSON.stringify(state.character));
      const mp = window.CoC.mediaPicker;
      if (mp && exportData.investigator) {
        for (const f of ["bannerId", "portraitId"]) {
          if (exportData.investigator[f]) {
            exportData.investigator[f] = (await mp.blobIdToDataURI(exportData.investigator[f])) || exportData.investigator[f];
          }
        }
      }
      const ok = store.exportJSON(exportData, filename);
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
    // Filtros de perícia e search-input → gerenciados por window.CoC.views.skills.init()
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

    // BUG-03 fix: Luck re-roll for young investigators (age 15-19)
    // PDF p.36: roll Luck twice, use the higher value
    const age = Number(c.investigator?.age) || 25;
    if (age >= 15 && age <= 19) {
      const reroll = dice.rollAttribute("3d6x5");
      const first = c.attributes.Sorte.value;
      if (reroll.total > first) {
        c.attributes.Sorte.value = reroll.total;
        c.attributes.Sorte.rolled += ` | re-roll: ${reroll.raw.join("+")}=${reroll.rawSum}, ×5 = ${reroll.total} ✓ (usado)`;
      } else {
        c.attributes.Sorte.rolled += ` | re-roll: ${reroll.raw.join("+")}=${reroll.rawSum}, ×5 = ${reroll.total} (descartado)`;
      }
    }

    // BUG-02 fix: apply age adjustments to primary attributes
    // Distribution: highest-value affected attr absorbs each point (never below 0)
    const adj = rules.calcAgeAdjustments(age);
    if (adj) {
      const before = {};
      adj.attrs.forEach(k => { before[k] = c.attributes[k]?.value || 0; });
      let remaining = adj.totalReduction;
      while (remaining > 0) {
        const eligible = adj.attrs.filter(k => (c.attributes[k]?.value || 0) > 0);
        if (!eligible.length) break;
        const highest = eligible.reduce((a, b) =>
          (c.attributes[a]?.value || 0) >= (c.attributes[b]?.value || 0) ? a : b
        );
        const cut = Math.min(remaining, c.attributes[highest].value);
        c.attributes[highest].value -= cut;
        remaining -= cut;
      }
      const detail = adj.attrs
        .filter(k => before[k] !== (c.attributes[k]?.value || 0))
        .map(k => `${codeToLabel(k)} ${before[k]}→${c.attributes[k].value}`)
        .join(", ");
      toast(`Atributos rolados — ajuste de idade (${age} anos): -${adj.totalReduction} pts em ${adj.attrs.join("/")} · ${detail}`, { type: "success", duration: 7000 });
    } else {
      toast("Atributos rolados! PV, MP, SAN, MOV, DB recalculados.", { type: "success" });
    }

    recalcDerived();
    renderAttributes();
    window.CoC.views.vitals.render();
    renderSkills();
    persistCurrent();
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
        window.CoC.views.rolls.setRollMods(state.rollMods);
      };
    });
    $$("#modifier-bonus button").forEach(b => {
      b.onclick = () => {
        $$("#modifier-bonus button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        state.rollMods.bp = b.dataset.bp || "";
        window.CoC.views.rolls.setRollMods(state.rollMods);
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
            window.CoC.views.rolls.setRollMods(state.rollMods);
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
            window.CoC.views.rolls.setRollMods(state.rollMods);
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
