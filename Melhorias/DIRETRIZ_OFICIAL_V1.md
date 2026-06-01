# DIRETRIZ OFICIAL DEFINITIVA — AIMalexi RPG (Call of Cthulhu 7e)

> **Este é o ÚNICO documento oficial de verdade do projeto.** Ele substitui qualquer
> roadmap, backlog, plano de melhorias ou direcionamento anterior. Nenhum documento futuro
> redefine prioridades/roadmap/arquitetura sem solicitação explícita do proprietário.
>
> Os demais documentos (`CLAUDE.md`, `ARQUITETURA_V3.md`, `TODO_AUDIT_CoC7e.md`,
> `CONSTITUICAO_OPERACIONAL_V1.md`) são **subordinados** a este. As **decisões de
> arquitetura** (Vanilla zero-build, Preact Signals vendado, Supabase como transporte,
> offline-first) e a **Constituição operacional** permanecem válidas — esta diretriz as
> **estende**, não as contradiz. As **seções de roadmap** dos docs antigos estão **superadas**.

Última atualização: 2026-06-01.

---

## 0. Processo obrigatório (antes de qualquer implementação)

1. Auditar o estado atual do código.
2. Comparar com esta diretriz.
3. Identificar divergências.
4. Atualizar esta documentação oficial (incl. **Changelog**, §8).
5. Executar a alteração.

**Política de desenvolvimento:** após cada alteração → (1) rodar testes automatizados
(`node js/tests/runner.js`, agora com gate em CI), (2) validar funcionamento, (3) atualizar
este doc, (4) integrar ao ramo principal após validação (via PR). **Proibido:** criar
funcionalidade fora deste roadmap; reimplementar o que já existe (ver §7); decidir com base
em doc desatualizado; introduzir múltiplas fontes de verdade.

---

## 1. Visão do produto

Evoluir de uma ficha digital para uma **plataforma completa de gestão de campanhas de CoC 7e**:
Investigadores · Mestre · **Multiplayer online** · Dashboard de campanha · Biblioteca de regras
· Controle de combate · Registro de eventos · Gestão de lore.

## 2. Prioridade estratégica máxima — MULTIPLAYER ONLINE GRATUITO

Toda decisão arquitetural futura deve considerar: sincronização em tempo real, comunicação
remota, compatibilidade entre dispositivos, **persistência de campanha**, reconexão automática,
**operação gratuita** para os usuários.

**Requisitos:** Jogadores entram remotamente, atualizam ficha em tempo real, compartilham
eventos, recebem atualizações do Mestre. Mestre monitora a mesa, aplica alterações, gerencia
encontros/NPCs, registra eventos. **Persistência:** a campanha não pode sumir quando todos
desconectam → Event Log persistente + snapshot de campanha + reconexão + sincronização
incremental.

> **Princípio arquitetural travado para a Fase M:** sincronizar **EVENTOS/intents**, nunca
> "state inteiro". Assim Timeline, Lore, Diário, Dashboard e Replay derivam da mesma fundação.
> Essa fundação **já existe** (`js/core/event-log.js`, `event-ontology.js`, `replay-consumer.js`,
> `executor.js`, `session-export.js`); a Fase M consolida e leva ao remoto **sem trocar o modelo**.

## 3. Reestruturação da Ficha do Investigador

- **Imagem única**: o retrato existe **uma só vez** (proibida duplicação em cartões/cabeçalhos/painéis).
- **Desktop real** (não mobile ampliado): usar a largura para narrativa (história, personalidade,
  convicções, crenças, pessoas importantes, anotações); reduzir scroll.
- **Atributos** (FOR, CON, TAM, DES, APA, INT, POD, EDU): refazer o componente — destaque,
  espaçamento, legibilidade, consistência desktop/mobile.
- **Edição**: todos os atributos editáveis; alterações persistem, atualizam o store, respeitam
  o fluxo oficial de dados.
- **Rolagem de atributos**: painel **retrátil** (abrir → escolher atributo → escolher dificuldade
  → rolar), reusando a engine das perícias, sem ocupar espaço permanente, desktop+mobile.

## 4. Ocupações personalizadas (bug crítico)

Uma ocupação personalizada deve se comportar **exatamente** como uma oficial: sem perda de
pontos, duplicação ou inconsistência após reload/importação/sincronização. Auditoria completa
dos fluxos: criação, edição, persistência, redistribuição, recálculo. **Testes automatizados
específicos obrigatórios.**

