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
  const _sr = window.CoC.createSafeRenderer();

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

  // Sprint 2 — persistMiddleware (instância única, init em boot())
  let _persistMiddleware = null;

  async function boot() {
    // Sprint 2 — persistMiddleware centraliza toda persistência automática.
    // Elimina chamadas manuais a persistCurrent() para actions em PERSIST_ACTIONS.
    // updateBaseline() é chamado após persistCurrent() para sincronizar o diff
    // com o novo id atribuído pelo SET_CHARACTER_ID dispatch interno.
    _persistMiddleware = window.CoC.createPersistMiddleware({
      bus:      window.CoC.bus,
      getState: function () { return cocStore.getState(); },
      saveCharacter: function () {
        persistCurrent();
        _persistMiddleware.updateBaseline();
      }
    });
    _persistMiddleware.init();

    // M3.1 — Vitals slice init + bus hooks (wired before character load)
    // M3.8 — Identity slice init
    window.CoC.views.identity.init(cocStore);
    window.CoC.bus.subscribe("identity:dirty",             function () { markDirty(); });
    window.CoC.bus.subscribe("identity:persist-requested", function () { persistCurrent(); });
    // M3.9 — Attributes slice init (editMode via callback — não exposto no store ainda)
    window.CoC.views.attributes.init(cocStore, { getEditMode: function () { return state.editMode; } });

    window.CoC.views.vitals.init();
    window.CoC.bus.subscribe("vitals:mitos-changed", function () {
      cocStore.dispatch({ type: "RECALC_DERIVED" });   // pipeline re-renderiza vitals+attributes
      persistCurrent();
    });
    // M3.3 — Skills slice init + bus hooks (persist via middleware for SET_SKILL, TOGGLE_*, ADD_CUSTOM_*)
    window.CoC.views.skills.init();
    window.CoC.bus.subscribe("skill:dirty", function () { markDirty(); });
    // M3.6 — Background slice init
    window.CoC.views.background.init(cocStore);
    window.CoC.bus.subscribe("background:dirty",              function () { markDirty(); });
    window.CoC.bus.subscribe("background:persist-requested",  function () { persistCurrent(); });
    // M3.7 — Finances slice init
    window.CoC.views.finances.init(cocStore);
    window.CoC.bus.subscribe("finances:persist-requested",    function () { persistCurrent(); });
    // M4.1 — Inventory slice init
    window.CoC.views.inventory.init();
    // M4.2 — Journal slice init
    window.CoC.views.journal.init();
    // M4.3 — Spells slice init
    window.CoC.views.spells.init();
    // M4.4 — Tomes slice init
    window.CoC.views.tomes.init();

    // M3.5 — Combat slice init (ONE-TIME delegation; weapons list uses store actions)
    window.CoC.views.combat.init(cocStore);
    window.CoC.views.combat.setRollMods(state.rollMods);

    // M3.4 — Rolls slice init + bus hooks
    window.CoC.views.rolls.init();       // wires roll:logged → logAndToast
    window.CoC.views.rolls.setRollMods(state.rollMods);  // sync inicial
    window.CoC.bus.subscribe("skill:roll-requested", function (data) {
      const entry = window.CoC.views.rolls.rollSkill(data.name, {
        difficulty: state.rollMods.difficulty,
        bp: state.rollMods.bp
      });
      // Auto-marcar perícia para evolução quando há sucesso natural (CoC 7e p.44)
      // Qualquer nível de sucesso (regular, hard, extreme, crit) — não apenas "met"
      if (entry && entry.level && entry.level !== 'fail' && entry.level !== 'fumble') {
        cocStore.dispatch({ type: 'MARK_SKILL_IMPROVEMENT', payload: { name: data.name, marked: true } });
      }
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

    // Sprint 6 — Render Pipeline: registry centralizado substituindo subscriptions manuais.
    // SPEND_LUCK e combat actions agora re-renderizam via RENDER_MAP em vez de
    // subscribers individuais. SET_CHARACTER (carga completa) dispara renderAll().
    const _pipeline = window.CoC.core.renderPipeline;
    _pipeline.register('identity',   function () { window.CoC.views.identity.render(); });
    _pipeline.register('attributes', function () { window.CoC.views.attributes.render(); });
    _pipeline.register('vitals',     function () { window.CoC.views.vitals.render(); });
    _pipeline.register('skills',     function () { window.CoC.views.skills.render(); });
    _pipeline.register('combat',     function () { window.CoC.views.combat.render(); });
    _pipeline.register('finances',   function () { window.CoC.views.finances.render(); });
    _pipeline.register('background', function () { window.CoC.views.background.render(); });
    _pipeline.register('inventory',  function () { window.CoC.views.inventory.render(); });
    _pipeline.register('journal',    function () { window.CoC.views.journal.render(); });
    _pipeline.register('spells',     function () { window.CoC.views.spells.render(); });
    _pipeline.register('tomes',      function () { window.CoC.views.tomes.render(); });
    _pipeline.init(window.CoC.bus, function () { return cocStore.getState(); }, cocStore.dispatch.bind(cocStore));

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
    const normalized = window.CoC.schema.normalizeCharacter(character);
    if (normalized._meta.schemaWarnings.length > 0) {
      console.warn('[schema]', normalized._meta.schemaWarnings);
    }
    applyTheme(normalized._meta?.theme || "arkham");
    state.character = normalized;  // dispatches SET_CHARACTER → cascade RECALC_DERIVED → pipeline.renderAll()
    if (!state.character.id) state.character.id = null;
    store.setActiveCharacter(state.character.id);
  }

  function loadPreset(presetName) {
    const preset = window.CoCData.presets?.[presetName];
    if (!preset) { toast("Preset não encontrado: " + presetName, { type: "error" }); return; }
    const fresh = JSON.parse(JSON.stringify(preset));
    fresh.id = null;
    fresh._meta = fresh._meta || {};
    fresh._meta.createdAt = new Date().toISOString();
    applyTheme(fresh._meta?.theme || "arkham");
    state.character = fresh;  // dispatches SET_CHARACTER → pipeline.renderAll()
    persistCurrent();
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

  // renderAll() mantido como escape hatch de debug (console, wizard fallback).
  // Em operação normal, SET_CHARACTER → pipeline.renderAll() é o caminho reativo.
  // RECALC_DERIVED não é mais dispatched aqui — o cascade interno do store.js
  // já aplica RECALC_DERIVED como parte de SET_CHARACTER antes do bus event.
  function renderAll() {
    if (!state.character) return clearUI();
    _sr.safeRender('identity',   function () { window.CoC.views.identity.render(); });
    _sr.safeRender('attributes', function () { window.CoC.views.attributes.render(); });
    _sr.safeRender('vitals',     function () { window.CoC.views.vitals.render(); });
    _sr.safeRender('skills',     renderSkills);
    _sr.safeRender('weapons',    function () { window.CoC.views.combat.render(); });
    _sr.safeRender('finances',   function () { window.CoC.views.finances.render(); });
    _sr.safeRender('background', function () { window.CoC.views.background.render(); });
    _sr.safeRender('inventory',  function () { window.CoC.views.inventory.render(); });
    _sr.safeRender('journal',    function () { window.CoC.views.journal.render(); });
    _sr.safeRender('spells',     function () { window.CoC.views.spells.render(); });
    _sr.safeRender('tomes',      function () { window.CoC.views.tomes.render(); });
  }

  // ─── TEMA ─────────────────────────────────────────────────────────────
  const _VALID_THEMES = ["arkham", "miskatonic", "sepia", "obsidian", "eldritch"];

  function applyTheme(theme) {
    const t = _VALID_THEMES.includes(theme) ? theme : "arkham";
    document.body.dataset.theme = t;
    $$(".theme-swatch").forEach(s => s.classList.toggle("active", s.dataset.theme === t));
  }

  function clearUI() {
    applyTheme("arkham");
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
      const portraitMain = $("#portrait-main");
      if (portraitMain) window.CoC.mediaPicker.render(portraitMain, null);
    }
    const invList = $("#inventory-list");
    if (invList) invList.innerHTML = "";
    const invCap = $("#inventory-capacity");
    if (invCap) invCap.textContent = "";
    const jList = $("#journal-list");
    if (jList) jList.innerHTML = "";
    const jCount = $("#journal-count");
    if (jCount) jCount.textContent = "";
    const sList = $("#spells-list");
    if (sList) sList.innerHTML = "";
    const sCount = $("#spells-count");
    if (sCount) sCount.textContent = "";
    const tList = $("#tomes-list");
    if (tList) tList.innerHTML = "";
    const tCount = $("#tomes-count");
    if (tCount) tCount.textContent = "";
    if (window.CoC.sanityFx) window.CoC.sanityFx.clear();
  }

  // ─── IDENTIDADE — extraído para js/views/identity.js (M3.8) ─────────────
  // render, bindCharacterImages, setupImageSlot, refreshImageRemoveBtn movidos.
  // Publica identity:dirty e identity:persist-requested via bus.

  // ─── ATRIBUTOS + DERIVADOS — extraído para js/views/attributes.js (M3.9) ──
  // renderAttributes → attributes.render(); recalcDerived → RECALC_DERIVED action.
  // editMode injetado via callback em init() (state.editMode ainda não está no store).

  // ─── PERÍCIAS — extraído para js/views/skills.js (M3.3) ──────────────────
  // Delegações locais para compatibilidade com renderAll() e outros call sites.
  function renderSkills()      { window.CoC.views.skills.render(); }
  function refreshSkillBadges(){ window.CoC.views.skills.refreshBadges(); }

  // ─── ARSENAL — extraído para js/views/combat.js (M3.5) ───────────────────
  // render, init, _editWeapon, _attack e setRollMods vivem agora em combat.js.
  // As actions ADD/UPDATE/REMOVE_WEAPON e ATTACK_RESOLVED passam pelo store.

  // ─── FINANÇAS — extraído para js/views/finances.js (M3.7) ────────────────
  // render, adjustCash, ensureFinances, formatMoney, getCreditRating,
  // setCreditRating vivem agora em finances.js.

  // ─── BACKGROUND — extraído para js/views/background.js (M3.6) ───────────
  // render e binding de campos background/status/equipment vivem agora em
  // background.js (publica background:dirty e background:persist-requested).

  // ═════════════════════════════════════════════════════════════════════
  // ROLAGENS
  // ═════════════════════════════════════════════════════════════════════

  // ─── ROLLS — extraído para js/views/rolls.js (M3.4) ─────────────────────
  // getSkillValue() usada por rollAttribute stub abaixo; combat.js tem cópia local.
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
        if (mp && char.investigator && char.investigator.portraitId) {
          char.investigator.portraitId = await mp.dataURIToBlobId(char.investigator.portraitId);
        }

        applyTheme(char._meta?.theme || "arkham");
        state.character = char;  // dispatches SET_CHARACTER → pipeline.renderAll()
        persistCurrent();
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
      window.CoC.views.attributes.render();
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
      if (mp && exportData.investigator && exportData.investigator.portraitId) {
        exportData.investigator.portraitId = (await mp.blobIdToDataURI(exportData.investigator.portraitId)) || exportData.investigator.portraitId;
      }
      const ok = store.exportJSON(exportData, filename);
      if (ok) toast("✓ JSON exportado — guarde este arquivo como backup!", { type: "success", duration: 4000 });
    };

    $("#btn-session-export").onclick = () => {
      const se = window.CoC.core && window.CoC.core.sessionExport;
      if (se) se.exportSession();
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

    // #btn-add-weapon handled by window.CoC.views.combat.init()

    // Theme picker swatches (M3.5.3)
    $$(".theme-swatch").forEach(swatch => {
      swatch.onclick = () => {
        const theme = swatch.dataset.theme;
        applyTheme(theme);
        if (state.character) {
          const c = state.character;
          c._meta = c._meta || {};
          c._meta.theme = theme;
          persistCurrent();
        }
      };
    });

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

    const age = Number(c.investigator?.age) || 25;
    const adj = rules.calcAgeAdjustments(age);
    const toastLines = [];

    // ── 1. Re-roll de Sorte para jovens (15–19): usar o melhor resultado ──
    if (adj && adj.luckRerolls > 0) {
      const reroll = dice.rollAttribute("3d6x5");
      const first  = c.attributes.Sorte.value;
      if (reroll.total > first) {
        c.attributes.Sorte.value = reroll.total;
        c.attributes.Sorte.rolled += ` | re-roll: ${reroll.raw.join("+")}=${reroll.rawSum}, ×5 = ${reroll.total} ✓ (usado)`;
        toastLines.push(`Sorte ${first}→${reroll.total} (re-roll favorável)`);
      } else {
        c.attributes.Sorte.rolled += ` | re-roll: ${reroll.raw.join("+")}=${reroll.rawSum}, ×5 = ${reroll.total} (descartado)`;
      }
    }

    // ── 2. EDU −5 para faixa 15–19 ────────────────────────────────────────
    if (adj && adj.eduReduction > 0) {
      const attr = c.attributes.EDU;
      if (attr) {
        const before = attr.value;
        attr.value = Math.max(0, attr.value - adj.eduReduction);
        if (attr.value !== before) toastLines.push(`EDU ${before}→${attr.value} (−${adj.eduReduction})`);
      }
    }

    // ── 3. Redução física distribuída (FOR/TAM ou FOR/CON/DES) ────────────
    if (adj && adj.physical.points > 0 && adj.physical.attrs.length > 0) {
      const before = {};
      adj.physical.attrs.forEach(k => { before[k] = c.attributes[k]?.value || 0; });
      let remaining = adj.physical.points;
      while (remaining > 0) {
        const eligible = adj.physical.attrs.filter(k => (c.attributes[k]?.value || 0) > 0);
        if (!eligible.length) break;
        const highest = eligible.reduce((a, b) =>
          (c.attributes[a]?.value || 0) >= (c.attributes[b]?.value || 0) ? a : b
        );
        const cut = Math.min(remaining, c.attributes[highest].value);
        c.attributes[highest].value -= cut;
        remaining -= cut;
      }
      const detail = adj.physical.attrs
        .filter(k => before[k] !== (c.attributes[k]?.value || 0))
        .map(k => `${codeToLabel(k)} ${before[k]}→${c.attributes[k].value}`)
        .join(", ");
      if (detail) toastLines.push(`Físico −${adj.physical.points}: ${detail}`);
    }

    // ── 4. Redução fixa de APA (faixas 40+) ──────────────────────────────
    if (adj && adj.appReduction > 0) {
      const attr = c.attributes.APA;
      if (attr) {
        const before = attr.value;
        attr.value = Math.max(0, attr.value - adj.appReduction);
        if (attr.value !== before) toastLines.push(`APA ${before}→${attr.value} (−${adj.appReduction})`);
      }
    }

    // ── 5. Verificações de Melhoria de EDU ───────────────────────────────
    if (adj && adj.eduImprovementChecks > 0) {
      const eduAttr = c.attributes.EDU;
      const checkResults = [];
      for (let i = 0; i < adj.eduImprovementChecks; i++) {
        const res = rules.rollEduImprovement(eduAttr ? eduAttr.value : 0);
        if (eduAttr) eduAttr.value = res.after;
        checkResults.push(res.improved
          ? `check ${i + 1}: d100=${res.rolled} > ${res.before} → +${res.gain} (EDU ${res.before}→${res.after})`
          : `check ${i + 1}: d100=${res.rolled} ≤ ${res.before} → sem ganho`
        );
        // Registrar cada verificação no log de rolagens
        if (window.CoC.views.rolls && window.CoC.views.rolls.registerRoll) {
          window.CoC.views.rolls.registerRoll({
            kind:     "edu-improvement",
            skill:    `Melhoria de EDU (verificação ${i + 1}/${adj.eduImprovementChecks})`,
            target:   res.before,
            d100:     res.rolled,
            level:    res.improved ? "regular" : "fail",
            met:      res.improved,
            note:     res.improved ? `+${res.gain} EDU (${res.before}→${res.after})` : "sem ganho",
            luckCost: 0,
          });
        }
      }
      toastLines.push(`EDU checks (${adj.eduImprovementChecks}×): ${checkResults.join(" | ")}`);
    }

    if (toastLines.length > 0) {
      toast(`Atributos rolados — ajuste de idade (${age} anos): ${toastLines.join(" · ")}`, { type: "success", duration: 9000 });
    } else {
      toast("Atributos rolados! PV, MP, SAN, MOV, DB recalculados.", { type: "success" });
    }

    cocStore.dispatch({ type: "RECALC_DERIVED" });  // pipeline re-renderiza attributes+vitals
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
        loadPreset("empty");
        if (choice === "quick") {
          setTimeout(() => rollAllAttributes(), 200);
        } else {
          toast("Ficha criada. Use 🎲 Rolar Tudo ou edite manualmente os atributos.", { type: "info" });
        }
        // Foco no nome
        setTimeout(() => $("#id-name")?.focus(), 250);
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
        window.CoC.views.combat.setRollMods(state.rollMods);
      };
    });
    $$("#modifier-bonus button").forEach(b => {
      b.onclick = () => {
        $$("#modifier-bonus button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        state.rollMods.bp = b.dataset.bp || "";
        window.CoC.views.rolls.setRollMods(state.rollMods);
        window.CoC.views.combat.setRollMods(state.rollMods);
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
        state.mobileTab = t.dataset.tab;
        applyTab();
      };
    });
    $$(".desktop-tab").forEach(t => {
      t.onclick = () => {
        state.mobileTab = t.dataset.tab;
        applyTab();
      };
    });
    applyTab();
  }

  function applyTab() {
    const tab = state.mobileTab;
    $$("[data-tab]").forEach(s => s.classList.toggle("tab-active", s.dataset.tab === tab));
    $$(".mobile-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    $$(".desktop-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  }

  // Alias para compatibilidade com chamadas existentes
  const applyMobileTab = applyTab;

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
