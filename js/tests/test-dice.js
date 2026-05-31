/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-dice.js
   Suíte de testes para js/engine/dice.js

   Cobertura:
   - classifyRoll: todas as faixas + limites de borda (determinístico — puro)
   - meetsDifficulty: matrix dificuldade × resultado
   - rollD100: invariantes estruturais (value ∈ [1,100], tensCandidates, bp)
   - rollNotation: casos determinísticos ("0", constantes) + faixas de dado
   - rollAttribute: faixas e invariantes (total%5===0, raw.length)

   Carregado por runner.js, que expõe assert(), assertEq() e group() como globais.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const dice = window.CoC.dice;

// ─────────────────────────────────────────────────────────────────────────────
//  classifyRoll — Classificação de resultado D100 (CoC 7e p.25)
//
//  Crítico  : d100 === 1
//  Extremo  : d100 ≤ floor(skill / 5)
//  Sólido   : d100 ≤ floor(skill / 2)
//  Regular  : d100 ≤ skill
//  Falha    : d100 > skill  (mas < fumble threshold)
//  Fumble   : skill < 50 → d100 ≥ 96 · skill ≥ 50 → d100 === 100
// ─────────────────────────────────────────────────────────────────────────────
group('classifyRoll — faixas e limites de borda');

// ─── Crítico: sempre 1, independente de skill ────────────────────────────
assertEq(dice.classifyRoll(1,  10), 'crit',    'classifyRoll: d100=1, skill=10  → crit');
assertEq(dice.classifyRoll(1,  50), 'crit',    'classifyRoll: d100=1, skill=50  → crit');
assertEq(dice.classifyRoll(1,  99), 'crit',    'classifyRoll: d100=1, skill=99  → crit');

// ─── Fumble: skill < 50 → limiar = 96 ────────────────────────────────────
assertEq(dice.classifyRoll(96, 49), 'fumble',  'classifyRoll: d100=96, skill=49 (< 50) → fumble');
assertEq(dice.classifyRoll(99, 49), 'fumble',  'classifyRoll: d100=99, skill=49 (< 50) → fumble');
assertEq(dice.classifyRoll(100,49), 'fumble',  'classifyRoll: d100=100, skill=49(< 50) → fumble');
assertEq(dice.classifyRoll(95, 49), 'fail',    'classifyRoll: d100=95, skill=49 (< 50) → fail (não fumble)');

// ─── Fumble: skill ≥ 50 → limiar = 100 (somente 100 é fumble) ────────────
assertEq(dice.classifyRoll(100,50), 'fumble',  'classifyRoll: d100=100, skill=50 → fumble');
assertEq(dice.classifyRoll(100,75), 'fumble',  'classifyRoll: d100=100, skill=75 → fumble');
assertEq(dice.classifyRoll(96, 50), 'fail',    'classifyRoll: d100=96, skill=50 → fail (skill ≥ 50, limiar=100)');
assertEq(dice.classifyRoll(99, 50), 'fail',    'classifyRoll: d100=99, skill=50 → fail (skill ≥ 50)');

// ─── Extremo: d100 ≤ floor(skill / 5) ────────────────────────────────────
//    skill=60 → extreme ≤ 12
assertEq(dice.classifyRoll(12, 60), 'extreme', 'classifyRoll: d100=12, skill=60 → extreme (limite)');
assertEq(dice.classifyRoll(13, 60), 'hard',    'classifyRoll: d100=13, skill=60 → hard (acima de extreme)');
assertEq(dice.classifyRoll(2,  60), 'extreme', 'classifyRoll: d100=2, skill=60  → extreme');

// ─── Sólido: floor(skill/5) < d100 ≤ floor(skill/2) ─────────────────────
//    skill=60 → hard ≤ 30
assertEq(dice.classifyRoll(30, 60), 'hard',    'classifyRoll: d100=30, skill=60 → hard (limite)');
assertEq(dice.classifyRoll(31, 60), 'regular', 'classifyRoll: d100=31, skill=60 → regular (acima de hard)');

// ─── Regular: floor(skill/2) < d100 ≤ skill ──────────────────────────────
//    skill=60 → regular ≤ 60
assertEq(dice.classifyRoll(60, 60), 'regular', 'classifyRoll: d100=60, skill=60 → regular (limite exato)');
assertEq(dice.classifyRoll(61, 60), 'fail',    'classifyRoll: d100=61, skill=60 → fail (acima de skill)');

// ─── Skill = 1 (mínimo extremo) ──────────────────────────────────────────
//    extreme = floor(1/5) = 0 → nenhum valor o alcança
//    hard    = floor(1/2) = 0
//    regular = 1
assertEq(dice.classifyRoll(1,  1),  'crit',    'classifyRoll: d100=1, skill=1   → crit (crit precede tudo)');
assertEq(dice.classifyRoll(2,  1),  'fail',    'classifyRoll: d100=2, skill=1   → fail');
assertEq(dice.classifyRoll(96, 1),  'fumble',  'classifyRoll: d100=96, skill=1  → fumble (skill < 50)');