## 5. Remoção do personagem padrão (Klein Moretti)

Remover completamente qualquer carregamento de "Klein Moretti". Ao iniciar: ficha limpa ou
**assistente de criação** (o sistema já tem criação rápida/templates).

## 6. Reestruturação da Ferramenta do Mestre

Mesmo padrão organizacional do Investigador. Corrigir sobreposição visual, nome de NPC vertical
na visão completa, responsividade (desktop/tablet/mobile). **Estrutura em 7 abas:**

1. **Investigadores** — visão completa (nome, retrato, PV, SAN, PM, Sorte, condições, status).
2. **Compêndio** — biblioteca integrada (regras, armas, equipamentos, itens, custos, preços, tabelas).
3. **NPCs** — gestão de NPCs/aliados/antagonistas/criaturas.
4. **Encontro e Combate** — adicionar investigadores/NPCs/criaturas; controlar iniciativa, dano,
   armadura, munição, condições, ferimentos graves, morte.
5. **Timeline e Event Log** — registro cronológico (rolagens/ações/alterações/eventos), persistente.
6. **Lore da Campanha** — wiki interna (facções, mistérios, locais, pistas, cronologia, personagens).
7. **Diário do Mestre** — anotações livres (planejamento/ideias/preparação), separado da Lore.

**Dashboard central do Mestre:** visão completa da mesa em tempo real — Investigadores
(PV/SAN/PM/Sorte/condições), Campanha (eventos/timeline/atividade), Combate (iniciativa/
participantes/status), Entidades (NPCs/monstros/aliados), Controle (dano/cura/condições/sessão).

## 7. Biblioteca oficial de regras e equipamentos

Referência integrada de CoC 7e. **Armas** (nome, dano, alcance, munição, custo, descrição);
**Equipamentos** (nome, categoria, peso, custo, descrição); **Economia** (preços, hospedagem,
alimentação, serviços, transporte); **Regras** (tabelas, referências, modificadores, custos,
danos). **Integração com a ficha:** ao adicionar armas/equipamentos/itens → (1) selecionar
existente ou (2) criar personalizado; a biblioteca é priorizada.

---

## Roadmap por fases (ordem aprovada pelo arquiteto)

| Ordem | Fase | Objetivo | Entregáveis-chave | Depende de |
|---|---|---|---|---|
| 1 | **G** Governança | Doc único + verdade | Esta diretriz, docs subordinados, fatos corrigidos, CI | — |
| 2 | **B** Quick wins/bugs | Estabilizar dados/UX | Klein, imagem única, ocupação personalizada (+testes), **B1** atributos (correção FUNCIONAL) + painel de rolagem | G |
| 3 | **M** Multiplayer durável **grátis** *(prioridade máx.)* | Campanha não some | **Event Sourcing leve** (eventos/intents, nunca state inteiro): EventLog persistente + snapshot + sync incremental + reconexão/fila offline (Supabase free) | B |
| 4 | **RI** Reestruturar Investigador | Desktop real | Layout p/ narrativa + **redesign visual dos atributos** + menos scroll | M |
| 5 | **RK** Reestruturar Keeper | 7 abas + correções | As 7 abas; fim de sobreposição/nome vertical; responsivo | M |
| 6 | **D** Dashboard do Mestre | Mesa ao vivo | Vitais/condições/eventos/iniciativa/entidades/controle | **RK** |
| 7 | **L** Biblioteca integrada | Referência CoC7e | Armas/equip./economia/regras + "selecionar \| criar" na ficha | **M** |
| 8 | **C** Combate avançado | Defesa/oposição | Dodge/Fight Back/Opposed, manobras (Build×Build), range bands | RK, D |
| ↻ | **Q** Qualidade contínua | Confiança | Gate CI (G), testes de ocupação/combate, E2E, regressão de migração | transversal |

**Sequência macro:** G → B → **M** → RI → RK → D → L → C, com **Q** transversal.

---

## §7-bis. Já implementado (NÃO reimplementar)

Auditoria de 2026-06-01 contra o código (não contra docs antigos):

- **`validateCharacter` está ATIVO** (boot e persistência via `js/shared/validators.js`).
- **Re-roll de Sorte para jovens 15-19**: feito (`js/investigator.js:570-582`).
- **Ajuste de atributos por idade**: parcial — `calcAgeAdjustments` calcula e é aplicado no
  `rollAllAttributes`; **resíduos** (Fase RI/B2): tiers de APA divergem do livro, distribuição
  é automática (não interativa), caminho de idade manual só mostra toast.
