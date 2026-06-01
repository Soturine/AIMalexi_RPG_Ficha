# Arquitetura V3 — Hub Narrativo CoC 7e

> ⚠️ **Subordinado a [`DIRETRIZ_OFICIAL_V1.md`](DIRETRIZ_OFICIAL_V1.md).** A seção *Roadmap*
> (M0–M7) está **superada** pela diretriz. As **decisões de arquitetura** abaixo (zero-build,
> Preact Signals, Supabase como transporte, offline-first) permanecem válidas e embasam a Fase M.

> Documento durável de arquitetura. Companheiro da `CONSTITUICAO_OPERACIONAL_V1.md`
> (regras absolutas). Aqui ficam as decisões técnicas, o porquê, e o roadmap.

## Contexto

O app é uma ficha de Call of Cthulhu 7e: Vanilla JS zero-build, PWA, IndexedDB, parser
RPN seguro, namespace `window.CoC`. Pontos fortes: engine madura, storage robusto,
performance alta. Problemas que a V3 ataca: mutabilidade global, ausência de fluxo
unidirecional, DOM imperativo escalando mal, risco de leaks, sem event bus, sync futura
difícil.

Meta: evoluir para **multiplayer narrativo** (dashboard do Mestre em tempo real) **sem**
virar VTT/SaaS, preservando o DNA — rápido como papel, invisível na mesa, offline-first,
mantível por uma pessoa.

## Decisões travadas

1. **Stack: Vanilla JS zero-build + camada reativa leve (Preact Signals vendado).** Sem
   SvelteKit (quebraria zero-build). Constituição §4 emendada para refletir isso.
2. **Reatividade: Preact Signals vendado** (`js/vendor/signals-core.js`), nunca signal próprio.
3. **Supabase = transporte/persistência, NUNCA runtime.** Runtime é o Store local.
   Fluxo: `Local Store → Persist local → Sync oportunista → Supabase`. Jamais `UI → Supabase → Estado`.
4. **Event Bus desacoplado da Store** (evita "Redux monstruoso").
5. **Actions = intenção de domínio** (`APPLY_DAMAGE`, `LOSE_SANITY`), nunca evento visual.
6. **Multiplayer = Supabase** (Postgres Changes + Broadcast + Presence). WebRTC rejeitado.
7. **Dashboard LOCAL antes do multiplayer** — valida a arquitetura reativa sem custo de rede.

---

## ETAPA 1 — Arquitetura Alvo

```
VIEWS (DOM)        investigator.js · keeper.js · dashboard.js   ← assinam signals, despacham actions
CORE REATIVO       js/core/  store · signals · actions · bus    ← fluxo unidirecional, estado imutável
ENGINE (puro)      dice · coc7e-rules(RPN) · names              ← funções puras (reusar como está)
PERSISTÊNCIA       js/engine/storage.js                         ← IndexedDB/LS/memória, ghost backup, debounce
SYNC               js/sync/  client · middleware · queue        ← oportunista, offline-first, reconexão
                          ↕ Supabase (Postgres + Realtime + RLS)
```

Fluxo: `UI → dispatch(action) → middleware → store(signals) → views reagem`. **Runtime é o
Store local**; a UI nunca lê do Supabase. Nenhuma tela depende de conexão contínua.

## ETAPA 2 — Store e Event Bus

- **Signals** (`js/core/signals.js`): ponte para Preact Signals vendado.
- **Store** (`js/core/store.js`): signals por **slice** (`character/session/rollLog/ui`). Leitura
  imutável (`getState()`→Proxy readonly; `snapshot()`→clone+freeze só em fronteiras).
  Granularidade no nível de slice, não de microcampo.
- **Actions** (`js/core/actions.js`): catálogo de intents de domínio + `SACRED` (campos que só o
  Mestre aplica no multiplayer). Sem reducers até o domínio estar mapeado.
