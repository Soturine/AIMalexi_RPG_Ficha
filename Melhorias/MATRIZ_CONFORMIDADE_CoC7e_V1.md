# Matriz de Conformidade — Call of Cthulhu 7ª Edição · AIMalexi RPG

> **Fonte oficial de priorização** conforme o Protocolo de Execução por Etapas.
> Toda nova implementação deve atualizar esta matriz antes de ser iniciada.
> Cruza e estende `TODO_AUDIT_CoC7e.md`.
>
> **Legenda:**
> ✅ Implementado corretamente · 🟡 Parcialmente implementado · 🔴 Não implementado · ⚫ Divergente da regra oficial

---

## 1. CRIAÇÃO DE PERSONAGEM

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 1.1 | Rolagem de atributos (3d6×5 / 2d6+6×5) | ✅ | — | `js/engine/dice.js:219`, `js/investigator.js:558` | — | — |
| 1.2 | Sorte: 3d6×5 | ✅ | — | `js/investigator.js:560` | — | — |
| 1.3 | Sorte dupla para 15–19 anos (melhor) | ✅ | — | `js/investigator.js:573` | — | — |
| 1.4 | Redução FOR/TAM para 15–19 anos (−5 total) | ✅ | **CORRIGIDO ETAPA 2.3** — `calcAgeAdjustments` retorna `physical:{points:5,attrs:[FOR,TAM]}` | `js/engine/coc7e-rules.js`, `js/investigator.js` | — | — |
| 1.5 | Redução EDU −5 para 15–19 anos | ✅ | **CORRIGIDO ETAPA 2.3** — `eduReduction:5` aplicado separadamente | `js/investigator.js` | — | — |
| 1.6 | Redução FOR/CON/DES para 40+ | ✅ | — | `js/investigator.js:586–608` | — | — |
| 1.7 | Redução APA **separada** (fixa) para 40+ | ✅ | **CORRIGIDO ETAPA 2.3** — `appReduction` é campo separado, não distribuído | `js/engine/coc7e-rules.js`, `js/investigator.js` | — | — |
| 1.8 | Verificações de Melhoria de EDU (por faixa etária) | ✅ | **CORRIGIDO ETAPA 2.4** — `rollEduImprovement()` pura + aplicação em `rollAllAttributes` | `js/engine/coc7e-rules.js`, `js/investigator.js` | — | — |
| 1.9 | Derivados: PV = ⌊(CON+TAM)/10⌋ | ✅ | — | `js/engine/coc7e-rules.js:125` | — | — |
| 1.10 | Derivados: PM = ⌊POD/5⌋ | ✅ | — | `js/engine/coc7e-rules.js:133` | — | — |
| 1.11 | Derivados: SAN inicial = POD | ✅ | — | `js/engine/coc7e-rules.js:141` | — | — |
| 1.12 | Derivados: MOV (FOR/DES/TAM + idade) | ✅ | — | `js/engine/coc7e-rules.js:189` | — | — |
| 1.13 | Derivados: Bônus de Dano / Build (tabela FOR+TAM) | ✅ | — | `js/engine/coc7e-rules.js:210` | — | — |
| 1.14 | Derivados: Esquiva base = DES/2 | ✅ | — | `js/engine/coc7e-rules.js:222` | — | — |
| 1.15 | Derivados: Língua Nativa base = EDU | ✅ | — | `js/engine/coc7e-rules.js:229` | — | — |
| 1.16 | Pontos de ocupação (fórmula EDU×4 etc.) | ✅ | — | `js/engine/coc7e-rules.js:251` | — | — |
| 1.17 | Perícias obrigatórias e livres da ocupação | ✅ | — | `js/engine/coc7e-rules.js:339`, `data/occupations.js` | — | — |
| 1.18 | Interesse pessoal = INT×2 | ✅ | — | `js/engine/coc7e-rules.js:313` | — | — |
| 1.19 | Rastreamento proveniência (base/ocup/interesse/evoluções) | 🔴 | Sem rastreabilidade; impossível auditar origem | — | P4 (ETAPA 11) | Alta |
| 1.20 | Bloqueio de valores ilegais | 🟡 | Cap 99 existe; sem bloqueio de alteração arbitrária | `js/views/attributes.js:116`, `js/shared/validators.js` | P4 (ETAPA 11) | Alta |

---

