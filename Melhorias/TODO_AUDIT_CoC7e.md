# TODO — Auditoria CoC7e (achados diferidos)

Auditoria feita em 2026-05-27 contra o PDF oficial de Chamada de Cthulhu 7ª Edição PT-BR (`pdfcoffee.com_call-of-cthulhu-7th-pt-br-pdf-free.pdf`, 351 páginas) e contra a base de código pós Fase 5 (commit `f29bdbc`).

**O que foi corrigido neste mesmo commit:**

- Fix difficulty em `attackWithWeapon` (usava array hardcoded em vez de `meetsDifficulty`)
- Fix difficulty + detecção de empala em `keeper.js:rollAttack`
- Fix dano de Empala em `dice.rollDamage` (faltava a rolagem extra da arma)
- Erro de base em `data/skills.js` (Ciência Forense movida para especialização de Ciência)
- 5 perícias canônicas adicionadas (Avaliação de Crédito, Mundo Natural, Prestidigitação, Arco, Armas Pesadas)
- 5 ataques do bestiário ganharam `impale: true` explícito
- Helper `getSkillValue` consolidado (DRY entre `attackWithWeapon` e `rollSkill`)

**O que segue abaixo é o backlog priorizado dos achados que NÃO entraram neste change.**

---

## 🔴 Severidade Alta (bugs de regra ou função morta)

### 1. Ajustes de atributo por idade não são aplicados

**Regra (PDF Cap. 3, p. 35-36 — "Idade dos Investigadores"):**

| Faixa etária | EDU | STR/CON/DEX | APA | Especial |
| --- | --- | --- | --- | --- |
| 15-19 | -5 | -5 entre STR/SIZ | — | 2 rolagens de Sorte, pega maior |
| 20-39 | 1 check melhoria | — | — | — |
| 40-49 | 2 checks | -5 distribuído | -5 | — |
| 50-59 | 3 checks | -10 | -10 | — |
| 60-69 | 4 checks | -20 | -15 | — |
| 70-79 | 4 checks | -40 | -20 | — |
| 80-89 | 4 checks | -80 | -25 | — |

**Código atual:** `calcMOV` em [js/engine/coc7e-rules.js:170-184](js/engine/coc7e-rules.js:170) aplica ajuste de idade SÓ no MOV. Atributos primários ignoram idade.

**Impacto:** investigadores de 70 anos mantêm STR/CON/DEX/APA originais — quebra o balanço do sistema.

**Fix sugerido:** nova função `applyAgeAdjustments(character, age)` em `coc7e-rules.js`. UI chama após o jogador confirmar idade. Distribuição dos -5/-10/-20 entre STR/CON/DEX deve ser interativa (jogador escolhe).

---

### 2. `validateCharacter` existe mas é chamado por ninguém

**Código:** [js/engine/coc7e-rules.js:318-344](js/engine/coc7e-rules.js:318) define validação completa (cap de skill, faixa de atributos). Grep mostra zero invocações em `js/investigator.js`.

**Fix sugerido:** chamar em `boot()` após `loadCharacter()` e dentro de `persistCurrent()`, surfaceando `warnings` via toast e `issues` via modal.

---

### 3. Sorte de jovens (15-19) não tem re-roll

**Regra (PDF p. 36):** personagens 15-19 anos rolam Sorte **duas vezes** e usam o maior. `rollAllAttributes` ([js/investigator.js:1240-1261](js/investigator.js:1240)) rola Sorte uma única vez igual aos outros atributos.

**Fix sugerido:** dentro do mesmo `applyAgeAdjustments` do item 1, ou caso especial em `rollAllAttributes`.

---

## 🟠 Severidade Média (gaps de UX/Combate)

### 4. Dano não é aplicado automaticamente ao HP do alvo

`attackWithWeapon` e `keeper.js:rollAttack` apenas LOGAM o dano. Jogador precisa subtrair PV manualmente.

**Fix sugerido:** após acerto, oferecer botão "Aplicar X dano a [alvo]". Alvo pode vir do `encounter` do keeper via BroadcastChannel.

---

### 5. Sem tracker de iniciativa por DEX

[js/keeper.js:27](js/keeper.js:27): `encounter: []` é só lista. PDF Cap. 6: combate começa com todos rolando **DEX** (modificadores: +50 ao DEX para iniciativa com arma de fogo).

