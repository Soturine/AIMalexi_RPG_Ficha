/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/rolls.js
   M3.4 — Fatia: Rolls (pipeline de rolagens CoC 7e)

   Responsabilidades:
     core:   rollSkill, rollAttribute, registerRoll (pipeline central)
     UI:     logAndToast, presentPostRollActions, pushRoll
     sync:   setRollMods (investigator.js sincroniza após cada mudança de mod)

   Fronteiras:
     attackWithWeapon() → fica em investigator.js (domínio Weapons)
     attackWithWeapon() chama window.CoC.views.rolls.registerRoll(entry)

   Side-effects via Bus:
     "roll:badge-inc"         → investigator.js incrementa badge FAB
     "rolls:persist-requested"→ investigator.js chama persistCurrent()
     "roll:logged"            → subscriber externo (luck.js) → logAndToast()

   Expõe: window.CoC.views.rolls = { init, logAndToast, registerRoll,
                                     rollSkill, rollAttribute, setRollMods }

   Depende de: js/core/{bus,store}.js  js/shared/ui-components.js
               js/engine/dice.js  js/views/luck.js (opcional — via window.CoC.views.luck)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  const { $, el, escapeHtml, toastRoll, appendRoll, modal: _modal, confirm } = window.CoC.ui;
  const dice     = window.CoC.dice;
  const cocStore = window.CoC.store;
  const bus      = window.CoC.bus;

  // Estado interno de modificadores de rolagem — sincronizado por investigator.js
  let _mods = { difficulty: "regular", bp: "" };

  function setRollMods(mods) {
    _mods = mods || { difficulty: "regular", bp: "" };
  }

  // ── Helper privado (mesma lógica de getSkillValue em investigator.js) ─────

  function _getSkillValue(c, name) {
    const direct = Number(c?.skills?.[name]?.value);
    if (!isNaN(direct)) return direct;
    const def = window.CoCData.findSkill(name) ||
                window.CoCData.findSkill(name.replace(/\s*\(.+\)$/, ""));
    if (!def) return 0;
    const attrs = Object.fromEntries(
      Object.entries(c?.attributes || {}).map(([k, x]) => [k, x.value])
    );
    if (def.baseFormula === "DES/2") return Math.floor((attrs.DES || 0) / 2);
    if (def.baseFormula === "EDU")   return attrs.EDU || 0;
    return Number(def.base) || 0;
  }

  // ── Log + Toast ────────────────────────────────────────────────────────────

  function logAndToast(entry) {
    const log = $("#roll-log");
    if (log) appendRoll(log, entry);
    if (entry?.level) toastRoll(entry);
    bus.publish("roll:badge-inc", {});
  }

  // ── Pipeline central ───────────────────────────────────────────────────────

  function registerRoll(entry) {
    logAndToast(entry);
    bus.publish("rolls:persist-requested", {});
    presentPostRollActions(entry);
  }

  // ── Rolagem de perícia ─────────────────────────────────────────────────────

  function rollSkill(name, opts = {}) {
    const c          = cocStore.getState().character;
    const v          = _getSkillValue(c, name);
    const difficulty = opts.difficulty || _mods.difficulty || "regular";
    const bp         = opts.bp != null ? opts.bp : (_mods.bp || null);
    const target     = difficulty === "hard"    ? dice.half(v)  :
                       difficulty === "extreme" ? dice.fifth(v) : v;
    const result     = dice.rollD100(bp || null);
    const level      = dice.classifyRoll(result.value, v);

    const entry = {
      kind:     "skill",
      skill:    name + (opts.pushed ? "  ⚠ PUSHED" : ""),
      skillRaw: name,
      target,
      targetRaw: v,
      d100:     result.value,
      level,
      note:     bp ? `[${bp}]` : "",
      pushed:   !!opts.pushed
    };
    registerRoll(entry);
  }

  // ── Rolagem de atributo ────────────────────────────────────────────────────

  function rollAttribute(code, opts = {}) {
    const c          = cocStore.getState().character;
    const v          = Number(c?.attributes?.[code]?.value) || 0;
    const difficulty = opts.difficulty || _mods.difficulty || "regular";
    const bp         = opts.bp != null ? opts.bp : (_mods.bp || null);
    const target     = difficulty === "hard"    ? dice.half(v)  :
                       difficulty === "extreme" ? dice.fifth(v) : v;
    const result     = dice.rollD100(bp || null);
    const level      = dice.classifyRoll(result.value, v);

    const entry = {
      kind:     "attribute",
      skill:    code,
      skillRaw: code,
      target,
      targetRaw: v,
      label:    difficulty === "regular" ? v : `${v} → ${difficulty === "hard" ? "Difícil" : "Extremo"} ${target}`,
      d100:     result.value,
      level,
      pushed:   false
    };
    registerRoll(entry);
  }

  // ── Painel pós-rolagem (efêmero — aparece no #roll-log) ───────────────────

  function presentPostRollActions(entry) {
    const old = $("#post-roll-actions");
    if (old) old.remove();
    if (!entry || entry.kind === "weapon-attack") return;

    const c    = cocStore.getState().character;
    const luck = Number(c?.attributes?.Sorte?.value) || 0;
    const diff = entry.d100 - (Number(entry.target) || 0);

    const canSpendLuck =
      !entry.pushed
      && (entry.level === "fail" || entry.level === "fumble" || entry.level === "regular")
      && diff > 0
      && luck >= diff
      && entry.level !== "fumble";

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
      style: {
        color: "var(--ink-dim)", marginBottom: "0.35rem",
        fontFamily: "var(--font-mono)", fontSize: "0.7rem",
        letterSpacing: "0.08em", textTransform: "uppercase"
      }
    }, [`Ações pós-rolagem · ${dimEntry}`]);
    panel.appendChild(header);

    const row = el("div", { style: { display: "flex", gap: "0.35rem", flexWrap: "wrap" } });

    if (canSpendLuck) {
      const cost = diff;
      const btn  = el("button", {
        class: "btn-primary",
        title: `Reduz sua Sorte em ${cost} para tornar este teste um sucesso Regular.`,
        on: { click: () => window.CoC.views.luck.spendLuck(entry, cost) }
      }, [`🍀 Gastar ${cost} Sorte (vira Regular)`]);
      row.appendChild(btn);
    }

    if (canPush) {
      // Captura mods atuais no momento em que o painel é criado
      const modsSnapshot = Object.assign({}, _mods);
      const btn = el("button", {
        class: "btn-danger",
        title: "Forçar a rolagem — relança com risco de consequência grave em caso de falha.",
        on: { click: () => pushRoll(entry, modsSnapshot) }
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

  // ── Forçar rolagem (Push) ─────────────────────────────────────────────────

  async function pushRoll(entry, mods = {}) {
    const old = $("#post-roll-actions");
    if (old) old.remove();

    const confirmed = await confirm(
      `Forçar a rolagem de "${entry.skillRaw || entry.skill}"? Falha numa rolagem forçada gera consequência narrativa GRAVE decidida pelo Guardião.`,
      { title: "Forçar Rolagem", danger: true, confirmLabel: "Forçar" }
    );
    if (!confirmed) return;

    const opts = { pushed: true, difficulty: mods.difficulty || "regular", bp: mods.bp || "" };

    if (entry.kind === "skill") {
      rollSkill(entry.skillRaw, opts);
    } else if (entry.kind === "attribute") {
      rollAttribute(entry.skillRaw, opts);
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function initRolls() {
    bus.subscribe("roll:logged", logAndToast);
  }

  // ── API pública ───────────────────────────────────────────────────────────

  window.CoC.views.rolls = Object.freeze({
    init:         initRolls,
    logAndToast,
    registerRoll,
    rollSkill,
    rollAttribute,
    setRollMods,
  });

})();