## 2. ROLAGENS

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 2.1 | Crítico = rolagem 01 (sempre) | ✅ | — | `js/engine/dice.js:98` | — | — |
| 2.2 | Extremo = d100 ≤ valor/5 | ✅ (engine) | — | `js/engine/dice.js:101` | — | — |
| 2.3 | Sólido/Difícil = d100 ≤ valor/2 | ✅ (engine) | — | `js/engine/dice.js:102` | — | — |
| 2.4 | Regular = d100 ≤ valor | ✅ | — | `js/engine/dice.js:103` | — | — |
| 2.5 | Fumble ≥96 (skill<50) / =100 (skill≥50) | ✅ | — | `js/engine/dice.js:99` | — | — |
| 2.6 | Seleção de dificuldade (Regular/Difícil/Extremo) filtra o resultado | ✅ | **CORRIGIDO ETAPA 2.1** — `gradeRoll()` centraliza; `met=false` quando tier não atinge dificuldade | `js/engine/dice.js:126`, `js/views/rolls.js` | — | — |
| 2.7 | Bônus: escolher a dezena mais **favorável** (menor valor) | ✅ | **CORRIGIDO ETAPA 2.2** — escolha pelo valor final; borda 00+0=100 corrigida | `js/engine/dice.js:69` | — | — |
| 2.8 | Penalidade: escolher dezena **desfavorável** (maior valor) | ✅ | **CORRIGIDO ETAPA 2.2** — mesma correção | `js/engine/dice.js:69` | — | — |
| 2.9 | `meetsDifficulty()` corretamente definida | ✅ | — | `js/engine/dice.js:114` | — | — |
| 2.10 | Gastar Sorte para converter falha em Regular | ✅ | **CORRIGIDO ETAPA 2.1** — `canSpendLuck` usa `met` | `js/views/rolls.js` | — | — |
| 2.11 | Forçar rolagem (Push): disponível em falha | ✅ | **CORRIGIDO ETAPA 2.1** — `canPush` usa `met` | `js/views/rolls.js` | — | — |
| 2.12 | Testes opostos | 🔴 | Não implementado | — | P2 | Média |
| 2.13 | Testes combinados de atributos | 🔴 | Não implementado | — | P2 | Média |
| 2.14 | Destaque visual do alvo por dificuldade | 🔴 | UX: usuário não vê 70→35→14 ao selecionar Difícil/Extremo | — | P2 (ETAPA 4) | Baixa |
| 2.15 | Notação `difficulty`+`met` persistidos no log | ✅ | **CORRIGIDO ETAPA 2.5** — campos aditivos em ROLL_SKILL/ROLL_ATTRIBUTE/PUSH_ROLL; fallback compat | `js/core/event-ontology.js` | — | — |

---

## 3. COMBATE

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 3.1 | Rolagem de ataque com perícia | ✅ | — | `js/views/combat.js:154`, `js/investigator.js` | — | — |
| 3.2 | Rolagem de dano | ✅ | — | `js/engine/dice.js:195`, `js/views/combat.js:211` | — | — |
| 3.3 | Dano aplicado ao PV automaticamente | 🟡 | `ATTACK_RESOLVED` calculado; `APPLY_DAMAGE` requer chamada separada | `js/views/combat.js:211`, `js/core/store.js:56` | P2 | Baixa |
| 3.4 | Ferimento Grave (dano ≥ metade do PV máx) | ✅ | — | `js/core/state-machine.js:61` | — | — |
| 3.5 | Inconsciência (PV ≤ 0) | ✅ | — | `js/core/state-machine.js:78` | — | — |
| 3.6 | Morte (dano massivo) | ✅ | — | `js/core/state-machine.js:95` | — | — |
| 3.7 | Esquiva como ação de reação | 🔴 | Stub em comentário apenas | `js/core/state-machine.js:310` | P2 (ETAPA 12) | Alta |
| 3.8 | Contra-ataque | 🔴 | Não implementado | — | P2 (ETAPA 12) | Alta |
| 3.9 | Manobras (derrubar/desarmar/empurrar/imobilizar) | 🔴 | Não implementado | — | P2 (ETAPA 12) | Alta |
| 3.10 | Alcance / Cobertura (armas de fogo) | 🔴 | Não implementado | — | P3 (ETAPA 12) | Alta |
| 3.11 | Rajada / Tiro Mirado | 🔴 | Não implementado | — | P3 (ETAPA 12) | Alta |
| 3.12 | Armadura absorve dano automaticamente | 🔴 | Não implementado | — | P2 (ETAPA 12) | Média |
| 3.13 | Munição: decremento automático | ✅ | — | `js/views/combat.js:85`, `js/tests/test-combat.js:196` | — | — |
| 3.14 | Recarga de arma | 🔴 | Sem botão/ação de recarga | — | P3 (ETAPA 12) | Baixa |
| 3.15 | Dropdown de perícia da arma (vs texto livre) | 🔴 | Digitação manual de nome de perícia | `js/views/combat.js` | P2 (ETAPA 5) | Baixa |
| 3.16 | Sistema de slots corporais | 🔴 | Não implementado | — | P3 (ETAPA 5) | Alta |