**Fix sugerido:** componente `combat-tracker` que mescla PJs + encounter, ordena por DEX modificado, mostra "vez de quem", botão "próximo turno".

---

### 6. Major Wound não é detectado automaticamente

[investigator.html:210](investigator.html:210): status `majorWound` é checkbox manual.

**Regra:** dano ≥ floor(PV/2) em um único hit = Major Wound + CON roll para não desmaiar.

**Fix sugerido:** quando aplicar dano (item 4), se ≥ PV/2 → marcar checkbox + popup de CON roll.

---

### 7. Ammo/Shots inertes

[data/weapons-templates.js:172-185](data/weapons-templates.js:172) tem `ammo: 6, shots: 3` mas UI não decrementa.

**Regra (PDF p. 109):** cada disparo após o primeiro recebe dado de Penalidade.

**Fix sugerido:** decrementar `w.ammo` ao atacar; bloquear ataque se `ammo === 0`; ação "Recarregar"; dado de Penalidade automático para 2º+ disparo do round.

---

### 8. Armadura não reduz dano

`encounter[i].armor` ([js/keeper.js:27](js/keeper.js:27)) existe e é exibido, mas `rollDamage` nunca subtrai. PDF p. 111: armor é subtraída do dano final.

**Fix sugerido:** parâmetro opcional `armor` em `rollDamage` que subtrai do total (mínimo 0).

---

### 9. Sem Dodge / Fighting Back / Opposed Rolls

Mecânica fundamental do CoC7e (PDF Cap. 6, p. 101-102). Hoje o ataque é resolvido sozinho, sem opção de defesa reativa.

**Fix sugerido (v2.0):** fluxo `opposedRoll(attacker, defender, defenderAction)` no engine. Modal pop-up no defensor: "Você foi atacado — Esquivar ou Lutar de Volta?".

---

### 10. Ocupação com alternativas (`|`) não dá escolha ao jogador

`calcOccupationPoints` ([js/engine/coc7e-rules.js:232-289](js/engine/coc7e-rules.js:232)) resolve automaticamente pela alternativa que maximiza pontos. O livro permite ao jogador ESCOLHER (preferir DEX em vez de FOR mesmo perdendo pontos, para alinhar o conceito).

**Fix sugerido:** UI exibe as alternativas como radio buttons; usa `calcOccupationPoints` para preview de cada uma.

---

## 🟡 Severidade Baixa (polimentos)

### 11. Push em sucesso Hard é tecnicamente permitido pela UI

[js/investigator.js:1038](js/investigator.js:1038): `canPush` inclui `"hard"`. PDF descreve push como "segunda e final tentativa" — semanticamente para falhas. Remover `"hard"` da lista.

### 12. `validateCharacter` usa faixa 15-90 para todos atributos

[js/engine/coc7e-rules.js:336-340](js/engine/coc7e-rules.js:336): SIZ/INT/EDU são 2D6+6×5 (faixa real 40-90), não 15-90. Tornar a validação per-atributo.

### 13. DB acima de 524

[data/damage-bonus-table.js:27](data/damage-bonus-table.js:27): última faixa para 445-524. PDF: "+1D6/+1 a cada +80 acima de 444". Para 525+ retorna +5D6/+6 quando devia ser +6D6/+7. Edge case (só criaturas).

### 14. Sem hard cap em skill points durante criação

[js/shared/validators.js:58-64](js/shared/validators.js:58) só marca UI com `.over-cap`, não bloqueia input. Bloquear via `input.max = 90` + override no Modo Edição.

### 15. `state.rollMods.bp` é `""` em vez de `null`

[js/investigator.js:32](js/investigator.js:32) inicializa como string vazia. `dice.rollD100` documenta `bp: null | "bonus" | "penalty"`. Padronizar para `null`.

### 16. Range bands em armas de fogo

PDF p. 109: PB (até DEX/5 m → +1 bônus), normal (até range), longo (até 2× → +1 penalty), muito longo (até 4× → só Extremo acerta, crit → empala). Não implementado.

### 17. Manobras (Build vs Build)

`Build` é calculado em [js/engine/coc7e-rules.js:191-198](js/engine/coc7e-rules.js:191) mas nunca usado. PDF p. 102: empurrar/agarrar/derrubar/desarmar comparam Build atacante vs defensor.

