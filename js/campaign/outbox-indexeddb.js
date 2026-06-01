/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/outbox-indexeddb.js
   Fase M (live) — Outbox durável da fila offline.

   Cache em memória (list/remove SÍNCRONOS — casam com campaign-persistence.js)
   espelhado em IndexedDB (durável entre reloads). Sem IndexedDB disponível
   (Node/SSR/privacidade) → memória pura. Idempotente por eventId (peer:seq).

   Expõe: window.CoC.campaign.outbox = { create(opts) }
     create() → { ready(), enqueue(row), list(), remove(row), size() }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC          = window.CoC          || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {
  'use strict';

  function eid(row) { return String(row.peer_id) + ':' + String(row.peer_seq); }

  function create(opts) {
    opts = opts || {};
    var dbName    = opts.dbName    || 'aimalexi-campaign';
    var storeName = opts.storeName || 'outbox';
    var idb = (typeof opts.indexedDB !== 'undefined') ? opts.indexedDB
            : (typeof indexedDB !== 'undefined' ? indexedDB : null);

    var cache = [];   // [{ key, row }]
    var _db   = null;

    function _open() {
      if (!idb) return Promise.resolve(null);
      return new Promise(function (resolve) {
        var req;
        try { req = idb.open(dbName, 1); } catch (e) { return resolve(null); }
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'key' });
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror   = function () { resolve(null); };
      });
    }

    function _store(mode) {
      if (!_db) return null;
      try { return _db.transaction(storeName, mode).objectStore(storeName); } catch (e) { return null; }
    }

    // Carrega o cache do IDB (idempotente; chamado no ready()).
    var _ready = _open().then(function (db) {
      _db = db;
      var store = _store('readonly');
      if (!store) return;
      return new Promise(function (resolve) {
        var req = store.getAll();
        req.onsuccess = function () { cache = (req.result || []).slice(); resolve(); };
        req.onerror   = function () { resolve(); };
      });
    });

    return {
      ready: function () { return _ready; },

      // Enfileira (sync no cache; persiste no IDB em background). Idempotente por eventId.
      enqueue: function (row) {
        var key = eid(row);
        if (!cache.some(function (e) { return e.key === key; })) {
          var item = { key: key, row: row };
          cache.push(item);
          var store = _store('readwrite');
          if (store) { try { store.put(item); } catch (e) {} }
        }
        return row;
      },

      list: function () { return cache.map(function (e) { return e.row; }); },

      remove: function (row) {
        var key = eid(row);
        cache = cache.filter(function (e) { return e.key !== key; });
        var store = _store('readwrite');
        if (store) { try { store.delete(key); } catch (e) {} }
      },

      size: function () { return cache.length; }
    };
  }

  window.CoC.campaign.outbox = Object.freeze({ create: create });
})();