---

## 4. SANIDADE

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 4.1 | Perda de SAN (ação manual via tracker) | ✅ | — | `js/views/vitals.js`, `js/core/store.js:73` | — | — |
| 4.2 | SAN máxima = 99 − Mythos | ✅ | — | `js/engine/coc7e-rules.js:149` | — | — |
| 4.3 | Loucura Temporária (≥5 SAN em 1 rolagem) | 🟡 | Detecção existe; efeito narrativo automático ausente | `js/core/state-machine.js:142` | P2 (ETAPA 12) | Média |
| 4.4 | Loucura Indefinida (≥20% SAN em 1 dia) | 🟡 | Detecção existe; efeito automático ausente | `js/core/state-machine.js:165` | P2 (ETAPA 12) | Média |
| 4.5 | SAN = 0 → Loucura Indefinida automática | ✅ | — | `js/core/state-machine.js:183` | — | — |
| 4.6 | Mythos ≥ SAN restante → Incurável | ✅ | — | `js/core/state-machine.js:191` | — | — |
| 4.7 | Recuperação de SAN (psicoterapia/recompensa) | 🔴 | Sem mecanismo — só incremento manual | — | P3 (ETAPA 12) | Média |

---

## 5. MYTHOS DE CTHULHU

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 5.1 | Armazenamento de Mythos | ✅ | — | `js/core/store.js:73`, `js/views/vitals.js` | — | — |
| 5.2 | Mythos rebaixa SAN máx automaticamente | ✅ | — | `js/engine/coc7e-rules.js:149`, `js/core/store.js:88` | — | — |
| 5.3 | Mythos não é perícia comum (evolução diferenciada) | 🟡 | Armazenado em `derived.Mitos`; sem bloqueio de melhoria por sessão | `js/core/store.js:73` | P2 | Baixa |
| 5.4 | Ganho de Mythos via tomos | 🔴 | Tomos não linham a ADD_MYTHOS | `js/views/tomes.js` | P2 (ETAPA 12) | Média |
| 5.5 | Registro histórico de ganhos de Mythos | 🔴 | Não implementado | — | P4 | Média |

---

## 6. PROGRESSÃO / EVOLUÇÃO

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 6.1 | Marcar perícia para evolução (sucesso na sessão) | ✅ | **CORRIGIDO ETAPA 3.3** — botão ✓ em cada linha; auto-marca após sucesso natural | `js/views/skills.js`, `js/core/store.js` | — | — |
| 6.2 | Evolução de perícia (d100 > valor → +d10) | ✅ | **CORRIGIDO ETAPA 3.3** — `rollSkillImprovement()` + `SKILL_IMPROVED` reducer + botão "Fim de Sessão" | `js/engine/coc7e-rules.js`, `js/views/skills.js` | — | — |
| 6.3 | Verificação de Melhoria de EDU (d100 > EDU → +d10) | ✅ | **CORRIGIDO ETAPA 2.4** — `rollEduImprovement()` implementada e chamada na criação | `js/engine/coc7e-rules.js` | — | — |
| 6.4 | EDU cap = 99 | ✅ | **CORRIGIDO ETAPA 2.4** — `Math.min(99, edu+gain)` aplicado | `js/engine/coc7e-rules.js` | — | — |
| 6.5 | Recompensa narrativa de Guardião | 🔴 | Não implementado | — | P3 | Baixa |

---

## 7. MAGIA

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 7.1 | Armazenamento de feitiços | ✅ | — | `js/views/spells.js`, `js/core/schema.js` | — | — |
| 7.2 | Custo de PM ao conjurar (auto) | 🟡 | UI define custo; despacho `SPEND_MAGIC` ausente ou sem confirmação | `js/views/spells.js` | P2 (ETAPA 12) | Média |
| 7.3 | Custo de SAN ao conjurar (auto) | 🟡 | UI define custo; `LOSE_SANITY` não ligado | `js/views/spells.js` | P2 (ETAPA 12) | Média |
| 7.4 | Custos permanentes de SAN/PM | 🔴 | Não implementado | — | P3 (ETAPA 12) | Média |
| 7.5 | Tempo de conjuração | 🔴 | Não implementado | — | P3 | Baixa |

---