---

## ⚪ Dívida arquitetural (não bugs)

### 18. Helpers de regra no controller, não no engine

`computeBaseValue` e `getSkillValue` em [js/investigator.js:612, 618](js/investigator.js:612) são regras CoC7e puras vivendo no controller. Pertencem a `js/engine/coc7e-rules.js` (que já existe como `window.CoC.rules`). Mover habilita reuso em `js/keeper.js`.

### 19. Lógica de skill-value duplicada em `sumSkillSpend`

[js/investigator.js:634-647](js/investigator.js:634) tem o mesmo padrão de lookup de base que `getSkillValue` faz. Trocar por `getSkillValue` (depois que o helper for movido para engine).

### 20. Perícias [Incomuns] ausentes

CoC7e marca como `[Uncommon]`: Demolições, Mergulho, Ler Lábios, Conhecimento (specs), Artilharia, Lança-chamas. Estão fora da folha padrão. Adicionar como toggle "perícias incomuns" no painel.

### 21. Convenção de DB nas armas

Armas brancas têm `+DB` explícito no `damage`, armas de fogo não — corretíssimo por CoC7e (DB só vale para melee/thrown). Documentar essa convenção em [data/weapons-templates.js](data/weapons-templates.js) com mais destaque (hoje está na docstring no topo, fácil de perder).

---

## ✅ Confirmado correto (já fiel ao PDF)

Lista de 16 mecânicas que a auditoria validou contra o livro e estão certas:

- Crítico = rolagem de 01 ([dice.js:81](js/engine/dice.js:81))
- Fumble: 96+ se skill <50, 100 se skill ≥50 ([dice.js:82-83](js/engine/dice.js:82))
- Difícil = metade, Extremo = quinto ([dice.js:84-87](js/engine/dice.js:84))
- Bônus/Penalidade cancelam-se (`dice.rollD100`)
- `meetsDifficulty` correto ([dice.js:97-101](js/engine/dice.js:97))
- Tabela DB/Build (FOR+SIZ) ([data/damage-bonus-table.js](data/damage-bonus-table.js))
- PV = floor((CON+TAM)/10) ([coc7e-rules.js:125-127](js/engine/coc7e-rules.js:125))
- PM = floor(POD/5) ([coc7e-rules.js:133-135](js/engine/coc7e-rules.js:133))
- SAN inicial = POD ([coc7e-rules.js:141-143](js/engine/coc7e-rules.js:141))
- SAN máx = 99 − Mitos ([coc7e-rules.js:149-151](js/engine/coc7e-rules.js:149))
- MOV base 7/8/9 + ajuste por idade ([coc7e-rules.js:170-184](js/engine/coc7e-rules.js:170))
- Esquivar = DES/2 ([coc7e-rules.js:203-205](js/engine/coc7e-rules.js:203))
- Idioma Próprio = EDU ([coc7e-rules.js:210-212](js/engine/coc7e-rules.js:210))
- Sorte não desfaz fumble/crítico ([investigator.js:1034](js/investigator.js:1034))
- Push só para perícia, não combate ([investigator.js:1037](js/investigator.js:1037))
- Empala flag boolean em weapons-templates ([data/weapons-templates.js:19](data/weapons-templates.js:19))

---

## Estratégia recomendada

**Próxima rodada (Fase 6) — itens 1, 2, 3** (criação correta por idade + validação ativa). Risco baixo, valor alto, autocontido em `coc7e-rules.js` + boot do `investigator.js`.

**Rodada seguinte — itens 4, 5, 6** (aplicação de dano + tracker de iniciativa + Major Wound). Trabalho de meia tarde, transforma o keeper de "lista de criaturas" em ferramenta operacional de combate.

**Itens 7, 8** (ammo/armor) podem entrar junto com 4-6 ou em PR separado.

**Itens 9 (Dodge/Fight Back) — esperar v2.0**, exige novo fluxo de turno e provavelmente UI multi-painel.

**Itens 10-17 (polimentos)** — pacote único quando der tempo. Cada um é minutos de trabalho.

**Item 18-19 (refactor arquitetural)** — junto com qualquer mudança grande no `keeper.js`.
