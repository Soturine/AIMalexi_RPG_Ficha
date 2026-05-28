/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/engine/storage.js
   Persistência híbrida: IndexedDB com fallback automático para localStorage.

   Estratégia cache-first:
   - boot: carrega TUDO para memória (state.cache)
   - reads: síncronos, vêm do cache (zero latência)
   - writes: atualizam cache imediatamente + persistem em background
   - migração silenciosa: copia dados antigos do localStorage para IDB no
     primeiro boot quando IDB está disponível

   Atribui a window.CoC.storage. API 100% compatível com versão anterior.
   Acrescenta:
     - window.CoC.storage.ready  → Promise (resolve quando cache pronto)
     - window.CoC.storage.backend → "indexeddb" | "localstorage" | "memory"
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  // ─── Constantes ──────────────────────────────────────────────────────
  const KEY_PREFIX = "aimalexi-rpg/";

  // Versão do schema de dados persistidos. Incremente quando a estrutura mudar.
  // A função runMigrations() deve adicionar um bloco para cada salto de versão.
  //   v1 → v2: campo investigator.occupationSkills (perícias livres designadas da ocupação)
  const SAVE_SCHEMA_VERSION = 2;

  // IndexedDB
  const DB_NAME = "aimalexi-rpg";
  const DB_VERSION = 1;
  const STORE = "kv";   // store key-value simples

  // Chaves canônicas (usadas no localStorage como caminhos)
  const KEY_INVESTIGATOR_LIST = KEY_PREFIX + "investigators/list";
  const KEY_KEEPER_LIBRARY    = KEY_PREFIX + "keeper/library";
  const KEY_ACTIVE_INV        = KEY_PREFIX + "investigators/active";
  const KEY_LAST_EXPORT       = KEY_PREFIX + "lastExportAt";
  const KEY_PREFS             = KEY_PREFIX + "prefs";                // preferências de UI (efeitos, etc.)
  const KEY_GHOST             = KEY_PREFIX + "backup/lastStable";    // backup-fantasma do último personagem salvo

  function characterKey(id) { return KEY_PREFIX + "investigators/" + id; }
  function creatureKey(id)  { return KEY_PREFIX + "keeper/creatures/" + id; }

  // ─── Estado em cache ─────────────────────────────────────────────────
  const cache = {
    characters: {},      // id → character (objeto inteiro)
    creatures: {},       // id → creature
    characterList: [],   // [{id, name, occupation, updatedAt}]
    creatureList: [],    // [{id, name, type, hp, updatedAt}]
    activeCharacterId: null,
    lastExportAt: 0,
    prefs: {},           // preferências de UI (chave → valor)
    ghost: null,         // { id, char, savedAt } — último personagem salvo (backup-fantasma)
    corrupted: []        // [{ key, raw }] — entradas que falharam ao carregar (quarentena)
  };

  let backend = "memory";   // determinado em init()
  let db = null;            // IDBDatabase quando backend === "indexeddb"

  // Fila de gravações pendentes (debounced por chave)
  const pendingWrites = new Map();
  let flushTimer = null;
  const FLUSH_DELAY_MS = 150;

  // ─── Barramento de erros de persistência ─────────────────────────────
  // A engine não toca no DOM (Constituição). Em vez de mostrar toasts, ela
  // notifica handlers registrados pela camada de UI (ex.: quota excedida).
  const errorHandlers = [];
  let lastErrorAt = 0;
  function onError(cb) { if (typeof cb === "function") errorHandlers.push(cb); }
  function emitError(info) {
    lastErrorAt = Date.now();
    for (const cb of errorHandlers) {
      try { cb(info); } catch (e) { /* handler nunca pode derrubar a persistência */ }
    }
  }

  // ─── Detecção de disponibilidade ─────────────────────────────────────
  function isLocalStorageAvailable() {
    try {
      const t = "__aimalexi_test__";
      localStorage.setItem(t, t);
      localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isIndexedDBAvailable() {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  }

  // ─── IndexedDB primitives ────────────────────────────────────────────
  function openIDB() {
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const dbInst = e.target.result;
          if (!dbInst.objectStoreNames.contains(STORE)) {
            dbInst.createObjectStore(STORE);
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror   = (e) => reject(e.target.error || new Error("IDB open failed"));
        req.onblocked = ()  => reject(new Error("IDB blocked"));
      } catch (e) { reject(e); }
    });
  }

  function idbGet(key) {
    return new Promise((resolve, reject) => {
      if (!db) return resolve(null);
      try {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result === undefined ? null : req.result);
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
  }

  function idbSet(key, value) {
    return new Promise((resolve, reject) => {
      if (!db) return resolve(false);
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("IDB tx aborted"));
      } catch (e) { reject(e); }
    });
  }

  function idbDelete(key) {
    return new Promise((resolve, reject) => {
      if (!db) return resolve(false);
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      } catch (e) { reject(e); }
    });
  }

  function idbKeys() {
    return new Promise((resolve, reject) => {
      if (!db) return resolve([]);
      try {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
  }

  // ─── LocalStorage primitives ─────────────────────────────────────────
  function lsGet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch (e) {
      console.warn("LS read failed for", key, e);
      return null;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("LS write failed for", key, e);
      return false;
    }
  }

  function lsDelete(key) {
    try { localStorage.removeItem(key); return true; }
    catch (e) { return false; }
  }

  function lsKeys() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(KEY_PREFIX)) out.push(k);
      }
    } catch (e) {}
    return out;
  }

  // ─── Backend-agnostic write (cache + persistência em background) ─────
  function persistKey(key, value) {
    pendingWrites.set(key, value);
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushPending, FLUSH_DELAY_MS);
  }

  function persistDelete(key) {
    pendingWrites.set(key, undefined);   // marker for deletion
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushPending, FLUSH_DELAY_MS);
  }

  async function flushPending() {
    flushTimer = null;
    if (pendingWrites.size === 0) return;
    const writes = Array.from(pendingWrites.entries());
    pendingWrites.clear();
    for (const [key, value] of writes) {
      try {
        if (value === undefined) {
          if (backend === "indexeddb") await idbDelete(key);
          else lsDelete(key);
        } else {
          if (backend === "indexeddb") {
            await idbSet(key, value);
          } else {
            const ok = lsSet(key, value);
            if (!ok) {
              // localStorage cheio — alerta no console E notifica a UI (usuário ainda tem o JSON export)
              console.error("⚠ localStorage quota excedida! Use Exportar JSON urgentemente.");
              emitError({ type: "quota", key, backend });
            }
          }
        }
      } catch (e) {
        console.error("Persist failed for", key, e);
        emitError({ type: "write", key, backend, error: e });
      }
    }
  }

  /**
   * Força a gravação imediata das pendências (best-effort).
   * Em localStorage é síncrono e confiável; em IndexedDB dispara as transações
   * mas não há garantia de conclusão se a página for descarregada no mesmo tick.
   */
  function forceFlush() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    return flushPending();
  }

  // Em desligamento da página, força flush das pendências.
  // pagehide + visibilitychange(hidden) são MUITO mais confiáveis que beforeunload
  // em mobile (iOS suspende a aba sem disparar beforeunload), evitando perder as
  // gravações ainda na janela de debounce (FLUSH_DELAY_MS).
  if (typeof window !== "undefined") {
    const flushOnExit = () => { forceFlush(); };
    window.addEventListener("beforeunload", flushOnExit);
    window.addEventListener("pagehide", flushOnExit);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") forceFlush();
    });
  }

  // ─── Boot: detecta backend e carrega cache ───────────────────────────
  async function loadAllFromIDB() {
    const keys = await idbKeys();
    for (const key of keys) {
      if (typeof key !== "string" || !key.startsWith(KEY_PREFIX)) continue;
      const val = await idbGet(key);
      placeInCache(key, val);
    }
  }

  function loadAllFromLocalStorage() {
    const keys = lsKeys();
    for (const key of keys) placeInCache(key, lsGet(key));
  }

  function placeInCache(key, val) {
    if (val == null) return;
    // Defensivo: uma única entrada corrompida NUNCA pode derrubar o boot inteiro
    // (Constituição: "sem White Screen of Death"). Quarentena + continua.
    try {
      if (key === KEY_INVESTIGATOR_LIST) cache.characterList = Array.isArray(val) ? val : [];
      else if (key === KEY_KEEPER_LIBRARY) cache.creatureList = Array.isArray(val) ? val : [];
      else if (key === KEY_ACTIVE_INV)     cache.activeCharacterId = val;
      else if (key === KEY_LAST_EXPORT)    cache.lastExportAt = Number(val) || 0;
      else if (key === KEY_PREFS)          cache.prefs = (val && typeof val === "object") ? val : {};
      else if (key === KEY_GHOST)          cache.ghost = (val && typeof val === "object") ? val : null;
      else if (key.startsWith(KEY_PREFIX + "investigators/")) {
        const id = key.replace(KEY_PREFIX + "investigators/", "");
        if (!val || typeof val !== "object") throw new Error("entrada de personagem inválida");
        cache.characters[id] = runMigrations(val);
      }
      else if (key.startsWith(KEY_PREFIX + "keeper/creatures/")) {
        const id = key.replace(KEY_PREFIX + "keeper/creatures/", "");
        if (!val || typeof val !== "object") throw new Error("entrada de criatura inválida");
        cache.creatures[id] = runMigrations(val);
      }
    } catch (e) {
      console.error("[storage] Entrada corrompida posta em quarentena:", key, e);
      cache.corrupted.push({ key, raw: val });
      emitError({ type: "corrupted", key, error: e });
    }
  }

  /**
   * Migração silenciosa: se IDB foi escolhido como backend MAS está vazio,
   * E localStorage tem dados antigos → copia para IDB.
   */
  async function migrateFromLocalStorageIfNeeded() {
    if (backend !== "indexeddb") return;
    if (cache.characterList.length > 0 || cache.creatureList.length > 0) return;
    if (!isLocalStorageAvailable()) return;

    const lsKeysList = lsKeys();
    if (lsKeysList.length === 0) return;

    console.log("[storage] Migrando " + lsKeysList.length + " chaves do localStorage para IndexedDB...");
    for (const key of lsKeysList) {
      const val = lsGet(key);
      if (val != null) {
        await idbSet(key, val);
        placeInCache(key, val);
      }
    }
    console.log("[storage] Migração concluída. Dados antigos preservados no localStorage como backup.");
  }

  async function init() {
    if (isIndexedDBAvailable()) {
      try {
        db = await openIDB();
        backend = "indexeddb";
        await loadAllFromIDB();
        await migrateFromLocalStorageIfNeeded();
      } catch (e) {
        console.warn("[storage] IndexedDB falhou, caindo pra localStorage:", e?.message || e);
        db = null;
        backend = isLocalStorageAvailable() ? "localstorage" : "memory";
        if (backend === "localstorage") loadAllFromLocalStorage();
      }
    } else if (isLocalStorageAvailable()) {
      backend = "localstorage";
      loadAllFromLocalStorage();
    } else {
      backend = "memory";   // dados só durante a sessão atual
      console.warn("[storage] Sem IndexedDB nem localStorage — dados não persistirão entre sessões.");
    }
  }

  // ─── Schema Migrations ───────────────────────────────────────────────
  /**
   * Aplica migrações de schema em dados carregados do storage.
   * Cada bloco if migra de versão N para N+1 de forma idempotente.
   * Chame antes de usar qualquer dado lido do IDB / localStorage.
   *
   * @param {object} data - Objeto de personagem ou criatura carregado
   * @returns {object} data atualizado (mesma referência, modificado in-place)
   */
  function runMigrations(data) {
    if (!data || typeof data !== "object") return data;
    const v = data._schemaVersion || 0;

    // v0 → v1: stampa a versão (primeiro deploy com versionamento).
    // Não há mudanças estruturais — apenas garante que o campo existe.
    if (v < 1) {
      data._schemaVersion = 1;
    }

    // v1 → v2: investigadores ganham occupationSkills (perícias livres designadas
    // da ocupação). Sem ele, o pool de pontos de ocupação fica impossível de gastar
    // em ocupações com perícias livres (em especial a "Personalizada"). Idempotente.
    if (data._schemaVersion < 2) {
      if (data.investigator && !Array.isArray(data.occupationSkills)) {
        data.occupationSkills = [];
      }
      data._schemaVersion = 2;
    }

    return data;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────
  function isStorageAvailable() {
    return backend !== "memory";
  }

  function genId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  // ═════════════════════════════════════════════════════════════════════
  // API PÚBLICA — síncrona (cache-first)
  // ═════════════════════════════════════════════════════════════════════

  // ─── INVESTIGADORES ──────────────────────────────────────────────────
  function saveCharacter(character) {
    if (!character) return null;
    if (!character.id) character.id = genId();
    character.updatedAt = new Date().toISOString();
    if (!character.createdAt) character.createdAt = character.updatedAt;

    cache.characters[character.id] = character;
    const entry = {
      id: character.id,
      name: character.investigator?.name || "Sem Nome",
      occupation: character.investigator?.occupation || "",
      updatedAt: character.updatedAt
    };
    const idx = cache.characterList.findIndex(e => e.id === character.id);
    if (idx >= 0) cache.characterList[idx] = entry;
    else cache.characterList.push(entry);

    persistKey(characterKey(character.id), character);
    persistKey(KEY_INVESTIGATOR_LIST, cache.characterList);

    // Backup-fantasma: snapshot do último personagem salvo. Se o registro principal
    // corromper/sumir, recoverGhost() devolve a última versão estável conhecida.
    try {
      cache.ghost = { id: character.id, char: JSON.parse(JSON.stringify(character)), savedAt: Date.now() };
      persistKey(KEY_GHOST, cache.ghost);
    } catch (e) { /* ghost é best-effort; nunca bloqueia o save principal */ }

    return character.id;
  }

  function loadCharacter(id) {
    if (!id) return null;
    return cache.characters[id] || null;
  }

  function listCharacters() {
    return cache.characterList.slice();
  }

  function deleteCharacter(id) {
    if (!id) return false;
    delete cache.characters[id];
    cache.characterList = cache.characterList.filter(e => e.id !== id);
    persistDelete(characterKey(id));
    persistKey(KEY_INVESTIGATOR_LIST, cache.characterList);
    if (cache.activeCharacterId === id) {
      cache.activeCharacterId = null;
      persistDelete(KEY_ACTIVE_INV);
    }
    return true;
  }

  function setActiveCharacter(id) {
    if (id) {
      cache.activeCharacterId = id;
      persistKey(KEY_ACTIVE_INV, id);
    } else {
      cache.activeCharacterId = null;
      persistDelete(KEY_ACTIVE_INV);
    }
  }

  function getActiveCharacter() {
    return cache.activeCharacterId ? loadCharacter(cache.activeCharacterId) : null;
  }

  // ─── BIBLIOTECA DO MESTRE ────────────────────────────────────────────
  function saveCreature(creature) {
    if (!creature) return null;
    if (!creature.id) creature.id = genId();
    creature.updatedAt = new Date().toISOString();
    if (!creature.createdAt) creature.createdAt = creature.updatedAt;

    cache.creatures[creature.id] = creature;
    const entry = {
      id: creature.id,
      name: creature.name || "Sem Nome",
      type: creature.type || "Outro",
      hp: creature.derived?.hp || creature.HP || null,
      updatedAt: creature.updatedAt
    };
    const idx = cache.creatureList.findIndex(e => e.id === creature.id);
    if (idx >= 0) cache.creatureList[idx] = entry;
    else cache.creatureList.push(entry);

    persistKey(creatureKey(creature.id), creature);
    persistKey(KEY_KEEPER_LIBRARY, cache.creatureList);
    return creature.id;
  }

  function loadCreature(id) {
    return id ? (cache.creatures[id] || null) : null;
  }

  function listCreatures() {
    return cache.creatureList.slice();
  }

  function deleteCreature(id) {
    if (!id) return false;
    delete cache.creatures[id];
    cache.creatureList = cache.creatureList.filter(e => e.id !== id);
    persistDelete(creatureKey(id));
    persistKey(KEY_KEEPER_LIBRARY, cache.creatureList);
    return true;
  }

  function duplicateCreature(id) {
    const orig = loadCreature(id);
    if (!orig) return null;
    const copy = JSON.parse(JSON.stringify(orig));
    delete copy.id;
    copy.name = (copy.name || "Sem Nome") + " (cópia)";
    return saveCreature(copy);
  }

  // ─── EXPORT / IMPORT JSON ────────────────────────────────────────────
  /**
   * Exporta um objeto como download JSON.
   * Sempre envelopa em um root com metadados de schema para permitir
   * migração automática em imports futuros.
   *
   * Formato do arquivo exportado:
   *   {
   *     "_format":        "aimalexi-rpg",
   *     "_schemaVersion": 1,
   *     "_exportedAt":    "ISO string",
   *     ...obj            (chaves do objeto original no root, sem nesting extra)
   *   }
   *
   * Se o obj já tiver "_format", não duplica (suporte a re-export de imports antigos).
   */
  function exportJSON(obj, filename) {
    try {
      const envelope = obj && obj._format === "aimalexi-rpg"
        ? obj
        : {
            _format:        "aimalexi-rpg",
            _schemaVersion: SAVE_SCHEMA_VERSION,
            _exportedAt:    new Date().toISOString(),
            ...obj
          };
      const json = JSON.stringify(envelope, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || ("export-" + new Date().toISOString().slice(0, 10) + ".json");
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      cache.lastExportAt = Date.now();
      persistKey(KEY_LAST_EXPORT, cache.lastExportAt);
      return true;
    } catch (e) {
      console.error("Export failed", e);
      return false;
    }
  }

  function importJSONFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("Nenhum arquivo fornecido"));
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          resolve(parsed);
        } catch (err) {
          reject(new Error("JSON inválido: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsText(file);
    });
  }

  function mergeCreatureLibrary(library) {
    const creatures = Array.isArray(library) ? library : (library?.creatures || []);
    let added = 0, updated = 0;
    for (const c of creatures) {
      if (!c) continue;
      runMigrations(c);
      if (c.id && loadCreature(c.id)) { saveCreature(c); updated++; }
      else { delete c.id; saveCreature(c); added++; }
    }
    return { added, updated };
  }

  // ─── TIMESTAMP DE EXPORT ─────────────────────────────────────────────
  function getLastExportTimestamp() { return cache.lastExportAt || 0; }

  function minutesSinceLastExport() {
    if (!cache.lastExportAt) return Infinity;
    return Math.round((Date.now() - cache.lastExportAt) / 60000);
  }

  // ─── PREFERÊNCIAS DE UI ──────────────────────────────────────────────
  // Preferências globais (não atreladas a um personagem): modo dos efeitos de
  // sanidade, etc. Persistidas via o mesmo backend resiliente (IDB/LS/memória).
  function getPref(key, fallback = null) {
    if (!key) return fallback;
    return Object.prototype.hasOwnProperty.call(cache.prefs, key) ? cache.prefs[key] : fallback;
  }

  function setPref(key, value) {
    if (!key) return false;
    cache.prefs[key] = value;
    persistKey(KEY_PREFS, cache.prefs);
    return true;
  }

  // ─── RECUPERAÇÃO / RESILIÊNCIA ───────────────────────────────────────
  /** Backup-fantasma do último personagem salvo (clone), ou null. */
  function getGhost() {
    if (!cache.ghost || !cache.ghost.char) return null;
    try { return JSON.parse(JSON.stringify(cache.ghost.char)); } catch (e) { return null; }
  }

  /**
   * Restaura o backup-fantasma como personagem ativo, regravando-o.
   * @param {string} [id] - se informado, só restaura se o ghost for desse id.
   * @returns {object|null} clone do personagem restaurado, ou null.
   */
  function recoverGhost(id) {
    if (!cache.ghost || !cache.ghost.char) return null;
    if (id && cache.ghost.id !== id) return null;
    const clone = getGhost();
    if (!clone) return null;
    saveCharacter(clone);
    return clone;
  }

  /** Entradas que falharam ao carregar (corrompidas, em quarentena). */
  function getCorruptedEntries() { return cache.corrupted.slice(); }

  // ─── UTILITÁRIOS ─────────────────────────────────────────────────────
  function nuclearReset() {
    const charKeys = Object.keys(cache.characters).map(characterKey);
    const creatKeys = Object.keys(cache.creatures).map(creatureKey);
    const allKeys = [...charKeys, ...creatKeys, KEY_INVESTIGATOR_LIST, KEY_KEEPER_LIBRARY, KEY_ACTIVE_INV, KEY_LAST_EXPORT];

    // Limpa cache
    cache.characters = {};
    cache.creatures = {};
    cache.characterList = [];
    cache.creatureList = [];
    cache.activeCharacterId = null;
    cache.lastExportAt = 0;

    // Persiste limpeza
    for (const k of allKeys) persistDelete(k);
    return allKeys.length;
  }

  // ─── Inicialização ────────────────────────────────────────────────────
  const ready = init();

  // ═════════════════════════════════════════════════════════════════════
  // EXPOR
  // ═════════════════════════════════════════════════════════════════════
  window.CoC.storage = {
    isStorageAvailable,
    saveCharacter, loadCharacter, listCharacters, deleteCharacter,
    setActiveCharacter, getActiveCharacter,
    saveCreature, loadCreature, listCreatures, deleteCreature, duplicateCreature,
    exportJSON, importJSONFromFile, mergeCreatureLibrary,
    getLastExportTimestamp, minutesSinceLastExport,
    nuclearReset,
    runMigrations,
    KEY_PREFIX,
    SAVE_SCHEMA_VERSION,
    // Novos:
    ready,                         // Promise<void> — resolve quando cache carregado
    get backend() { return backend; },
    // Preferências de UI:
    getPref, setPref,
    // Resiliência / recuperação:
    forceFlush, onError, getGhost, recoverGhost, getCorruptedEntries,
    get lastErrorAt() { return lastErrorAt; }
  };

})();
