/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/guia.js
   Interatividade do Guia do Iniciante
   ───────────────────────────────────────────────────────────────────────────
   - Rolagem D100 demo classificada por perícia
   - Scroll suave + highlight da seção ativa no sumário
   - Sem dependências além de window.CoC.dice
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  // ─── Atalhos ──────────────────────────────────────────────────────────
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const dice = window.CoC?.dice;

  const LEVEL_DESCRIPTIONS = {
    crit:    { label: "CRÍTICO",  text: "Sucesso espetacular. Você superou todas as expectativas — beleza, eficiência, drama." },
    extreme: { label: "EXTREMO",  text: "Sucesso excepcional. Você não só conseguiu — fez muito além do necessário." },
    hard:    { label: "DIFÍCIL",  text: "Sucesso sólido. Você atingiu o resultado, mas exigiu esforço. Conta como vitória clara." },
    regular: { label: "REGULAR",  text: "Sucesso normal. Você conseguiu o básico do que tentou." },
    fail:    { label: "FALHA",    text: "Não conseguiu. Mas falhar abre portas narrativas — o que acontece a seguir?" },
    fumble:  { label: "FUMBLE",   text: "Catástrofe. Não só falhou — algo deu MUITO errado. Esse é o melhor momento da mesa." }
  };

  // ═════════════════════════════════════════════════════════════════════
  // DEMO DE ROLAGEM CLASSIFICADA
  // ═════════════════════════════════════════════════════════════════════

  function setupDemoClassify() {
    const btn = $("#btn-demo-classify");
    const result = $("#demo-classify-result");
    const skillInput = $("#demo-skill");
    if (!btn || !result || !skillInput) return;

    btn.addEventListener("click", () => {
      const skill = Math.max(1, Math.min(99, parseInt(skillInput.value, 10) || 50));
      skillInput.value = skill;

      if (!dice) {
        result.textContent = "Engine de dados indisponível.";
        return;
      }

      const r = dice.rollD100(null);
      const level = dice.classifyRoll(r.value, skill);
      const info = LEVEL_DESCRIPTIONS[level] || LEVEL_DESCRIPTIONS.regular;

      const halfV = Math.floor(skill / 2);
      const fifthV = Math.floor(skill / 5);

      const detail = `
        <div class="detail">
          <span class="label-result">${info.label}</span>
          <div class="explanation">
            <b>Perícia ${skill}</b> · Regular ≤ ${skill} · Difícil ≤ ${halfV} · Extremo ≤ ${fifthV}<br>
            ${info.text}
          </div>
        </div>
      `;
      result.className = "demo-roll-result " + level;
      result.innerHTML = `<div class="dice-face">${r.value}</div>${detail}`;
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // SCROLL SUAVE + HIGHLIGHT DA SEÇÃO ATIVA
  // ═════════════════════════════════════════════════════════════════════

  function setupSmoothScroll() {
    $$("#toc-list a").forEach(a => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        // Atualiza URL sem recarregar
        history.replaceState(null, "", href);
      });
    });
  }

  function setupSectionObserver() {
    const sections = $$(".guia-section[id]");
    const tocLinks = $$("#toc-list a");
    if (sections.length === 0 || tocLinks.length === 0) return;

    // Maps from id → link
    const linkById = {};
    tocLinks.forEach(a => {
      const id = (a.getAttribute("href") || "").replace(/^#/, "");
      if (id) linkById[id] = a;
    });

    const observer = new IntersectionObserver((entries) => {
      // Pega a entrada mais próxima do topo que esteja visível
      let bestId = null;
      let bestRatio = 0;
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio > bestRatio) {
          bestRatio = e.intersectionRatio;
          bestId = e.target.id;
        }
      }
      if (bestId) {
        tocLinks.forEach(a => a.classList.remove("active"));
        if (linkById[bestId]) linkById[bestId].classList.add("active");
      }
    }, {
      rootMargin: "-30% 0px -50% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });

    sections.forEach(s => observer.observe(s));
  }

  // ═════════════════════════════════════════════════════════════════════
  // BOOT
  // ═════════════════════════════════════════════════════════════════════

  // ═════════════════════════════════════════════════════════════════════
  // BARRA DE PROGRESSO DE LEITURA
  // ═════════════════════════════════════════════════════════════════════

  function setupReadingProgress() {
    const bar = $("#reading-bar");
    if (!bar) return;
    let ticking = false;
    function update() {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const max = (doc.scrollHeight - window.innerHeight) || 1;
      const pct = Math.max(0, Math.min(100, (scrollTop / max) * 100));
      bar.style.width = pct + "%";
      ticking = false;
    }
    window.addEventListener("scroll", () => {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  function boot() {
    setupDemoClassify();
    setupSmoothScroll();
    setupSectionObserver();
    setupReadingProgress();

    // Se a URL tem hash, rola suavemente após o load
    if (location.hash) {
      const t = document.querySelector(location.hash);
      if (t) setTimeout(() => t.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
