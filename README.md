# AIMalexi RPG Ficha

Ferramenta web estática em PT-BR para apoiar criação e gerenciamento de fichas de
**Chamado de Cthulhu 7ª Edição**. O projeto roda no navegador, sem etapa de
build e sem dependências obrigatórias de Node para uso normal.

> A verdade não enlouquece. Ela apenas revela o que sempre esteve à espreita.

Site público, quando publicado pelo GitHub Pages:

https://m4alexii.github.io/AIMalexi_RPG_Ficha/

## Preview

Tour rápido pelas telas principais:

![Tour rápido do AIMalexi RPG Ficha](assets/screenshots/tour.gif)

| Portal | Ficha do Investigador |
|---|---|
| <img src="assets/screenshots/home.png" alt="Portal inicial do AIMalexi RPG" width="420"> | <img src="assets/screenshots/investigator.png" alt="Ficha do Investigador com atributos e dados principais" width="420"> |

| Centro do Guardião | Compêndio |
|---|---|
| <img src="assets/screenshots/keeper.png" alt="Centro de Campanha do Guardião" width="420"> | <img src="assets/screenshots/compendium.png" alt="Compêndio de referência" width="420"> |

## Acesso Rápido

- [Portal inicial](index.html)
- [Ficha do Investigador](investigator.html)
- [Centro do Guardião](keeper.html)
- [Guia do Iniciante](guia-iniciante.html)
- [Compêndio](compendium.html)
- [Roadmap](docs/ROADMAP.md)
- [Guia para agentes de IA](AGENTS.md)
- [Changelog](CHANGELOG.md)
- [Deploy](DEPLOY.md)

## Status do Projeto

Este README separa o que está pronto do que ainda está em desenvolvimento. O
projeto já tem uma base grande de código, testes e documentação, mas alguns
fluxos continuam em evolução.

### Funcionalidades Prontas

- **Portal inicial** em `index.html`, com acesso para investigador, Guardião,
  guia do iniciante e compêndio.
- **Ficha do Investigador** em `investigator.html`, com criação/edição de
  personagem, atributos, perícias, rolagens, vitais, inventário, diário, magias,
  tomos, finanças, temas e impressão/salvar como PDF pelo navegador.
- **Persistência local** via `IndexedDB`, com fallback para `localStorage` e,
  em último caso, memória durante a sessão.
- **Exportação e importação JSON de personagens**, incluindo suporte para backup
  portátil de imagens quando possível.
- **Exportação de sessão** pela ficha do investigador, com trace/eventos da
  sessão.
- **Ferramenta do Guardião** em `keeper.html`, com NPCs/criaturas, biblioteca
  local, encontro, timeline/log, Lore, diário e visão de campanha em abas.
- **Exportação e importação JSON da biblioteca do Guardião**.
- **Guia do Iniciante** em `guia-iniciante.html` e `GUIA-INICIANTE.md`.
- **Compêndio de referência** em `compendium.html`, com busca e seções resumidas.
- **Suíte de testes Node sem dependências externas** em `js/tests/runner.js`,
  coberta por workflow de CI em `.github/workflows/ci.yml`.

### Em Desenvolvimento

- **PWA/offline**: `manifest.json` e `sw.js` existem e registram um service
  worker cache-first para os assets locais principais. O modo offline deve ser
  tratado como parcial/em validação porque o multiplayer remoto depende de
  Supabase e o HTML ainda carrega o SDK do Supabase via CDN.
- **Multiplayer/campanhas remotas**: há transporte por `BroadcastChannel` e
  Supabase Realtime. A persistência durável de campanha ainda está em evolução;
  há fundação em `js/campaign/`, `supabase/schema.sql` e testes de mock, mas
  não trate isso como campanha online durável finalizada.
- **Dashboard do Guardião**: existem resumos e estruturas de campanha, mas
  vários fluxos ainda estão sendo refinados.
- **Compêndio/biblioteca integrada**: já há dados e consulta, mas isso não
  substitui livro, SRD ou biblioteca oficial.

