/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/campaign-ontology.js
   Ontologia canônica de eventos de transporte de campanha.

   Todos os eventos broadcast pelo transport devem ser criados via
   ontology.make() — isso garante que o tipo é reconhecido e os campos
   obrigatórios estão presentes antes de sair pelo fio.

   CATALOG entry:
     domain         — agrupamento lógico ('session' | 'player' | 'status' | 'trace')
     requiredFields — campos exigidos no payload (além de type/peerId/ts do envelope)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {

  var CATALOG = {
    // ── Ciclo de sessão ───────────────────────────────────────────────────────
    SESSION_STARTED:     { domain: 'session', requiredFields: ['campaignId', 'campaignName', 'pin'] },
    SESSION_ENDED:       { domain: 'session', requiredFields: ['campaignId'] },
    HOST_ONLINE:         { domain: 'session', requiredFields: ['campaignId', 'pin', 'campaignName'] },
    CAMPAIGN_ENDED:      { domain: 'session', requiredFields: ['pin'] },

    // ── Presença de jogador ───────────────────────────────────────────────────
    PLAYER_CONNECTED:    { domain: 'player',  requiredFields: ['playerName'] },
    PLAYER_DISCONNECTED: { domain: 'player',  requiredFields: ['playerName'] },
    REQUEST_STATUS:      { domain: 'player',  requiredFields: [] },

    // ── Status do investigador ────────────────────────────────────────────────
    INVESTIGATOR_STATUS: { domain: 'status',  requiredFields: ['playerName', 'characterName', 'status'] },

    // ── Chat de campanha (#18) ────────────────────────────────────────────────
    CHAT_MESSAGE:        { domain: 'chat',    requiredFields: ['author', 'role', 'text', 'msgId'] },

    // ── Rastro de execução ────────────────────────────────────────────────────
    // seqNo:   monotonic counter per investigator session — enables loss detection
    // eventId: peerId + ':' + seqNo — deduplication key for Supabase at-least-once delivery
    EXECUTION_TRACE:     { domain: 'trace',   requiredFields: ['characterName', 'playerName', 'entry', 'seqNo', 'eventId'] },
  };

  // ── validate(type, payload) → { ok, errors[] } ────────────────────────────
  function validate(type, payload) {
    var entry = CATALOG[type];
    if (!entry) return { ok: false, errors: ['Tipo de evento desconhecido: ' + type] };

    var errors = [];
    (entry.requiredFields || []).forEach(function (field) {
      if (payload == null || payload[field] == null) {
        errors.push('Campo obrigatório ausente: ' + field);
      }
    });

    return errors.length ? { ok: false, errors: errors } : { ok: true };
  }

  // ── make(type, payload) → event object ────────────────────────────────────
  // Warns to console but never throws — transport still delivers the event.
  function make(type, payload) {
    var result = validate(type, payload || {});
    if (!result.ok) {
      console.warn('[campaign-ontology] make(' + type + '): ' + result.errors.join('; '));
    }
    return Object.assign({ type: type }, payload || {});
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  function getDomain(type) {
    return CATALOG[type] ? CATALOG[type].domain : null;
  }

  function isKnown(type) {
    return Object.prototype.hasOwnProperty.call(CATALOG, type);
  }

  function getTypes() {
    return Object.keys(CATALOG);
  }

  window.CoC.campaign.ontology = Object.freeze({
    CATALOG:   CATALOG,
    validate:  validate,
    make:      make,
    getDomain: getDomain,
    isKnown:   isKnown,
    getTypes:  getTypes,
  });

})();
