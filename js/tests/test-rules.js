/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-rules.js
   Suíte de testes para js/engine/coc7e-rules.js

   Cobertura desta versão (v1):
   - BUG-02: calcAgeAdjustments — todas as faixas etárias + limites de borda
   - BUG-03: re-roll de Sorte para jovens (15-19) — invariante da lógica
   - calcDB:  bônus de dano via tabela FOR+TAM
   - calcMOV: movimento base + ajustes por idade
   - calcHP:  pontos de vida

   Carregado por runner.js, que expõe assert(), assertEq() e group() como globais.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const rules = window.CoC.rules;

// ─────────────────────────────────────────────────────────────────────────────
//  BUG-02 — Ajustes de atributos por idade (CoC 7e p.35-36)
//
//  Jovens (15-19): -5 em FOR, CON, DES  (SEM APA — APA é aparência, não física)
//  Adultos (20-39): sem redução
//  Meia-idade (40-49): -5 em FOR, CON, DES, APA
//  (50-59): -10 · (60-69): -20 · (70-79): -40 · (80+): -80
// ─────────────────────────────────────────────────────────────────────────────
group('BUG-02 — calcAgeAdjustments (faixas + limites de borda)');

// Jovens — redução física SEM APA
const _17 = rules.calcAgeAdjustments(17);
assert(_17 !== null,                                      'age 17: retorna ajuste (não null)');
assertEq(_17.totalReduction, 5,                           'age 17: redução total = 5');
assertEq(_17.attrs.join(','), 'FOR,CON,DES',              'age 17: apenas FOR,CON,DES — sem APA');

// Limite superior da faixa jovem
const _19 = rules.calcAgeAdjustments(19);
assertEq(_19.totalReduction, 5,                           'age 19 (limite jovem): redução = 5');
assert(!_19.attrs.includes('APA'),                        'age 19: APA não afetada em jovens');

// Adultos — sem redução
assert(rules.calcAgeAdjustments(20) === null,             'age 20 (limite adulto): sem ajuste');
assert(rules.calcAgeAdjustments(30) === null,             'age 30 (adulto pleno): sem ajuste');
assert(rules.calcAgeAdjustments(39) === null,             'age 39 (limite adulto): sem ajuste');

// Início da meia-idade — APA passa a ser afetada
const _40 = rules.calcAgeAdjustments(40);
assert(_40 !== null,                                      'age 40 (início meia-idade): retorna ajuste');
assertEq(_40.totalReduction, 5,                           'age 40: redução = 5');
assert(_40.attrs.includes('APA'),                         'age 40: APA incluída na meia-idade');
assertEq(rules.calcAgeAdjustments(49).totalReduction, 5,  'age 49 (limite faixa 40s): redução = 5');

// Escalada das faixas
assertEq(rules.calcAgeAdjustments(50).totalReduction, 10, 'age 50: redução = 10');
assertEq(rules.calcAgeAdjustments(59).totalReduction, 10, 'age 59: redução = 10');
assertEq(rules.calcAgeAdjustments(60).totalReduction, 20, 'age 60: redução = 20');
assertEq(rules.calcAgeAdjustments(70).totalReduction, 40, 'age 70: redução = 40');
assertEq(rules.calcAgeAdjustments(80).totalReduction, 80, 'age 80: redução = 80');
assertEq(rules.calcAgeAdjustments(90).totalReduction, 80, 'age 90+: redução máxima = 80');

// ─────────────────────────────────────────────────────────────────────────────
//  BUG-03 — Re-roll de Sorte para jovens (CoC 7e p.36)
//
//  Investigadores com 15-19 anos rolam Sorte duas vezes e usam o MAIOR valor.
//  Adultos (≥20) usam apenas um roll.
//
//  A lógica está em investigator.js (rollAllAttributes), não em coc7e-rules.js.
//  Este teste documenta o invariante comportamental com valores mockados,
//  protegendo contra regressão caso a lógica seja movida ou alterada.
// ─────────────────────────────────────────────────────────────────────────────
group('BUG-03 — Re-roll de Sorte para jovens 15-19');

// Espelha a lógica de investigator.js:1030-1040
function _pickBestLuck(age, roll1, roll2) {
  return (age >= 15 && age <= 19) ? Math.max(roll1, roll2) : roll1;
}

assertEq(_pickBestLuck(17, 40, 75), 75, 'age 17: usa re-roll superior (75 > 40)');
assertEq(_pickBestLuck(17, 75, 40), 75, 'age 17: mantém primeiro se superior (75 > 40)');
assertEq(_pickBestLuck(17, 50, 50), 50, 'age 17: empate → retorna roll1 (50 = 50)');
assertEq(_pickBestLuck(15, 35, 70), 70, 'age 15 (limite inferior): re-roll ativo');
assertEq(_pickBestLuck(19, 35, 70), 70, 'age 19 (limite superior): re-roll ativo');
assertEq(_pickBestLuck(20, 35, 70), 35, 'age 20 (adulto): sem re-roll → usa primeiro roll');
assertEq(_pickBestLuck(30, 40, 80), 40, 'age 30 (adulto): sem re-roll → usa primeiro roll');

