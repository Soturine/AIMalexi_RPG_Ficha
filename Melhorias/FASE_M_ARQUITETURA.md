# Fase M — Multiplayer Durável Grátis · Arquitetura

> ⚠️ **Subordinado a [`DIRETRIZ_OFICIAL_V1.md`](DIRETRIZ_OFICIAL_V1.md)** (fonte única; roadmap lá).
> Este é o **design técnico** da Fase M (prioridade máxima). Aprovado pelo proprietário em
> 2026-06-01: **projeto Supabase compartilhado**, **entrada por PIN**, **RLS robusto**
> (auth anônimo + RPC `join_campaign(pin)` + RLS por associação).

## Princípios (travados)

- **Runtime é sempre o Store local.** A UI **nunca** lê do Supabase. Supabase é **transporte + log**.
- **Sincroniza-se EVENTOS/intents**, nunca "state inteiro". Timeline/Dashboard/Replay derivam do log.
- **Offline-first.** Ação crítica funciona sem rede; sync é oportunista (fila + reconexão).
- **Campos sagrados** (`APPLY_DAMAGE`, `LOSE_SANITY`, `RESOLVE_COMBAT`, status): a versão
  **canônica da campanha** só o cliente do **Mestre** grava (intent → autoridade).

## Reuso (não reimplementar)

`executor`, `event-ontology` (`SACRED`), `replay-consumer`, `supabase-transport` (Realtime Model A),
`campaign-store`, `pin-system`, `player-sync`/`keeper-dashboard`, `config.js`. Vendor `supabase.js`
é stub vazio → vendar o SDK é tarefa da fiação ao vivo (M-live).

## Modelo de dados (Supabase compartilhado) — ver `supabase/schema.sql`

- `campaigns(id, pin unique, name, host_user_id, status, created_at, last_active_at)`
- `campaign_members(campaign_id, user_id, role, joined_at)` — base do RLS robusto.
- `campaign_events(id, campaign_id, peer_id, peer_seq, type, payload, sacred, created_at)`
  — **Event Log durável**; `UNIQUE(campaign_id, peer_id, peer_seq)` garante idempotência.
- `investigator_snapshots(campaign_id, peer_id, player_name, character_name, character_json,
  vitals, last_seq, updated_at)` — **checkpoint** para late-join rápido (snapshot + eventos `> last_seq`).

RLS (robusto): tudo gated por associação (`campaign_members`). Eventos **sagrados** só o `host`
insere (policy por papel). RPC `join_campaign(pin)` (SECURITY DEFINER) valida PIN e cria a associação.

## Fluxo de sincronização (dual-write)

Ação local → `executor` → (1) broadcast Realtime (como hoje) **e** (2) `INSERT` em `campaign_events`
com `peer_seq` monotônico por peer. `INVESTIGATOR_STATUS` faz `upsert` em `investigator_snapshots`
(debounced). Dedup por `eventId = peer_id:peer_seq` (+ UNIQUE no banco).

## Reconexão + offline

- **Outbox** (IndexedDB no browser; adapter de memória nos testes): ações enfileiradas offline;
  ao reconectar, drena em ordem (insert + broadcast), **idempotente**.
- **Late-join/reconexão:** lê `campaigns` + `investigator_snapshots` + `campaign_events` com
  `seq > último visto` → reconstrói dashboard/timeline. **Campanha sobrevive a todos desconectarem.**

## Camada de persistência (cliente) — `js/campaign/campaign-persistence.js`

Orquestração **desacoplada** (client Supabase e storage **injetados** → testável com mock):
- `nextSeq()` — seq monotônico por peer.
- `recordEvent(event)` — atribui seq, dedup, dual-write (via client), enfileira no outbox se offline.
- `upsertSnapshot(snap)` — checkpoint do investigador.
- `loadSince(snapshot, events)` — merge determinístico p/ late-join (snapshot + eventos `> last_seq`, ordenados).
- `drainOutbox()` — reenvia fila pendente, idempotente.

## Fases de implementação (PRs pequenos)

- **M-fundação (este PR):** `schema.sql` (tabelas+RLS+RPC) · `campaign-persistence.js` (lógica + testes mock) · este doc.
- **M-live:** vendar SDK (`js/vendor/supabase.js`), adapters reais (Supabase + IndexedDB), `useSupabase:true`, fiação no `supabase-transport`/`player-sync`.
- **M-reconnect:** late-join/restore durável do `campaign-store` a partir do DB.
- **M-sacred:** autoridade do Mestre p/ eventos sagrados (intent→host) + policy RLS.
- **M-qa:** testes de integração + verificação em navegador com projeto Supabase real.

## Não-objetivos

Sem VTT. UI nunca lê do Supabase. Nada efêmero entra no Store canônico (tiers de estado).

## Status

- ✅ **Fundação** (`campaign-persistence.js`) + testes puros.
- ✅ **Adapters** (`supabase-persistence-adapter.js`, `outbox-indexeddb.js`) — verificados por
  mock: CI 784/784 + `node js/tests/mlive-integration.js` 14/14.
- ⏳ **Go-live** (exige o projeto Supabase do dono): habilitar Anonymous sign-ins; rodar
  `supabase/schema.sql`; vendar o SDK; incluir os `<script>`; conectar em
  `supabase-transport`/`player-sync`; `useSupabase:true` + chaves no `config.js`; validar no navegador.

### Como ativar (go-live)
1. Supabase → Authentication → habilitar **Anonymous sign-ins**; rodar `supabase/schema.sql`.
2. Vendar o SDK: salvar o build ESM de `@supabase/supabase-js` em `js/vendor/supabase.js` (expor `window.supabase`).
3. Incluir em `investigator.html`/`keeper.html` os `<script>` de `outbox-indexeddb.js` e
   `supabase-persistence-adapter.js` (e o vendor).
4. `js/config.js`: `supabaseUrl`, `supabaseKey` (publishable/anon), `useSupabase: true`.
5. Fiação: no fluxo de campanha, criar `persistence = campaign.persistence.create({ client:
   supabaseAdapter.createPersistenceClient(sb), storage: outbox.create(), campaignId, peerId })`;
   chamar `recordEvent` junto do broadcast; `drainOutbox` + `loadSince` no reconnect/late-join.
