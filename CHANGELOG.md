# CHANGELOG

Historico resumido de mudancas relevantes do AIMalexi RPG Ficha.

Para detalhes historicos de arquitetura e fases antigas, consulte tambem
`Melhorias/DIRETRIZ_OFICIAL_V1.md`.

## 2026-06-07 - Documentacao de estado real

### Adicionado

- `docs/ROADMAP.md` com prioridades realistas e estado operacional do projeto.
- `AGENTS.md` com instrucoes para futuros agentes de IA.
- `CHANGELOG.md` inicial.
- Prints e GIF de preview em `assets/screenshots/`.

### Alterado

- `README.md` reescrito para refletir o estado real do projeto.
- README agora separa funcionalidades prontas, em desenvolvimento, planejadas e
  limitacoes conhecidas.
- README documenta execucao local, GitHub Pages, estrutura de pastas,
  backup/exportacao/importacao, PWA/offline parcial, contribuicao e aviso legal.
- README agora inclui uma secao `Preview` com tour visual das telas principais.

### Observado

- Links locais principais entre HTMLs e assets foram auditados sem quebra
  aparente.
- A suite `node js/tests/runner.js` falhou antes das mudancas de documentacao:
  `872/888 passed`, com 16 falhas pre-existentes em proveniencia de pericias,
  ontologia/arquitetura e KPIs do dashboard.

### Nao alterado

- Nenhuma regra de jogo, calculo, dado mecanico ou comportamento de ficha foi
  alterado nesta etapa.