- **Schema** (`js/core/schema/`): valida payloads antes do reduce e na ingestão de sync.
- **Dispatch** (`js/core/dispatch.js`): cadeia FIXA `trace → validate → reduce → persist → sync → log → notify`.
- **Dev Trace** (`js/dev/trace.js`): groupCollapsed por dispatch (timings, diff, reducers, sync). Mitiga middleware inflation.
- **Event Bus** (`js/core/bus.js`): desacoplado da Store; alimenta dashboard, sanity-fx, háptico, log.

Riscos vigiados: middleware inflation (cadeia curta + trace); store inflation (se não sobrevive a
reload, não entra no Store); granularidade de signals (slice, não microcampo).

## ETAPA 3 — Multiplayer

Supabase, modelo de **intents** para o sagrado: jogador escreve direto os campos não-críticos
(nome, perícias, notas) via RLS; SAN/PV/PM/status/entidades ocultas vão por intent → o cliente do
**Mestre** (host autoritativo) valida com a engine, grava e faz broadcast. Reconexão automática +
fila offline (`js/sync/queue.js`). Conflito: LWW por campo para não-críticos; autoridade do Mestre
para os sagrados. Acesso por link/QR/PIN, auth anônima.

## ETAPA 4 — Refatoração Evolutiva (strangler)

Sem rewrite; app jogável a cada passo. Engine pura, storage, ui-components, sanity-fx e PWA são
preservados. Os `state` mutáveis de `investigator.js`/`keeper.js` viram slices do store; cada
mutação direta vira `dispatch(action)`; full re-render vira update cirúrgico por signal.

## ETAPA 5 — Segurança

- RNG criptográfico (`crypto.getRandomValues`) no `dice.js`. ✅ feito (M0.3).
- Anti-tampering honesto: o cliente nunca é confiável; defesa real = autoridade do Mestre + RLS.
- `session_log` append-only (jogador só insere). Serialização validada (schema + `validators.js`); sem `eval` (RPN seguro).
- Separação assimétrica via RLS (`gm_private`), nunca só na UI.

## ETAPA 6 — Performance

Signals finos (fim do full re-render), delegação de evento (✅ M0.4), batch + rAF, sync
debounced + diffs por campo, instrumentação em `js/dev/perf.js`. Meta: 60fps, abrir instantâneo,
tela branca = falha crítica.

## ETAPA 7 — UI/UX Narrativa

Invisível (1 toque, máx. 2 — reusar `bottomSheet`/`toast`). Degradação por sanidade estendendo
`sanity-fx.js`, gated por `prefers-reduced-motion`. Logs narrativos discretos (event bus). Háptico
(`navigator.vibrate`) em crítico/desastre/perda de SAN. Sem gimmicks.

## ETAPA 8 — Dashboard do Mestre (visualizações configuráveis)

`dashboard.html` + `js/dashboard.js`: grade de widgets-card, cada um assinante de um signal (ao
vivo). Presets **Simples** (só vitais) ↔ **Detalhado** (tudo); toggles por widget persistidos em
`storage.getPref/setPref`. Widgets: Vitais da party · Condições & status · Feed de rolagens · Log
narrativo · NPCs & Bestiário (oculto) · Inventário relevante · Notas do Mestre. Reusa o padrão
Simples/Full já provado no `keeper.js`. Atende a "Regra do Mestre Onisciente".

## ETAPA 9 — Stack Final

- **Manter:** Vanilla zero-build; engine pura; `storage.js`; `ui-components.js`; `sanity-fx.js`; PWA; `data/`.
- **Adicionar:** `js/core/`, `js/sync/`, `js/dev/`, `js/vendor/`, `dashboard.html`.
- **Curar:** mutação global; full re-render; orphan listeners; `Math.random` no dado; 404 do banner.
- **Reativo:** Preact Signals vendado. SvelteKit descartado.

---

## Roadmap

