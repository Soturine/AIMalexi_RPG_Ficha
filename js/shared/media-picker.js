/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/shared/media-picker.js
   Seletor de imagem compartilhado (Fase 6) — usado pela ficha e pelo keeper.

   Fontes: upload local, URL externa (aviso offline), biblioteca de templates.
   Armazena SEMPRE como data URI base64 (clone-safe: sobrevive JSON.stringify,
   export/import e o fallback localStorage). Upload/URL passam por downscale
   via canvas para manter os saves leves.

   Atribui a window.CoC.mediaPicker.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  const { el, modal, toast } = window.CoC.ui;

  /**
   * Converte File/Blob em data URI, redimensionando se exceder maxDim.
   * Re-encoda JPEG 0.85.
   */
  function fileToDataUri(file, maxDim) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let w = img.naturalWidth, h = img.naturalHeight;
          if (maxDim && Math.max(w, h) > maxDim) {
            const s = maxDim / Math.max(w, h);
            w = Math.round(w * s); h = Math.round(h * s);
          }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          try { resolve(canvas.toDataURL("image/jpeg", 0.85)); }
          catch (e) { reject(e); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function urlToDataUri(url, maxDim) {
    return fetch(url, { mode: "cors" })
      .then(resp => { if (!resp.ok) throw new Error("HTTP " + resp.status); return resp.blob(); })
      .then(blob => fileToDataUri(blob, maxDim));
  }

  /**
   * Resolve um objeto media em uma src utilizável (data URI, URL, ou template).
   * @param media  { kind: "data"|"url"|"template", uri?|url?|id? }
   * @param templatesKey  "banners" | "portraits"
   */
  function resolveSrc(media, templatesKey) {
    if (!media) return null;
    if (media.kind === "data" && media.uri) return media.uri;
    if (media.kind === "url" && media.url) return media.url;
    if (media.kind === "template" && media.id) {
      const list = window.CoCData?.imageTemplates?.[templatesKey] || [];
      const tpl = list.find(t => t.id === media.id);
      if (!tpl) return null;
      if (tpl.svg) return "data:image/svg+xml;utf8," + encodeURIComponent(tpl.svg);
      return tpl.path || null;
    }
    return null;
  }

  /**
   * Abre o modal de escolha de imagem.
   * @param opts.title         título do modal
   * @param opts.current       objeto media atual (ou null)
   * @param opts.templatesKey  "banners" | "portraits"
   * @param opts.maxDim        dimensão máxima para downscale (px)
   * @param opts.onPick        callback(mediaObj | null) — chamado ao escolher/remover
   */
  function open(opts) {
    const { title, current, templatesKey, maxDim = 1200, onPick } = opts || {};
    const pick = (media) => { if (typeof onPick === "function") onPick(media); };

    const root = el("div", { class: "img-picker" });
    const tabs = el("div", { class: "img-picker-tabs" });
    const content = el("div", { class: "img-picker-content" });

    let m = null;
    const closePicker = () => { if (m) m.close(); };

    let activeTab = "upload";
    const setTab = (id) => {
      activeTab = id;
      tabs.querySelectorAll(".img-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === id));
      content.innerHTML = "";
      content.appendChild(renderTab(id));
    };

    [
      { id: "upload",   label: "📁 Upload" },
      { id: "url",      label: "🔗 URL" },
      { id: "template", label: "🖼️ Biblioteca" },
      { id: "remove",   label: "🗑️ Remover" }
    ].forEach(t => {
      const btn = el("button", { class: "img-tab" + (activeTab === t.id ? " active" : ""), on: { click: () => setTab(t.id) } });
      btn.dataset.tab = t.id;
      btn.textContent = t.label;
      tabs.appendChild(btn);
    });

    function renderTab(id) {
      if (id === "upload")   return uploadTab();
      if (id === "url")      return urlTab();
      if (id === "template") return templateTab();
      if (id === "remove")   return removeTab();
      return el("div");
    }

    function uploadTab() {
      const wrap = el("div");
      wrap.appendChild(el("p", { class: "img-picker-hint" },
        ["Aceita JPG, PNG, WebP. Máx 5 MB. A imagem é otimizada e salva localmente (funciona offline)."]));
      wrap.appendChild(el("input", {
        type: "file",
        accept: "image/jpeg,image/png,image/webp",
        on: { change: (e) => handleFile(e.target.files?.[0]) }
      }));
      return wrap;
    }

    function urlTab() {
      const wrap = el("div");
      wrap.appendChild(el("p", { class: "img-picker-hint" }, [
        navigator.onLine
          ? "Cola uma URL pública. Recomendado “Baixar e cachear” para funcionar offline depois."
          : "⚠ Você está OFFLINE. URLs externas não carregam agora. Use Upload ou Biblioteca."
      ]));
      const input = el("input", { type: "url", placeholder: "https://exemplo.com/imagem.jpg", style: { width: "100%", marginBottom: "0.5rem" } });
      wrap.appendChild(input);
      const row = el("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap" } });
      row.appendChild(el("button", {
        class: "btn",
        on: { click: () => {
          const url = input.value.trim();
          if (!/^https?:\/\//i.test(url)) return toast("URL inválida", { type: "error" });
          pick({ kind: "url", url });
          closePicker();
          toast("URL definida. Requer estar online e o link existir.", { type: "info" });
        }}
      }, ["Usar URL direta"]));
      row.appendChild(el("button", {
        class: "btn",
        disabled: !navigator.onLine,
        title: navigator.onLine ? "Baixa e salva localmente (offline depois)" : "Indisponível offline",
        on: { click: () => {
          const url = input.value.trim();
          if (!/^https?:\/\//i.test(url)) return toast("URL inválida", { type: "error" });
          urlToDataUri(url, maxDim)
            .then(uri => { pick({ kind: "data", uri }); closePicker(); toast("✓ Imagem baixada e cacheada", { type: "success" }); })
            .catch(err => toast("Falha ao baixar (CORS?): " + err.message, { type: "error" }));
        }}
      }, ["⬇ Baixar e cachear"]));
      wrap.appendChild(row);
      return wrap;
    }

    function templateTab() {
      const wrap = el("div");
      const templates = window.CoCData?.imageTemplates?.[templatesKey] || [];
      if (!templates.length) {
        wrap.appendChild(el("p", { class: "img-picker-hint" }, ["Nenhum template disponível."]));
        return wrap;
      }
      wrap.appendChild(el("p", { class: "img-picker-hint" },
        [`${templates.length} templates curados (SVGs ornamentais + fotos de domínio público).`]));
      const grid = el("div", { class: "template-grid" });
      templates.forEach(t => {
        const card = el("button", {
          class: "template-card",
          title: t.name + (t.credit ? ` · ${t.credit}` : ""),
          on: { click: () => { pick({ kind: "template", id: t.id }); closePicker(); toast(`Template "${t.name}" aplicado`, { type: "success" }); } }
        });
        const thumb = el("div", { class: "template-thumb" });
        if (t.svg) thumb.innerHTML = t.svg;
        else if (t.path) thumb.style.backgroundImage = `url("${t.path}")`;
        card.appendChild(thumb);
        card.appendChild(el("span", { class: "template-name" }, [t.name]));
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
      return wrap;
    }

    function removeTab() {
      const wrap = el("div");
      wrap.appendChild(el("p", { class: "img-picker-hint" },
        [current ? "Remove a imagem atual e volta ao placeholder." : "Nenhuma imagem definida ainda."]));
      wrap.appendChild(el("button", {
        class: "btn-danger",
        disabled: !current,
        on: { click: () => { pick(null); closePicker(); toast("Imagem removida", { type: "info" }); } }
      }, ["🗑️ Confirmar remoção"]));
      return wrap;
    }

    function handleFile(file) {
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast("Formato inválido. Use JPG, PNG ou WebP.", { type: "error" });
      if (file.size > 5 * 1024 * 1024) return toast("Imagem maior que 5 MB", { type: "error" });
      fileToDataUri(file, maxDim)
        .then(uri => { pick({ kind: "data", uri }); closePicker(); toast("✓ Imagem salva localmente (otimizada)", { type: "success" }); })
        .catch(() => toast("Falha ao processar a imagem", { type: "error" }));
    }

    root.appendChild(tabs);
    root.appendChild(content);
    setTab("upload");

    m = modal({ title: title || "Imagem", body: root });
  }

  window.CoC.mediaPicker = { open, resolveSrc, fileToDataUri, urlToDataUri };

})();
