# Roadmap do Projeto

Este roadmap resume prioridades práticas para evoluir o AIMalexi RPG Ficha sem
quebrar a compatibilidade com GitHub Pages nem alterar regras de jogo sem
necessidade.

Fonte hierárquica: `Melhorias/DIRETRIZ_OFICIAL_V1.md` continua sendo a diretriz
histórica mais detalhada do projeto. Este arquivo é um resumo operacional
atualizado para manutenção e contribuição.

## Estado Atual Resumido

- Projeto estático, sem build obrigatório.
- Páginas principais existentes: `index.html`, `investigator.html`,
  `keeper.html`, `guia-iniciante.html`, `compendium.html`.
- Persistência local implementada em `js/engine/storage.js`.
- Exportação/importação JSON existe para personagem e biblioteca do Guardião.
- PWA existe, mas deve ser tratado como parcial/em validação.
- Multiplayer remoto existe como transporte Realtime, mas campanha durável ainda
  está em desenvolvimento.
- Suíte Node passou na auditoria de 2026-06-07 com `889/889`.
- Relatório de arquitetura e clean code: `docs/AUDITORIA_CLEAN_CODE.md`.

## Prioridade 0 - Governança e Documentação

Status: em andamento.

- Manter README alinhado ao estado real do código.
- Manter este roadmap curto e acionável.
- Manter `AGENTS.md` como guia para futuros agentes de IA.
- Registrar mudanças relevantes em `CHANGELOG.md`.
- Evitar promessas absolutas sobre PWA, multiplayer, PDF ou regras enquanto não
  houver verificação manual/automatizada.

## Prioridade 1 - Estabilização da Qualidade

Objetivo: preservar a suíte verde e reduzir risco de regressão.

- Tratar qualquer nova falha em `node js/tests/runner.js` como regressão.
- Adicionar verificação simples de links locais em CI ou script documentado.
- Conferir a lista de arquivos em `sw.js` contra scripts e estilos carregados
  nos HTMLs sempre que o shell mudar.
- Validar manualmente as cinco páginas principais em desktop e mobile.
- Criar testes E2E/visuais leves para os fluxos críticos.

## Prioridade 2 - Backup, Offline e Publicação

Objetivo: proteger dados de mesa e reduzir surpresa para usuários.

- Testar exportação/importação de personagem com e sem imagem.
- Testar exportação/importação da biblioteca do Guardião.
- Documentar fluxo de recuperação quando `IndexedDB` ou `localStorage` falham.
- Validar service worker em `localhost` e GitHub Pages.
- Vendar ou remover dependência runtime de CDN antes de anunciar offline
  completo.

## Prioridade 3 - Redução Gradual de Complexidade

Objetivo: preparar o código para manutenção longa sem refatoração gigante.

- Quebrar `js/core/store.js` em reducers/helpers menores quando houver testes
  cobrindo o comportamento.
- Separar responsabilidades de boot, toolbar, rolagens e persistência em
  `js/investigator.js`.
- Separar biblioteca, workspace, encontros e log em `js/keeper.js`.
- Reduzir repetição de renderização em `js/views/*.js` usando helpers pequenos e
  locais.
- Medir impacto antes de memoizar ou criar índices auxiliares.

## Prioridade 4 - Multiplayer Durável

Objetivo: transformar campanha remota em recurso persistente, não apenas
Realtime efêmero.

- Confirmar estado real de `js/config.js`, Supabase e RLS.
- Integrar event log durável, snapshots e replay com o fluxo do Guardião.
- Usar fila offline/reconexão para eventos de campanha.
- Definir autoridade do Guardião para eventos sensíveis.
- Validar com testes de mock e teste manual em dois navegadores/dispositivos.

## Prioridade 5 - UX do Investigador e do Guardião

Objetivo: deixar fluxos principais mais claros sem reescrever a arquitetura.

- Reduzir atrito na criação do investigador.
- Melhorar mensagens de backup e importação.
- Refinar dashboard do Guardião e estados vazios.
- Validar responsividade em mobile/tablet/desktop.
- Evitar menus profundos para ações críticas de mesa.

## Prioridade 6 - Compêndio e Biblioteca

Objetivo: oferecer referência de mesa útil sem copiar material proprietário.

- Expandir dados de armas/equipamentos com texto original e curto.
- Integrar melhor seleção de itens/armas com ficha e Guardião.
- Remover ou reescrever qualquer trecho que pareça cópia longa de livro oficial.
- Manter a documentação clara de que o compêndio não substitui o livro básico.

## Prioridade 7 - Combate e Regras Avançadas

Objetivo: automatizar apenas onde houver ganho claro e baixo risco.

- Tracker de iniciativa completo.
- Fluxos de defesa/oposição quando aplicável.
- Munição, armadura e ferimentos graves com feedback claro.
- Testes unitários para qualquer cálculo ou regra automatizada.

## Fora de Escopo por Enquanto

- Transformar o projeto em VTT completo.
- Mapas, tokens, iluminação dinâmica ou automação pesada de mesa.
- Frameworks grandes ou build obrigatório.
- Conteúdo proprietário longo, aventuras oficiais ou PDFs.

## Checklist de Pronto Para Publicar

- [ ] `git status` limpo antes do push.
- [ ] Links locais principais verificados.
- [ ] README e changelog atualizados se o status mudou.
- [ ] `node js/tests/runner.js` executado e passando.
- [ ] Teste manual mínimo: portal, investigador, Guardião, guia e compêndio.
- [ ] Exportação/importação testada quando o fluxo de dados foi tocado.
- [ ] PWA/offline testado quando `manifest.json`, `sw.js`, HTML, JS ou CSS
  mudarem.
