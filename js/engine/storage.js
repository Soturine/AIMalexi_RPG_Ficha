/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/engine/storage.js
   Abstração de Persistência (localStorage) — Multi-personagem
   Atribui a window.CoC.storage
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  // ─── Constantes de chave ──────────────────────────────────────────────
  const KEY_PREFIX = "aimalexi-rpg/";
  const KEY_INVESTIGATOR_LIST = KEY_PREFIX + "investigators/list";
  const KEY_KEEPER_LIBRARY    = KEY_PREFIX + "keeper/library";
  const KEY_ACTIVE = {
    investigator: KEY_PREFIX + "investigators/active",
    keeper:       KEY_PREFIX + "keeper/active"
  };
  const KEY_LAST_EXPORT = KEY_PREFIX + "lastExportAt";

  function characterKey(id) { return KEY_PREFIX + "investigators/" + id; }
  function creatureKey(id)  { return KEY_PREFIX + "keeper/creatures/" + id; }

  // ─── Helpers ──────────────────────────────────────────────────────────
  function isStorageAvailable() {
    try {
      const t = "__aimalexi_test__";
      localStorage.setItem(t, t);
      localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  function safeGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn("Storage read failed for", key, e);
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("Storage write failed for", key, e);
      return false;
    }
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  function genId() {
    // ID curto, ordenável por tempo
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 7);
    return ts + "-" + rand;
  }

  // ─── INVESTIGADORES ───────────────────────────────────────────────────

  /**
   * Salva um personagem. Se não tiver id, gera um novo.
   * @returns {string} id do personagem
   */
  function saveCharacter(character) {
    if (!character) return null;
    if (!character.id) character.id = genId();
    character.updatedAt = new Date().toISOString();
    if (!character.createdAt) character.createdAt = character.updatedAt;

    safeSet(characterKey(character.id), character);

    // Atualiza lista
    const list = safeGet(KEY_INVESTIGATOR_LIST, []);
    const idx = list.findIndex(e => e.id === character.id);
    const entry = {
      id: character.id,
      name: character.investigator?.name || "Sem Nome",
      occupation: character.investigator?.occupation || "",
      updatedAt: character.updatedAt
    };
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    safeSet(KEY_INVESTIGATOR_LIST, list);

    return character.id;
  }

  function loadCharacter(id) {
    if (!id) return null;
    return safeGet(characterKey(id));
  }

  function listCharacters() {
    return safeGet(KEY_INVESTIGATOR_LIST, []);
  }

  function deleteCharacter(id) {
    if (!id) return false;
    safeRemove(characterKey(id));
    const list = safeGet(KEY_INVESTIGATOR_LIST, []);
    const newList = list.filter(e => e.id !== id);
    safeSet(KEY_INVESTIGATOR_LIST, newList);
    // Limpa active se for o ativo
    if (safeGet(KEY_ACTIVE.investigator) === id) {
      safeRemove(KEY_ACTIVE.investigator);
    }
    return true;
  }

  function setActiveCharacter(id) {
    if (id) safeSet(KEY_ACTIVE.investigator, id);
    else safeRemove(KEY_ACTIVE.investigator);
  }

  function getActiveCharacter() {
    const id = safeGet(KEY_ACTIVE.investigator);
    return id ? loadCharacter(id) : null;
  }

  // ─── BIBLIOTECA DO MESTRE (NPCs / Criaturas) ──────────────────────────

  function saveCreature(creature) {
    if (!creature) return null;
    if (!creature.id) creature.id = genId();
    creature.updatedAt = new Date().toISOString();
    if (!creature.createdAt) creature.createdAt = creature.updatedAt;

    safeSet(creatureKey(creature.id), creature);

    const library = safeGet(KEY_KEEPER_LIBRARY, []);
    const idx = library.findIndex(e => e.id === creature.id);
    const entry = {
      id: creature.id,
      name: creature.name || "Sem Nome",
      type: creature.type || "Outro",
      hp: creature.derived?.HP || creature.HP || null,
      updatedAt: creature.updatedAt
    };
    if (idx >= 0) library[idx] = entry; else library.push(entry);
    safeSet(KEY_KEEPER_LIBRARY, library);

    return creature.id;
  }

  function loadCreature(id) { return id ? safeGet(creatureKey(id)) : null; }

  function listCreatures() { return safeGet(KEY_KEEPER_LIBRARY, []); }

  function deleteCreature(id) {
    if (!id) return false;
    safeRemove(creatureKey(id));
    const library = safeGet(KEY_KEEPER_LIBRARY, []);
    safeSet(KEY_KEEPER_LIBRARY, library.filter(e => e.id !== id));
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

  // ─── EXPORT / IMPORT JSON ─────────────────────────────────────────────

  /**
   * Exporta um objeto qualquer como arquivo JSON download.
   * @param {Object} obj
   * @param {string} filename
   */
  function exportJSON(obj, filename) {
    try {
      const json = JSON.stringify(obj, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || ("export-" + new Date().toISOString().slice(0, 10) + ".json");
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      // Registra timestamp do último export (usado pelo alerta de saída)
      safeSet(KEY_LAST_EXPORT, Date.now());
      return true;
    } catch (e) {
      console.error("Export failed", e);
      return false;
    }
  }

  /**
   * Lê arquivo .json escolhido pelo usuário via <input type="file"> e retorna parsed.
   * @param {File} file
   * @returns {Promise<Object>}
   */
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

  /**
   * Mescla biblioteca importada à biblioteca atual.
   * @param {Object} library - { creatures: [...] } ou um array direto
   * @returns {{ added: number, updated: number }}
   */
  function mergeCreatureLibrary(library) {
    const creatures = Array.isArray(library) ? library : (library?.creatures || []);
    let added = 0, updated = 0;
    for (const c of creatures) {
      if (c && c.id && loadCreature(c.id)) {
        saveCreature(c); updated++;
      } else {
        delete c.id;
        saveCreature(c); added++;
      }
    }
    return { added, updated };
  }

  // ─── TIMESTAMP DE EXPORT (para alerta de saída) ───────────────────────

  function getLastExportTimestamp() {
    return safeGet(KEY_LAST_EXPORT, 0);
  }

  function minutesSinceLastExport() {
    const ts = getLastExportTimestamp();
    if (!ts) return Infinity;
    return Math.round((Date.now() - ts) / 60000);
  }

  // ─── UTILITÁRIOS ──────────────────────────────────────────────────────

  /**
   * Limpa TUDO. Pede confirmação obrigatória via callback do caller.
   * Use com cuidado.
   */
  function nuclearReset() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
    }
    keys.forEach(safeRemove);
    return keys.length;
  }

  // ─── Expor no namespace global ─────────────────────────────────────────
  window.CoC.storage = {
    isStorageAvailable,
    saveCharacter, loadCharacter, listCharacters, deleteCharacter,
    setActiveCharacter, getActiveCharacter,
    saveCreature, loadCreature, listCreatures, deleteCreature, duplicateCreature,
    exportJSON, importJSONFromFile, mergeCreatureLibrary,
    getLastExportTimestamp, minutesSinceLastExport,
    nuclearReset,
    KEY_PREFIX
  };

})();