### Funcionalidades Planejadas

- Multiplayer durável gratuito com event log persistente, snapshot, reconexão e
  fila offline.
- Melhor integração entre Guardião e investigadores para eventos, dano,
  encontros e timeline.
- Biblioteca ampliada de equipamentos, preços, armas e referências resumidas.
- Fluxos de combate avançado, como iniciativa completa, defesa/oposição,
  munição, armadura e ferimentos graves automatizados.
- Testes E2E/visuais para os fluxos principais no navegador.

### Limitações Conhecidas

- Dados salvos no navegador podem ser perdidos se o usuário limpar cache,
  `IndexedDB` ou `localStorage`. Use exportação JSON regularmente.
- Recursos de campanha remota dependem de internet, Supabase e configuração
  correta de `js/config.js`.
- O PWA não deve ser anunciado como "100% offline" enquanto o SDK remoto e os
  fluxos de instalação/cache não forem validados em todos os caminhos.
- Algumas regras e fluxos de jogo seguem em backlog. Consulte
  `Melhorias/TODO_AUDIT_CoC7e.md`, [docs/ROADMAP.md](docs/ROADMAP.md) e
  [docs/AUDITORIA_CLEAN_CODE.md](docs/AUDITORIA_CLEAN_CODE.md).

## Como Rodar Localmente

Não há build step. Para apenas usar a ferramenta:

1. Baixe ou clone o repositório.
2. Abra `index.html` no navegador.
3. Navegue para a ficha desejada.

Para uma experiência mais parecida com GitHub Pages, especialmente ao testar
service worker/PWA, use um servidor local:

```powershell
python -m http.server 8765
```

Depois abra:

```text
http://localhost:8765/
```

Observações:

- Abrir por duplo clique (`file://`) funciona para boa parte da ficha, mas
  service workers exigem `http://localhost` ou HTTPS.
- Não é necessário rodar `npm install`.
- Para executar a suíte automatizada:

```powershell
node js/tests/runner.js
```

Na auditoria de 2026-06-07, a suíte local passou com `889/889`.

## Publicação no GitHub Pages

O projeto é compatível com GitHub Pages porque é estático e usa caminhos
relativos.

Fluxo recomendado:

1. Mantenha a versão publicada em `main`.
2. No GitHub, abra **Settings > Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione branch `main` e pasta `/ (root)`.
5. Salve e aguarde a publicação.

Depois de um push para `main`, o site deve atualizar em alguns minutos:

```text
https://m4alexii.github.io/AIMalexi_RPG_Ficha/
```

Se alterar arquivos JS/CSS/HTML importantes e quiser que eles fiquem disponíveis
no cache offline, revise `PRECACHE_URLS` em `sw.js` e incremente
`CACHE_VERSION`.

## Backup, Exportação e Importação

### Investigador

- Use **Exportar JSON** na ficha do investigador para baixar um backup do
  personagem.
- Use **Importar JSON** para restaurar um personagem exportado.
- Use **Sessão** para exportar um JSON da sessão com eventos/trace quando esse
  dado for relevante para auditoria ou replay.
- Retratos/imagens podem ser armazenados como Blob no `IndexedDB`; na
  exportação, o código tenta embutir dados portáteis quando possível.

### Guardião

- Use **Exportar** na ferramenta do Guardião para salvar a biblioteca local.
- Use **Importar** para mesclar uma biblioteca JSON.

### Boas Práticas

- Exporte personagens ao fim de cada sessão.
- Guarde backups fora do navegador.
- Antes de limpar cache/dados do navegador, exporte personagens e biblioteca.
- Ao testar importação, confirme nome, atributos, perícias, inventário e imagens.

## PWA e Modo Offline

O projeto possui:

- `manifest.json`
- registro de service worker nas páginas principais
- `sw.js` com estratégia cache-first
- cache dos arquivos locais carregados pelo shell principal

Estado atual: **em desenvolvimento/parcial**.