// ─────────────────────────────────────────────────────────────────────────────
//  meetsDifficulty — Regular / Hard / Extreme vs resultado
//
//  Rank: crit=5, extreme=4, hard=3, regular=2, fail=1, fumble=0
//  Dificuldade regular requer rank ≥ 2 (≥ "regular")
//  Dificuldade hard    requer rank ≥ 3 (≥ "hard")
//  Dificuldade extreme requer rank ≥ 4 (≥ "extreme")
// ─────────────────────────────────────────────────────────────────────────────
group('meetsDifficulty — matriz dificuldade × resultado');

// Dificuldade regular: passa em regular, hard, extreme, crit; falha em fail/fumble
assert( dice.meetsDifficulty('regular', 'regular'), 'meetsDifficulty: regular|regular → true');
assert( dice.meetsDifficulty('regular', 'hard'),    'meetsDifficulty: regular|hard    → true');
assert( dice.meetsDifficulty('regular', 'extreme'), 'meetsDifficulty: regular|extreme → true');
assert( dice.meetsDifficulty('regular', 'crit'),    'meetsDifficulty: regular|crit    → true');
assert(!dice.meetsDifficulty('regular', 'fail'),    'meetsDifficulty: regular|fail    → false');
assert(!dice.meetsDifficulty('regular', 'fumble'),  'meetsDifficulty: regular|fumble  → false');

// Dificuldade hard: passa em hard, extreme, crit; falha em regular, fail, fumble
assert( dice.meetsDifficulty('hard', 'hard'),       'meetsDifficulty: hard|hard       → true');
assert( dice.meetsDifficulty('hard', 'extreme'),    'meetsDifficulty: hard|extreme    → true');
assert( dice.meetsDifficulty('hard', 'crit'),       'meetsDifficulty: hard|crit       → true');
assert(!dice.meetsDifficulty('hard', 'regular'),    'meetsDifficulty: hard|regular    → false');
assert(!dice.meetsDifficulty('hard', 'fail'),       'meetsDifficulty: hard|fail       → false');

// Dificuldade extreme: passa em extreme e crit; falha em hard, regular, fail, fumble
assert( dice.meetsDifficulty('extreme', 'extreme'), 'meetsDifficulty: extreme|extreme → true');
assert( dice.meetsDifficulty('extreme', 'crit'),    'meetsDifficulty: extreme|crit    → true');
assert(!dice.meetsDifficulty('extreme', 'hard'),    'meetsDifficulty: extreme|hard    → false');
assert(!dice.meetsDifficulty('extreme', 'regular'), 'meetsDifficulty: extreme|regular → false');

// ─────────────────────────────────────────────────────────────────────────────
//  rollD100 — Invariantes estruturais
//
//  Não testa valores específicos (não-determinístico), mas verifica:
//  - value ∈ [1, 100]
//  - tensCandidates.length: 1 sem bp, 2 com bônus/penalidade
//  - campo bp preservado no retorno
//  - units ∈ [0, 9], tens ∈ [0, 9]
// ─────────────────────────────────────────────────────────────────────────────
group('rollD100 — invariantes estruturais (N=30 amostras)');

// Sem bônus/penalidade
let d100_inRange = true, d100_candidates1 = true, d100_bpNull = true;
let d100_units_ok = true, d100_tens_ok = true;
for (let i = 0; i < 30; i++) {
  const r = dice.rollD100();
  if (r.value < 1 || r.value > 100) d100_inRange = false;
  if (r.tensCandidates.length !== 1)  d100_candidates1 = false;
  if (r.bp !== null)                  d100_bpNull = false;
  if (r.units < 0 || r.units > 9)    d100_units_ok = false;
  if (r.tens  < 0 || r.tens  > 9)    d100_tens_ok  = false;
}
assert(d100_inRange,     'rollD100(): value ∈ [1,100] em 30 amostras');
assert(d100_candidates1, 'rollD100(): tensCandidates.length === 1 sem bp');
assert(d100_bpNull,      'rollD100(): bp === null sem argumento');
assert(d100_units_ok,    'rollD100(): units ∈ [0,9]');
assert(d100_tens_ok,     'rollD100(): tens  ∈ [0,9]');

// Com bônus/penalidade: tensCandidates.length deve ser 2
let d100_bonus_cands = true, d100_penalty_cands = true;
let d100_bonus_min = true, d100_penalty_max = true;
for (let i = 0; i < 30; i++) {
  const b = dice.rollD100('bonus');
  const p = dice.rollD100('penalty');
  if (b.tensCandidates.length !== 2)                           d100_bonus_cands = false;
  if (p.tensCandidates.length !== 2)                           d100_penalty_cands = false;
  if (b.tens !== Math.min(...b.tensCandidates))                d100_bonus_min = false;
  if (p.tens !== Math.max(...p.tensCandidates))                d100_penalty_max = false;
}
assert(d100_bonus_cands,   'rollD100("bonus"): tensCandidates.length === 2');
assert(d100_penalty_cands, 'rollD100("penalty"): tensCandidates.length === 2');
assert(d100_bonus_min,     'rollD100("bonus"): tens === min(tensCandidates)');
assert(d100_penalty_max,   'rollD100("penalty"): tens === max(tensCandidates)');

