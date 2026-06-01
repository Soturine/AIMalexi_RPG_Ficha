#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/mlive-integration.js
   Fase M — teste de INTEGRAÇÃO async (fora do runner síncrono de CI).
   Exercita campaign-persistence + outbox + supabase-adapter ponta-a-ponta com
   um MOCK do supabase-js (tabelas em memória, UNIQUE simulada).

   Uso: node js/tests/mlive-integration.js   (exit 0 = ok, 1 = falha)
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
global.window = global; global.self = global;

const path = require('path');
const root = path.join(__dirname, '..', '..');
require(path.join(root, 'js/campaign/campaign-persistence.js'));
require(path.join(root, 'js/campaign/outbox-indexeddb.js'));
require(path.join(root, 'js/campaign/supabase-persistence-adapter.js'));

let passed = 0, failed = 0;
const fails = [];
function ok(cond, label) { if (cond) { passed++; process.stdout.write('.'); } else { failed++; fails.push(label); process.stdout.write('F'); } }
function eq(a, b, label) { ok(a === b, label + ` (esperado ${JSON.stringify(b)}, recebido ${JSON.stringify(a)})`); }

// ── Mock supabase-js: query builder thenable + tabelas em memória ────────────
function makeSupabase() {
  const tables = { campaign_events: [], investigator_snapshots: [] };
  let idc = 0;
  function builder(table) {
    let op = null; const args = {}; const filters = []; let ord = null;
    const b = {
      insert(row) { op = 'insert'; args.row = row; return b; },
      upsert(row, opts) { op = 'upsert'; args.row = row; args.opts = opts; return b; },
      select() { op = op || 'select'; return b; },
      eq(c, v) { filters.push(['eq', c, v]); return b; },
      gt(c, v) { filters.push(['gt', c, v]); return b; },
      order(c, o) { ord = { c, asc: !(o && o.ascending === false) }; return b; },
      then(resolve, reject) { try { resolve(run()); } catch (e) { reject ? reject(e) : (() => { throw e; })(); } }
    };
    function filt(rows) {
      return rows.filter(r => filters.every(f =>
        f[0] === 'eq' ? r[f[1]] === f[2] : (Number(r[f[1]]) || 0) > (Number(f[2]) || 0)));
    }
    function run() {
      const t = tables[table];
      if (op === 'insert') {
        const row = args.row;
        if (t.some(x => x.campaign_id === row.campaign_id && x.peer_id === row.peer_id && x.peer_seq === row.peer_seq))
          return { data: null, error: { code: '23505', message: 'duplicate key value' } };
        const stored = Object.assign({ id: ++idc }, row);
        t.push(stored);
        return { data: [stored], error: null };
      }
      if (op === 'upsert') {
        const s = args.row;
        const i = t.findIndex(x => x.campaign_id === s.campaign_id && x.peer_id === s.peer_id);
        if (i >= 0) t[i] = Object.assign({}, t[i], s); else t.push(Object.assign({ id: ++idc }, s));
        return { data: [s], error: null };
      }
      let rows = filt(t.slice());
      if (ord) rows.sort((a, c) => ((Number(a[ord.c]) || 0) - (Number(c[ord.c]) || 0)) * (ord.asc ? 1 : -1));
      return { data: rows, error: null };
    }
    return b;
  }
  return { from: builder, _tables: tables };
}

(async function main() {
  const C = window.CoC.campaign;
  const sb = makeSupabase();
  const client = C.supabaseAdapter.createPersistenceClient(sb);
  const outbox = C.outbox.create({ indexedDB: null });
  let online = true;

  const P = C.persistence.create({
    client, storage: outbox, campaignId: 'C1', peerId: 'p1',
    isOnline: () => online, isSacred: t => t === 'APPLY_DAMAGE'
  });

  // 1) online → insere no banco; sem outbox
  await P.recordEvent({ type: 'ROLL_SKILL', payload: { skill: 'Esquivar' } });
  eq(sb._tables.campaign_events.length, 1, "online: 1 evento no banco");
  eq(outbox.size(), 0, "online: outbox vazio");

  // 2) marca sagrado corretamente
  await P.recordEvent({ type: 'APPLY_DAMAGE', payload: { amount: 2 } });
  eq(sb._tables.campaign_events.length, 2, "2 eventos no banco");
  eq(sb._tables.campaign_events[1].sacred, true, "APPLY_DAMAGE persistido como sagrado");

  // 3) offline → vai pro outbox, não pro banco
  online = false;
  await P.recordEvent({ type: 'ROLL_SKILL', payload: {} });
  eq(sb._tables.campaign_events.length, 2, "offline: banco inalterado");
  eq(outbox.size(), 1, "offline: 1 na fila");

  // 4) reconectar e drenar
  online = true;
  await P.drainOutbox();
  eq(sb._tables.campaign_events.length, 3, "drain: 3º evento persistido");
  eq(outbox.size(), 0, "drain: outbox esvaziado");

  // 5) idempotência: reenfileirar evento já persistido → drain trata duplicata como ok
  outbox.enqueue(sb._tables.campaign_events[0]);
  await P.drainOutbox();
  eq(sb._tables.campaign_events.length, 3, "idempotente: duplicata não cria linha nova");
  eq(outbox.size(), 0, "idempotente: outbox limpo após duplicata");

  // 6) snapshot + late-join
  await P.upsertSnapshot({ playerName: 'Ana', characterName: 'Reed', character: { x: 1 }, vitals: { hp: 10 }, lastSeq: 3 });
  const all = await P.loadSince(0);
  eq(all.snapshots.length, 1, "loadSince: 1 snapshot");
  eq(all.events.length, 3, "loadSince(0): 3 eventos ordenados");
  eq(all.events[0].id < all.events[2].id, true, "loadSince: ordenado asc por id");

  // 7) cursor de late-join: só eventos após o 2º
  const cut = sb._tables.campaign_events[1].id;
  const partial = await P.loadSince(cut);
  eq(partial.events.length, 1, "loadSince(cursor): só eventos > cursor");

  process.stdout.write('\n\n');
  if (fails.length) { fails.forEach(f => process.stderr.write('  ✗ ' + f + '\n')); }
  console.log(`${failed === 0 ? '✅' : '❌'}  ${passed}/${passed + failed} integração M-live`);
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
