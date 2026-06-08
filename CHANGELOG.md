# CHANGELOG

Histórico resumido de mudanças relevantes do AIMalexi RPG Ficha.

Para detalhes históricos de arquitetura e fases antigas, consulte também
`Melhorias/DIRETRIZ_OFICIAL_V1.md`.

## 2026-06-07 - Auditoria clean code, testes e PWA

### Adicionado

- `docs/AUDITORIA_CLEAN_CODE.md` com nota de arquitetura, pontos fortes,
  riscos, gargalos, bugs corrigidos e plano recomendado.

### Alterado

- README revisado com acentos, links úteis, tom temático e status atualizado da
  auditoria.
- `docs/ROADMAP.md`, `AGENTS.md` e `CLAUDE.md` alinhados ao estado atual dos
  testes e do service worker.
- `manifest.json` deixou de prometer offline completo e agora descreve suporte
  offline parcial.
- `sw.js` passou a cachear `manifest.json`, `js/core/replay-consumer.js` e
  `js/core/session-export.js`; `CACHE_VERSION` foi atualizado para `v51`.

### Corrigido

- Suíte Node voltou a passar: `889/889`.
- Proveniência de perícias agora possui fallback seguro para bases essenciais
  quando `data/skills.js` não está carregado no runner Node.
- Ontologia de eventos foi alinhada ao estado real das ações `SET_ATTRIBUTE`,
  `ROLL_SKILL` e `PUSH_ROLL`.
- View de atributos deixou de escrever direto no store para ações de atributo,
  usando o executor como caminho principal.
- KPIs do dashboard do Guardião agora calculam médias de HP/SAN e contagem de
  investigadores vivos com regras mais explícitas.

### Observado

- Links locais principais entre HTMLs e assets foram auditados sem quebra.
- O PWA segue parcial porque o SDK Supabase ainda é carregado por CDN em fluxos
  de multiplayer.
- Não houve remoção de dead code nesta etapa; itens duvidosos foram
  documentados para refatoração futura.

## 2026-06-07 - Documentação de estado real

### Adicionado

- `docs/ROADMAP.md` com prioridades realistas e estado operacional do projeto.
- `AGENTS.md` com instruções para futuros agentes de IA.
- `CHANGELOG.md` inicial.
- Prints e GIF de preview em `assets/screenshots/`.

### Alterado

- `README.md` reescrito para refletir o estado real do projeto.
- README agora separa funcionalidades prontas, em desenvolvimento, planejadas e
  limitações conhecidas.
- README documenta execução local, GitHub Pages, estrutura de pastas,
  backup/exportação/importação, PWA/offline parcial, contribuição e aviso legal.
- README agora inclui uma seção `Preview` com tour visual das telas principais.

### Observado

- Links locais principais entre HTMLs e assets foram auditados sem quebra
  aparente.
- A suíte `node js/tests/runner.js` falhava antes das mudanças de documentação:
  `873/889 passed`, com 16 falhas preexistentes em proveniência de perícias,
  ontologia/arquitetura e KPIs do dashboard.

### Não alterado

- Nenhuma regra de jogo, cálculo, dado mecânico ou comportamento de ficha foi
  alterado nesta etapa.