- **Core reativo (M1-M3 dos docs antigos)**: store/signals/bus/executor/event-log/views já existem.
- **Multiplayer local** (BroadcastChannel) e **Supabase Realtime Model A** (sem persistência) existem.
- **Dado**: usa `crypto.getRandomValues` (`dice.js`), com fallback `Math.random` só offline.

---

## §8. Changelog (estado anterior · atual · impacto · próxima etapa)

### 2026-06-01 — Sessão 1 (Fases G + B)

**Governança (G)**
- *Anterior:* docs em conflito (`CLAUDE.md` dizia cache "v5" e "M1 é o próximo"; testes ditos
  "manuais"); sem fonte única; sem gate de CI.
- *Atual:* esta diretriz vira fonte oficial; docs antigos subordinados; `CLAUDE.md` corrigido
  (cache **v22→v23**, status real, árvore de pastas, suíte Node de 16+1 testes); CI
  (`.github/workflows/ci.yml`) roda `node js/tests/runner.js` em push/PR.
- *Impacto:* fim da ambiguidade documental; regressões barradas por CI.
- *Próxima etapa:* manter changelog a cada mudança.

**Klein Moretti removido (B)**
- *Anterior:* botão "📜 Klein", opção do wizard e `presets/klein-moretti.js` carregavam o exemplo.
- *Atual:* botão, opção do wizard, `<script>` e entrada de precache removidos; preset deletado;
  boot sem personagem → assistente de criação.
- *Impacto:* início limpo; sem ficha de exemplo imposta.
- *Próxima etapa:* —

**Imagem única (B)**
- *Anterior:* retrato renderizado 2× (`#portrait-main` + espelho `#character-portrait` na sidebar).
- *Atual:* mantido só o `#portrait-main`; espelho removido.
- *Impacto:* sem redundância visual.
- *Próxima etapa:* reposicionamento definitivo no redesign desktop (Fase RI).

**Ocupação personalizada (B)**
- *Anterior:* migração v2→v3 renomeava perícias em `skills`/armas, mas **não** em
  `occupationSkills` → após reload, perícias livres da ocupação deixavam de casar e os pontos
  eram recontados como Interesse Pessoal (erro de distribuição).
- *Atual:* migração v3 também renomeia `occupationSkills`; novo `js/tests/test-occupation.js`
  trava o contrato de pontos (cálculo, contexto, atribuição, idempotência a reload).
- *Impacto:* distribuição estável após reload/importação para ocupações personalizadas e oficiais.
- *Próxima etapa:* validação em navegador dos fluxos de UI de criação/edição (Fase B/RI).

**Atributos — correção funcional + painel de rolagem (B1)**
- *Anterior:* edição `contenteditable` frágil (zerava em blur vazio); sem rolagem por atributo na sessão.
- *Atual:* parse robusto (sanitiza dígitos, blur vazio mantém valor); painel retrátil de rolagem
  reusando `window.CoC.views.rolls.rollAttribute`.
- *Impacto:* atributos editáveis com segurança; rolagem disponível desktop/mobile.
- *Próxima etapa:* redesign visual do componente (tamanho/grid/legibilidade) na Fase RI.

### 2026-06-01 — Sessão 2 (Fase RI — layout desktop do Investigador, conforme mockup do proprietário)

- *Anterior:* retrato ocupava uma coluna na seção de identidade (`portrait-bg-layout`);
  edição/atributos no sidebar; narrativa comprimida ao lado do retrato.
- *Atual:* **retrato único no topo da sidebar**; **botão "Editar Investigador"** no rodapé da
  sidebar; **vitais como pills coloridas** (PV vermelho · SAN azul · PM roxo · Sorte verde, com
  ícones); **atributos em grade 2 colunas** (≥901px) com valor em destaque. Aba **Personagem**
  reorganizada para usar a largura: Identidade (esq.) + Conceito/Traço de Personalidade/Hobbies
  (dir.) → **Background** em largura total → **Convicções · Crenças · Pessoas Importantes** em 3
  colunas → demais campos CoC (locais, posses, ferimentos, fobias, tomos, encontros, equipamento)
  num painel recolhível "Mais detalhes". Dois campos novos em `background`: `hobbies`, `convictions`.
- *Impacto:* layout desktop real (menos scroll, narrativa usando a largura), imagem única,
  atributos legíveis. Nenhum campo perdido (todos preservados/realocados).
