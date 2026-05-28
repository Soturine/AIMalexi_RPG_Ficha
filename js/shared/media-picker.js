/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/shared/media-picker.js
   Seleção e exibição de imagens (banner + retrato do investigador).

   Pipeline obrigatória (persistir ANTES de renderizar):
     input[type=file] → guarda 2MB → resize canvas → Blob → saveBlob(IDB)
                      → blobId → ObjectURL → render

   Princípios:
   - Imagem grande NUNCA entra crua: limite HARD de 2MB no arquivo bruto.
   - Resize client-side (canvas) p/ ~maxDim, WebP com fallback JPEG.
   - Fallback Safari: se o canvas falhar, usa o arquivo original (já ≤2MB).
   - ObjectURL registry com revoke obrigatório → sem memory leak.
   - render() aceita blobId (upload) OU data-URI (template) pelo mesmo caminho.

   Atribui a window.CoC.mediaPicker — sem dependências de rede.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  const store = window.CoC.storage;
  const toast = (window.CoC.ui && window.CoC.ui.toast) ? window.CoC.ui.toast : function () {};

  const MAX_RAW_BYTES = 2 * 1024 * 1024;   // 2MB no arquivo bruto (antes do resize)

  // ─── ObjectURL registry (anti-leak) ──────────────────────────────────
  // urlByEl: a URL viva de CADA elemento (revogada ao trocar/limpar).
  // activeUrls: todas as URLs vivas (revogadas em releaseAll / pagehide).
  const urlByEl = new WeakMap();
  const activeUrls = new Set();

  function releaseEl(elm) {
    const prev = urlByEl.get(elm);
    if (prev) {
      try { URL.revokeObjectURL(prev); } catch (e) {}
      activeUrls.delete(prev);
      urlByEl.delete(elm);
    }
  }

  function releaseAll() {
    for (const u of activeUrls) { try { URL.revokeObjectURL(u); } catch (e) {} }
    activeUrls.clear();
  }

  if (typeof window !== "undefined") {
    // Segurança extra: ao sair/suspender a página, revoga tudo.
    window.addEventListener("pagehide", releaseAll);
  }

  // ─── Seleção de arquivo ───────────────────────────────────────────────
  function chooseFile() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.position = "fixed";
      input.style.left = "-9999px";
      input.addEventListener("change", () => {
        const f = (input.files && input.files[0]) ? input.files[0] : null;
        input.remove();
        resolve(f);
      });
      // append garante o disparo do seletor em mobile (Safari/iOS)
      document.body.appendChild(input);
      input.click();
    });
  }

  // ─── Carregar bitmap (createImageBitmap com fallback p/ <img>) ────────
  function loadViaImg(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { img._srcUrl = url; resolve(img); };
      img.onerror = () => { try { URL.revokeObjectURL(url); } catch (e) {} reject(new Error("falha ao carregar imagem")); };
      img.src = url;
    });
  }

  function loadBitmap(file) {
    if (self.createImageBitmap) {
      return createImageBitmap(file).catch(() => loadViaImg(file));
    }
    return loadViaImg(file);
  }

  function scaleDims(w, h, maxDim) {
    if (!w || !h) return { width: maxDim, height: maxDim };
    if (w <= maxDim && h <= maxDim) return { width: w, height: h };
    const r = w >= h ? maxDim / w : maxDim / h;
    return { width: Math.max(1, Math.round(w * r)), height: Math.max(1, Math.round(h * r)) };
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve) => {
      if (!canvas.toBlob) return resolve(null);
      try { canvas.toBlob((b) => resolve(b), mime, quality); }
      catch (e) { resolve(null); }
    });
  }

  async function resizeToBlob(file, maxDim, quality) {
    const bmp = await loadBitmap(file);
    const w = bmp.width || bmp.naturalWidth;
    const h = bmp.height || bmp.naturalHeight;
    const dims = scaleDims(w, h, maxDim);

    const canvas = document.createElement("canvas");
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      if (bmp._srcUrl) { try { URL.revokeObjectURL(bmp._srcUrl); } catch (e) {} }
      throw new Error("sem contexto 2d");
    }
    ctx.drawImage(bmp, 0, 0, dims.width, dims.height);
    if (bmp.close) bmp.close();
    if (bmp._srcUrl) { try { URL.revokeObjectURL(bmp._srcUrl); } catch (e) {} }

    // Tenta WebP; se o navegador não codificar (Safari antigo), cai p/ JPEG.
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    if (!blob) throw new Error("toBlob indisponível");
    return blob;
  }

  // ═════════════════════════════════════════════════════════════════════
  // API
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Abre o seletor, processa e PERSISTE a imagem. Retorna o blobId salvo
   * (string) ou null se cancelado/inválido. Render é responsabilidade do caller.
   *
   * @param {Object} [opts]
   * @param {number} [opts.maxDim=768]  - maior dimensão após resize
   * @param {number} [opts.quality=0.8] - qualidade de compressão (0..1)
   * @returns {Promise<string|null>}
   */
  async function pick(opts = {}) {
    const { maxDim = 768, quality = 0.8 } = opts;
    if (!store || !store.saveBlob) {
      toast("Armazenamento indisponível para imagens.", { type: "error" });
      return null;
    }
    const file = await chooseFile();
    if (!file) return null;
    if (!/^image\//.test(file.type || "")) {
      toast("Selecione um arquivo de imagem.", { type: "warn" });
      return null;
    }
    if (file.size > MAX_RAW_BYTES) {
      toast("Imagem muito grande (máx. 2MB). Escolha uma menor.", { type: "warn", duration: 5000 });
      return null;
    }

    let blob;
    try {
      blob = await resizeToBlob(file, maxDim, quality);
    } catch (e) {
      // Fallback (Safari mobile etc.): o arquivo original já está ≤2MB.
      console.warn("[media-picker] resize falhou, usando original:", e && e.message ? e.message : e);
      blob = file;
    }

    try {
      const id = await store.saveBlob(null, blob);   // persiste ANTES de renderizar
      return id || null;
    } catch (e) {
      toast("Não foi possível salvar a imagem.", { type: "error" });
      return null;
    }
  }

  /**
   * Renderiza uma imagem num elemento (background-image cover).
   * Aceita um blobId (upload, lazy via storage.getBlob) OU um data-URI (template).
   * Gerencia o ObjectURL registry: revoga o anterior do elemento antes de criar novo.
   *
   * @param {HTMLElement} targetEl
   * @param {string|null} ref - blobId, data:URI, ou null/"" para limpar
   * @returns {Promise<void>}
   */
  async function render(targetEl, ref) {
    if (!targetEl) return;
    releaseEl(targetEl);   // revoga a URL anterior deste elemento

    const clear = () => {
      targetEl.style.backgroundImage = "";
      targetEl.classList.remove("has-image");
    };

    if (!ref) return clear();

    // Template (data-URI) ou URL absoluta: aplica direto, sem ObjectURL.
    if (typeof ref === "string" && (ref.startsWith("data:") || ref.startsWith("http"))) {
      targetEl.style.backgroundImage = `url("${ref}")`;
      targetEl.classList.add("has-image");
      return;
    }

    // Caso contrário, é um blobId: busca no storage (lazy).
    if (!store || !store.getBlob) return clear();
    const blob = await store.getBlob(ref);
    if (!(blob instanceof Blob)) return clear();

    const url = URL.createObjectURL(blob);
    urlByEl.set(targetEl, url);
    activeUrls.add(url);
    targetEl.style.backgroundImage = `url("${url}")`;
    targetEl.classList.add("has-image");
  }

  window.CoC.mediaPicker = {
    pick,
    render,
    clear: releaseEl,
    releaseAll,
    MAX_RAW_BYTES
  };

})();