## 8. TOMOS

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 8.1 | Armazenamento de tomos | ✅ | — | `js/views/tomes.js`, `js/core/schema.js` | — | — |
| 8.2 | Progresso de estudo (semanas) | ✅ | — | `js/views/tomes.js` | — | — |
| 8.3 | Perda de SAN ao estudar | 🟡 | Campo existe; `LOSE_SANITY` não disparado ao completar | `js/views/tomes.js` | P2 (ETAPA 12) | Baixa |
| 8.4 | Ganho de Mythos ao concluir leitura | 🔴 | Campo inexistente; sem link a `ADD_MYTHOS` | `js/views/tomes.js` | P2 (ETAPA 12) | Baixa |
| 8.5 | Concessão de feitiços via tomo | 🔴 | Não implementado | — | P3 (ETAPA 12) | Média |

---

## 9. CONDIÇÕES / STATUS

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 9.1 | Infraestrutura ADD_STATUS / REMOVE_STATUS | ✅ | — | `js/core/actions.js:45`, `js/core/store.js:137` | — | — |
| 9.2 | Ferimento Grave (majorWound) | ✅ | — | `js/core/state-machine.js:61` | — | — |
| 9.3 | Inconsciência (unconscious) | ✅ | — | `js/core/state-machine.js:78` | — | — |
| 9.4 | Morrendo (dying) | ✅ | — | `js/core/state-machine.js:88` | — | — |
| 9.5 | Morto (dead) | ✅ | — | `js/core/state-machine.js:95` | — | — |
| 9.6 | Loucura Temporária (tempInsane) | 🟡 | Detectada; sem efeito mecânico automático | `js/core/state-machine.js:142` | P2 | Média |
| 9.7 | Loucura Indefinida (indefInsane) | 🟡 | Detectada; sem efeito automático | `js/core/state-machine.js:165` | P2 | Média |
| 9.8 | Loucura Incurável (incurablyInsane) | ✅ | — | `js/core/state-machine.js:183` | — | — |
| 9.9 | Sangrando | 🔴 | Infra existe, sem lógica | — | P3 | Baixa |
| 9.10 | Envenenado | 🔴 | Infra existe, sem lógica | — | P3 | Baixa |
| 9.11 | Atordoado | 🔴 | Infra existe, sem lógica | — | P3 | Baixa |
| 9.12 | Exausto | 🔴 | Infra existe, sem lógica | — | P3 | Baixa |
| 9.13 | Sob efeito de magia | 🔴 | Não implementado | — | P3 | Média |
| 9.14 | Modificadores automáticos por condição | 🔴 | Nenhuma condição aplica modificador automático | — | P3 (ETAPA 12) | Alta |

---

## 10. GUARDIÃO

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 10.1 | Dashboard com KPIs de investigadores | 🟡 | KPIs existem (vivos, SAN média) mas faltam: enlouquecidos, mortes, sessões, tempo | `js/keeper-dashboard-summary.js` | P2 (ETAPA 6) | Baixa |
| 10.2 | Diário avançado por tópicos | 🔴 | Só textarea livre | `js/keeper-notes.js` | P2 (ETAPA 6) | Média |
| 10.3 | Compêndio isolado | 🟡 | Iframe em keeper.html; CSS/layout vaza | `keeper.html:148`, `compendium.html` | P2 (ETAPA 6) | Média |
| 10.4 | Duplicação de layout no compêndio | ⚫ | Bug confirmado pelo usuário | `keeper.html` | P2 (ETAPA 6) | Baixa |

---

## 11. UX / INTERFACE

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 11.1 | Largura total 1920px (sem margens laterais) | 🟡 | `max-width: 1800px` deixa 24px de cada lado | `css/investigator.css:446` | P3 (ETAPA 7) | Baixa |
| 11.2 | Abas expandidas até o limite | 🟡 | Abas existem; espaço vazio em resoluções amplas | — | P3 (ETAPA 7) | Baixa |
| 11.3 | Nomes completos (PV/SAN/PM) | ⚫ | Abreviações usadas em toda UI | `js/views/vitals.js` | P3 (ETAPA 7) | Baixa |
| 11.4 | Link para Home no título | 🔴 | Sem link | `investigator.html`, `keeper.html` | P3 (ETAPA 7) | Baixa |
| 11.5 | Chat integrado na aba Log | 🔴 | Não implementado | — | P3 (ETAPA 7) | Alta |
| 11.6 | Finanças dentro de Inventário | ⚫ | Finanças em aba separada (Personagem) | `js/views/finances.js` | P3 (ETAPA 7) | Baixa |
| 11.7 | Central de Configurações (tema/i18n/efeitos) | 🔴 | Só 5 swatches de tema; sem i18n | `investigator.html:85` | P4 (ETAPA 8) | Alta |
| 11.8 | Enciclopédia de perícias integrada | 🔴 | Só nome + valor | `js/views/skills.js` | P4 (ETAPA 9) | Alta |
| 11.9 | Botão "Atributo" sem função | ⚫ | Botão morto na UI | — | P2 (ETAPA 4) | Baixa |

