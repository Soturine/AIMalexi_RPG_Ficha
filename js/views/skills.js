/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/skills.js
   M3.3 — Fatia: Perícias

   Responsabilidades:
     render:  #skills-groups + #badge-occ + #badge-pi
     bind:    delegação de eventos em #skills-groups (input/click/focusout)
              filter chips + search input
     write:   dispatch SET_SKILL / TOGGLE_OCCUPATION_SKILL / ADD_CUSTOM_SKILL

   Fronteira M3.4:
     click em .skill-roll → bus.publish("skill:roll-requested", { name })
     investigator.js subscreve em boot() e chama rollSkill()

   Side-effects via Bus:
     "skill:roll-requested"    → investigator.js rollSkill()
     "store:dispatch"          → investigator.js persistCurrent() (subscription em boot)

   Expõe: window.CoC.views.skills = { init, render, updateSkillUI, refreshBadges }

   Depende de: js/core/{bus,store}.js  js/shared/{ui-components,validators}.js
               js/engine/dice.js  data/{skills,occupations}.js
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  const { $, el, escapeHtml, toast, modal } = window.CoC.ui;
  const dice      = window.CoC.dice;
  const cocStore    = window.CoC.store;
  const cocExecutor = window.CoC.core.executor;
  const bus         = window.CoC.bus;
  const validators = window.CoC.validators;

  // Estado efêmero de UI — não vai ao store (não é estado do personagem)
  let _filter = "all";   // all | occupation | used
  let _search = "";

  // ── Helpers puros ─────────────────────────────────────────────────────────

  function _computeBaseValue(skill, attrs) {
    if (skill.baseFormula === "DES/2") return Math.floor((attrs.DES || 0) / 2);
    if (skill.baseFormula === "EDU")   return attrs.EDU || 0;
    return Number(skill.base) || 0;
  }

  function _sumSkillSpend(c, occSkillSet) {
    let occSpent = 0, piSpent = 0;
    const attrs = _attrsFlat(c);
    for (const [name, sk] of Object.entries(c.skills || {})) {
      const def = window.CoCData.findSkill(name) ||
                  window.CoCData.findSkill(name.replace(/\s*\(.+\)$/, ""));
      const base  = def ? _computeBaseValue(def, attrs) : 0;
      const spent = Math.max(0, (Number(sk.value) || 0) - base);
      if (spent <= 0) continue;
      if (occSkillSet && occSkillSet.has(name)) occSpent += spent;
      else piSpent += spent;
    }
    return { occSpent, piSpent };
  }

  function _attrsFlat(c) {
    return Object.fromEntries(
      Object.entries(c.attributes || {}).map(([k, v]) => [k, v.value])
    );
  }

  function _occContext(c) {
    const rules   = window.CoC.rules;
    const occName = c.investigator?.occupation;
    const occ     = occName ? window.CoCData.findOccupation(occName) : null;
    return { occ, ctx: rules.buildOccupationContext(occ, c) };
  }

  function _occToggleHTML(name, isMandatory, isChosen) {
    if (isMandatory) {
      return `<span class="skill-occ mandatory" title="Perícia obrigatória da ocupação">◆</span>`;
    }
    const on    = !!isChosen;
    const title = on
      ? "Perícia livre da ocupação (conta no pool). Clique para devolver ao Interesse Pessoal."
      : "Marcar como perícia livre da ocupação (pontos contam no pool da ocupação).";
    return `<button class="skill-occ-toggle${on ? " on" : ""}" data-occ-toggle="${escapeHtml(name)}" title="${title}" aria-pressed="${on}">${on ? "◆" : "◇"}</button>`;
  }

  function _occFreePicksHint(ctx) {
    if (!ctx || !ctx.freeBudget) return "";
    return ` · livres ${ctx.freeUsed}/${ctx.freeBudget}`;
  }

  function _cssEscape(s) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(s);
    return String(s).replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }

  // ── Enciclopédia de perícias (#30) ─────────────────────────────────────────
  // Constrói o HTML do painel retrátil. Usa a base de conhecimento quando existe;
  // caso contrário, cai no note/examples da definição base (fallback gracioso).
  function _buildEncPanel(name, def) {
    const enc = window.CoCData.findSkillEncyclopedia
      ? window.CoCData.findSkillEncyclopedia(name) : null;
    const parts = [];

    const list = (title, arr) => {
      if (!arr || !arr.length) return "";
      return `<div class="enc-block"><h5>${title}</h5><ul>${
        arr.map(x => `<li>${escapeHtml(x)}</li>`).join("")
      }</ul></div>`;
    };

    if (enc) {
      if (enc.descricao) parts.push(`<p class="enc-desc">${escapeHtml(enc.descricao)}</p>`);
      parts.push(list("Pode fazer", enc.podeFazer));
      parts.push(list("Não pode fazer", enc.naoPodeFazer));
      parts.push(list("Exemplos", enc.exemplos));
      if (enc.interacoes && enc.interacoes.length) {
        parts.push(`<div class="enc-block"><h5>Interações</h5><div class="enc-tags">${
          enc.interacoes.map(x => `<span class="enc-tag">${escapeHtml(x)}</span>`).join("")
        }</div></div>`);
      }
      if (enc.nota) parts.push(`<p class="enc-note">⚠ ${escapeHtml(enc.nota)}</p>`);
    } else {
      // Fallback: usa metadados da definição base
      if (def && def.note) parts.push(`<p class="enc-desc">${escapeHtml(def.note)}</p>`);
      if (def && def.examples && def.examples.length) {
        parts.push(list("Especializações / exemplos", def.examples));
      }
      if (parts.length === 0) {
        parts.push(`<p class="enc-desc enc-empty">Sem descrição detalhada para esta perícia ainda.</p>`);
      }
    }

    // Proveniência do valor (#32) — origem rastreável: base + alocado + total
    const prov = window.CoC.rules && window.CoC.rules.computeSkillProvenance
      ? window.CoC.rules.computeSkillProvenance(cocStore.getState().character, name) : null;
    if (prov) {
      const lines = [`<span class="prov-line"><span>Base</span><span>${prov.base}</span></span>`];
      if (prov.occupation > 0) lines.push(`<span class="prov-line"><span>Ocupação</span><span>+${prov.occupation}</span></span>`);
      if (prov.interest > 0)   lines.push(`<span class="prov-line"><span>Interesse Pessoal</span><span>+${prov.interest}</span></span>`);
      lines.push(`<span class="prov-line prov-total"><span>Total</span><span>${prov.total}</span></span>`);
      const capWarn = prov.withinLimit ? "" : `<span class="prov-cap-warn">⚠ Acima do limite recomendado (${prov.cap}%) — requer Modo Guardião</span>`;
      parts.push(`<div class="enc-block prov-block"><h5>Origem do valor (Ver Histórico)</h5><div class="prov-rows">${lines.join("")}</div>${capWarn}</div>`);
    }

    // Ações rápidas de rolagem por dificuldade + ações contextuais
    const quick = [
      `<button class="btn-ghost btn-sm enc-roll" data-enc-roll="${escapeHtml(name)}" data-enc-diff="regular">Regular</button>`,
      `<button class="btn-ghost btn-sm enc-roll" data-enc-roll="${escapeHtml(name)}" data-enc-diff="hard">Difícil</button>`,
      `<button class="btn-ghost btn-sm enc-roll" data-enc-roll="${escapeHtml(name)}" data-enc-diff="extreme">Extremo</button>`,
    ];
    if (enc && enc.acoes && enc.acoes.length) {
      enc.acoes.forEach(a => {
        quick.push(`<button class="btn-primary btn-sm enc-roll" data-enc-roll="${escapeHtml(name)}" data-enc-diff="${a.difficulty || "regular"}" title="Ação contextual">${escapeHtml(a.label)}</button>`);
      });
    }
    parts.push(`<div class="enc-actions">${quick.join("")}</div>`);

    return parts.join("");
  }

  // ── Badge state ───────────────────────────────────────────────────────────

  function _computeBadgeState(c) {
    const rules = window.CoC.rules;
    c.occupationSkills = Array.isArray(c.occupationSkills) ? c.occupationSkills : [];
    const { occ, ctx } = _occContext(c);
    const occSkills = ctx.effective;
    const attrs     = _attrsFlat(c);
    const occBudget = occ ? rules.calcOccupationPoints(occ.pointsFormula, attrs).points : 0;
    const piBudget  = rules.calcPersonalInterestPoints(attrs.INT || 0);
    const { occSpent, piSpent } = _sumSkillSpend(c, occSkills);
    return {
      occ: validators.pointsBadgeState(occSpent, occBudget),
      pi:  validators.pointsBadgeState(piSpent,  piBudget),
      occLabel: "Ocupação: " + validators.pointsBadgeState(occSpent, occBudget).label + _occFreePicksHint(ctx),
      piLabel:  "Interesse: " + validators.pointsBadgeState(piSpent,  piBudget).label,
    };
  }

  function refreshBadges() {
    const c = cocStore.getState().character;
    if (!c) return;
    const bs      = _computeBadgeState(c);
    const badgeOcc = $("#badge-occ");
    const badgePi  = $("#badge-pi");
    if (badgeOcc) {
      badgeOcc.classList.remove("ok", "warn", "err");
      badgeOcc.classList.add(bs.occ.level);
      badgeOcc.textContent = bs.occLabel;
    }
    if (badgePi) {
      badgePi.classList.remove("ok", "warn", "err");
      badgePi.classList.add(bs.pi.level);
      badgePi.textContent = bs.piLabel;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderSkills() {
    const c = cocStore.getState().character;
    if (!c) return;

    const groups = window.CoCData.skillsByCategory();
    const labels = window.CoCData.categoryLabels;

    c.occupationSkills = Array.isArray(c.occupationSkills) ? c.occupationSkills : [];
    const { occ, ctx } = _occContext(c);
    const occSkills     = ctx.effective;
    const attrs         = _attrsFlat(c);
    const occBudget     = occ ? window.CoC.rules.calcOccupationPoints(occ.pointsFormula, attrs).points : 0;
    const piBudget      = window.CoC.rules.calcPersonalInterestPoints(attrs.INT || 0);
    const { occSpent, piSpent } = _sumSkillSpend(c, occSkills);

    // Atualiza badges
    const occState  = validators.pointsBadgeState(occSpent, occBudget);
    const piState   = validators.pointsBadgeState(piSpent,  piBudget);
    const badgeOcc  = $("#badge-occ");
    const badgePi   = $("#badge-pi");
    if (badgeOcc) {
      badgeOcc.classList.remove("ok", "warn", "err");
      badgeOcc.classList.add(occState.level);
      badgeOcc.textContent = "Ocupação: " + occState.label + _occFreePicksHint(ctx);
    }
    if (badgePi) {
      badgePi.classList.remove("ok", "warn", "err");
      badgePi.classList.add(piState.level);
      badgePi.textContent = "Interesse: " + piState.label;
    }

    // Reconstrói grupos
    const container = $("#skills-groups");
    if (!container) return;
    container.innerHTML = "";
    _ensureDelegation();

    const search = _search.trim().toLowerCase();
    const filter = _filter;
    const renderedNames = new Set();

    for (const [cat, list] of Object.entries(groups)) {
      const filtered = list.filter(s => {
        if (search && !s.name.toLowerCase().includes(search)) return false;
        if (filter === "occupation" && !occSkills.has(s.name)) return false;
        if (filter === "used") {
          const sk   = c.skills?.[s.name];
          const base = _computeBaseValue(s, attrs);
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
        const base     = _computeBaseValue(s, attrs);
        const sk       = c.skills?.[s.name];
        const value    = sk?.value != null ? Number(sk.value) : base;
        const isOcc    = occSkills.has(s.name);
        const capStatus = validators.skillCapStatus(value, document.getElementById("btn-edit-mode")?.classList.contains("active") ?? false);

        renderedNames.add(s.name);
        const isMarked = !!(sk?.marked);
        const row = el("div", {
          class: "skill-row" +
            (isOcc ? " occupation" : "") +
            (capStatus.level === "err" ? " over-cap" : "") +
            (capStatus.level === "warn" && !capStatus.ok ? " over-cap-warn" : "") +
            (isMarked ? " skill-marked" : "")
        });
        const specTag     = s.specializable ? `<span class="skill-tag">específica</span>` : "";
        const baseFormula = s.baseFormula    ? ` <span class="skill-tag" title="Base derivada">${escapeHtml(s.baseFormula)}=${base}</span>` : "";
        const occMark     = _occToggleHTML(s.name, ctx.mandatory.has(s.name), ctx.chosen.has(s.name));
        const markBtn     = `<button class="skill-mark btn-ghost${isMarked ? " marked" : ""}" data-mark-skill="${escapeHtml(s.name)}" title="${isMarked ? "Marcada para evolução (clique para desmarcar)" : "Marcar para evolução ao fim da sessão"}" aria-pressed="${isMarked}">${isMarked ? "✓" : "○"}</button>`;
        const infoBtn     = `<button class="skill-info-toggle" data-info-skill="${escapeHtml(s.name)}" title="Ver descrição da perícia" aria-expanded="false">ⓘ</button>`;
        row.innerHTML = `
          <div class="skill-name">${occMark}${escapeHtml(s.name)}${specTag}${baseFormula} ${infoBtn}</div>
          <input class="skill-input" type="number" min="0" max="99" value="${value}"
            data-skill="${escapeHtml(s.name)}"
            title="Total da perícia (Base ${base} + alocados)" />
          <div class="skill-frac"><span class="skill-frac-half" title="Difícil">${dice.half(value)}</span><span class="skill-frac-sep"> · </span><span class="skill-frac-fifth" title="Extremo">${dice.fifth(value)}</span></div>
          ${markBtn}
          <button class="skill-roll btn-ghost" data-roll-skill="${escapeHtml(s.name)}" title="Rolar perícia">🎲</button>
          <div class="skill-enc-panel" data-enc-for="${escapeHtml(s.name)}" hidden></div>
        `;
        inner.appendChild(row);
      }
      container.appendChild(group);
    }

    // Perícias customizadas não presentes no catálogo base
    const customNames = Object.keys(c.skills || {}).filter(n => !renderedNames.has(n));
    if (customNames.length > 0) {
      const customFiltered = customNames.filter(name => {
        if (search && !name.toLowerCase().includes(search)) return false;
        if (filter === "occupation" && !occSkills.has(name)) return false;
        if (filter === "used" && (Number(c.skills[name].value) || 0) === 0) return false;
        return true;
      });

      if (customFiltered.length > 0) {
        const group = el("div", { class: "skill-group" });
        group.innerHTML = `<h3 class="skill-group-title">Perícias Específicas</h3>`;
        const inner = el("div", { class: "skills-list" });
        group.appendChild(inner);

        for (const name of customFiltered) {
          const sk        = c.skills[name];
          const value     = Number(sk.value) || 0;
          const isOcc     = occSkills.has(name);
          const capStatus = validators.skillCapStatus(value, document.getElementById("btn-edit-mode")?.classList.contains("active") ?? false);
          const parent    = window.CoCData.findSkill(name.replace(/\s*\(.+\)$/, ""));
          const parentBase = parent ? _computeBaseValue(parent, attrs) : 0;

          const isMarkedCustom = !!(sk?.marked);
          const row = el("div", {
            class: "skill-row" +
              (isOcc ? " occupation" : "") +
              (capStatus.level === "err" ? " over-cap" : "") +
              (capStatus.level === "warn" && !capStatus.ok ? " over-cap-warn" : "") +
              (isMarkedCustom ? " skill-marked" : "")
          });
          const parentTag = parent ? `<span class="skill-tag" title="Base herdada de ${escapeHtml(parent.name)}">base ${parentBase}</span>` : "";
          const occMark   = _occToggleHTML(name, ctx.mandatory.has(name), ctx.chosen.has(name));
          const markBtnC  = `<button class="skill-mark btn-ghost${isMarkedCustom ? " marked" : ""}" data-mark-skill="${escapeHtml(name)}" title="${isMarkedCustom ? "Marcada para evolução" : "Marcar para evolução"}" aria-pressed="${isMarkedCustom}">${isMarkedCustom ? "✓" : "○"}</button>`;
          row.innerHTML = `
            <div class="skill-name">${occMark}${escapeHtml(name)}${parentTag}</div>
            <input class="skill-input" type="number" min="0" max="99" value="${value}" data-skill="${escapeHtml(name)}" />
            <div class="skill-frac"><span class="skill-frac-half" title="Difícil">${dice.half(value)}</span><span class="skill-frac-sep"> · </span><span class="skill-frac-fifth" title="Extremo">${dice.fifth(value)}</span></div>
            ${markBtnC}
            <button class="skill-roll btn-ghost" data-roll-skill="${escapeHtml(name)}" title="Rolar perícia">🎲</button>
          `;
          inner.appendChild(row);
        }
        container.appendChild(group);
      }
    }

    // Botão adicionar perícia específica
    const addBtn = el("button", {
      style: { marginTop: "0.75rem" },
      text: "+ Adicionar Perícia Específica",
      on: { click: () => _addCustomSkill() }
    });
    container.appendChild(addBtn);

    // Botão Fim de Sessão — só aparece quando há perícias marcadas
    const markedSkills = Object.entries(c.skills || {}).filter(([, sk]) => sk?.marked);
    if (markedSkills.length > 0) {
      const eosBtn = el("button", {
        class: "btn-primary",
        style: { marginTop: "0.75rem", marginLeft: "0.5rem" },
        title: `${markedSkills.length} perícia(s) marcada(s) para evolução`,
        on: { click: () => _endOfSession() }
      }, [`⭐ Fim de Sessão (${markedSkills.length} marcada${markedSkills.length > 1 ? "s" : ""})`]);
      container.appendChild(eosBtn);
    }
  }

  // ── Fim de Sessão: evolução de perícias marcadas ───────────────────────────

  async function _endOfSession() {
    const c = cocStore.getState().character;
    if (!c) return;
    const rules = window.CoC.rules;
    const marked = Object.entries(c.skills || {}).filter(([, sk]) => sk?.marked);
    if (marked.length === 0) {
      toast("Nenhuma perícia marcada para evolução.", { type: "info" });
      return;
    }

    const results = [];
    for (const [name, sk] of marked) {
      const value = Number(sk.value) || 0;
      const res   = rules.rollSkillImprovement(value);
      if (res.improved) {
        cocExecutor.execute({ type: "SKILL_IMPROVED", payload: { name, gain: res.gain } });
        results.push(`✓ ${name}: d100=${res.rolled} > ${res.before} → +${res.gain} (${res.before}→${res.after})`);
        // Registrar no log
        if (window.CoC.views.rolls && window.CoC.views.rolls.registerRoll) {
          window.CoC.views.rolls.registerRoll({
            kind:     "skill-improvement",
            skill:    `Evolução: ${name}`,
            target:   res.before,
            d100:     res.rolled,
            level:    "regular",
            met:      true,
            note:     `+${res.gain} (${res.before}→${res.after})`,
            luckCost: 0,
          });
        }
      } else {
        // Desmarcar sem ganho
        cocExecutor.execute({ type: "MARK_SKILL_IMPROVEMENT", payload: { name, marked: false } });
        results.push(`✗ ${name}: d100=${res.rolled} ≤ ${res.before} — sem evolução`);
      }
    }

    bus.publish("skill:persist-requested", {});
    toast(
      `Fim de Sessão — evolução de perícias:\n${results.join("\n")}`,
      { type: results.some(r => r.startsWith("✓")) ? "success" : "info", duration: 8000 }
    );
    renderSkills();  // atualiza marcações visuais
  }

  // ── Light update (preserva foco durante digitação) ─────────────────────────

  function updateSkillUI(name) {
    const c = cocStore.getState().character;
    if (!c) return;
    const input = document.querySelector(`input[data-skill="${_cssEscape(name)}"]`);
    if (input) {
      const v   = Number(input.value) || 0;
      const row = input.closest(".skill-row");
      const frac = row?.querySelector(".skill-frac");
      if (frac) {
        const h = frac.querySelector('.skill-frac-half');
        const f = frac.querySelector('.skill-frac-fifth');
        if (h && f) { h.textContent = dice.half(v); f.textContent = dice.fifth(v); }
        else frac.textContent = `${dice.half(v)} · ${dice.fifth(v)}`;
      }
      if (row) {
        const cap = validators.skillCapStatus(v, document.getElementById("btn-edit-mode")?.classList.contains("active") ?? false);
        row.classList.toggle("over-cap",      cap.level === "err");
        row.classList.toggle("over-cap-warn", cap.level === "warn" && !cap.ok);
      }
    }
    refreshBadges();
  }

  // ── Delegation (registrada 1x, sobrevive a rebuilds de innerHTML) ─────────

  function _ensureDelegation() {
    const container = $("#skills-groups");
    if (!container || container._skillsDelegated) return;
    container._skillsDelegated = true;

    container.addEventListener("click", (e) => {
      const rollBtn = e.target.closest(".skill-roll[data-roll-skill]");
      if (rollBtn) {
        // Fronteira M3.4: não acoplamos diretamente ao rollSkill() de investigator.js
        bus.publish("skill:roll-requested", { name: rollBtn.dataset.rollSkill });
        return;
      }
      const occBtn = e.target.closest("[data-occ-toggle]");
      if (occBtn) {
        e.preventDefault();
        cocExecutor.execute({ type: "TOGGLE_OCCUPATION_SKILL", payload: { skillName: occBtn.dataset.occToggle } });
        return;
      }
      const markBtn = e.target.closest("[data-mark-skill]");
      if (markBtn) {
        const name    = markBtn.dataset.markSkill;
        const current = !!(cocStore.getState().character?.skills?.[name]?.marked);
        cocExecutor.execute({ type: "MARK_SKILL_IMPROVEMENT", payload: { name, marked: !current } });
        bus.publish("skill:persist-requested", {});
        return;
      }
      // Enciclopédia: toggle do painel retrátil (#30)
      const infoBtn = e.target.closest("[data-info-skill]");
      if (infoBtn) {
        const name  = infoBtn.dataset.infoSkill;
        const row   = infoBtn.closest(".skill-row");
        const panel = row && row.querySelector(`.skill-enc-panel[data-enc-for="${_cssEscape(name)}"]`);
        if (!panel) return;
        const opening = panel.hasAttribute("hidden");
        if (opening) {
          if (!panel.dataset.built) {
            const def = window.CoCData.findSkill(name) ||
                        window.CoCData.findSkill(name.replace(/\s*\(.+\)$/, ""));
            panel.innerHTML = _buildEncPanel(name, def);
            panel.dataset.built = "1";
          }
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
        infoBtn.setAttribute("aria-expanded", String(opening));
        infoBtn.classList.toggle("open", opening);
        return;
      }
      // Enciclopédia: ações rápidas de rolagem por dificuldade
      const encRoll = e.target.closest("[data-enc-roll]");
      if (encRoll) {
        const name = encRoll.dataset.encRoll;
        const diff = encRoll.dataset.encDiff || "regular";
        if (window.CoC.views.rolls && window.CoC.views.rolls.rollSkill) {
          window.CoC.views.rolls.rollSkill(name, { difficulty: diff });
        }
        return;
      }
    });

    container.addEventListener("input", (e) => {
      const input = e.target.closest("input[data-skill]");
      if (!input) return;
      const name = input.dataset.skill;
      const v    = Math.max(0, Math.min(99, parseInt(input.value, 10) || 0));
      cocExecutor.execute({ type: "SET_SKILL", payload: { name, value: v } });
      updateSkillUI(name);
      bus.publish("skill:dirty", {});
    });

    container.addEventListener("focusout", (e) => {
      if (e.target.closest("input[data-skill]")) {
        bus.publish("skill:persist-requested", {});
      }
    });
  }

  // ── Toggle ocupação ────────────────────────────────────────────────────────

  // chamado também por addCustomSkill via checkbox — mantém parity com legado
  function _toggleOccupationSkill(name) {
    cocExecutor.execute({ type: "TOGGLE_OCCUPATION_SKILL", payload: { skillName: name } });
  }

  // ── Adicionar perícia específica ──────────────────────────────────────────

  async function _addCustomSkill() {
    if (!cocStore.getState().character) return;

    const specializable = window.CoCData.skills.filter(s => s.specializable);
    const wrapper = el("div", {});
    wrapper.innerHTML = `
      <p style="margin-bottom:0.5rem;color:var(--ink-dim)">Escolha a perícia base e a especialização.</p>
      <label>Perícia base</label>
      <select id="cs-parent">
        <option value="">— Outra (digite o nome completo) —</option>
        ${specializable.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join("")}
      </select>
      <div style="margin-top:0.5rem">
        <label>Especialização</label>
        <input type="text" id="cs-spec" placeholder="Ex: Espada, Latim, Atuação" />
        <p id="cs-examples" class="dim" style="font-size:0.8em;margin-top:0.3rem"></p>
      </div>
      <div style="margin-top:0.5rem">
        <label>Nome completo (auto-gerado, edite se quiser)</label>
        <input type="text" id="cs-name" placeholder="Lutar (Espada)" />
      </div>
      <div style="margin-top:0.5rem">
        <label>Valor inicial</label>
        <input type="number" id="cs-value" value="0" min="0" max="99" />
      </div>
      <div style="margin-top:0.5rem">
        <label><input type="checkbox" id="cs-occ" /> Conta para a ocupação (perícia livre)</label>
        <p class="dim" style="font-size:0.8em;margin-top:0.2rem">Marque para os pontos contarem no pool da OCUPAÇÃO em vez do Interesse Pessoal.</p>
      </div>
    `;

    const parentSel  = wrapper.querySelector("#cs-parent");
    const specInput  = wrapper.querySelector("#cs-spec");
    const nameInput  = wrapper.querySelector("#cs-name");
    const examples   = wrapper.querySelector("#cs-examples");
    const valueInput = wrapper.querySelector("#cs-value");
    const occCheck   = wrapper.querySelector("#cs-occ");

    const c      = cocStore.getState().character;
    const occNow = c.investigator?.occupation ? window.CoCData.findOccupation(c.investigator.occupation) : null;
    const ctxNow = window.CoC.rules.buildOccupationContext(occNow, c);
    if (occCheck) occCheck.checked = ctxNow.freeBudget > 0 && ctxNow.freeUsed < ctxNow.freeBudget;

    function syncName() {
      const p = parentSel.value, s = specInput.value.trim();
      if (p && s) nameInput.value = `${p} (${s})`;
      else if (p) nameInput.value = p + " (...)";
    }
    parentSel.onchange = () => {
      const p = window.CoCData.findSkill(parentSel.value);
      examples.textContent = p?.examples ? "Ex: " + p.examples.join(", ") : "";
      const attrs = _attrsFlat(cocStore.getState().character);
      valueInput.value = p ? _computeBaseValue(p, attrs) : 0;
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
          const v    = Math.max(0, Math.min(99, parseInt(valueInput.value, 10) || 0));
          const isOcc = !!(occCheck && occCheck.checked);
          cocExecutor.execute({ type: "ADD_CUSTOM_SKILL", payload: { skillName: name, value: v, isOccupation: isOcc } });
          // persist + render via bus subscription em boot()
          bus.publish("skill:persist-requested", {});
          toast(`"${name}" adicionada`, { type: "success" });
        }}
      ]
    });
  }

  // ── Init (filter chips + search input) ────────────────────────────────────

  function initSkills() {
    // Filter chips
    document.querySelectorAll(".filter-chip").forEach(chip => {
      chip.onclick = () => {
        document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        _filter = chip.dataset.filter;
        renderSkills();
      };
    });
    document.querySelectorAll(".filter-chip[data-filter='all']").forEach(c => c.classList.add("active"));

    // Search input
    const searchInput = $("#skill-search-input");
    if (searchInput) {
      searchInput.oninput = (e) => {
        _search = e.target.value;
        renderSkills();
      };
    }

    // Reactive re-render on occupation/improvement/attribute changes
    bus.subscribe("store:dispatch", function (event) {
      if (!event.changed) return;
      const t = event.action.type;
      if (t === "TOGGLE_OCCUPATION_SKILL" || t === "ADD_CUSTOM_SKILL" ||
          t === "MARK_SKILL_IMPROVEMENT"  || t === "SKILL_IMPROVED") {
        renderSkills();
      }
      // Quando EDU ou outros atributos que alimentam fórmulas de ocupação mudam,
      // refrescar os badges (pontos de ocupação = EDU*4 etc.)
      if (t === "SET_ATTRIBUTE" || t === "RECALC_DERIVED") {
        refreshBadges();
      }
    });
  }

  // ── Expõe API pública ─────────────────────────────────────────────────────

  window.CoC.views.skills = Object.freeze({
    init:          initSkills,
    render:        renderSkills,
    updateSkillUI: updateSkillUI,
    refreshBadges: refreshBadges,
    endOfSession:  _endOfSession,
  });

})();