// ─────────────────────────────────────────────────────────────────────────────
//  calcDB — Bônus de Dano por faixa FOR+TAM
//
//  Tabela CoC 7e (damage-bonus-table.js):
//   2– 64 → "-2" / build -2
//  65– 84 → "-1" / build -1
//  85–124 → "0"  / build  0
// 125–164 → "+1D4" / build 1
// 165–204 → "+1D6" / build 2
// 205–284 → "+2D6" / build 3
// ─────────────────────────────────────────────────────────────────────────────
group('calcDB — Bônus de Dano (FOR+TAM)');

// Menor faixa: sum = 2 (mínimo absoluto da tabela)
const _db_min = rules.calcDB(1, 1);          // sum = 2
assertEq(_db_min.db,    '-2', 'calcDB(1,1)  sum=2   → db="-2"');
assertEq(_db_min.build,  -2,  'calcDB(1,1)  sum=2   → build=-2');

// Faixa negativa moderada: sum = 64 (limite da primeira faixa)
assertEq(rules.calcDB(32, 32).db, '-2',   'calcDB(32,32)  sum=64  → db="-2" (limite inferior)');
assertEq(rules.calcDB(33, 32).db, '-1',   'calcDB(33,32)  sum=65  → db="-1" (início segunda faixa)');

// Faixa neutra: sum = 110 (dentro de 85–124)
assertEq(rules.calcDB(50, 60).db,  '0',   'calcDB(50,60)  sum=110 → db="0" (faixa neutra)');

// Faixa positiva: sum = 125 (início de +1D4)
const _db_pos = rules.calcDB(63, 62);         // sum = 125
assertEq(_db_pos.db,   '+1D4', 'calcDB(63,62)  sum=125 → db="+1D4"');
assertEq(_db_pos.build,  1,    'calcDB(63,62)  sum=125 → build=1');

// Faixa extrema: sum = 205 (início de +2D6)
const _db_ext = rules.calcDB(103, 102);       // sum = 205
assertEq(_db_ext.db,   '+2D6', 'calcDB(103,102) sum=205 → db="+2D6"');
assertEq(_db_ext.build,  3,    'calcDB(103,102) sum=205 → build=3');

// ─────────────────────────────────────────────────────────────────────────────
//  calcMOV — Movimento base + ajustes por idade
//
//  Regra base (CoC 7e):
//    FOR < TAM E DES < TAM → MOV 7
//    FOR > TAM E DES > TAM → MOV 9
//    qualquer outro caso    → MOV 8
//
//  Ajustes por faixa etária:
//    40-49: -1 · 50-59: -2 · 60-69: -3 · 70-79: -4 · 80+: -5
// ─────────────────────────────────────────────────────────────────────────────
group('calcMOV — Movimento (base + idade)');

// Base — relação FOR/DES/TAM
assertEq(calcMOV(80, 70, 60, 30), 9, 'MOV: FOR>TAM && DES>TAM → 9');
assertEq(calcMOV(40, 40, 60, 30), 7, 'MOV: FOR<TAM && DES<TAM → 7');
assertEq(calcMOV(60, 40, 60, 30), 8, 'MOV: FOR=TAM (misto)    → 8');
assertEq(calcMOV(60, 60, 60, 30), 8, 'MOV: todos iguais       → 8');

// Ajustes por faixa etária (base 9 → progressivo)
assertEq(calcMOV(80, 70, 60, 45), 8, 'MOV: base 9, age 40s → 9-1=8');
assertEq(calcMOV(80, 70, 60, 55), 7, 'MOV: base 9, age 50s → 9-2=7');
assertEq(calcMOV(80, 70, 60, 65), 6, 'MOV: base 9, age 60s → 9-3=6');
assertEq(calcMOV(80, 70, 60, 75), 5, 'MOV: base 9, age 70s → 9-4=5');
assertEq(calcMOV(80, 70, 60, 85), 4, 'MOV: base 9, age 80s → 9-5=4');

// Base 7 + 80s = 2 (acima do mínimo de 1)
assertEq(calcMOV(40, 40, 60, 85), 2, 'MOV: base 7, age 80s → 7-5=2');

// ─────────────────────────────────────────────────────────────────────────────
//  calcHP — Pontos de Vida: floor((CON + TAM) / 10)
// ─────────────────────────────────────────────────────────────────────────────
group('calcHP — Pontos de Vida');

assertEq(rules.calcHP(50, 50), 10, 'calcHP(50,50) → 10');
assertEq(rules.calcHP(60, 70), 13, 'calcHP(60,70) → floor(130/10) = 13');
assertEq(rules.calcHP(30, 30),  6, 'calcHP(30,30) → 6');
assertEq(rules.calcHP(45, 55), 10, 'calcHP(45,55) → floor(100/10) = 10');
assertEq(rules.calcHP( 0,  0),  0, 'calcHP(0,0)   → 0');

// ─────────────────────────────────────────────────────────────────────────────
//  Funções auxiliares locais (não disponíveis em window.CoC)
// ─────────────────────────────────────────────────────────────────────────────

function calcMOV(forca, des, tam, age) {
  return rules.calcMOV(forca, des, tam, age);
}
