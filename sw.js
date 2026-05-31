/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · sw.js
   Service Worker — Cache-First para funcionamento 100% offline.

   Estratégia:
   - Na instalação: pré-cacheia todos os assets estáticos (shell do app).
   - Em fetch: serve do cache primeiro; só vai à rede se não houver hit.
   - Em atualização: novo SW aguarda até todas as abas serem fechadas
     antes de assumir (skipWaiting desabilitado intencionalmente para
     evitar que uma aba com dados em memória seja interrompida no meio
     de uma sessão de jogo).

   Para forçar atualização imediata: incremente CACHE_VERSION abaixo.
   ═══════════════════════════════════════════════════════════════════════════ */

const CACHE_VERSION = "v9";
const CACHE_NAME = "aimalexi-rpg-" + CACHE_VERSION;

// Assets que devem estar disponíveis offline imediatamente após instalação.
// Caminhos relativos à raiz do escopo do SW.
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./investigator.html",
  "./keeper.html",
  "./guia-iniciante.html",
  "./css/theme.css",
  "./css/investigator.css",
  "./css/keeper.css",
  "./css/guia.css",
  "./js/shared/ui-components.js",
  "./js/shared/validators.js",
  "./js/shared/sanity-fx.js",
  "./js/shared/media-picker.js",
  "./js/engine/storage.js",
  "./js/engine/dice.js",
  "./js/engine/coc7e-rules.js",
  "./js/engine/name-generator.js",
  "./js/core/actions.js",
  "./js/core/signals.js",
  "./js/core/bus.js",
  "./js/core/store.js",
  "./js/core/event-log.js",
  "./js/dev/trace.js",
  "./js/dev/perf.js",
  "./js/views/vitals.js",
  "./js/views/luck.js",
  "./js/views/skills.js",
  "./js/views/rolls.js",
  "./js/views/inventory.js",
  "./js/views/journal.js",
  "./js/views/spells.js",
  "./js/views/tomes.js",
  "./js/investigator.js",
  "./js/keeper.js",
  "./js/guia.js",
  "./data/skills.js",
  "./data/occupations.js",
  "./data/damage-bonus-table.js",
  "./data/weapons-templates.js",
  "./data/name-pools.js",
  "./data/image-templates.js",
  "./data/bestiary.js",
  "./data/npc-archetypes.js",
  "./data/presets/empty.js",
  "./data/presets/klein-moretti.js",
];

// ─── Instalação: pré-cacheia o shell ────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll falha atomicamente se qualquer URL falhar.
      // Em dev local (file://) algumas URLs podem retornar 0 — ignora individualmente.
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[SW] Pré-cache falhou para", url, err);
          })
        )
      );
    })
  );
});

// ─── Ativação: limpa caches de versões anteriores ───────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("aimalexi-rpg-") && k !== CACHE_NAME)
          .map((k) => {
            console.log("[SW] Removendo cache antigo:", k);
            return caches.delete(k);
          })
      )
    )
  );
});

// ─── Fetch: cache-first ──────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Ignora requisições não-GET e cross-origin (ex: analytics, CDNs externos).
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Cache miss: vai à rede e armazena o resultado para próxima vez.
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
          return response;
        })
        .catch(() => {
          // Rede indisponível e sem cache — retorna página offline genérica se existir.
          if (event.request.destination === "document") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