---

## 12. MOTOR DE DEPENDÊNCIAS & PROVENIÊNCIA

| # | Regra | Estado | Impacto | Arquivos | Prioridade | Complexidade |
|---|-------|--------|---------|----------|------------|--------------|
| 12.1 | RECALC_DERIVED ao alterar atributo | ✅ | — | `js/core/store.js:363`, `js/views/attributes.js:121` | — | — |
| 12.2 | RECALC_DERIVED ao alterar Mythos | ✅ | — | `js/core/store.js:88` | — | — |
| 12.3 | RECALC_DERIVED ao alterar idade | 🟡 | Notifica usuário; não auto-aplica redução de atributos | `js/views/identity.js:92` | P1A (ETAPA 3) | Média |
| 12.4 | Recalc de ocupação ao mudar EDU | ✅ | — | `js/views/identity.js:63` | — | — |
| 12.5 | Recalc de interesse pessoal ao mudar INT | 🟡 | Budgets atualizados; sem redistribuição automática | `js/views/skills.js` | P2 | Baixa |
| 12.6 | Motor de dependências completo (#31) | 🔴 | Valores derivados editáveis manualmente; sem grafo | — | P4 (ETAPA 10) | Alta |
| 12.7 | Sistema de proveniência / rastreabilidade (#32) | 🔴 | Sem histórico de origem dos valores | — | P4 (ETAPA 11) | Alta |

---

## Resumo Executivo

| Prioridade | Qtd ✅ | Qtd 🟡 | Qtd 🔴 | Qtd ⚫ | Total |
|-----------|--------|--------|--------|--------|-------|
| **P1 — Bugs críticos (ETAPA 2)** | 9 | 0 | 0 | 0 | **9 ✅ CONCLUÍDO** |
| **P1A — Criação completa (ETAPA 3)** | 3 | 0 | 0 | 0 | **3 ✅ CONCLUÍDO** |
| **P2 — Médio prazo (ETAPAs 4–6)** | 0 | 6 | 10 | 2 | **18** |
| **P3 — Longo prazo (ETAPAs 7–9)** | 0 | 2 | 12 | 2 | **16** |
| **P4 — Arquitetural (ETAPAs 10–11)** | 0 | 0 | 4 | 1 | **5** |
| **Já corretos** | 30 | — | — | — | **30** |
| **TOTAL** | **42** | **9** | **25** | **5** | **81** |

> **Última atualização:** pós-ETAPA 3 — 3 itens P1A resolvidos + fix regressão identity.js.
> Próxima prioridade: ETAPA 4 (Personagem & Perícias: #6, #7, #8, #9).

---

## Itens P1 para ETAPA 2 (código a alterar)

| Item | Arquivo | Etapa | Estado atual |
|------|---------|-------|--------------|
| Dificuldade não filtra resultado (2.6) | `js/views/rolls.js:84–87`, `js/engine/dice.js` | 2.1 | ⚫ |
| Bônus dezena crua (2.7) | `js/engine/dice.js:69` | 2.2 | ⚫ |
| Penalidade dezena crua (2.8) | `js/engine/dice.js:69` | 2.2 | ⚫ |
| canSpendLuck ignora dificuldade (2.10) | `js/views/rolls.js:178` | 2.1 | 🟡 |
| canPush ignora dificuldade (2.11) | `js/views/rolls.js:185` | 2.1 | 🟡 |
| Faixa 15–19: FOR/CON/DES em vez de FOR/TAM (1.4) | `js/engine/coc7e-rules.js:163` | 2.3 | ⚫ |
| Faixa 15–19: sem EDU−5 (1.5) | `js/investigator.js:584` | 2.3 | 🔴 |
| Faixa 40+: APA no bolo distribuído (1.7) | `js/engine/coc7e-rules.js:164` | 2.3 | ⚫ |
| EDU Improvement inexistente (6.3, 6.4) | `js/engine/coc7e-rules.js` | 2.4 | 🔴 |
| difficulty/met não persistidos (2.15) | `js/core/event-ontology.js:172`, `js/core/store.js:156` | 2.5 | 🔴 |

> **Próxima atualização desta matriz:** após ETAPA 2 concluída, reclassificar todos os itens P1 acima.
