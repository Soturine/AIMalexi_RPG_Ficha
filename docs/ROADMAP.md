# Roadmap do Projeto

Este roadmap resume prioridades praticas para evoluir o AIMalexi RPG Ficha sem
quebrar a compatibilidade com GitHub Pages nem alterar regras de jogo sem
necessidade.

Fonte hierarquica: `Melhorias/DIRETRIZ_OFICIAL_V1.md` continua sendo a diretriz
historica mais detalhada do projeto. Este arquivo e um resumo operacional
atualizado para manutencao e contribuicao.

## Estado Atual Resumido

- Projeto estatico, sem build obrigatorio.
- Paginas principais existentes: `index.html`, `investigator.html`,
  `keeper.html`, `guia-iniciante.html`, `compendium.html`.
- Persistencia local implementada em `js/engine/storage.js`.
- Exportacao/importacao JSON existe para personagem e biblioteca do Guardiao.
- PWA existe, mas deve ser tratado como parcial/em validacao.
- Multiplayer remoto existe como transporte Realtime, mas campanha duravel
  ainda esta em desenvolvimento.
- Suite Node existe, mas a auditoria de 2026-06-07 encontrou 16 falhas
  pre-existentes: `872/888 passed`.

## Prioridade 0 - Governanca e Documentacao

Status: em andamento.

- Manter README alinhado ao estado real do codigo.
- Manter este roadmap curto e acionavel.
- Manter `AGENTS.md` como guia para futuros agentes de IA.
- Registrar mudancas relevantes em `CHANGELOG.md`.
- Evitar promessas absolutas sobre PWA, multiplayer, PDF ou regras enquanto
  nao houver verificacao manual/automatizada.

## Prioridade 1 - Estabilizacao da Qualidade

Objetivo: voltar a ter uma base confiavel para evolucao.

- Corrigir ou documentar as 16 falhas atuais da suite Node.
- Separar testes que falham por backlog conhecido de testes que deveriam ser
  gate de regressao.
- Adicionar verificacao simples de links locais em CI ou script documentado.
- Conferir a lista de arquivos em `sw.js` contra scripts e estilos carregados
  nos HTMLs.
- Validar manualmente as cinco paginas principais em desktop e mobile.

## Prioridade 2 - Backup, Offline e Publicacao

Objetivo: proteger dados de mesa e reduzir surpresa para usuarios.

- Testar exportacao/importacao de personagem com e sem imagem.
- Testar exportacao/importacao da biblioteca do Guardiao.
- Documentar fluxo de recuperacao quando `IndexedDB` ou `localStorage` falham.
- Validar service worker em `localhost` e GitHub Pages.
- Vendar ou remover dependencia runtime de CDN antes de anunciar offline
  completo.

## Prioridade 3 - Multiplayer Duravel

Objetivo: transformar campanha remota em recurso persistente, nao apenas
Realtime efemero.

- Confirmar estado real de `js/config.js`, Supabase e RLS.
- Integrar event log duravel, snapshots e replay com o fluxo do Guardiao.
- Usar fila offline/reconexao para eventos de campanha.
- Definir autoridade do Guardiao para eventos sensiveis.
- Validar com testes de mock e teste manual em dois navegadores/dispositivos.

## Prioridade 4 - UX do Investigador e do Guardiao

Objetivo: deixar fluxos principais mais claros sem reescrever a arquitetura.

- Reduzir atrito na criacao do investigador.
- Melhorar mensagens de backup e importacao.
- Refinar dashboard do Guardiao e estados vazios.
- Validar responsividade em mobile/tablet/desktop.
- Evitar menus profundos para acoes criticas de mesa.

## Prioridade 5 - Compendio e Biblioteca

Objetivo: oferecer referencia de mesa util sem copiar material proprietario.

- Expandir dados de armas/equipamentos com texto original e curto.
- Integrar melhor selecao de itens/armas com ficha e Guardiao.
- Remover ou reescrever qualquer trecho que pareca copia longa de livro oficial.
- Manter a documentacao clara de que o compendio nao substitui o livro basico.

## Prioridade 6 - Combate e Regras Avancadas

Objetivo: automatizar apenas onde houver ganho claro e baixo risco.

- Tracker de iniciativa completo.
- Fluxos de defesa/oposicao quando aplicavel.
- Municao, armadura e ferimentos graves com feedback claro.
- Testes unitarios para qualquer calculo ou regra automatizada.

## Fora de Escopo por Enquanto

- Transformar o projeto em VTT completo.
- Mapas, tokens, iluminacao dinamica ou automacao pesada de mesa.
- Frameworks grandes ou build obrigatorio.
- Conteudo proprietario longo, aventuras oficiais ou PDFs.

## Checklist de Pronto Para Publicar

- [ ] `git status` limpo antes do push.
- [ ] Links locais principais verificados.
- [ ] README e changelog atualizados se o status mudou.
- [ ] `node js/tests/runner.js` executado ou falha baseline registrada.
- [ ] Teste manual minimo: portal, investigador, Guardiao, guia e compendio.
- [ ] Exportacao/importacao testada quando o fluxo de dados foi tocado.
- [ ] PWA/offline testado quando `manifest.json`, `sw.js`, HTML, JS ou CSS
  mudaram.