- **M0 — Estabilização — ✅ CONCLUÍDO**
  - M0.1 Banner/retrato (media-picker + Blob no IndexedDB + CSS + wire + persist-before-render)
  - M0.2 Bump SW/cache (`v2`→`v3`) + precache dos novos arquivos
  - M0.3 RNG criptográfico no `dice.js`
  - M0.4 Delegação de eventos nas perícias (sem listeners órfãos)
  - M0.5 Scaffold vazio (`js/core`, `schema`, `dev`, `sync`, `vendor`) + Preact Signals vendado (não plugado)
  - M0.6 Catálogo de intents (`js/core/actions.js`) — vocabulário de domínio + `SACRED`
  - M0.8 Render lifecycle & cleanup primitives (`js/core/lifecycle.js`) — dono explícito de
    teardown (scopes, ObjectURLs, subscriptions, listeners) ANTES do Store, p/ não regredir em leaks
- **M1 — Core reativo:** store/signals/dispatcher/bus + schema + trace completo + testes. Reducers aqui.
  As views passam a criar um `scope` por componente (lifecycle) e dispô-lo no teardown.
- **M2 — Log append-only** (event bus → roll/session_log local).
- **M3 — Strangle investigator** (state→store, render cirúrgico).
- **M4 — Dashboard LOCAL** (multi-PC + widgets, sem rede). *(diferencial §12)*
- **M5 — Sync oportunista** (Supabase + RLS + auth anônima + fila offline + reconexão). *(MVP multiplayer)*
- **M6 — Autoridade + segurança** (intents sagrados, entidades ocultas, hardening RLS).
- **M7 — Polish** (háptico, degradação por sanidade, auditoria de perf em device antigo).

---

## Itens em aberto (do review — endereçar no M1+)

- **Tiers de estado (anti store-inflation) — virar regra constitucional.** Formalizar
  `store/{domain, session, sync, ui-persistent}` e PROIBIR no Store principal: modal/hover/draft/
  input transitório → estado local do componente. Regra: *se não sobrevive a um reload, não entra
  no Store.*
- **Composição de middleware fixa.** Cadeia única `trace → validate → reduce → persist → sync →
  log → notify`. Sem middleware arbitrário por feature (evita virar mini-framework opaco).
- **Snapshots & recovery (faltava).** Definir modelo `snapshot ocasional + intents incrementais`
  (replay parcial, não infinito): como reconstruir sessão, compactar log, recuperar de corrupção.
  Alvo: M1 (local) → M5 (sync).
- **Disciplina do Dashboard.** Manter operacional/invisível; rejeitar creep de VTT (mapas, chat,
  iluminação). O dashboard não pode virar "keeper OS".

## Registro M0 (arquivos tocados)

- **Engine:** `js/engine/storage.js` (+`saveBlob`/`getBlob`/`deleteBlob`, blobs lazy no boot),
  `js/engine/dice.js` (`randomFraction` via crypto).
- **Novos:** `js/shared/media-picker.js`, `data/image-templates.js`.
- **UI:** `css/investigator.css` (`.character-banner`/`.character-portrait`/`.img-remove`),
  `js/investigator.js` (wire de imagens, delegação de perícias, cleanup em `clearUI`),
  `data/presets/empty.js` (`bannerId`/`portraitId`).
- **PWA:** `sw.js` (`CACHE_NAME` v3 + precache de media-picker/image-templates).
- **Scaffold (não plugado):** `js/core/{signals,store,actions,dispatch,bus,lifecycle}.js`, `js/core/schema/index.js`,
  `js/dev/{trace,perf}.js`, `js/sync/{supabase-client,syncMiddleware,queue}.js`,
  `js/vendor/{signals-core.js (Preact Signals vendado), supabase.js (slot)}`.
- **Constituição:** §4 emendada (zero-build + reativo leve; RLS no backend).

### Causa-raiz do bug do banner (resolvida)
O HTML referenciava `data/image-templates.js` e `js/shared/media-picker.js` (commit `cc75117`,
resolução de merge) mas os arquivos nunca foram commitados → 404 silencioso + divs vazios sem
CSS/JS. M0.1 recriou os dois arquivos, o CSS e o wiring.