O uso local básico tende a funcionar sem rede depois que os arquivos foram
carregados e cacheados, mas há ressalvas:

- multiplayer remoto não funciona offline;
- o SDK Supabase ainda é carregado por CDN em `investigator.html` e
  `keeper.html`;
- a lista de precache precisa ser mantida sempre que novos arquivos entram;
- testes manuais de instalação PWA/offline ainda devem ser feitos antes de
  anunciar suporte completo.

## Estrutura do Projeto

```text
AIMalexi_RPG_Ficha/
|-- index.html              Portal inicial
|-- investigator.html       Ficha do Investigador
|-- keeper.html             Ferramenta do Guardião
|-- compendium.html         Compêndio de referência
|-- guia-iniciante.html     Guia renderizado em HTML
|-- GUIA-INICIANTE.md       Versão Markdown do guia
|-- README.md               Visão geral do projeto
|-- DEPLOY.md               Guia de publicação/manutenção
|-- CLAUDE.md               Notas históricas para Claude Code
|-- AGENTS.md               Instruções atuais para agentes de IA
|-- CHANGELOG.md            Histórico resumido de mudanças
|-- manifest.json           Manifesto PWA
|-- sw.js                   Service worker/cache
|-- css/                    Estilos das páginas e tema
|-- js/                     Engine, UI, core reativo, campanha e testes
|-- data/                   Dados JS: perícias, ocupações, bestiário, armas etc.
|-- docs/                   Roadmap, auditorias e documentação auxiliar
|-- assets/                 Assets, screenshots e templates opcionais
|-- baseline/               Baselines de personagens/testes manuais
|-- supabase/               Schema SQL para a camada de campanha
|-- Melhorias/              Diretrizes, arquitetura e auditorias históricas
```

## Checklist de Teste Manual

- [ ] Abrir `index.html`.
- [ ] Abrir `investigator.html`.
- [ ] Criar ou carregar um investigador.
- [ ] Rolar atributo/perícia e conferir o log.
- [ ] Exportar personagem JSON.
- [ ] Importar o JSON exportado.
- [ ] Testar impressão/salvar como PDF pelo navegador.
- [ ] Abrir `keeper.html`.
- [ ] Gerar NPC ou criar criatura.
- [ ] Exportar/importar biblioteca do Guardião.
- [ ] Abrir `guia-iniciante.html`.
- [ ] Abrir `compendium.html`.
- [ ] Em servidor local, testar carregamento com service worker.
- [ ] Depois de cacheado, testar comportamento offline básico.

## Como Contribuir

- Mantenha o projeto estático, simples e compatível com GitHub Pages.
- Evite frameworks pesados ou build obrigatório.
- Não altere regras, cálculos ou comportamento da ficha sem necessidade clara e
  teste correspondente.
- Antes de mudar dados de jogo em `data/`, confira impacto em ficha, compêndio,
  Guardião e testes.
- Rode ao menos:

```powershell
node js/tests/runner.js
```

- Se a suíte estiver falhando por baseline, registre isso no resumo da mudança.
- Teste manualmente as páginas principais listadas acima.
- Atualize [docs/ROADMAP.md](docs/ROADMAP.md) ou [CHANGELOG.md](CHANGELOG.md)
  quando a mudança alterar status, prioridade ou comportamento.

## Aviso Legal

Este projeto é **não oficial**. Ele não é afiliado, aprovado ou endossado pela
Chaosium Inc., New Order Editora ou qualquer detentor de direitos de
**Call of Cthulhu / Chamado de Cthulhu**.

Esta ferramenta não substitui o livro básico nem materiais oficiais. Ela deve
ser usada como apoio de mesa e ficha digital.

Contribuições não devem reproduzir textos proprietários longos, aventuras
oficiais, arte oficial, tabelas extensas copiadas, PDFs, trechos protegidos ou
conteúdo licenciado sem permissão. Prefira resumos originais, dados mecânicos
necessários para a ficha e referências curtas.

## Licença

O código do projeto está sob licença MIT. Veja [LICENSE](LICENSE).
