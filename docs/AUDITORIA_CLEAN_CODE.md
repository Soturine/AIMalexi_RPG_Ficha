# Auditoria Clean Code, Arquitetura e Performance

Data: 2026-06-07  
Branch auditada: `codex/auditoria-clean-code-performance`

## Nota Geral

**7,4 / 10**

O projeto está em bom estado para uma aplicação web estática sem build: roda em
GitHub Pages, tem suíte Node sem dependências externas, estrutura de dados
legível e separação crescente entre engine, core, views e campanha. A principal
dívida é a convivência entre arquitetura nova (`js/core/`, executor, event log,
render pipeline) e módulos grandes ainda concentrando boot, UI e persistência.

## Escopo Verificado

- `README.md`, `AGENTS.md`, `CHANGELOG.md`, `docs/ROADMAP.md`, `CLAUDE.md` e
  `DEPLOY.md`.
- Páginas principais: `index.html`, `investigator.html`, `keeper.html`,
  `compendium.html`, `guia-iniciante.html`.
- `sw.js`, `manifest.json`, `js/`, `js/engine/`, `js/core/`, `js/views/`,
  `js/campaign/`, `data/`, `css/`, `docs/` e `Melhorias/`.
- Suíte automatizada `node js/tests/runner.js`.
- Referências locais em `href`/`src` nas páginas principais.
- Cobertura do `PRECACHE_URLS` contra os arquivos locais carregados pelo shell.

## Estado Inicial Encontrado

- A suíte Node falhava com `873/889`, concentrada em proveniência de perícias,
  ontologia de eventos, contrato de arquitetura das views e KPIs do Guardião.
- Links locais principais não tinham arquivos ausentes.
- O service worker tinha três lacunas no precache:
  - `manifest.json`
  - `js/core/replay-consumer.js`
  - `js/core/session-export.js`
- Documentação ainda citava `CACHE_VERSION` antigo, 16 suítes de teste e o
  baseline de falhas que foi corrigido nesta auditoria.

## Pontos Fortes

- Projeto simples de publicar: HTML/CSS/JS estáticos e caminhos relativos.
- Boa cobertura de testes unitários para regras, store, executor, event log,
  replay, exportação de sessão, campanha, outbox e dashboard.
- Engine de regras e dados separada da camada de UI.
- `sw.js` e `manifest.json` já existem e seguem estratégia cache-first para o
  shell local.
- Exportação/importação JSON protege personagens e biblioteca do Guardião.
- Diretrizes históricas em `Melhorias/` ajudam a entender decisões de produto e
  arquitetura.

## Pontos Fracos

- `js/core/store.js`, `js/investigator.js`, `js/keeper.js`,
  `js/engine/storage.js` e algumas views ainda são grandes demais para revisão
  rápida.
- Há acoplamento global via `window.CoC`, prático para um app estático, mas fácil
  de tornar implícito demais.
- Algumas responsabilidades continuam misturadas: boot, binding de UI,
  persistência, renderização e comandos de domínio aparecem no mesmo arquivo.
- O PWA ainda depende de disciplina manual para manter `PRECACHE_URLS`.
- O SDK Supabase ainda é carregado por CDN em fluxos de multiplayer, impedindo
  promessa honesta de offline completo.

## Riscos Técnicos

- Refatorações amplas em `store.js`, `investigator.js` ou `keeper.js` podem
  gerar regressões difíceis de perceber só por inspeção visual.
- Alterações em `storage.js` exigem cuidado com compatibilidade de saves antigos
  e migrações.
- Mudanças em `data/` afetam ficha, compêndio, Guardião e testes.
- O uso de globais facilita carregamento por `<script>`, mas torna ordem de
  scripts e nomes compartilhados parte do contrato.
- Campanha remota ainda precisa de validação forte de persistência, reconexão,
  autoridade do Guardião e fila offline.

## Gargalos de Performance

- Renderizações de listas em views podem reconstruir HTML completo mesmo para
  alterações pequenas; no tamanho atual isso é aceitável, mas pode pesar com
  muitos itens, perícias customizadas, magias, tomos ou eventos.
