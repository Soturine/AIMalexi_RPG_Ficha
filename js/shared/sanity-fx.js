/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/shared/sanity-fx.js
   Sistema de efeitos visuais de Insanidade (SAN baixa) — progressivo + acessível.

   Responsabilidades:
   - Injeta o overlay #sanity-fx (camadas: vinheta, grão, cromática, blur, flicker).
   - Mapeia SAN_atual / SAN_max → nível 0-4 (body[data-sanity]).
   - Gerencia o modo de acessibilidade: OFF / REDUZIDO / COMPLETO
     (body[data-sanity-fx]), persistido em CoC.storage.getPref/setPref.
   - Default: COMPLETO, mas auto-reduz para REDUZIDO se o SO sinaliza
     prefers-reduced-motion (até o usuário escolher explicitamente).

   Toda a aparência mora em css/theme.css. Este módulo só liga estado→atributos
   e oferece o modal de configuração. Atribui a window.CoC.sanityFx.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  const PREF_KEY = "sanityFxMode";
  const MODES = ["full", "reduced", "off"];
  const MODE_LABELS = {
    full:    "Completo",
    reduced: "Reduzido",
    off:     "Desligado"
  };

  // Limiares de SAN (atual/máx) → nível visual.
  // 0: ≥50% · 1: <50% · 2: <30% · 3: <15% · 4: <5%
  const THRESHOLDS = [
    { max: 0.05, level: 4 },
    { max: 0.15, level: 3 },
    { max: 0.30, level: 2 },
    { max: 0.50, level: 1 }
  ];

  const store = window.CoC.storage || null;

  let mode = "full";
  let injected = false;
  let lastRatio = 1;          // última razão SAN aplicada (para re-aplicar após preview)
  let previewTimer = null;

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { return false; }
  }

  // ─── Overlay DOM ──────────────────────────────────────────────────────
  function injectOverlay() {
    if (injected || document.getElementById("sanity-fx")) { injected = true; return; }
    const fx = document.createElement("div");
    fx.id = "sanity-fx";
    fx.setAttribute("aria-hidden", "true");
    // Camadas estáticas, controladas 100% por CSS via body[data-sanity].
    ["sfx-vignette", "sfx-blur", "sfx-chroma", "sfx-grain", "sfx-flicker"].forEach((cls) => {
      const layer = document.createElement("div");
      layer.className = cls;
      fx.appendChild(layer);
    });
    document.body.appendChild(fx);
    injected = true;
  }

  // ─── Modo de acessibilidade ───────────────────────────────────────────
  function resolveInitialMode() {
    const saved = store && typeof store.getPref === "function" ? store.getPref(PREF_KEY, null) : null;
    if (saved && MODES.includes(saved)) return saved;
    // Sem preferência explícita: COMPLETO por padrão, mas respeita o SO.
    return prefersReducedMotion() ? "reduced" : "full";
  }

  function applyModeAttr() {
    document.body.setAttribute("data-sanity-fx", mode);
  }

  function setMode(next, persist = true) {
    if (!MODES.includes(next)) return;
    mode = next;
    applyModeAttr();
    if (persist && store && typeof store.setPref === "function") {
      store.setPref(PREF_KEY, mode);
    }
    // Re-aplica o nível atual sob o novo modo.
    applyRatio(lastRatio);
  }

  function getMode() { return mode; }

  // ─── Aplicação do nível por SAN ───────────────────────────────────────
  function ratioToLevel(ratio) {
    if (!isFinite(ratio) || ratio >= 0.5) return 0;
    for (const t of THRESHOLDS) {
      if (ratio < t.max) return t.level;
    }
    return 0;
  }

  function applyRatio(ratio) {
    lastRatio = isFinite(ratio) ? ratio : 1;
    const level = ratioToLevel(lastRatio);
    document.body.setAttribute("data-sanity", String(level));
  }

  /**
   * Ponto de entrada principal: recebe SAN atual e máxima.
   * @param {number} current - SAN atual
   * @param {number} max - SAN máxima
   */
  function apply(current, max) {
    const c = Number(current);
    const m = Number(max);
    const ratio = (isFinite(c) && isFinite(m) && m > 0) ? c / m : 1;
    applyRatio(ratio);
  }

  function clear() {
    document.body.setAttribute("data-sanity", "0");
    lastRatio = 1;
  }

  // ─── Modal de configuração ────────────────────────────────────────────
  function openSettings() {
    const ui = window.CoC.ui;
    if (!ui || typeof ui.modal !== "function") return;
    const { el, modal } = ui;

    const wrap = el("div", {});
    wrap.appendChild(el("p", {
      style: { marginBottom: "0.75rem", color: "var(--ink-dim)" },
      text: "Efeitos visuais de insanidade conforme sua Sanidade cai. Passe o mouse / toque numa opção para pré-visualizar."
    }));

    const optionList = el("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" } });

    const OPTIONS = [
      { value: "full",    title: "🧠 Completo",  desc: "Experiência máxima: vinheta, blur periférico, aberração cromática, tremor e lampejos progressivos." },
      { value: "reduced", title: "🌫 Reduzido",  desc: "Só cor e vinheta estáticas — sem movimento, blur ou flicker. Bom para enjoo/telas fracas." },
      { value: "off",     title: "⬜ Desligado", desc: "Nenhum efeito visual. A ficha permanece neutra mesmo com SAN baixa." }
    ];

    const buttons = [];
    OPTIONS.forEach((opt) => {
      const btn = el("button", {
        class: "sfx-mode-option" + (mode === opt.value ? " active" : ""),
        "data-mode": opt.value,
        style: {
          textAlign: "left", padding: "0.6rem 0.8rem", cursor: "pointer",
          border: "1px solid var(--ink-faded)", borderRadius: "var(--radius)",
          background: mode === opt.value ? "var(--bg-card-hi)" : "transparent",
          borderLeft: mode === opt.value ? "3px solid var(--brass)" : "3px solid transparent"
        }
      }, [
        el("div", { style: { fontFamily: "var(--font-serif)", fontSize: "1.05rem", color: "var(--brass-bright)" }, text: opt.title }),
        el("div", { style: { fontSize: "0.82rem", color: "var(--ink-dim)", marginTop: "0.15rem" }, text: opt.desc })
      ]);
      btn.addEventListener("click", () => {
        setMode(opt.value);
        buttons.forEach((b) => {
          const on = b.dataset.mode === opt.value;
          b.classList.toggle("active", on);
          b.style.background = on ? "var(--bg-card-hi)" : "transparent";
          b.style.borderLeft = on ? "3px solid var(--brass)" : "3px solid transparent";
        });
      });
      // Pré-visualização ao focar/hover: mostra nível 3 temporariamente.
      btn.addEventListener("mouseenter", () => previewWithMode(opt.value));
      btn.addEventListener("mouseleave", endPreview);
      btn.addEventListener("focus", () => previewWithMode(opt.value));
      btn.addEventListener("blur", endPreview);
      buttons.push(btn);
      optionList.appendChild(btn);
    });

    wrap.appendChild(optionList);

    modal({
      title: "Efeitos de Insanidade",
      body: wrap,
      actions: [{ label: "Fechar", primary: true }],
      onClose: endPreview
    });
  }

  // Preview: aplica modo e nível 3 por alguns segundos para o usuário sentir o efeito.
  function previewWithMode(previewMode) {
    if (!MODES.includes(previewMode)) return;
    document.body.setAttribute("data-sanity-fx", previewMode);
    document.body.setAttribute("data-sanity", "3");
    if (previewTimer) clearTimeout(previewTimer);
  }

  function endPreview() {
    // Restaura modo persistido + nível real (último SAN aplicado).
    applyModeAttr();
    applyRatio(lastRatio);
  }

  // ─── Init ─────────────────────────────────────────────────────────────
  function init() {
    injectOverlay();
    mode = resolveInitialMode();
    applyModeAttr();
    applyRatio(lastRatio);
    // O cache de prefs pode carregar depois (IndexedDB é async). Reconcilia o modo
    // quando o storage estiver pronto, sem sobrescrever uma escolha já feita pelo SO.
    if (store && store.ready && typeof store.ready.then === "function") {
      store.ready.then(() => {
        const saved = store.getPref ? store.getPref(PREF_KEY, null) : null;
        if (saved && MODES.includes(saved) && saved !== mode) {
          mode = saved;
          applyModeAttr();
          applyRatio(lastRatio);
        }
      }).catch(() => {});
    }
  }

  // ─── Expor ────────────────────────────────────────────────────────────
  window.CoC.sanityFx = {
    init,
    apply,
    clear,
    setMode,
    getMode,
    openSettings,
    ratioToLevel,   // exposto para testes
    MODES
  };

})();
