/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/shared/ui-components.js
   Componentes UI compartilhados: roll log, modal, toast, helpers DOM
   Atribui a window.CoC.ui
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  // ─── Helpers DOM ──────────────────────────────────────────────────────
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k === "on" && typeof v === "object") {
        for (const [evt, fn] of Object.entries(v)) node.addEventListener(evt, fn);
      } else if (k === "style" && typeof v === "object") {
        Object.assign(node.style, v);
      } else if (k.startsWith("data-") || k.startsWith("aria-")) {
        node.setAttribute(k, v);
      } else {
        node[k] = v;
      }
    }
    for (const c of [].concat(children || [])) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  function setText(sel, value) {
    const n = typeof sel === "string" ? $(sel) : sel;
    if (n) n.textContent = value;
  }

  function setHTML(sel, value) {
    const n = typeof sel === "string" ? $(sel) : sel;
    if (n) n.innerHTML = value;
  }

  // ─── Toast / Notificação rápida ────────────────────────────────────────
  let toastContainer = null;
  function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = el("div", {
      class: "toast-container",
      style: {
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        pointerEvents: "none"
      }
    });
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function toast(message, opts = {}) {
    const { type = "info", duration = 3500 } = opts;
    const colors = {
      info:    { bg: "#1c1813", border: "#b8924f", color: "#e8dcc4" },
      success: { bg: "#1a2a1a", border: "#5a8a5a", color: "#cfe8cf" },
      warn:    { bg: "#2a1f10", border: "#c8924f", color: "#f0d8a4" },
      error:   { bg: "#2a1010", border: "#8b1a1a", color: "#ffb4b4" }
    }[type] || {};

    const node = el("div", {
      class: "toast " + type,
      style: {
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${colors.border}`,
        color: colors.color,
        padding: "0.65rem 1rem",
        borderRadius: "3px",
        fontSize: "0.9rem",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        maxWidth: "360px",
        pointerEvents: "auto",
        animation: "toast-in 0.25s ease-out"
      }
    }, [message]);

    ensureToastContainer().appendChild(node);

    setTimeout(() => {
      node.style.transition = "opacity 0.3s, transform 0.3s";
      node.style.opacity = "0";
      node.style.transform = "translateX(30px)";
      setTimeout(() => node.remove(), 320);
    }, duration);
  }

  /**
   * Toast especializado para rolagens — cor baseada no nível classificado.
   * Sempre dispara, mesmo no desktop (não polui — o usuário acompanha o resultado
   * sem precisar olhar pro log lateral).
   *
   * @param {Object} entry - mesmo formato do appendRoll
   */
  function toastRoll(entry) {
    const labels = window.CoC?.dice?.LEVEL_LABELS || {};
    const styleByLevel = {
      crit:    { bg: "#2a2010", border: "#d4a960", color: "#ffe4a8", icon: "✨" },
      extreme: { bg: "#2a1810", border: "#c87a4f", color: "#ffd1b0", icon: "🎯" },
      hard:    { bg: "#1c1813", border: "#a89580", color: "#e8dcc4", icon: "✓" },
      regular: { bg: "#15110d", border: "#7a8590", color: "#cdd5dc", icon: "✓" },
      fail:    { bg: "#1a0d0d", border: "#6b3232", color: "#d8a8a8", icon: "✗" },
      fumble:  { bg: "#2a0606", border: "#8b1a1a", color: "#ffb4b4", icon: "💀" }
    };
    // Se a dificuldade exigida não foi atingida, mostrar como falha visual
    // mesmo que o tier natural seja Regular ou superior.
    const displayLevel = (entry.met === false) ? "fail" : entry.level;
    const s = styleByLevel[displayLevel] || styleByLevel.regular;
    const tierLabel = labels[entry.level] || (entry.level || "ROLAGEM").toUpperCase();
    // Nota de dificuldade: mostra o tier atingido vs. o exigido quando há mismatch
    let label;
    if (entry.met === false && entry.difficulty && entry.difficulty !== "regular") {
      const diffLabel = entry.difficulty === "hard" ? "Difícil" : "Extremo";
      label = `${tierLabel} — insuficiente p/ ${diffLabel}`;
    } else {
      label = tierLabel;
    }
    const target = entry.target != null ? ` (alvo ${entry.target})` : "";
    const dmg = entry.dmg ? ` · ⚔ ${entry.dmg}` : "";

    const node = el("div", {
      class: "toast roll-toast " + (entry.level || ""),
      style: {
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderLeft: `4px solid ${s.border}`,
        color: s.color,
        padding: "0.7rem 1rem",
        borderRadius: "3px",
        fontSize: "0.9rem",
        boxShadow: "0 4px 18px rgba(0,0,0,0.6)",
        maxWidth: "420px",
        minWidth: "260px",
        pointerEvents: "auto",
        animation: "toast-in 0.25s ease-out",
        fontFamily: "var(--font-body)",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "0.5rem 0.75rem",
        alignItems: "center"
      }
    });
    node.innerHTML = `
      <span style="font-size: 1.6rem; line-height: 1;">${s.icon}</span>
      <div>
        <div style="font-family: var(--font-serif); font-size: 1.05rem; line-height: 1.2;">
          <b>${escapeHtml(entry.skill || "—")}</b>${escapeHtml(target)}
        </div>
        <div style="font-family: var(--font-mono); font-size: 0.85em; margin-top: 0.15rem;">
          d100 = <b>${entry.d100 != null ? entry.d100 : "—"}</b> · <span style="color: ${s.border};">${escapeHtml(label)}</span>${escapeHtml(dmg)}
        </div>
      </div>
    `;
    ensureToastContainer().appendChild(node);

    const duration = (entry.level === "crit" || entry.level === "fumble") ? 5500 : 3500;
    setTimeout(() => {
      node.style.transition = "opacity 0.3s, transform 0.3s";
      node.style.opacity = "0";
      node.style.transform = "translateX(30px)";
      setTimeout(() => node.remove(), 320);
    }, duration);
  }

  // ─── Bottom Sheet (mobile) ────────────────────────────────────────────
  /**
   * Cria um FAB que abre um bottom sheet com conteúdo arbitrário.
   * O FAB pode mostrar contador (badge).
   *
   * @param {Object} opts
   * @param {string} opts.id - ID único
   * @param {string} opts.icon - emoji do botão
   * @param {string} opts.label - texto curto
   * @param {() => HTMLElement} opts.content - factory de conteúdo
   * @param {number} opts.badgeCount - número opcional no badge
   * @returns {{ setBadge(n), open(), close() }}
   */
  function bottomSheet({ id, icon, label, content, position = "bottom-right" }) {
    // Container do FAB
    let fab = document.getElementById("fab-" + id);
    if (!fab) {
      fab = el("button", {
        id: "fab-" + id,
        class: "fab no-print",
        title: label,
        style: {
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "linear-gradient(180deg, var(--brass) 0%, #8c6e3a 100%)",
          color: "var(--bg-deep)",
          fontSize: "1.4rem",
          border: "2px solid var(--brass-bright)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.6), 0 0 18px var(--brass-glow)",
          cursor: "pointer",
          zIndex: 90,
          display: "none",  // visível só em mobile (CSS responsivo)
          alignItems: "center",
          justifyContent: "center",
          padding: 0
        }
      });
      fab.innerHTML = `
        <span>${icon}</span>
        <span class="fab-badge" style="
          position: absolute; top: -4px; right: -4px;
          background: var(--blood); color: var(--ink);
          font-size: 0.7rem; font-family: var(--font-mono);
          padding: 0.1rem 0.35rem; border-radius: 999px;
          min-width: 18px; text-align: center;
          display: none;">0</span>
      `;
      document.body.appendChild(fab);
    }

    let sheet = null;
    function open() {
      if (sheet) return;
      const backdrop = el("div", {
        class: "bottom-sheet-backdrop",
        style: {
          position: "fixed", inset: 0,
          background: "rgba(10, 8, 7, 0.6)", zIndex: 95
        }
      });
      sheet = el("div", {
        class: "bottom-sheet",
        style: {
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          maxHeight: "75vh",
          background: "var(--bg-card)",
          borderTop: "2px solid var(--brass)",
          borderRadius: "12px 12px 0 0",
          padding: "1rem 1rem 5rem",
          zIndex: 96,
          overflowY: "auto",
          animation: "sheet-up 0.3s ease-out",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.7)"
        }
      });
      const closeBtn = el("button", {
        class: "btn-ghost",
        text: "✕",
        title: "Fechar",
        style: {
          position: "absolute", top: "0.5rem", right: "0.5rem",
          fontSize: "1.2rem", padding: "0.3rem 0.6rem"
        },
        on: { click: close }
      });
      sheet.appendChild(closeBtn);
      sheet.appendChild(content());
      backdrop.appendChild(sheet);
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) close();
      });
      document.body.appendChild(backdrop);
      sheet._backdrop = backdrop;
    }
    function close() {
      if (!sheet) return;
      const b = sheet._backdrop;
      sheet.style.animation = "sheet-down 0.25s ease-in";
      setTimeout(() => { b.remove(); sheet = null; }, 260);
    }

    fab.onclick = () => sheet ? close() : open();

    function setBadge(n) {
      const b = fab.querySelector(".fab-badge");
      if (!b) return;
      if (n > 0) { b.textContent = n > 99 ? "99+" : n; b.style.display = "inline-block"; }
      else b.style.display = "none";
    }

    return { open, close, setBadge, fab };
  }

  // ─── Modal genérico ────────────────────────────────────────────────────
  function modal({ title, body, actions, dismissible = true, onClose }) {
    const backdrop = el("div", { class: "modal-backdrop" });
    const m = el("div", { class: "modal", role: "dialog", "aria-modal": "true" });

    if (title) m.appendChild(el("div", { class: "modal-title" }, [title]));

    if (body) {
      const bodyNode = typeof body === "string"
        ? el("div", { html: body })
        : body;
      m.appendChild(bodyNode);
    }

    function close() {
      backdrop.remove();
      if (typeof onClose === "function") onClose();
    }

    if (Array.isArray(actions) && actions.length) {
      const actionRow = el("div", { class: "modal-actions" });
      for (const a of actions) {
        const btn = el("button", {
          class: a.primary ? "btn-primary" : (a.danger ? "btn-danger" : ""),
          text: a.label || "OK",
          on: { click: () => {
            const r = a.onClick ? a.onClick() : null;
            if (r !== false) close();
          }}
        });
        actionRow.appendChild(btn);
      }
      m.appendChild(actionRow);
    }

    backdrop.appendChild(m);
    if (dismissible) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) close();
      });
      document.addEventListener("keydown", function escHandler(e) {
        if (e.key === "Escape") {
          document.removeEventListener("keydown", escHandler);
          close();
        }
      });
    }
    document.body.appendChild(backdrop);
    return { close, node: m };
  }

  function confirm(message, { title = "Confirmar", confirmLabel = "Confirmar", cancelLabel = "Cancelar", danger = false } = {}) {
    return new Promise((resolve) => {
      modal({
        title,
        body: el("p", { style: { fontSize: "1rem", color: "var(--ink)" } }, [message]),
        actions: [
          { label: cancelLabel, onClick: () => resolve(false) },
          { label: confirmLabel, primary: !danger, danger, onClick: () => resolve(true) }
        ],
        onClose: () => resolve(false)
      });
    });
  }

  function prompt(message, { title = "Entrada", defaultValue = "", placeholder = "" } = {}) {
    return new Promise((resolve) => {
      const input = el("input", { type: "text", value: defaultValue, placeholder });
      const wrapper = el("div", {}, [
        el("p", { style: { marginBottom: "0.5rem" } }, [message]),
        input
      ]);
      const m = modal({
        title,
        body: wrapper,
        actions: [
          { label: "Cancelar", onClick: () => resolve(null) },
          { label: "OK", primary: true, onClick: () => resolve(input.value) }
        ],
        onClose: () => resolve(null)
      });
      setTimeout(() => input.focus(), 50);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { resolve(input.value); m.close(); }
      });
    });
  }

  // ─── Roll Log ─────────────────────────────────────────────────────────
  /**
   * Adiciona uma entrada de rolagem ao log.
   * @param {HTMLElement} containerEl - <div class="roll-log"> com lista interna
   * @param {Object} entry - { skill, target, d100, level, dmg, note }
   * @param {number} maxEntries - default 50
   * @returns {Object[]} histórico atualizado
   */
  function appendRoll(containerEl, entry, maxEntries = 50) {
    if (!containerEl) return [];
    const labels = window.CoC?.dice?.LEVEL_LABELS || {};

    const list = $("ul", containerEl) || (() => {
      const u = el("ul", { style: { listStyle: "none", padding: 0, margin: 0 } });
      containerEl.appendChild(u);
      return u;
    })();

    const e = entry || {};
    const ts = new Date(e.ts || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // Classe visual: se dificuldade não atingida, exibe como falha na cor
    const displayLevel = (e.met === false) ? "fail" : (e.level || "");
    const node = el("li", { class: `roll-entry ${displayLevel}` });
    let html = "";
    if (e.skill)  html += `<span class="skill">${escapeHtml(e.skill)}</span>`;
    if (e.target != null) html += ` <span style="color:var(--ink-faded);font-size:0.8em">(${e.target})</span>`;
    if (e.d100 != null) html += ` <span class="result">${e.d100}</span>`;
    if (e.level) {
      let levelText = labels[e.level] || e.level;
      if (e.met === false && e.difficulty && e.difficulty !== "regular") {
        const diffLabel = e.difficulty === "hard" ? "Difícil" : "Extremo";
        levelText += ` <span style="color:var(--err);font-size:0.8em">(insuf. ${diffLabel})</span>`;
      }
      html += `<span class="level">${levelText}</span>`;
    }
    if (e.dmg)    html += `<br><span style="color:var(--brass-bright)">⚔ ${escapeHtml(String(e.dmg))}</span>`;
    if (e.note)   html += `<br><span style="color:var(--ink-dim);font-style:italic;font-size:0.85em">${escapeHtml(e.note)}</span>`;
    html += `<span class="ts">${ts}</span>`;
    node.innerHTML = html;

    list.insertBefore(node, list.firstChild);

    // Limita ao max
    while (list.children.length > maxEntries) list.removeChild(list.lastChild);

    return entriesFromList(list);
  }

  function clearLog(containerEl) {
    const list = $("ul", containerEl);
    if (list) list.innerHTML = "";
  }

  function entriesFromList(listEl) {
    return $$("li", listEl).map(li => ({
      html: li.innerHTML,
      level: li.className.replace("roll-entry", "").trim()
    }));
  }

  function exportLogAsMarkdown(history) {
    if (!Array.isArray(history) || history.length === 0) return "";
    const lines = ["# Roll Log — " + new Date().toLocaleString("pt-BR"), ""];
    for (const e of history) {
      const labels = window.CoC?.dice?.LEVEL_LABELS || {};
      let line = "- ";
      if (e.skill) line += `**${e.skill}**`;
      if (e.target != null) line += ` (${e.target})`;
      if (e.d100 != null) line += ` → \`${e.d100}\``;
      if (e.level) line += ` — ${labels[e.level] || e.level}`;
      if (e.dmg) line += ` · Dano: ${e.dmg}`;
      lines.push(line);
    }
    return lines.join("\n");
  }

  // ─── Escape HTML ──────────────────────────────────────────────────────
  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ─── Animações CSS injetadas (toast) ──────────────────────────────────
  (function injectAnims() {
    if (document.getElementById("ui-anims")) return;
    const style = document.createElement("style");
    style.id = "ui-anims";
    style.textContent = `
      @keyframes toast-in { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes pulse-accent { 0%, 100% { box-shadow: 0 0 0 0 var(--accent-glow); } 50% { box-shadow: 0 0 0 6px transparent; } }
      .pulse-accent { animation: pulse-accent 2s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
  })();

  // ─── Copiar para clipboard ────────────────────────────────────────────
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copiado para a área de transferência", { type: "success", duration: 2000 });
      return true;
    } catch (e) {
      // Fallback: textarea + execCommand
      try {
        const ta = el("textarea", { value: text, style: { position: "fixed", left: "-9999px" } });
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        toast("Copiado", { type: "success", duration: 2000 });
        return true;
      } catch (err) {
        toast("Não foi possível copiar", { type: "error" });
        return false;
      }
    }
  }

  // ─── Animações adicionais (bottom sheet) ──────────────────────────────
  (function injectMoreAnims() {
    if (document.getElementById("ui-anims-2")) return;
    const style = document.createElement("style");
    style.id = "ui-anims-2";
    style.textContent = `
      @keyframes sheet-up   { from { transform: translateY(100%); } to { transform: translateY(0); } }
      @keyframes sheet-down { from { transform: translateY(0); } to { transform: translateY(100%); } }
      @media (max-width: 768px) { .fab { display: flex !important; } }
    `;
    document.head.appendChild(style);
  })();

  // ─── Expor ────────────────────────────────────────────────────────────
  window.CoC.ui = {
    $, $$, el, setText, setHTML,
    toast, toastRoll, modal, confirm, prompt,
    appendRoll, clearLog, exportLogAsMarkdown,
    escapeHtml, copyToClipboard,
    bottomSheet
  };

})();
