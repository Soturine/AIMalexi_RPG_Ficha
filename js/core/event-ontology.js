/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/event-ontology.js
   Ontologia canônica de eventos de domínio — CoC 7e / Sprint 7

   Fonte única de verdade para:
   1. O espaço completo de ações (implementadas + planejadas + lacunas)
   2. O RENDER_MAP do render-pipeline (derivado daqui, não mantido à parte)
   3. Classificação SACRED (autorização multiplayer — M5)
   4. Gap analysis de domínio (quais ações ainda não têm reducer)

   Campos por entrada:
     aggregate : 'character' | 'session' | 'encounter' | 'campaign'
     domain    : agrupamento de domínio CoC 7e (vitals, skills, combat, ...)
     renders   : 'ALL' | string[] | null
                 'ALL'      = carga completa (SET_CHARACTER via pipeline.init)
                 string[]   = views específicas afetadas
                 null       = sem render direto (ação de metadados ou session)
     persists  : bool — está em PERSIST_ACTIONS (persist-middleware)?
     sacred    : bool — requer autorização do host em multiplayer (M5)
     effects   : string[] — bus events ou efeitos colaterais publicados
     status    : 'live'    = reducer em store.js + wired no RENDER_MAP
                 'planned' = em actions.js TYPES; sem reducer ainda
                 'gap'     = identificada pela análise de domínio; ainda não existe
     note      : string (opcional) — observação arquitetural

   O RENDER_MAP derivado (window.CoC.core.eventOntology.RENDER_MAP) é exportado
   para o render-pipeline.js — ele não mantém seu próprio mapa.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC      = window.CoC      || {};
window.CoC.core = window.CoC.core || {};