// ─────────────────────────────────────────────────────────────────────────────
//  rollNotation — Casos determinísticos + faixas de resultado
//
//  Casos determinísticos: notações sem dado ("0", "5", "-3", etc.)
//  Faixas: "1D6" ∈ [1,6], "2D6" ∈ [2,12], "1D4+2" ∈ [3,6], "3D6" ∈ [3,18]
// ─────────────────────────────────────────────────────────────────────────────
group('rollNotation — determinísticos e faixas');

// Determinísticos (sem dado)
assertEq(dice.rollNotation('0').total,   0, 'rollNotation("0")  → total = 0');
assertEq(dice.rollNotation('5').total,   5, 'rollNotation("5")  → total = 5');
assertEq(dice.rollNotation('-3').total, -3, 'rollNotation("-3") → total = -3');
assertEq(dice.rollNotation('10').total, 10, 'rollNotation("10") → total = 10');
assertEq(dice.rollNotation(null).total,  0, 'rollNotation(null) → total = 0 (guarda proteção)');

// Faixas (N=20 amostras por notação)
function inRange(fn, min, max, label) {
  for (let i = 0; i < 20; i++) {
    const v = fn();
    if (v < min || v > max) {
      assert(false, `${label}: valor ${v} fora de [${min},${max}]`);
      return;
    }
  }
  assert(true, label);
}

inRange(() => dice.rollNotation('1D6').total,   1,  6, 'rollNotation("1D6")  ∈ [1,6]');
inRange(() => dice.rollNotation('2D6').total,   2, 12, 'rollNotation("2D6")  ∈ [2,12]');
inRange(() => dice.rollNotation('1D4+2').total, 3,  6, 'rollNotation("1D4+2")∈ [3,6]');
inRange(() => dice.rollNotation('3D6').total,   3, 18, 'rollNotation("3D6")  ∈ [3,18]');
inRange(() => dice.rollNotation('1D10').total,  1, 10, 'rollNotation("1D10") ∈ [1,10]');
inRange(() => dice.rollNotation('1D8-1').total, 0,  7, 'rollNotation("1D8-1")∈ [0,7]');

// rolls[] preenchido corretamente
const rr = dice.rollNotation('2D6');
assertEq(rr.rolls.length, 1,   'rollNotation("2D6"): rolls.length === 1 (um grupo)');
assertEq(rr.rolls[0].n,   2,   'rollNotation("2D6"): rolls[0].n === 2');
assertEq(rr.rolls[0].sides, 6, 'rollNotation("2D6"): rolls[0].sides === 6');
assertEq(rr.rolls[0].dice.length, 2, 'rollNotation("2D6"): rolls[0].dice.length === 2');

// ─────────────────────────────────────────────────────────────────────────────
//  rollAttribute — Faixas e invariantes
//
//  "3d6x5"   → total ∈ [15,90], total%5 === 0, raw.length === 3
//  "2d6+6x5" → total ∈ [40,90], total%5 === 0, raw.length === 2
// ─────────────────────────────────────────────────────────────────────────────
group('rollAttribute — faixas e invariantes (N=30)');

let attr3_range = true, attr3_mult5 = true, attr3_rawLen = true;
let attr2_range = true, attr2_mult5 = true, attr2_rawLen = true;

for (let i = 0; i < 30; i++) {
  const r3 = dice.rollAttribute('3d6x5');
  if (r3.total < 15 || r3.total > 90) attr3_range = false;
  if (r3.total % 5 !== 0)             attr3_mult5 = false;
  if (r3.raw.length !== 3)            attr3_rawLen = false;

  const r2 = dice.rollAttribute('2d6+6x5');
  if (r2.total < 40 || r2.total > 90) attr2_range = false;
  if (r2.total % 5 !== 0)             attr2_mult5 = false;
  if (r2.raw.length !== 2)            attr2_rawLen = false;
}

assert(attr3_range,  'rollAttribute("3d6x5"):   total ∈ [15,90] em 30 amostras');
assert(attr3_mult5,  'rollAttribute("3d6x5"):   total % 5 === 0');
assert(attr3_rawLen, 'rollAttribute("3d6x5"):   raw.length === 3');
assert(attr2_range,  'rollAttribute("2d6+6x5"): total ∈ [40,90] em 30 amostras');
assert(attr2_mult5,  'rollAttribute("2d6+6x5"): total % 5 === 0');
assert(attr2_rawLen, 'rollAttribute("2d6+6x5"): raw.length === 2');

// rawSum × 5 === total (invariante interno)
let rawSum_ok = true;
for (let i = 0; i < 20; i++) {
  const r = dice.rollAttribute('3d6x5');
  if (r.rawSum * 5 !== r.total) rawSum_ok = false;
}
assert(rawSum_ok, 'rollAttribute("3d6x5"): rawSum * 5 === total (invariante interno)');
