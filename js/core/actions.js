/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/actions.js
   CATÁLOGO DE INTENTS — o vocabulário de domínio do CoC 7e.

   M0.6: definido ANTES de qualquer reducer/store. "Arquitetura boa nasce do
   domínio, não da tecnologia." Se o catálogo nasce errado, reducers, logs, sync
   e dashboard nascem errados.

   REGRA: actions representam INTENÇÃO DE DOMÍNIO, nunca evento visual.
     ✅ APPLY_DAMAGE, LOSE_SANITY, SPEND_LUCK, PUSH_ROLL
     ❌ BUTTON_CLICK, INPUT_CHANGED

   Aqui há SÓ vocabulário + fábricas (action creators) + classificação de
   "sagrado". SEM reducers (entram no M1, depois do domínio mapeado).

   Atribui a window.CoC.actions — dados puros, sem efeitos colaterais.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  const TYPES = Object.freeze({
    // ── Personagem (carga/meta) ──────────────────────────────────────────
    SET_CHARACTER:   "SET_CHARACTER",
    SET_CHARACTER_ID:"SET_CHARACTER_ID",

    // ── Vitais ──────────────────────────────────────────────────────────
    APPLY_DAMAGE:    "APPLY_DAMAGE",
    HEAL_DAMAGE:     "HEAL_DAMAGE",
    LOSE_SANITY:     "LOSE_SANITY",
    RECOVER_SANITY:  "RECOVER_SANITY",
    SPEND_MAGIC:     "SPEND_MAGIC",
    RESTORE_MAGIC:   "RESTORE_MAGIC",
    SPEND_LUCK:      "SPEND_LUCK",

    // ── Rolagens ────────────────────────────────────────────────────────
    ROLL_SKILL:      "ROLL_SKILL",
    ROLL_ATTRIBUTE:  "ROLL_ATTRIBUTE",
    ROLL_DAMAGE:     "ROLL_DAMAGE",
    PUSH_ROLL:       "PUSH_ROLL",
    REGISTER_FUMBLE: "REGISTER_FUMBLE",

    // ── Combate / estados narrativos ─────────────────────────────────────
    RESOLVE_COMBAT:  "RESOLVE_COMBAT",
    ADD_STATUS:      "ADD_STATUS",
    REMOVE_STATUS:   "REMOVE_STATUS",

    // ── Ficha (edição do próprio investigador) ───────────────────────────
    SET_ATTRIBUTE:             "SET_ATTRIBUTE",
    SET_SKILL:                 "SET_SKILL",
    TOGGLE_OCCUPATION_SKILL:   "TOGGLE_OCCUPATION_SKILL",
    ADD_CUSTOM_SKILL:          "ADD_CUSTOM_SKILL",
    // Evolução de perícias (CoC 7e p.44)
    MARK_SKILL_IMPROVEMENT:    "MARK_SKILL_IMPROVEMENT",   // marca para evolução no fim da sessão
    SKILL_IMPROVED:            "SKILL_IMPROVED",           // aplica ganho após rolagem de melhoria
    SET_IDENTITY:           "SET_IDENTITY",
    SET_IMAGE:              "SET_IMAGE",
    EQUIP_WEAPON:           "EQUIP_WEAPON",
    ADD_ITEM:               "ADD_ITEM",
    REMOVE_ITEM:            "REMOVE_ITEM",

    // ── Journal (M4.2) ──────────────────────────────────────────────────
    ADD_JOURNAL_ENTRY:    "ADD_JOURNAL_ENTRY",
    UPDATE_JOURNAL_ENTRY: "UPDATE_JOURNAL_ENTRY",
    REMOVE_JOURNAL_ENTRY: "REMOVE_JOURNAL_ENTRY",

    // ── Magias (M4.3) ────────────────────────────────────────────────────
    ADD_SPELL:    "ADD_SPELL",
    UPDATE_SPELL: "UPDATE_SPELL",
    REMOVE_SPELL: "REMOVE_SPELL",

    // ── Grimórios (M4.4) ─────────────────────────────────────────────────
    // Sem vínculo obrigatório com spells[]. spellIds[] é extensão futura (M4.5).
    ADD_TOME:    "ADD_TOME",
    UPDATE_TOME: "UPDATE_TOME",
    REMOVE_TOME: "REMOVE_TOME",
    // INVARIANTE: character.inventory[] e character.weapons[] são domínios distintos.
    // weapons[] = recursos mecânicos de combate. inventory[] = posses narrativas.
    // Não existe sincronização entre os arrays — a duplicação é intencional.
    ADD_INVENTORY_ITEM:    "ADD_INVENTORY_ITEM",
    UPDATE_INVENTORY_ITEM: "UPDATE_INVENTORY_ITEM",
    REMOVE_INVENTORY_ITEM: "REMOVE_INVENTORY_ITEM",
  });

  // Campos SAGRADOS (Constituição §8): no multiplayer o jogador NÃO aplica
  // direto — envia uma intent e o Mestre (host autoritativo) valida e grava.
  // No modo solo/local, são aplicados normalmente. Esta lista guia o futuro
  // syncMiddleware/permissões (M5/M6), não impõe nada agora.
  const SACRED = Object.freeze(new Set([
    TYPES.APPLY_DAMAGE, TYPES.HEAL_DAMAGE,
    TYPES.LOSE_SANITY,  TYPES.RECOVER_SANITY,
    TYPES.SPEND_MAGIC,  TYPES.RESTORE_MAGIC,
    TYPES.RESOLVE_COMBAT, TYPES.ADD_STATUS, TYPES.REMOVE_STATUS
  ]));

  // Toda action: { type, payload, ts }. (actorId/targetId entram no M5.)
  function make(type, payload = {}) {
    return { type, payload, ts: Date.now() };
  }

  const creators = {
    // Personagem
    setCharacter:    (character)                   => make(TYPES.SET_CHARACTER,    character),
    setCharacterId:  (id)                          => make(TYPES.SET_CHARACTER_ID, id),

    // Vitais
    applyDamage:    (amount, source = null)        => make(TYPES.APPLY_DAMAGE,    { amount, source }),
    healDamage:     (amount)                       => make(TYPES.HEAL_DAMAGE,     { amount }),
    loseSanity:     (amount, reason = null)        => make(TYPES.LOSE_SANITY,     { amount, reason }),
    recoverSanity:  (amount, reason = null)        => make(TYPES.RECOVER_SANITY,  { amount, reason }),
    spendMagic:     (amount)                       => make(TYPES.SPEND_MAGIC,     { amount }),
    restoreMagic:   (amount)                       => make(TYPES.RESTORE_MAGIC,   { amount }),
    spendLuck:      (amount, rollId = null)        => make(TYPES.SPEND_LUCK,      { amount, rollId }),

    // Rolagens
    rollSkill:      (skill, opts = {})             => make(TYPES.ROLL_SKILL,      Object.assign({ skill }, opts)),
    rollAttribute:  (attr, difficulty = "regular") => make(TYPES.ROLL_ATTRIBUTE,  { attr, difficulty }),
    rollDamage:     (notation, opts = {})          => make(TYPES.ROLL_DAMAGE,     Object.assign({ notation }, opts)),
    pushRoll:       (rollId)                        => make(TYPES.PUSH_ROLL,       { rollId }),
    registerFumble: (rollId, effect = null)        => make(TYPES.REGISTER_FUMBLE, { rollId, effect }),

    // Combate / estados
    resolveCombat:  (payload = {})                 => make(TYPES.RESOLVE_COMBAT,  payload),
    addStatus:      (status, meta = {})            => make(TYPES.ADD_STATUS,      Object.assign({ status }, meta)),
    removeStatus:   (status)                        => make(TYPES.REMOVE_STATUS,   { status }),

    // Ficha
    setAttribute:          (code, value)                     => make(TYPES.SET_ATTRIBUTE,          { code, value }),
    setSkill:              (name, value)                     => make(TYPES.SET_SKILL,              { name, value }),
    toggleOccupationSkill: (skillName)                       => make(TYPES.TOGGLE_OCCUPATION_SKILL, { skillName }),
    addCustomSkill:        (skillName, value, isOccupation)  => make(TYPES.ADD_CUSTOM_SKILL,        { skillName, value, isOccupation: !!isOccupation }),
    setIdentity:           (field, value)                    => make(TYPES.SET_IDENTITY,            { field, value }),
    setImage:       (slot, ref)                    => make(TYPES.SET_IMAGE,       { slot, ref }), // slot: "banner" | "portrait"
    equipWeapon:    (weaponId, equipped = true)    => make(TYPES.EQUIP_WEAPON,    { weaponId, equipped }),
    addItem:        (item)                         => make(TYPES.ADD_ITEM,        { item }),
    removeItem:     (itemId)                         => make(TYPES.REMOVE_ITEM,     { itemId }),

    // Inventário (M4.1)
    addInventoryItem:    (item) => make(TYPES.ADD_INVENTORY_ITEM,    { item }),
    updateInventoryItem: (item) => make(TYPES.UPDATE_INVENTORY_ITEM, { item }),
    removeInventoryItem: (id)   => make(TYPES.REMOVE_INVENTORY_ITEM, { id }),

    // Journal (M4.2)
    addJournalEntry:    (entry) => make(TYPES.ADD_JOURNAL_ENTRY,    { entry }),
    updateJournalEntry: (entry) => make(TYPES.UPDATE_JOURNAL_ENTRY, { entry }),
    removeJournalEntry: (id)    => make(TYPES.REMOVE_JOURNAL_ENTRY, { id }),

    // Magias (M4.3)
    addSpell:    (spell) => make(TYPES.ADD_SPELL,    { spell }),
    updateSpell: (spell) => make(TYPES.UPDATE_SPELL, { spell }),
    removeSpell: (id)    => make(TYPES.REMOVE_SPELL, { id }),

    // Grimórios (M4.4)
    addTome:    (tome) => make(TYPES.ADD_TOME,    { tome }),
    updateTome: (tome) => make(TYPES.UPDATE_TOME, { tome }),
    removeTome: (id)   => make(TYPES.REMOVE_TOME, { id }),
  };

  function isSacred(action) {
    const t = typeof action === "string" ? action : (action && action.type);
    return SACRED.has(t);
  }

  window.CoC.actions = Object.freeze(Object.assign({ TYPES, SACRED, make, isSacred }, creators));

})();