(function () {

  // ── Catálogo de ações ──────────────────────────────────────────────────────
  var CATALOG = {

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    // pipeline.init() despacha RECALC_DERIVED antes de renderAll() neste path.
    SET_CHARACTER: {
      aggregate: 'character', domain: 'lifecycle',
      renders: 'ALL', persists: true, sacred: false,
      effects: ['pipeline:recalc-before-render-all'],
      status: 'live',
    },
    SET_CHARACTER_ID: {
      aggregate: 'character', domain: 'lifecycle',
      renders: [], persists: false, sacred: false,
      effects: [],
      status: 'live',
      note: 'Atualiza só o id após primeiro save; excluído de PERSIST_ACTIONS para evitar loop',
    },
    RECALC_DERIVED: {
      aggregate: 'character', domain: 'lifecycle',
      renders: ['vitals', 'attributes'], persists: true, sacred: false,
      effects: [],
      status: 'live',
      note: 'JSON diff guard em persist-middleware evita saves redundantes',
    },

    // ── Vitais ────────────────────────────────────────────────────────────────
    APPLY_DAMAGE: {
      aggregate: 'character', domain: 'vitals',
      renders: ['vitals'], persists: true, sacred: true,
      effects: ['vitals:flash-pv', 'check:majorWound', 'check:unconscious', 'check:dying'],
      status: 'live',
      boundary_randomness: false,  // amount é determinístico (escolhido por regra/GM)
    },
    HEAL_DAMAGE: {
      aggregate: 'character', domain: 'vitals',
      renders: ['vitals'], persists: true, sacred: true,
      effects: ['vitals:flash-pv'],
      status: 'live',
      boundary_randomness: false,
    },
    ADD_MYTHOS: {
      aggregate: 'character', domain: 'sanity',
      renders: ['vitals'], persists: true, sacred: true,
      effects: ['check:sanMax'],
      status: 'live',
      boundary_randomness: false,
    },
    LOSE_SANITY: {
      aggregate: 'character', domain: 'sanity',
      renders: ['vitals'], persists: true, sacred: true,
      effects: ['vitals:flash-san', 'check:temporaryInsanity', 'check:indefiniteInsanity'],
      status: 'live',
      boundary_randomness: true,   // perda de SAN é resultado de dado (1d6, 1d10, etc.)
      resolved_fields: ['amount'], // dados já rolados na view, embutidos no payload
    },
    RECOVER_SANITY: {
      aggregate: 'character', domain: 'sanity',
      renders: ['vitals'], persists: true, sacred: true,
      effects: ['vitals:flash-san'],
      status: 'live',
      boundary_randomness: false,
    },
    SPEND_MAGIC: {
      aggregate: 'character', domain: 'magic',
      renders: ['vitals'], persists: true, sacred: true,
      effects: ['vitals:flash-pm'],
      status: 'live',
      boundary_randomness: true,   // custo de MP pode ser variável (feitiços)
      resolved_fields: ['amount'],
    },
    RESTORE_MAGIC: {
      aggregate: 'character', domain: 'magic',
      renders: ['vitals'], persists: true, sacred: true,
      effects: ['vitals:flash-pm'],
      status: 'live',
      boundary_randomness: false,
    },

    // ── Status / efeitos de combate ────────────────────────────────────────────
    ADD_STATUS: {
      aggregate: 'character', domain: 'vitals',
      renders: ['vitals'], persists: true, sacred: true,
      effects: [],
      status: 'live',
      note: 'Exemplos: majorWound, unconscious, dying, temporaryInsane',
    },
    REMOVE_STATUS: {
      aggregate: 'character', domain: 'vitals',
      renders: ['vitals'], persists: true, sacred: true,
      effects: [],
      status: 'live',
    },

    // ── Sorte ────────────────────────────────────────────────────────────────
    SPEND_LUCK: {
      aggregate: 'character', domain: 'luck',
      renders: ['attributes', 'vitals'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    GAIN_LUCK: {
      aggregate: 'character', domain: 'luck',
      renders: ['attributes', 'vitals'], persists: true, sacred: false,
      effects: [],
      status: 'gap',
      note: 'Oposto de SPEND_LUCK; ausente em actions.js',
    },

    // ── Atributos primários ───────────────────────────────────────────────────
    SET_ATTRIBUTE: {
      aggregate: 'character', domain: 'attributes',
      renders: ['attributes', 'vitals', 'skills'], persists: true, sacred: false,
      effects: [],
      status: 'planned',
      note: 'Atualmente mutação direta em attributes.js; migração pendente para store',
    },

    // ── Perícias ──────────────────────────────────────────────────────────────
    SET_SKILL: {
      aggregate: 'character', domain: 'skills',
      renders: ['skills'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    TOGGLE_OCCUPATION_SKILL: {
      aggregate: 'character', domain: 'skills',
      renders: ['skills'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    ADD_CUSTOM_SKILL: {
      aggregate: 'character', domain: 'skills',
      renders: ['skills'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    ROLL_SKILL: {
      aggregate: 'session', domain: 'rolls',
      renders: null, persists: false, sacred: false,
      effects: ['roll:logged', 'roll:badge-inc'],
      status: 'live',
      boundary_randomness: true,
      resolved_fields: ['roll', 'skillValue', 'level'],
    },
    SKILL_IMPROVED: {
      aggregate: 'character', domain: 'skills',
      renders: ['skills'], persists: true, sacred: false,
      effects: [],
      status: 'gap',
      note: 'Rolagem de melhoria de perícia pós-sessão (CoC 7e p.44); sem reducer',
    },

    // ── Rolagens / sessão ─────────────────────────────────────────────────────
    ROLL_ATTRIBUTE: {
      aggregate: 'session', domain: 'rolls',
      renders: null, persists: false, sacred: false,
      effects: ['roll:logged'],
      status: 'live',
      boundary_randomness: true,
      resolved_fields: ['roll', 'attribute', 'result'],
    },
    ROLL_DAMAGE: {
      aggregate: 'session', domain: 'rolls',
      renders: null, persists: false, sacred: false,
      effects: ['roll:logged'],
      status: 'planned',
      boundary_randomness: true,
      resolved_fields: ['roll', 'damage'],
    },
    PUSH_ROLL: {
      aggregate: 'session', domain: 'rolls',
      renders: null, persists: false, sacred: false,
      effects: ['roll:logged', 'roll:pushed'],
      status: 'live',
      boundary_randomness: true,
      resolved_fields: ['roll', 'skillValue', 'level'],
    },
    REGISTER_FUMBLE: {
      aggregate: 'session', domain: 'rolls',
      renders: null, persists: false, sacred: false,
      effects: ['roll:logged', 'roll:fumble'],
      status: 'planned',
    },

    // ── Identidade ─────────────────────────────────────────────────────────────
    SET_IDENTITY: {
      aggregate: 'character', domain: 'identity',
      renders: ['identity', 'skills', 'finances'], persists: true, sacred: false,
      effects: [],
      status: 'planned',
      note: 'Ocupação afeta skill points e crédito; migração de identity.js pendente',
    },
    SET_IMAGE: {
      aggregate: 'character', domain: 'identity',
      renders: ['identity'], persists: true, sacred: false,
      effects: [],
      status: 'planned',
      note: 'Slot banner|portrait; migração de identity.js pendente',
    },

    // ── Combate / armas ────────────────────────────────────────────────────────
    ADD_WEAPON: {
      aggregate: 'character', domain: 'combat',
      renders: ['combat'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    UPDATE_WEAPON: {
      aggregate: 'character', domain: 'combat',
      renders: ['combat'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    REMOVE_WEAPON: {
      aggregate: 'character', domain: 'combat',
      renders: ['combat'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    ATTACK_RESOLVED: {
      aggregate: 'session', domain: 'combat',
      renders: ['combat'], persists: true, sacred: false,
      effects: ['roll:logged'],
      status: 'live',
      boundary_randomness: true,    // d100 de ataque + dado de dano rolados na view
      resolved_fields: ['roll', 'hit'],  // resultado já materializado antes do dispatch
      note: 'Decrementa ammo; resultado de rolagem de ataque + dano',
    },
    EQUIP_WEAPON: {
      aggregate: 'character', domain: 'combat',
      renders: ['combat'], persists: true, sacred: false,
      effects: [],
      status: 'planned',
    },
    RESOLVE_COMBAT: {
      aggregate: 'encounter', domain: 'combat',
      renders: ['combat'], persists: false, sacred: true,
      effects: ['encounter:round-resolved'],
      status: 'planned',
      note: 'Resolução completa de round; precisa de encounter view (M4)',
    },

    // ── Inventário ────────────────────────────────────────────────────────────
    ADD_INVENTORY_ITEM: {
      aggregate: 'character', domain: 'inventory',
      renders: ['inventory'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    UPDATE_INVENTORY_ITEM: {
      aggregate: 'character', domain: 'inventory',
      renders: ['inventory'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    REMOVE_INVENTORY_ITEM: {
      aggregate: 'character', domain: 'inventory',
      renders: ['inventory'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },

    // ── Journal ───────────────────────────────────────────────────────────────
    ADD_JOURNAL_ENTRY: {
      aggregate: 'character', domain: 'journal',
      renders: ['journal'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    UPDATE_JOURNAL_ENTRY: {
      aggregate: 'character', domain: 'journal',
      renders: ['journal'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    REMOVE_JOURNAL_ENTRY: {
      aggregate: 'character', domain: 'journal',
      renders: ['journal'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },

    // ── Magias ────────────────────────────────────────────────────────────────
    ADD_SPELL: {
      aggregate: 'character', domain: 'magic',
      renders: ['spells'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    UPDATE_SPELL: {
      aggregate: 'character', domain: 'magic',
      renders: ['spells'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    REMOVE_SPELL: {
      aggregate: 'character', domain: 'magic',
      renders: ['spells'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },

    // ── Grimórios ─────────────────────────────────────────────────────────────
    ADD_TOME: {
      aggregate: 'character', domain: 'tomes',
      renders: ['tomes'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    UPDATE_TOME: {
      aggregate: 'character', domain: 'tomes',
      renders: ['tomes'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },
    REMOVE_TOME: {
      aggregate: 'character', domain: 'tomes',
      renders: ['tomes'], persists: true, sacred: false,
      effects: [],
      status: 'live',
    },

    // ── Encounter / Sessão (futuro — M4/M5) ────────────────────────────────────
    INITIATIVE_SET: {
      aggregate: 'encounter', domain: 'combat',
      renders: null, persists: false, sacred: false,
      effects: [],
      status: 'gap',
      note: 'Tracker de iniciativa por DEX (CoC 7e p.108); requer encounter view',
    },
    TURN_ADVANCED: {
      aggregate: 'encounter', domain: 'combat',
      renders: null, persists: false, sacred: false,
      effects: [],
      status: 'gap',
    },
    ENCOUNTER_BEGUN: {
      aggregate: 'encounter', domain: 'combat',
      renders: null, persists: false, sacred: false,
      effects: ['encounter:started'],
      status: 'gap',
    },
    ENCOUNTER_ENDED: {
      aggregate: 'encounter', domain: 'combat',
      renders: null, persists: false, sacred: false,
      effects: ['encounter:ended'],
      status: 'gap',
    },
    SESSION_STARTED: {
      aggregate: 'campaign', domain: 'session',
      renders: null, persists: false, sacred: false,
      effects: ['session:log-started'],
      status: 'gap',
      note: 'M5: log de sessão + milestones de campanha',
    },
    SESSION_ENDED: {
      aggregate: 'campaign', domain: 'session',
      renders: null, persists: false, sacred: false,
      effects: ['session:log-ended', 'skills:improvement-roll-available'],
      status: 'gap',
    },
  };

  // ── Derivação do RENDER_MAP ────────────────────────────────────────────────
  // Inclui apenas ações com status === 'live' e renders !== null.
  // Ações 'planned' e 'gap' têm renders documentado mas não produzem entrada
  // no mapa ativo — evita dead code no pipeline.
  var _renderMap = Object.create(null);
  Object.keys(CATALOG).forEach(function (type) {
    var e = CATALOG[type];
    if (e.status === 'live' && e.renders !== null) {
      _renderMap[type] = e.renders;
    }
  });
  var RENDER_MAP = Object.freeze(_renderMap);

  // ── Derivação do BOUNDARY_FIELDS — Action Schema de determinismo ───────────
  // Mapa: { ACTION_TYPE: ['field1', 'field2'] } para ações com boundary_randomness.
  // Usado pelo executor para validar que resultados de dado estão no payload.
  // Regra: dados são materializados na VIEW (borda do sistema) e entram como
  // fato imutável. O executor nunca gera ou recomputa aleatoriedade.
  var _boundaryFields = Object.create(null);
  Object.keys(CATALOG).forEach(function (type) {
    var e = CATALOG[type];
    if (e.boundary_randomness && Array.isArray(e.resolved_fields)) {
      _boundaryFields[type] = e.resolved_fields.slice();
    }
  });
  var BOUNDARY_FIELDS = Object.freeze(_boundaryFields);

  // ── Consultas utilitárias ──────────────────────────────────────────────────

  function byStatus(status) {
    return Object.keys(CATALOG).filter(function (t) { return CATALOG[t].status === status; });
  }

  function byDomain(domain) {
    return Object.keys(CATALOG).filter(function (t) { return CATALOG[t].domain === domain; });
  }

  function bySacred() {
    return Object.keys(CATALOG).filter(function (t) { return CATALOG[t].sacred; });
  }

  function byBoundaryRandomness() {
    return Object.keys(CATALOG).filter(function (t) { return CATALOG[t].boundary_randomness; });
  }

  /**
   * Valida que um payload contém todos os campos resolved_fields definidos
   * para ações com boundary_randomness. Retorna { valid, missing }.
   * Usado pelo executor antes de processar a ação.
   */
  function validatePayload(type, payload) {
    var required = BOUNDARY_FIELDS[type];
    if (!required || required.length === 0) return { valid: true, missing: [] };
    var p = payload || {};
    var missing = required.filter(function (f) {
      return !(f in p) || p[f] === undefined || p[f] === null;
    });
    return { valid: missing.length === 0, missing: missing };
  }

  window.CoC.core.eventOntology = Object.freeze({
    CATALOG:              CATALOG,
    RENDER_MAP:           RENDER_MAP,
    BOUNDARY_FIELDS:      BOUNDARY_FIELDS,
    byStatus:             byStatus,
    byDomain:             byDomain,
    bySacred:             bySacred,
    byBoundaryRandomness: byBoundaryRandomness,
    validatePayload:      validatePayload,
  });

})();