- `js/engine/storage.js` faz serialização, migração e fallbacks robustos; é
  correto, mas deve ser observado quando imagens grandes forem exportadas ou
  cacheadas.
- `keeper.html`/`js/keeper.js` combinam biblioteca, workspace, encontros e log;
  crescimento de bestiário e timeline pode exigir índices simples ou paginação.
- A camada de campanha/event log deve evitar buscas lineares repetidas quando o
  volume de eventos crescer.

## Complexidades Relevantes

- Maiores arquivos observados:
  - `css/investigator.css`
  - `js/investigator.js`
  - `css/keeper.css`
  - `js/keeper.js`
  - `css/theme.css`
  - `js/engine/storage.js`
  - `js/views/skills.js`
  - `js/core/store.js`
- Funções/blocos que merecem refatoração gradual:
  - `reducer` em `js/core/store.js`
  - `boot` e `rollAllAttributes` em `js/investigator.js`
  - `bindWorkspaceEvents` e fluxos de encontro em `js/keeper.js`
  - `runMigrations` em `js/engine/storage.js`
  - `renderSkills` em `js/views/skills.js`

## Dead Code Removido

Nenhum código foi removido nesta etapa.

Itens como `js/vendor/supabase.js`, `js/sync/`, `test-engine.html`,
`baseline/` e documentos em `Melhorias/` parecem ser placeholders, ferramentas
de apoio ou histórico útil. Sem confiança alta de inutilização, foram mantidos e
registrados como dívida/atenção futura.

## Duplicações Removidas

- Duplicação documental de `SET_ATTRIBUTE` na ontologia foi removida/alinhada,
  mantendo uma definição viva coerente com os testes.

Não houve extração ampla de helpers nesta etapa. A duplicação em views e
handlers deve ser atacada em passos pequenos, com testes e validação visual.

## Bugs Corrigidos

- `computeSkillProvenance` agora usa fallback seguro para bases essenciais de
  perícias quando os dados globais não estão carregados no runner Node.
- A ontologia de eventos foi alinhada ao estado real de `SET_ATTRIBUTE`,
  `ROLL_SKILL` e `PUSH_ROLL`.
- `PUSH_ROLL` deixou de emitir aviso indevido para campos documentados como
  opcionais.
- `js/views/attributes.js` passou a enviar alteração de atributo pelo executor
  em vez de escrever diretamente no store.
- KPIs do Guardião agora retornam `sanAvg`, `hpAvg` e contagem de vivos mais
  explícita.
- `sw.js` passou a cachear todos os arquivos locais carregados pelas páginas
  principais e `CACHE_VERSION` foi atualizado para `v51`.
- `manifest.json` deixou de prometer offline completo.

## Itens Adiados

- Refatorar `store.js` em reducers menores.
- Separar boot, toolbar, rolagens e persistência em `js/investigator.js`.
- Separar biblioteca, workspace, encontros e log em `js/keeper.js`.
- Criar verificação de links/cache como script versionado ou etapa de CI.
- Vendar Supabase ou ajustar estratégia para que o PWA possa ser declarado
  offline com precisão.
- Adicionar testes E2E/visuais para as cinco páginas principais.

## Plano Recomendado

1. Manter `node js/tests/runner.js` verde como gate mínimo.
2. Transformar a checagem de links locais e precache em script reutilizável.
3. Refatorar `store.js` por domínio, um grupo de ações por vez.
4. Extrair funções de boot e binding de `investigator.js` sem alterar HTML.
5. Extrair módulos menores de `keeper.js` começando por biblioteca e encontros.
6. Validar PWA em `localhost` e GitHub Pages após cada alteração no shell.
7. Só anunciar offline completo depois que Supabase/CDN tiver solução clara.

## Validações desta Auditoria

- `node js/tests/runner.js`: `889/889`.
- Links locais das páginas principais: `0` quebrados.
- Cobertura de precache após correção: `0` arquivos locais carregados fora do
  cache e `0` entradas obsoletas.
