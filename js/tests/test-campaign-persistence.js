/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-campaign-persistence.js
   Fase M — trava a LÓGICA PURA da persistência durável do Event Log:
   seq monotônico, marcação de sagrado, dedupe (idempotência), filtragem por
   cursor + ordenação (late-join) e ordenação do outbox (reenvio determinístico).

   A orquestração async (recordEvent/drainOutbox/loadSince) usa estas puras e é
   verificada na fase live (integração com Supabase + IndexedDB).
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  group("Campaign Persistence — Event Log durável (puro)");

  var P = window.CoC.campaign.persistence;

  // eventId = peer:seq (idempotência lógica)
  assertEq(P.eventId({ peer_id: 'abc', peer_seq: 7 }), 'abc:7', "eventId = peer_id:peer_seq");

  // nextRow — seq monotônico, shape e marcação de sagrado
  var sac = function (t) { return t === 'APPLY_DAMAGE'; };
  var r1 = P.nextRow(0, { type: 'ROLL_SKILL', payload: { skill: 'Esquivar' } },
    { campaignId: 'C1', peerId: 'p1', isSacred: sac });
  assertEq(r1.seq, 1, "nextRow: seq 0 → 1");
  assertEq(r1.row.peer_seq, 1, "row.peer_seq = 1");
  assertEq(r1.row.campaign_id, 'C1', "row.campaign_id propagado");
  assertEq(r1.row.peer_id, 'p1', "row.peer_id propagado");
  assertEq(r1.row.sacred, false, "ROLL_SKILL não é sagrado");

  var r2 = P.nextRow(r1.seq, { type: 'APPLY_DAMAGE', payload: { amount: 3 } },
    { campaignId: 'C1', peerId: 'p1', isSacred: sac });
  assertEq(r2.seq, 2, "nextRow: seq 1 → 2 (monotônico)");
  assertEq(r2.row.sacred, true, "APPLY_DAMAGE é sagrado");
  assertEq(r2.row.payload.amount, 3, "payload preservado");

  // routeEvent — conectividade
  assertEq(P.routeEvent(true,  {}), 'insert',  "online → insert");
  assertEq(P.routeEvent(false, {}), 'enqueue', "offline → enqueue (outbox)");

  // dedupe — por eventId (reenvio do outbox não duplica)
  var dd = P.dedupe([
    { peer_id: 'p1', peer_seq: 1, id: 10 },
    { peer_id: 'p1', peer_seq: 1, id: 10 },   // duplicata
    { peer_id: 'p2', peer_seq: 1, id: 11 }
  ]);
  assertEq(dd.length, 2, "dedupe remove duplicata por eventId");

  // eventsAfter — late-join: filtra id > cursor, dedup e ordena asc
  var ea = P.eventsAfter([
    { peer_id: 'p1', peer_seq: 3, id: 3 },
    { peer_id: 'p1', peer_seq: 1, id: 1 },
    { peer_id: 'p1', peer_seq: 2, id: 2 },
    { peer_id: 'p1', peer_seq: 2, id: 2 }     // duplicata
  ], 1);
  assertEq(ea.length, 2, "eventsAfter(cursor=1) → 2 eventos");
  assertEq(ea[0].id, 2, "ordenado asc: 1º id=2");
  assertEq(ea[1].id, 3, "ordenado asc: 2º id=3");
  assertEq(P.eventsAfter([{ peer_id: 'p1', peer_seq: 1, id: 1 }], 5).length, 0,
    "cursor à frente de tudo → vazio");

  // orderOutbox — reenvio na ordem da sequência do peer
  var ob = P.orderOutbox([
    { peer_id: 'p1', peer_seq: 3 },
    { peer_id: 'p1', peer_seq: 1 },
    { peer_id: 'p1', peer_seq: 2 }
  ]);
  assertEq(ob[0].peer_seq, 1, "outbox ordenado: primeiro = seq 1");
  assertEq(ob[2].peer_seq, 3, "outbox ordenado: último = seq 3");

  // create() existe e devolve a API esperada (fumaça)
  var inst = P.create({
    client: {}, storage: { enqueue: function () {}, list: function () { return []; }, remove: function () {} },
    campaignId: 'C1', peerId: 'p1', isOnline: function () { return true; }, isSacred: sac
  });
  assert(typeof inst.recordEvent === 'function', "create(): recordEvent presente");
  assert(typeof inst.drainOutbox === 'function', "create(): drainOutbox presente");
  assert(typeof inst.loadSince === 'function', "create(): loadSince presente");
  assertEq(inst.currentSeq(), 0, "create(): seq inicial = 0");
})();
