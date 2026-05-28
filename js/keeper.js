/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/keeper.js
   Orquestrador da Ficha do Mestre — Constituição V1
   ───────────────────────────────────────────────────────────────────────────
   - DDAU: state é fonte da verdade; DOM é reflexo.
   - Renders cirúrgicos. Rebuild só em mudança estrutural.
   - Modo Simples = padrão. Modo Completo = opcional, escondido.
   - schemaVersion em saves. Mobile-first 375px sem overflow horizontal.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  const { $, $$, el, toast, modal, confirm, prompt, appendRoll, clearLog, escapeHtml, copyToClipboard } = window.CoC.ui;
  const dice = window.CoC.dice;
  const store = window.CoC.storage;

  const SCHEMA_VERSION = 1;

  // ─── Estado em memória (DDAU) ─────────────────────────────────────────
  const state = {
    active: null,            // criatura aberta no workspace (clone editável)
    activeSourceId: null,    // id do bestiário base (se for instância) — para "Restaurar"
    activeSavedId: null,     // id em localStorage (se foi salvo)
    mode: "simple",          // "simple" | "full"
    libraryTab: "all",       // "all" | "bestiary" | "saved"
    librarySearch: "",
    encounter: [],           // criaturas no tracker {id, name, hp, hpMax, armor, sanLoss, type}
    rollHistory: []
  };

  // A disponibilidade real do storage só é conhecida após store.ready (IndexedDB é
  // assíncrono). A checagem correta vive no boot(), depois do await — evita o
  // falso-positivo que disparava em quase todo carregamento. Registra só o handler
  // de erro real de gravação (quota cheia).
  if (store.onError) {
    store.onError((info) => {
      if (info && info.type === "quota") {
        toast("⚠ Armazenamento cheio. Exporte a biblioteca e remova itens antigos para liberar espaço.", { type: "error", duration: 8000 });
      }
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // BOOT
  // ═════════════════════════════════════════════════════════════════════

  async function boot() {
    bindToolbar();
    bindLibraryTabs();
    bindLibrarySearch();
    bindEncounter();
    bindRollLog();

    // Aguarda o cache do storage (IndexedDB é async no boot)
    if (store.ready) {
      try { await store.ready; } catch (e) { /* fallback já tratado pelo storage */ }
    }

    renderLibrary();
    renderEncounter();

    if (store.backend === "memory") {
      toast("⚠ Persistência indisponível. Use 💾 Exportar para salvar criaturas.", { type: "warn", duration: 7000 });
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // BIBLIOTECA — render + interação
  // ═════════════════════════════════════════════════════════════════════

  function renderLibrary() {
    const list = $("#library-list");
    list.innerHTML = "";

    const items = collectLibraryItems();
    if (items.length === 0) {
      list.innerHTML = `<div class="encounter-empty">Nada por aqui.</div>`;
      return;
    }
    for (const it of items) {
      const card = el("div", {
        class: `library-item type-${it.type} ${state.active && state.active._libKey === it._libKey ? "active" : ""}`,
        on: { click: () => openInWorkspace(it) }
      });
      const hp = it.derived?.hp != null ? `PV ${it.derived.hp}` : "";
      const sanl = it.sanLoss && it.sanLoss !== "—" ? ` · SAN ${escapeHtml(it.sanLoss)}` : "";
      const tag = it._source === "bestiary" ? "📜" : "💾";
      card.innerHTML = `
        <div>
          <div class="li-name">${escapeHtml(it.name)}</div>
        </div>
        <div class="li-meta">${tag} ${hp}${sanl}</div>
      `;
      list.appendChild(card);
    }
  }

  function collectLibraryItems() {
    const tab = state.libraryTab;
    const search = state.librarySearch.trim().toLowerCase();
    const out = [];

    if (tab === "all" || tab === "bestiary") {
      for (const c of (window.CoCData.bestiary || [])) {
        const entry = { ...c, _source: "bestiary", _libKey: "best:" + c.id };
        if (!matchesSearch(entry, search)) continue;
        out.push(entry);
      }
    }
    if (tab === "all" || tab === "saved") {
      for (const meta of store.listCreatures()) {
        const full = store.loadCreature(meta.id);
        if (!full) continue;
        const entry = { ...full, _source: "saved", _libKey: "saved:" + meta.id };
        if (!matchesSearch(entry, search)) continue;
        out.push(entry);
      }
    }
    return out;
  }

  function matchesSearch(entry, search) {
    if (!search) return true;
    const hay = [entry.name, entry.category, ...(entry.tags || [])].join(" ").toLowerCase();
    return hay.includes(search);
  }

  function bindLibraryTabs() {
    $$(".library-tab").forEach(t => {
      t.onclick = () => {
        $$(".library-tab").forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        state.libraryTab = t.dataset.tab;
        renderLibrary();
      };
    });
  }

  function bindLibrarySearch() {
    let timer = null;
    $("#library-search").oninput = (e) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        state.librarySearch = e.target.value;
        renderLibrary();
      }, 150);
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // ABRIR CRIATURA NO WORKSPACE
  // ═════════════════════════════════════════════════════════════════════

  function openInWorkspace(item) {
    // Clone deep para edição segura
    const clone = JSON.parse(JSON.stringify(item));
    delete clone._source;
    delete clone._libKey;

    if (item._source === "bestiary") {
      // Instância derivada do bestiário base — não sobrescreve original
      state.active = clone;
      state.activeSourceId = item.id;
      state.activeSavedId = null;
    } else {
      state.active = clone;
      state.activeSourceId = null;
      state.activeSavedId = item.id;
    }
    state.mode = "simple";
    renderWorkspace();
    renderLibrary();   // atualiza highlight da seleção ativa
  }

  function renderWorkspace() {
    const ws = $("#workspace");
    if (!state.active) {
      ws.innerHTML = `
        <div class="workspace-empty">
          <span class="icon" aria-hidden="true">📜</span>
          <p><b>Selecione uma criatura da biblioteca</b> ou gere um NPC aleatório.</p>
          <p style="margin-top: 0.5rem; font-size: 0.85rem;">Modo <b>Simples</b> por padrão — depois de abrir, clique em <b>"✎ Abrir Editor Completo"</b> para acessar o editor profundo.</p>
        </div>
      `;
      return;
    }
    ws.className = "workspace mode-" + state.mode;
    ws.innerHTML = renderCreatureHeader() + renderSimpleMode() + renderFullMode();
    bindWorkspaceEvents();

    // Primeira vez que o usuário abre QUALQUER criatura nesta sessão:
    // pulsa o toggle Simples↔Completo 3 vezes para chamar atenção.
    if (!state._modeToggleSeen) {
      state._modeToggleSeen = true;
      const btn = $("#btn-toggle-mode");
      if (btn) {
        btn.classList.add("first-attention");
        setTimeout(() => btn.classList.remove("first-attention"), 5500);
      }
    }
  }

  function renderCreatureHeader() {
    const c = state.active;
    const typeLabel = (window.CoCData.bestiaryTypeLabels || {})[c.type] || c.type || "—";
    const cat = c.category ? ` · ${escapeHtml(c.category)}` : "";
    const isInstance = !!state.activeSourceId;
    const isSimple = state.mode === "simple";

    // Toggle "pílula" — texto descreve a AÇÃO (o que acontece ao clicar)
    const toggleLabel = isSimple ? "✎ Abrir Editor Completo" : "👁 Voltar ao Modo Simples";
    const toggleTitle = isSimple
      ? "Modo atual: SIMPLES. Clique para abrir o Editor Completo (stats brutos, ataques múltiplos, lore)."
      : "Modo atual: COMPLETO. Clique para voltar à visualização Simples (operacional em mesa).";
    const modePillLabel = isSimple ? "MODO SIMPLES" : "MODO EDITOR";

    return `
      <div class="creature-header">
        <div class="creature-header-title">
          <div class="creature-type-row">
            <span class="creature-type">${escapeHtml(typeLabel)}${cat}</span>
            <span class="mode-pill ${isSimple ? "simple" : "full"}" aria-label="Modo atual">${modePillLabel}</span>
          </div>
          <div class="creature-title" id="creature-title" contenteditable="${state.mode === "full"}">${escapeHtml(c.name)}</div>
        </div>
        <div class="creature-header-actions">
          <!-- Grupo 1: TOGGLE DE MODO (destacado) -->
          <button id="btn-toggle-mode" class="mode-toggle-btn ${isSimple ? "to-full" : "to-simple"}" title="${escapeHtml(toggleTitle)}">
            ${toggleLabel}
          </button>

          <!-- Grupo 2: AÇÕES DE CUSTOMIZAÇÃO -->
          <div class="btn-group" role="group" aria-label="Customização">
            <button id="btn-add-modifiers" title="Aplicar modificadores (Fanático, Armado, Veterano, Ferido, ...)">+ Modificador</button>
            ${isInstance ? `<button id="btn-fork-creature" class="btn-ghost" title="Criar variante editável de '${escapeHtml(c.name)}' sem alterar o original do bestiário">⑂ Variante</button>` : ""}
          </div>

          <!-- Grupo 3: AÇÕES PRINCIPAIS -->
          <div class="btn-group" role="group" aria-label="Persistência">
            <button id="btn-save-creature" title="Salvar esta criatura na biblioteca (persiste no navegador)">💾 Salvar</button>
            <button id="btn-add-to-encounter" class="btn-primary" title="Adicionar ao tracker de encontro à direita">⚔ Encontro</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSimpleMode() {
    const c = state.active;
    const d = c.derived || {};
    const hp = d.hp != null ? d.hp : "—";
    const hpMax = c._hpMax != null ? c._hpMax : hp;
    const fill = hpMax > 0 ? Math.max(0, Math.min(100, (Number(hp) / Number(hpMax)) * 100)) : 100;

    return `
      <div class="simple-mode">
        <!-- Stats trackers principais (HP, MOV, DB, Armor, SAN Loss) -->
        <div class="simple-stats">
          <div class="stat-tile tracker" style="--fill: ${fill}%;">
            <div class="stat-label">PV</div>
            <div class="stat-value" id="hp-display">${escapeHtml(String(hp))}</div>
            <div class="tracker-actions no-print">
              <button data-hp="-1">-1</button>
              <button data-hp="-X">-X</button>
              <button data-hp="+1">+1</button>
            </div>
          </div>
          <div class="stat-tile">
            <div class="stat-label">MOV</div>
            <div class="stat-value">${escapeHtml(String(d.mov ?? "—"))}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-label">DB</div>
            <div class="stat-value">${escapeHtml(String(d.db ?? "0"))}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-label">Armadura</div>
            <div class="stat-value">${escapeHtml(String(c.armor ?? 0))}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-label">Perda SAN</div>
            <div class="stat-value" style="font-size: 1.1rem;">${escapeHtml(String(c.sanLoss ?? "—"))}</div>
          </div>
        </div>

        <!-- Stats brutos compactos (para rolagem de resistência etc.) -->
        ${renderRawStatsRow()}

        <!-- Ataques -->
        ${renderAttacks()}

        <!-- Perícias notáveis -->
        ${renderNotableSkills()}

        <!-- Notas operacionais -->
        ${renderNotes()}
      </div>
    `;
  }

  function renderRawStatsRow() {
    const s = state.active.stats || {};
    const order = ["str", "con", "siz", "dex", "int", "pow", "app", "edu"];
    const labels = { str: "FOR", con: "CON", siz: "TAM", dex: "DES", int: "INT", pow: "POD", app: "APA", edu: "EDU" };
    const cells = order
      .filter(k => s[k] != null)
      .map(k => {
        const v = Number(s[k]) || 0;
        return `
          <div class="raw-stat" data-stat="${k}" title="Clique para teste de Resistência (${labels[k]} × 5)">
            <span class="raw-stat-label">${labels[k]}</span>
            <span class="raw-stat-value">${v}</span>
            <span class="raw-stat-frac">${dice.half(v)} / ${dice.fifth(v)}</span>
          </div>
        `;
      }).join("");
    return `<div class="raw-stats-row">${cells}</div>`;
  }

  function renderAttacks() {
    const attacks = state.active.attacks || [];
    if (attacks.length === 0) return "";
    const rows = attacks.map((a, idx) => `
      <div class="attack-card" data-attack-idx="${idx}">
        <div>
          <div class="attack-name">${escapeHtml(a.name)}</div>
          <div class="attack-meta">
            ${escapeHtml(String(a.chance ?? "—"))}% ·
            <b>${escapeHtml(a.damage || "—")}</b>
            ${a.type ? ` · ${escapeHtml(a.type)}` : ""}
          </div>
        </div>
        <div class="attack-meta">${a.note ? "<i>nota</i>" : ""}</div>
        <button class="attack-roll" data-attack-roll="${idx}" title="Rolar ataque + dano">🎯</button>
        ${a.note ? `<div class="attack-note">${escapeHtml(a.note)}</div>` : ""}
      </div>
    `).join("");
    return `
      <div class="attacks-section">
        <h3>⚔ Ataques</h3>
        ${rows}
      </div>
    `;
  }

  function renderNotableSkills() {
    const skills = state.active.skills || [];
    if (skills.length === 0) return "";
    const rows = skills.map((s, idx) => `
      <div class="notable-skill" data-skill-idx="${idx}">
        <span class="ns-name">${escapeHtml(s.name)}</span>
        <span class="ns-value">${escapeHtml(String(s.value ?? "—"))}%</span>
        <button class="ns-roll btn-ghost" data-skill-roll="${idx}" title="Rolar">🎲</button>
      </div>
    `).join("");
    return `
      <div class="attacks-section">
        <h3>🎯 Perícias Notáveis</h3>
        <div class="notable-skills">${rows}</div>
      </div>
    `;
  }

  function renderNotes() {
    const notes = state.active.notes || [];
    if (notes.length === 0) return "";
    const lis = notes.map(n => `<li>${escapeHtml(n)}</li>`).join("");
    return `
      <div class="notes-section">
        <h3>📝 Notas</h3>
        <ul>${lis}</ul>
      </div>
    `;
  }

  function renderFullMode() {
    const c = state.active;
    return `
      <div class="full-mode">
        <div class="full-mode-section">
          <h3>Editor — Stats Brutos (manuais)</h3>
          <div class="edit-grid">
            ${["str","con","siz","dex","int","pow","app","edu"].map(k => `
              <label>${k.toUpperCase()}
                <input type="number" data-edit-stat="${k}" value="${c.stats?.[k] ?? ""}" min="0" max="200" />
              </label>
            `).join("")}
          </div>
        </div>

        <div class="full-mode-section">
          <h3>Derivados (manuais)</h3>
          <div class="edit-grid">
            <label>PV<input type="number" data-edit-derived="hp" value="${c.derived?.hp ?? ""}" /></label>
            <label>MOV<input type="number" data-edit-derived="mov" value="${c.derived?.mov ?? ""}" /></label>
            <label>DB<input type="text" data-edit-derived="db" value="${escapeHtml(c.derived?.db ?? "0")}" /></label>
            <label>Build<input type="number" data-edit-derived="build" value="${c.derived?.build ?? 0}" /></label>
            <label>Armadura<input type="number" data-edit-creature="armor" value="${c.armor ?? 0}" /></label>
            <label>Perda SAN<input type="text" data-edit-creature="sanLoss" value="${escapeHtml(c.sanLoss ?? "—")}" /></label>
          </div>
        </div>

        <div class="full-mode-section">
          <h3>Ataques</h3>
          <div id="edit-attacks"></div>
          <button id="btn-add-attack" style="margin-top: 0.5rem;">+ Novo Ataque</button>
        </div>

        <div class="full-mode-section">
          <h3>Perícias Notáveis</h3>
          <div id="edit-skills"></div>
          <button id="btn-add-skill" style="margin-top: 0.5rem;">+ Nova Perícia</button>
        </div>

        <div class="full-mode-section">
          <h3>Notas</h3>
          <textarea id="edit-notes" rows="4" placeholder="Uma nota por linha">${(c.notes || []).map(escapeHtml).join("\n")}</textarea>
        </div>
      </div>
    `;
  }

  function bindWorkspaceEvents() {
    // Toggle modo
    $("#btn-toggle-mode")?.addEventListener("click", () => {
      state.mode = state.mode === "simple" ? "full" : "simple";
      renderWorkspace();
    });

    // Save
    $("#btn-save-creature")?.addEventListener("click", saveActive);

    // Add to encounter
    $("#btn-add-to-encounter")?.addEventListener("click", () => addActiveToEncounter());

    // Modificadores
    $("#btn-add-modifiers")?.addEventListener("click", openModifiersModal);

    // Variante
    $("#btn-fork-creature")?.addEventListener("click", forkVariant);

    // HP controls
    $$("[data-hp]").forEach(b => b.onclick = () => adjustHP(b.dataset.hp));

    // Rolar resistência (FOR×5 etc.) clicando no stat
    $$(".raw-stat").forEach(node => {
      node.onclick = () => rollResistance(node.dataset.stat);
    });

    // Ataques (clique no card OU no botão)
    $$("[data-attack-roll]").forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); rollAttack(parseInt(b.dataset.attackRoll, 10)); };
    });
    $$(".attack-card").forEach(c => {
      c.onclick = () => rollAttack(parseInt(c.dataset.attackIdx, 10));
    });

    // Perícias notáveis
    $$("[data-skill-roll]").forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); rollNotableSkill(parseInt(b.dataset.skillRoll, 10)); };
    });

    // Editar nome (Modo Completo)
    const titleNode = $("#creature-title");
    if (titleNode && state.mode === "full") {
      titleNode.onblur = () => {
        const v = (titleNode.textContent || "").trim();
        if (v) state.active.name = v;
        markDirty();
      };
      titleNode.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); titleNode.blur(); } };
    }

    // Full mode bindings (apenas se visíveis)
    if (state.mode === "full") {
      $$("[data-edit-stat]").forEach(input => {
        input.oninput = () => {
          const k = input.dataset.editStat;
          state.active.stats = state.active.stats || {};
          state.active.stats[k] = Math.max(0, parseInt(input.value, 10) || 0);
          markDirty();
        };
      });
      $$("[data-edit-derived]").forEach(input => {
        input.oninput = () => {
          const k = input.dataset.editDerived;
          state.active.derived = state.active.derived || {};
          state.active.derived[k] = (input.type === "number") ? (parseInt(input.value, 10) || 0) : input.value;
          markDirty();
        };
      });
      $$("[data-edit-creature]").forEach(input => {
        input.oninput = () => {
          const k = input.dataset.editCreature;
          state.active[k] = (input.type === "number") ? (parseInt(input.value, 10) || 0) : input.value;
          markDirty();
        };
      });

      // Notas
      const notesNode = $("#edit-notes");
      if (notesNode) {
        notesNode.oninput = () => {
          state.active.notes = notesNode.value.split("\n").map(s => s.trim()).filter(Boolean);
          markDirty();
        };
      }

      renderEditableAttacks();
      renderEditableSkills();

      $("#btn-add-attack")?.addEventListener("click", () => {
        state.active.attacks = state.active.attacks || [];
        state.active.attacks.push({ name: "Novo Ataque", type: "melee", chance: 30, damage: "1D4", note: "" });
        renderEditableAttacks();
        markDirty();
      });
      $("#btn-add-skill")?.addEventListener("click", () => {
        state.active.skills = state.active.skills || [];
        state.active.skills.push({ name: "Nova Perícia", value: 30 });
        renderEditableSkills();
        markDirty();
      });
    }
  }

  function renderEditableAttacks() {
    const container = $("#edit-attacks");
    if (!container) return;
    const atks = state.active.attacks || [];
    container.innerHTML = atks.map((a, i) => `
      <div class="edit-grid" style="margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--ink-faded);">
        <label>Nome<input type="text" data-atk="${i}" data-field="name" value="${escapeHtml(a.name || "")}" /></label>
        <label>Chance %<input type="number" data-atk="${i}" data-field="chance" value="${a.chance ?? 0}" /></label>
        <label>Dano<input type="text" data-atk="${i}" data-field="damage" value="${escapeHtml(a.damage || "")}" /></label>
        <label>Tipo<input type="text" data-atk="${i}" data-field="type" value="${escapeHtml(a.type || "")}" /></label>
        <label style="grid-column: 1 / -1;">Nota<input type="text" data-atk="${i}" data-field="note" value="${escapeHtml(a.note || "")}" /></label>
        <button class="btn-danger btn-icon" data-atk-del="${i}" title="Remover">🗑</button>
      </div>
    `).join("") || `<div class="dim">Sem ataques. Clique em "+ Novo Ataque".</div>`;

    $$("[data-atk]", container).forEach(input => {
      input.oninput = () => {
        const i = parseInt(input.dataset.atk, 10);
        const f = input.dataset.field;
        if (!state.active.attacks[i]) return;
        const v = input.type === "number" ? (parseInt(input.value, 10) || 0) : input.value;
        state.active.attacks[i][f] = v;
        markDirty();
      };
    });
    $$("[data-atk-del]", container).forEach(b => {
      b.onclick = () => {
        const i = parseInt(b.dataset.atkDel, 10);
        state.active.attacks.splice(i, 1);
        renderEditableAttacks();
        markDirty();
      };
    });
  }

  function renderEditableSkills() {
    const container = $("#edit-skills");
    if (!container) return;
    const skills = state.active.skills || [];
    container.innerHTML = skills.map((s, i) => `
      <div class="edit-grid" style="margin-bottom: 0.4rem;">
        <label>Nome<input type="text" data-sk="${i}" data-field="name" value="${escapeHtml(s.name || "")}" /></label>
        <label>Valor %<input type="number" data-sk="${i}" data-field="value" value="${s.value ?? 0}" /></label>
        <button class="btn-danger btn-icon" data-sk-del="${i}" title="Remover">🗑</button>
      </div>
    `).join("") || `<div class="dim">Sem perícias notáveis.</div>`;

    $$("[data-sk]", container).forEach(input => {
      input.oninput = () => {
        const i = parseInt(input.dataset.sk, 10);
        const f = input.dataset.field;
        if (!state.active.skills[i]) return;
        const v = input.type === "number" ? (parseInt(input.value, 10) || 0) : input.value;
        state.active.skills[i][f] = v;
        markDirty();
      };
    });
    $$("[data-sk-del]", container).forEach(b => {
      b.onclick = () => {
        const i = parseInt(b.dataset.skDel, 10);
        state.active.skills.splice(i, 1);
        renderEditableSkills();
        markDirty();
      };
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // AJUSTES DE HP (light update — sem rebuild)
  // ═════════════════════════════════════════════════════════════════════

  async function adjustHP(op) {
    const c = state.active;
    if (!c?.derived) return;
    const cur = Number(c.derived.hp) || 0;
    let delta = 0;

    if (op === "+1") delta = +1;
    else if (op === "-1") delta = -1;
    else if (op === "-X") {
      const v = await prompt("Quanto deduzir? (número ou notação tipo 1D6, 2D6+3)", { title: "Reduzir PV" });
      if (v == null || v.trim() === "") return;
      const t = v.trim();
      if (/^-?\d+$/.test(t)) delta = -Math.abs(parseInt(t, 10));
      else {
        const r = dice.rollNotation(t);
        delta = -Math.abs(r.total);
      }
    }

    c.derived.hp = Math.max(-10, cur + delta);

    // Light update — não rebuilda tudo, só atualiza o tile de PV
    const display = $("#hp-display");
    if (display) display.textContent = String(c.derived.hp);
    const tile = display?.closest(".stat-tile");
    if (tile && c._hpMax) {
      const fill = Math.max(0, Math.min(100, (c.derived.hp / c._hpMax) * 100));
      tile.style.setProperty("--fill", fill + "%");
    }

    // Atualiza tracker de encontro se essa criatura estiver lá
    updateEncounterHP(c);
    markDirty();
  }

  // ═════════════════════════════════════════════════════════════════════
  // ROLAGENS
  // ═════════════════════════════════════════════════════════════════════

  function rollResistance(statKey) {
    const c = state.active;
    const v = Number(c?.stats?.[statKey]) || 0;
    if (v === 0) return;
    // Teste regular contra valor do atributo
    const r = dice.rollD100(null);
    const level = dice.classifyRoll(r.value, v);
    logRoll({
      skill: `${c.name} · ${statKey.toUpperCase()}`,
      target: v,
      d100: r.value,
      level
    });
  }

  function rollAttack(idx) {
    const c = state.active;
    const a = c?.attacks?.[idx];
    if (!a) return;
    const chance = Number(a.chance) || 0;
    const r = dice.rollD100(null);
    const level = dice.classifyRoll(r.value, chance);
    const hit = ["crit", "extreme", "hard", "regular"].includes(level);
    let dmgStr = "(miss)";
    if (hit) {
      const db = c.derived?.db || "0";
      const impale = (level === "crit" || level === "extreme") && /espada|faca|adaga|empala|rifle|garra|mordida|tridente/i.test(a.name + " " + (a.note || ""));
      const d = dice.rollDamage(a.damage || "0", db, impale);
      const diceStr = d.rolls.map(x => `(${x.dice.join("+")})`).join("+");
      dmgStr = `${a.damage} → ${d.total}${impale ? " ⚡EMPALA" : ""} ${diceStr}`;
    }
    logRoll({
      skill: `⚔ ${c.name} · ${a.name}`,
      target: chance,
      d100: r.value,
      level,
      dmg: dmgStr
    });
  }

  function rollNotableSkill(idx) {
    const c = state.active;
    const s = c?.skills?.[idx];
    if (!s) return;
    const v = Number(s.value) || 0;
    const r = dice.rollD100(null);
    const level = dice.classifyRoll(r.value, v);
    logRoll({
      skill: `${c.name} · ${s.name}`,
      target: v,
      d100: r.value,
      level
    });
  }

  function logRoll(entry) {
    appendRoll($("#roll-log"), entry);
  }

  // ═════════════════════════════════════════════════════════════════════
  // PERSISTÊNCIA — SALVAR CRIATURA
  // ═════════════════════════════════════════════════════════════════════

  function saveActive() {
    const c = state.active;
    if (!c) return;
    // Garante schemaVersion + id
    c.schemaVersion = c.schemaVersion || SCHEMA_VERSION;
    if (!c.id) c.id = slug(c.name) + "-" + Date.now().toString(36);

    // Se for primeira save de uma instância do bestiário, evita colidir com id base
    if (state.activeSourceId && c.id === state.activeSourceId) {
      c.id = c.id + "-inst-" + Date.now().toString(36);
    }
    const savedId = store.saveCreature(c);
    state.activeSavedId = savedId;
    toast(`"${c.name}" salvo na biblioteca`, { type: "success" });
    renderLibrary();
  }

  function slug(s) {
    return (s || "criatura").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function forkVariant() {
    const c = state.active;
    if (!c) return;
    const variantName = c.name + " (Variante)";
    const v = JSON.parse(JSON.stringify(c));
    v.name = variantName;
    delete v.id;
    state.active = v;
    state.activeSourceId = null;
    state.activeSavedId = null;
    state.mode = "full";
    renderWorkspace();
    toast(`Variante criada de "${c.name}" — abrindo no Modo Completo.`, { type: "info" });
  }

  // ═════════════════════════════════════════════════════════════════════
  // MODIFICADORES
  // ═════════════════════════════════════════════════════════════════════

  function openModifiersModal() {
    const c = state.active;
    if (!c) return;
    const mods = window.CoCData.npcModifiers || [];
    if (mods.length === 0) return;

    const wrap = el("div", {});
    const list = el("div", { class: "mod-list" });
    mods.forEach(m => {
      const card = el("label", { class: "mod-card" });
      card.innerHTML = `
        <input type="checkbox" data-mod="${m.id}" />
        <div>
          <div class="mod-name">${escapeHtml(m.name)}</div>
          <div class="mod-desc">${escapeHtml(m.description || "")}</div>
        </div>
      `;
      list.appendChild(card);
    });
    wrap.appendChild(el("p", {
      style: { color: "var(--ink-dim)", marginBottom: "0.75rem" },
      text: "Marque os modificadores a aplicar. Mudanças são acumulativas e não-reversíveis sem refresh."
    }));
    wrap.appendChild(list);

    modal({
      title: `Modificadores — ${c.name}`,
      body: wrap,
      actions: [
        { label: "Cancelar" },
        { label: "Aplicar", primary: true, onClick: () => {
          const checked = $$("input[data-mod]:checked", wrap).map(i => i.dataset.mod);
          if (checked.length === 0) return false;
          state.active = window.CoCData.applyModifiers(state.active, checked);
          renderWorkspace();
          toast(`${checked.length} modificador(es) aplicado(s)`, { type: "success" });
        }}
      ]
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // GERADOR DE NPC ALEATÓRIO
  // ═════════════════════════════════════════════════════════════════════

  function generateRandomNPC() {
    const archs = window.CoCData.npcArchetypes || [];
    if (archs.length === 0) { toast("Sem arquétipos disponíveis", { type: "warn" }); return; }
    const arch = pick(archs);

    // Rola atributos
    const stats = {
      str: rollAttr("3d6x5"),
      con: rollAttr("3d6x5"),
      siz: rollAttr("2d6+6x5"),
      dex: rollAttr("3d6x5"),
      int: rollAttr("2d6+6x5"),
      pow: rollAttr("3d6x5"),
      app: rollAttr("3d6x5"),
      edu: rollAttr("2d6+6x5")
    };

    // Aplica leve viés conforme perfil
    if (arch.profile === "combatant") {
      stats.str += 10; stats.con += 10; stats.dex += 5;
    } else if (arch.profile === "intellectual") {
      stats.int += 10; stats.edu += 15; stats.pow += 5;
      stats.str -= 5; stats.con -= 5;
    }
    for (const k in stats) stats[k] = Math.max(15, Math.min(95, stats[k]));

    // Derivados (manuais conforme constituição)
    const hp = Math.floor((stats.con + stats.siz) / 10);
    const movBase = (stats.dex >= stats.siz && stats.str >= stats.siz) ? 9
                 : (stats.dex < stats.siz && stats.str < stats.siz) ? 7 : 8;
    const dbInfo = window.CoCData.lookupDB ? window.CoCData.lookupDB(stats.str + stats.siz) : { db: "0", build: 0 };

    // Nome
    const locale = pick(["ptBR", "en"]);
    const gender = pick(["male", "female"]);
    const nameObj = window.CoC.names.generateName({ locale, era: "1920s", gender });

    const npc = {
      schemaVersion: SCHEMA_VERSION,
      id: null,
      name: nameObj.full,
      type: "human",
      category: arch.id,
      stats,
      derived: { hp, mov: movBase, db: dbInfo.db, build: dbInfo.build },
      armor: 0,
      sanLoss: "—",
      attacks: [
        { name: "Soco", type: "melee", chance: Math.max(25, stats.dex - 25), damage: "1D3" }
      ],
      skills: [],
      notes: [
        `Arquétipo: ${arch.name}.`,
        arch.occupationHint || "",
        arch.notes || ""
      ].filter(Boolean),
      tags: ["npc", "gerado", arch.id]
    };

    state.active = npc;
    state.activeSourceId = null;
    state.activeSavedId = null;
    state.mode = "simple";
    renderWorkspace();
    toast(`NPC gerado: ${nameObj.full} (${arch.name})`, { type: "success" });
  }

  function rollAttr(formula) {
    return dice.rollAttribute(formula).total;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ═════════════════════════════════════════════════════════════════════
  // CRIAR DO ZERO
  // ═════════════════════════════════════════════════════════════════════

  function createBlank() {
    const blank = {
      schemaVersion: SCHEMA_VERSION,
      id: null,
      name: "Nova Criatura",
      type: "human",
      category: "custom",
      stats: { str: 50, con: 50, siz: 50, dex: 50, int: 50, pow: 50 },
      derived: { hp: 10, mov: 8, db: "0", build: 0 },
      armor: 0,
      sanLoss: "—",
      attacks: [],
      skills: [],
      notes: [],
      tags: ["custom"]
    };
    state.active = blank;
    state.activeSourceId = null;
    state.activeSavedId = null;
    state.mode = "full";
    renderWorkspace();
    toast("Criatura em branco — preencha no editor", { type: "info" });
  }

  // ═════════════════════════════════════════════════════════════════════
  // TRACKER DE ENCONTRO
  // ═════════════════════════════════════════════════════════════════════

  function addActiveToEncounter() {
    const c = state.active;
    if (!c) return;
    const entry = {
      id: `enc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: c.name,
      hpCur: Number(c.derived?.hp) || 0,
      hpMax: Number(c.derived?.hp) || 0,
      mov: c.derived?.mov ?? "—",
      armor: c.armor ?? 0,
      sanLoss: c.sanLoss ?? "—",
      type: c.type,
      sourceId: state.activeSavedId || state.activeSourceId || null,
      dead: false
    };
    state.encounter.push(entry);
    renderEncounter();
    toast(`"${entry.name}" adicionado ao encontro`, { type: "success" });
  }

  function renderEncounter() {
    const list = $("#encounter-list");
    if (!list) return;
    list.innerHTML = "";
    if (state.encounter.length === 0) {
      list.innerHTML = `<div class="encounter-empty">Nenhuma criatura ativa.<br>Use <b>+ Encontro</b>.</div>`;
      return;
    }
    state.encounter.forEach((e, idx) => {
      const ratio = e.hpMax > 0 ? Math.max(0, Math.min(1, e.hpCur / e.hpMax)) : 1;
      const node = el("div", {
        class: "encounter-item" + (e.dead ? " dead" : "")
      });
      node.innerHTML = `
        <div>
          <div class="ei-name">${escapeHtml(e.name)}</div>
          <div class="ei-meta">MOV ${escapeHtml(String(e.mov))} · Arm ${e.armor} · SAN ${escapeHtml(e.sanLoss)}</div>
        </div>
        <div class="ei-hp">PV ${e.hpCur}<span style="font-size:0.75em;color:var(--ink-faded)"> /${e.hpMax}</span></div>
        <div class="ei-controls">
          <button data-enc="${idx}" data-op="-1">-1</button>
          <button data-enc="${idx}" data-op="-X">-X</button>
          <button data-enc="${idx}" data-op="+1">+1</button>
          <button data-enc="${idx}" data-op="kill" title="Marcar como morto">💀</button>
          <button data-enc="${idx}" data-op="remove" title="Remover do encontro">✕</button>
        </div>
      `;
      list.appendChild(node);
    });

    $$("[data-enc]", list).forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); adjustEncounter(parseInt(b.dataset.enc, 10), b.dataset.op); };
    });
  }

  async function adjustEncounter(idx, op) {
    const e = state.encounter[idx];
    if (!e) return;
    if (op === "+1") e.hpCur = Math.min(e.hpMax, e.hpCur + 1);
    else if (op === "-1") e.hpCur = Math.max(-10, e.hpCur - 1);
    else if (op === "-X") {
      const v = await prompt("Quanto deduzir?", { title: "Ajuste de PV" });
      if (v == null || v.trim() === "") return;
      const t = v.trim();
      let d = 0;
      if (/^-?\d+$/.test(t)) d = Math.abs(parseInt(t, 10));
      else { const r = dice.rollNotation(t); d = Math.abs(r.total); }
      e.hpCur = Math.max(-10, e.hpCur - d);
    } else if (op === "kill") { e.dead = !e.dead; }
    else if (op === "remove") { state.encounter.splice(idx, 1); }

    if (e && e.hpCur <= 0 && !e.dead) e.dead = true;
    renderEncounter();
  }

  function updateEncounterHP(creature) {
    // Sincroniza por nome+sourceId apenas se houver match exato
    const enc = state.encounter.find(e =>
      e.sourceId && (e.sourceId === state.activeSourceId || e.sourceId === state.activeSavedId)
    );
    if (enc) {
      enc.hpCur = Number(creature.derived?.hp) || 0;
      renderEncounter();
    }
  }

  function bindEncounter() {
    $("#btn-encounter-add")?.addEventListener("click", addActiveToEncounter);
    $("#btn-clear-encounter")?.addEventListener("click", async () => {
      if (state.encounter.length === 0) return;
      if (await confirm("Limpar todo o tracker de encontro?", { title: "Limpar encontro" })) {
        state.encounter = [];
        renderEncounter();
      }
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // TOOLBAR
  // ═════════════════════════════════════════════════════════════════════

  function bindToolbar() {
    $("#btn-new-npc").onclick = generateRandomNPC;
    $("#btn-new-custom").onclick = createBlank;

    $("#btn-import").onclick = () => $("#file-import").click();
    $("#file-import").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = await store.importJSONFromFile(file);
        const summary = store.mergeCreatureLibrary(data);
        toast(`Importado: ${summary.added} adicionado(s), ${summary.updated} atualizado(s)`, { type: "success" });
        renderLibrary();
      } catch (err) {
        toast("Erro ao importar: " + (err?.message || "arquivo inválido"), { type: "error" });
      }
      e.target.value = "";
    };

    $("#btn-export").onclick = () => {
      const lib = store.listCreatures().map(meta => store.loadCreature(meta.id)).filter(Boolean);
      if (lib.length === 0) { toast("Biblioteca vazia — nada para exportar", { type: "warn" }); return; }
      const payload = {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        creatures: lib
      };
      store.exportJSON(payload, `biblioteca-${new Date().toISOString().slice(0,10)}.json`);
      toast(`${lib.length} criatura(s) exportada(s)`, { type: "success", duration: 4000 });
    };

    $("#btn-print").onclick = () => window.print();
  }

  // ═════════════════════════════════════════════════════════════════════
  // ROLL LOG
  // ═════════════════════════════════════════════════════════════════════

  function bindRollLog() {
    $("#btn-copy-log")?.addEventListener("click", () => {
      const items = $$("#roll-log li").map(li => "- " + (li.textContent || "").replace(/\s+/g, " ").trim());
      const md = "# Roll Log Mestre — " + new Date().toLocaleString("pt-BR") + "\n\n" + items.join("\n");
      copyToClipboard(md);
    });
    $("#btn-clear-log")?.addEventListener("click", async () => {
      if (await confirm("Limpar o log?", { title: "Limpar log" })) clearLog($("#roll-log"));
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // DIRTY TRACKING (debounce de save)
  // ═════════════════════════════════════════════════════════════════════

  let dirtyTimer = null;
  function markDirty() {
    if (!state.activeSavedId) return; // só auto-salva criatura já persistida
    if (dirtyTimer) clearTimeout(dirtyTimer);
    dirtyTimer = setTimeout(() => {
      if (state.active && state.activeSavedId) {
        state.active.id = state.activeSavedId;
        store.saveCreature(state.active);
        renderLibrary();
      }
    }, 800);
  }

  // ═════════════════════════════════════════════════════════════════════
  // GO
  // ═════════════════════════════════════════════════════════════════════

  function startBoot() {
    Promise.resolve(boot()).catch(err => console.error("[keeper] boot failed", err));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startBoot);
  } else {
    startBoot();
  }

})();
