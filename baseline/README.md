# Baseline — AIMalexi RPG CoC 7e

Snapshots do comportamento **atual** do motor de regras (incluindo bugs conhecidos).
Usados como referência para validar que os fixes de FASE 1 não introduzem regressões.

## Arquivos

| Arquivo | Idade | BUG-02 | BUG-03 |
|---|---|---|---|
| investigator-age-15.json | 15 anos | N/A (jovem) | **PRESENTE** |
| investigator-age-25.json | 25 anos | N/A (referência limpa) | N/A |
| investigator-age-50.json | 50 anos | **PRESENTE** (−10 pts em STR/CON/DEX/APP) | N/A |
| investigator-age-80.json | 80 anos | **PRESENTE** (−80 pts em STR/CON/DEX/APP) | N/A |

## Bugs documentados

### BUG-02 — Ajuste de atributos por idade não implementado
`coc7e-rules.js` ajusta apenas `MOV` por idade. `STR`, `CON`, `DEX` e `APP` não são reduzidos.

Tabela esperada (PDF p.35–36):

| Faixa de idade | Redução total | Atributos afetados |
|---|---|---|
| 15–19 | −5 | STR, CON, DEX |
| 40–49 | −5 | STR, CON, DEX, APP |
| 50–59 | −10 | STR, CON, DEX, APP |
| 60–69 | −20 | STR, CON, DEX, APP |
| 70–79 | −40 | STR, CON, DEX, APP |
| 80–89 | −80 | STR, CON, DEX, APP |

**Evidência nos baselines:** age-80 com `APP=90` e BUG-02 PRESENT = investigador octogenário com aparência perfeita.

### BUG-03 — Re-roll de Sorte para jovens (15–19) não implementado
PDF p.36: personagens com 15–19 anos rolam Sorte duas vezes e usam o maior valor.
Comportamento atual: rola uma vez.

**Evidência nos baselines:** age-15 com `luckRerollUsed: false`.

## Semente e reprodutibilidade

| Campo | Valor |
|---|---|
| Semente | 12345 |
| PRNG | Mulberry32 |
| Versão do projeto | M0.8 |

Todos os 4 arquivos usam a mesma semente. Os dados de rolls são registrados para reprodução manual.

## Como regenerar

### No navegador
Abra `baseline/generate.html` — gera e oferece download dos 4 arquivos JSON.

### Via Node.js (dev)
```bash
node /tmp/gen-baseline.js
# ou equivalente após o script ser movido para baseline/generate.js
```

## Como usar para validação pós-fix

Após aplicar os fixes de FASE 1:

1. Regenere os baselines com `generate.html`
2. Compare os campos `derived.MOV`, `generated.*` e `adjustments.ageModifiersApplied`
3. Valide:
   - `age-15`: `adjustments.ageModifiersApplied: true`, `adjustments.luckRerollUsed: true`
   - `age-50`: `adjustments.ageModifiersApplied: true`, total de redução = 10
   - `age-80`: `adjustments.ageModifiersApplied: true`, total de redução = 80
   - `derived.MOV` para todas as idades deve permanecer **inalterado** (MOV já estava correto)

## Estrutura de cada JSON

```json
{
  "meta": {
    "projectVersion": "M0.8",
    "seed": 12345,
    "prng": "Mulberry32",
    "age": ...,
    "generatedAt": "...",
    "knownBugsPresent": [...],
    "purpose": "..."
  },
  "generated": {
    "STR": ..., "CON": ..., "SIZ": ..., "DEX": ...,
    "APP": ..., "INT": ..., "POW": ..., "EDU": ..., "Luck": ...
  },
  "rolls": {
    "STR": { "formula": "3d6x5", "dice": [...], "rawSum": ..., "total": ... },
    ...
  },
  "adjustments": {
    "ageModifiersApplied": false,
    "luckRerollUsed": false,
    "eduImprovementChecks": ...,
    "bugState": {
      "BUG-02": "PRESENT | N/A — ...",
      "BUG-03": "PRESENT | N/A — ..."
    }
  },
  "derived": {
    "HP": ..., "MP": ..., "SAN_initial": ..., "SAN_max": ...,
    "MOV": ..., "Build": ..., "DamageBonus": ...,
    "Dodge": ..., "OwnLanguage": ...
  }
}
```
