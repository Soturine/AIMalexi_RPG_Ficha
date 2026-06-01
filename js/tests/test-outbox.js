/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-outbox.js
   Fase M — trava a fila offline (outbox) no caminho de MEMÓRIA (sem IndexedDB):
   enqueue/list/remove síncronos + idempotência por eventId. O caminho IndexedDB
   (durável entre reloads) é verificado no navegador na fase live.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  group("Campaign Outbox — fila offline (memória)");

  var ob = window.CoC.campaign.outbox.create({ indexedDB: null }); // memória pura

  var r1 = { peer_id: 'p1', peer_seq: 1, type: 'ROLL_SKILL' };
  var r2 = { peer_id: 'p1', peer_seq: 2, type: 'APPLY_DAMAGE' };

  ob.enqueue(r1); ob.enqueue(r2);
  assertEq(ob.size(), 2, "enqueue de 2 → size 2");
  assertEq(ob.list().length, 2, "list → 2 itens");

  ob.enqueue(r1);  // mesmo eventId (peer:seq)
  assertEq(ob.size(), 2, "enqueue duplicado é idempotente (mesmo eventId)");

  ob.remove(r1);
  assertEq(ob.size(), 1, "remove(r1) → size 1");
  assertEq(ob.list()[0].peer_seq, 2, "sobrou o evento seq 2");

  ob.remove(r2);
  assertEq(ob.size(), 0, "remove de tudo → vazio");
})();