- *Próxima etapa:* **verificação em navegador** do layout; depois seguir para a **Fase M**
  (multiplayer durável). Pendente da RI: refinamento fino de espaçamentos e ajuste do tier de APA.

### 2026-06-01 — Sessão 3 (Fase M — fundação da persistência durável)

- *Anterior:* multiplayer era "Model A" (Supabase Realtime broadcast-only); eventos evaporavam na
  desconexão; campanha só em sessionStorage (some ao fechar). Sem tabelas, RLS, fila offline ou replay-from-DB.
- *Atual:* design oficial em `FASE_M_ARQUITETURA.md` (Supabase compartilhado, PIN, RLS robusto).
  `supabase/schema.sql`: tabelas `campaigns` / `campaign_members` / `campaign_events` /
  `investigator_snapshots` + RLS por associação + RPCs `create_campaign`/`join_campaign` + eventos
  sagrados só do host. `js/campaign/campaign-persistence.js`: lógica desacoplada (client + storage
  injetados) — seq monotônico, dedupe/idempotência, late-join (snapshot + eventos > cursor) e outbox;
  coberta por `test-campaign-persistence.js`.
- *Impacto:* fundação **testável** (778/778) para campanha durável, sem depender de infra ao vivo.
- *Próxima etapa (M-live):* vendar o SDK Supabase, adapters reais (Supabase + IndexedDB),
  `useSupabase:true`, fiação em `supabase-transport`/`player-sync`, e verificação com projeto real.

### 2026-06-01 — Sessão 4 (Fase M — adapters live + outbox)

- *Anterior:* só a lógica pura de persistência (sem adapters concretos).
- *Atual:* `js/campaign/supabase-persistence-adapter.js` (contrato → supabase-js: insert/select/
  upsert + auth anônimo + RPCs `create_campaign`/`join_campaign`) e `js/campaign/outbox-indexeddb.js`
  (fila offline durável — cache síncrono + IndexedDB; fallback de memória). `.mcp.json` (MCP do
  Supabase) já na main. Verificação: **784/784** no CI (inclui outbox) + `node js/tests/mlive-integration.js`
  **14/14** (fluxo durável ponta-a-ponta com mock supabase-js: online/offline/drain/idempotência/snapshot/late-join).
- *Impacto:* camada de persistência completa e **verificada por mock**; falta só a fiação ao vivo.
- *Próxima etapa (go-live; exige o projeto Supabase do dono):* habilitar Anonymous sign-ins, rodar
  `schema.sql`, vendar o SDK, incluir os `<script>`, conectar em `supabase-transport`/`player-sync`,
  `useSupabase:true` + chaves, validar no navegador. `useSupabase` segue **desligado** (app intacto em modo local).

### 2026-06-01 — Sessão 5 (Fase RK — Keeper em 7 abas)

- *Anterior:* Keeper em grid de 3 colunas fixo (biblioteca/workspace/encontro+timeline+log); sem
  abas; sem Lore nem Diário do Mestre; Compêndio em página separada.
- *Atual:* `keeper.html` reorganizado em **7 abas** (Investigadores · Compêndio · NPCs · Encontro ·
  Timeline · Lore · Diário) **preservando todos os ids** (keeper.js intacto). `js/keeper-tabs.js`
  (controlador de abas, lembra a última) e `js/keeper-notes.js` (Lore por categoria + Diário,
  persistidos em localStorage). Compêndio embutido via iframe. Correção do nome de item de encontro
  (nowrap/ellipsis); sobreposição resolvida estruturalmente (sem coluna sticky). sw cache v24→v25.
- *Impacto:* ferramenta do Mestre organizada por abas; Lore e Diário ganham espaço próprio e durável.
- *Próxima etapa (RK-2):* condições/retrato na aba Investigadores; iniciativa/munição/ferimentos na
  de Combate; dados de equipamentos/preços no Compêndio; entrada manual na Timeline. Requer
  verificação visual em navegador.

---

## §9. Critérios de sucesso (da diretriz)

Multiplayer online como prioridade · Dashboard do Mestre implementado · Keeper em abas · Layout
do Investigador corrigido · Atributos editáveis e legíveis · Rolagem de atributos disponível ·
Klein não carregado automaticamente · Biblioteca integrada à ficha · Bug de ocupação
personalizada eliminado · Fonte oficial única · Evolução registrada consistentemente · Sistema
preparado para evolução contínua sem ambiguidade arquitetural.
