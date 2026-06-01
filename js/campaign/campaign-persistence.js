/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/campaign-persistence.js
   Fase M — Camada de persistência durável do Event Log (lógica desacoplada).

   Runtime é sempre o Store local; ISTO é transporte+log. O cliente Supabase e o
   storage do outbox são INJETADOS (factory create()), para que a lógica de risco
   — seq monotônico, marcação de sagrado, dedupe, ordenação, roteamento
   online/offline e idempotência — seja PURA e testável sem infra ao vivo.

   Contrato do client (adapter live implementa contra Supabase):
     insertEvent(row)            → Promise (rejeita { duplicate:true } em UNIQUE)
     fetchEventsSince(cid, afterId) → Promise<row[]>
     upsertSnapshot(snap)        → Promise
     fetchSnapshots(cid)         → Promise<snap[]>
   Contrato do storage (outbox; live = IndexedDB, testes = memória):
     enqueue(row) · list() → row[] · remove(row)

   Expõe: window.CoC.campaign.persistence = { create, + funções puras }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC          = window.CoC          || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {
  'use strict';

  // eventId lógico estável (idempotência): peer_id:peer_seq
  function eventId(row) { return String(row.peer_id) + ':' + String(row.peer_seq); }

  // Puro: remove duplicatas por eventId, preservando a 1ª ocorrência.
  function dedupe(events) {
    var seen = Object.create(null), out = [];
    for (var i = 0; i < (events || []).length; i++) {
      var k = eventId(events[i]);
      if (seen[k]) continue;
      seen[k] = true;
      out.push(events[i]);
    }
    return out;
  }

  // Puro: eventos com id > afterId, deduplicados e ordenados asc por id (ordem do log).
  function eventsAfter(events, afterId) {
    var cut = Number(afterId) || 0;
    return dedupe(events)
      .filter(function (e) { return (Number(e.id) || 0) > cut; })
      .sort(function (a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); });
  }

  // Puro: ordena o outbox pela sequência do peer (reenvio determinístico).
  function orderOutbox(items) {
    return (items || []).slice().sort(function (a, b) {
      return (Number(a.peer_seq) || 0) - (Number(b.peer_seq) || 0);
    });
  }

  // Puro: rota de um evento conforme conectividade.
  function routeEvent(online, /* row */ _row) { return online ? 'insert' : 'enqueue'; }

  // Puro: constrói a próxima linha de evento → { seq, row }. Marca sagrado via opts.isSacred.
  function nextRow(seq, event, opts) {
    opts = opts || {};
    var n = (Number(seq) || 0) + 1;
    var isSacred = typeof opts.isSacred === 'function' ? opts.isSacred : function () { return false; };
    return {
      seq: n,
      row: {
        campaign_id: opts.campaignId,
        peer_id: opts.peerId,
        peer_seq: n,
        type: event.type,
        payload: event.payload || {},
        sacred: !!isSacred(event.type)
      }
    };
  }

  // ── Orquestração (async; usa as puras + client/storage injetados) ────────────
  function create(deps) {
    deps = deps || {};
    var client     = deps.client;
    var storage    = deps.storage;
    var campaignId = deps.campaignId;
    var peerId     = deps.peerId;
    var seq        = Number(deps.startSeq) || 0;

    var isOnline = typeof deps.isOnline === 'function' ? deps.isOnline : function () {
      return (typeof navigator === 'undefined') ? true : (navigator.onLine !== false);
    };
    var isSacred = typeof deps.isSacred === 'function' ? deps.isSacred : function (type) {
      var a = window.CoC && window.CoC.actions;
      return !!(a && typeof a.isSacred === 'function' && a.isSacred(type));
    };

    function tryInsert(row) {
      return Promise.resolve()
        .then(function () { return client.insertEvent(row); })
        .then(function () { return { ok: true, row: row }; })
        .catch(function (err) {
          if (err && err.duplicate) return { ok: true, duplicate: true, row: row }; // idempotente
          return Promise.resolve(storage.enqueue(row)).then(function () {
            return { ok: false, queued: true, row: row, error: err };
          });
        });
    }

    return {
      eventId: eventId, dedupe: dedupe, eventsAfter: eventsAfter,
      currentSeq: function () { return seq; },

      // Registra uma ação como evento durável. Online → insert (com fallback p/ outbox);
      // offline → outbox. Sempre atribui seq monotônico antes de enviar.
      recordEvent: function (event) {
        var nx = nextRow(seq, event, { campaignId: campaignId, peerId: peerId, isSacred: isSacred });
        seq = nx.seq;
        if (routeEvent(isOnline(), nx.row) === 'enqueue') {
          return Promise.resolve(storage.enqueue(nx.row)).then(function () {
            return { queued: true, row: nx.row };
          });
        }
        return tryInsert(nx.row);
      },

      // Reenvia a fila pendente em ordem; idempotente (duplicata = já persistido).
      drainOutbox: function () {
        var items = orderOutbox(storage.list());
        var i = 0;
        return (function step() {
          if (i >= items.length) return Promise.resolve({ drained: i });
          var item = items[i];
          return Promise.resolve()
            .then(function () { return client.insertEvent(item); })
            .then(function () { storage.remove(item); i++; return step(); })
            .catch(function (err) {
              if (err && err.duplicate) { storage.remove(item); i++; return step(); }
              return Promise.resolve({ drained: i, stoppedAt: item, error: err });
            });
        })();
      },

      upsertSnapshot: function (snap) {
        snap = snap || {};
        return Promise.resolve(client.upsertSnapshot({
          campaign_id: campaignId, peer_id: snap.peerId || peerId,
          player_name: snap.playerName, character_name: snap.characterName,
          character_json: snap.character || {}, vitals: snap.vitals || {},
          last_seq: Number(snap.lastSeq) || seq
        }));
      },

      // Late-join/reconexão: snapshots (base) + eventos após o cursor (timeline a aplicar).
      loadSince: function (afterId) {
        return Promise.all([
          Promise.resolve(client.fetchSnapshots(campaignId)),
          Promise.resolve(client.fetchEventsSince(campaignId, afterId || 0))
        ]).then(function (res) {
          return { snapshots: res[0] || [], events: eventsAfter(res[1] || [], afterId || 0) };
        });
      }
    };
  }

  window.CoC.campaign.persistence = Object.freeze({
    create: create,
    eventId: eventId,
    dedupe: dedupe,
    eventsAfter: eventsAfter,
    orderOutbox: orderOutbox,
    routeEvent: routeEvent,
    nextRow: nextRow
  });
})();
