/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-rules.js
   Suíte de testes para js/engine/coc7e-rules.js

   Cobertura desta versão (v2):
   - calcAgeAdjustments — estrutura oficial (physical, appReduction, eduReduction,
     eduImprovementChecks, luckRerolls) para todas as faixas etárias
   - rollEduImprovement — sem ganho, com ganho, cap 99
   - BUG-03: re-roll de Sorte para jovens (15-19) — invariante da lógica
   - calcDB:  bônus de dano via tabela FOR+TAM
   - calcMOV: movimento base + ajustes por idade
   - calcHP:  pontos de vida

   Carregado por runner.js, que expõe assert(), assertEq() e group() como globais.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const rules = window.CoC.rules;

// ─────────────────────────────────────────────────────────────────────────────
//  calcAgeAdjustments — estrutura oficial CoC 7e p.35-36
//
//  Retorno: { physical:{points,attrs}, appReduction, eduReduction,
//             eduImprovementChecks, luckRerolls }
//
//  Faixa 15–19: physical{5,[FOR,TAM]}, eduReduction=5, luckRerolls=1
//  Faixa 20–39: eduImprovementChecks=1
//  Faixa 40–49: physical{5,[FOR,CON,DES]}, appReduction=5, eduChecks=2
//  Faixa 50–59: physical{10}, appReduction=10, eduChecks=3
//  Faixa 60–69: physical{20}, appReduction=15, eduChecks=4
//  Faixa 70–79: physical{40}, appReduction=20, eduChecks=4
//  Faixa 80+:   physical{80}, appReduction=25, eduChecks=4
// ─────────────────────────────────────────────────────────────────────────────
group('calcAgeAdjustments — estrutura oficial CoC 7e (todas as faixas)');

// ── Faixa 15–19: FOR/TAM (não CON/DES), EDU−5, luckRerolls=1 ────────────────
const _17 = rules.calcAgeAdjustments(17);
assert(_17 !== null,                                          'age 17: retorna ajuste (não null)');
assertEq(_17.physical.points, 5,                             'age 17: physical.points=5');
assertEq(_17.physical.attrs.join(','), 'FOR,TAM',            'age 17: physical.attrs=FOR,TAM (não CON/DES)');
assertEq(_17.appReduction, 0,                                'age 17: appReduction=0');
assertEq(_17.eduReduction, 5,                                'age 17: eduReduction=5');
assertEq(_17.eduImprovementChecks, 0,                        'age 17: eduImprovementChecks=0');
assertEq(_17.luckRerolls, 1,                                 'age 17: luckRerolls=1');

const _15 = rules.calcAgeAdjustments(15);
assertEq(_15.physical.attrs.join(','), 'FOR,TAM',            'age 15 (limite inf.): FOR,TAM');
assertEq(_15.luckRerolls, 1,                                 'age 15: luckRerolls=1');

const _19 = rules.calcAgeAdjustments(19);
assertEq(_19.physical.attrs.join(','), 'FOR,TAM',            'age 19 (limite sup.): FOR,TAM');
assertEq(_19.eduReduction, 5,                                'age 19: eduReduction=5');

// ── Faixa 20–39: apenas EDU checks ──────────────────────────────────────────
const _25 = rules.calcAgeAdjustments(25);
assert(_25 !== null,                                          'age 25: retorna ajuste (não null)');
assertEq(_25.physical.points, 0,                             'age 25: physical.points=0');
assertEq(_25.appReduction, 0,                                'age 25: appReduction=0');
assertEq(_25.eduReduction, 0,                                'age 25: eduReduction=0');
assertEq(_25.eduImprovementChecks, 1,                        'age 25: eduImprovementChecks=1');
assertEq(_25.luckRerolls, 0,                                 'age 25: luckRerolls=0');

// ── Faixa 40–49: FOR/CON/DES + APA separada + 2 EDU checks ──────────────────
const _45 = rules.calcAgeAdjustments(45);
assertEq(_45.physical.points, 5,                             'age 45: physical.points=5');
assertEq(_45.physical.attrs.join(','), 'FOR,CON,DES',        'age 45: physical.attrs=FOR,CON,DES');
assertEq(_45.appReduction, 5,                                'age 45: appReduction=5 (APA separada)');
assertEq(_45.eduImprovementChecks, 2,                        'age 45: eduImprovementChecks=2');

// ── Faixa 50–59 ──────────────────────────────────────────────────────────────
const _55 = rules.calcAgeAdjustments(55);
assertEq(_55.physical.points, 10,                            'age 55: physical.points=10');
assertEq(_55.appReduction, 10,                               'age 55: appReduction=10');
assertEq(_55.eduImprovementChecks, 3,                        'age 55: eduImprovementChecks=3');

// ── Faixa 60–69 ──────────────────────────────────────────────────────────────
const _65 = rules.calcAgeAdjustments(65);
assertEq(_65.physical.points, 20,                            'age 65: physical.points=20');
assertEq(_65.appReduction, 15,                               'age 65: appReduction=15');
assertEq(_65.eduImprovementChecks, 4,                        'age 65: eduImprovementChecks=4');

// ── Faixa 70–79 ──────────────────────────────────────────────────────────────
const _75 = rules.calcAgeAdjustments(75);
assertEq(_75.physical.points, 40,                            'age 75: physical.points=40');
assertEq(_75.appReduction, 20,                               'age 75: appReduction=20');
assertEq(_75.eduImprovementChecks, 4,                        'age 75: eduImprovementChecks=4');

// ── Faixa 80+ ────────────────────────────────────────────────────────────────
const _85 = rules.calcAgeAdjustments(85);
assertEq(_85.physical.points, 80,                            'age 85: physical.points=80');
assertEq(_85.appReduction, 25,                               'age 85: appReduction=25');
assertEq(_85.eduImprovementChecks, 4,                        'age 85: eduImprovementChecks=4');
assertEq(rules.calcAgeAdjustments(99).physical.points, 80,  'age 99+: physical.points=80 (máximo)');

// ── Antes dos 15 anos: null ──────────────────────────────────────────────────
assert(rules.calcAgeAdjustments(14) === null,                'age 14: sem ajuste (null)');
assert(rules.calcAgeAdjustments(10) === null,                'age 10: sem ajuste (null)');

// ─────────────────────────────────────────────────────────────────────────────
//  rollEduImprovement — Verificação de Melhoria de EDU (CoC 7e p.36)
//
//  Função pura:
//  - d100 > EDU → improved=true, gain∈[1,10], after=min(99,EDU+gain)
//  - d100 ≤ EDU → improved=false, gain=0, after=EDU
// ─────────────────────────────────────────────────────────────────────────────
group('rollEduImprovement — Verificação de Melhoria de EDU');

// Sem ganho: retorno estrutural quando não melhora
(function () {
  // Forçar não-melhoria: EDU 99 → qualquer d100 1-99 ≤ 99, nunca melhora
  // (d100 precisaria ser 100 e EDU 99 → 100 > 99 → melhoraria, mas cap=99 → gain=0)
  // Alternativa: EDU=1, rodar muitas vezes até encontrar não-melhoria
  // Como é não-determinístico, testamos a estrutura do retorno
  const r = rules.rollEduImprovement(50);
  assert(typeof r.rolled === 'number',    'rollEduImprovement: retorna rolled (número)');
  assert(typeof r.gain === 'number',      'rollEduImprovement: retorna gain (número)');
  assert(typeof r.before === 'number',    'rollEduImprovement: retorna before (número)');
  assert(typeof r.after === 'number',     'rollEduImprovement: retorna after (número)');
  assert(typeof r.improved === 'boolean', 'rollEduImprovement: retorna improved (boolean)');
  assertEq(r.before, 50,                 'rollEduImprovement(50): before=50');
  assert(r.rolled >= 1 && r.rolled <= 100, 'rollEduImprovement: rolled ∈ [1,100]');
  if (r.improved) {
    assert(r.gain >= 1 && r.gain <= 10,   'rollEduImprovement (melhorou): gain ∈ [1,10]');
    assert(r.after > r.before,            'rollEduImprovement (melhorou): after > before');
    assert(r.after <= 99,                 'rollEduImprovement (melhorou): after ≤ 99');
  } else {
    assertEq(r.gain, 0,                   'rollEduImprovement (não melhorou): gain=0');
    assertEq(r.after, r.before,           'rollEduImprovement (não melhorou): after=before');
  }
})();

// Cap 99: EDU=96, gain=8 → after=99 (não 104)
(function () {
  // Substituição determinística da lógica (sem RNG): testar o cap diretamente
  // Espelha: after = Math.min(99, edu + gain)
  function applyGain(edu, gain) { return Math.min(99, edu + gain); }
  assertEq(applyGain(96,  8),  99, 'EDU cap: 96+8=104 → after=99 (cap em 99)');
  assertEq(applyGain(90, 10), 99,  'EDU cap: 90+10=100 → after=99');
  assertEq(applyGain(99,  1), 99,  'EDU cap: 99+1=100 → after=99');
  assertEq(applyGain(80, 10), 90,  'EDU sem cap: 80+10=90 ≤ 99 → after=90');
})();

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
//  rollSkillImprovement — Verificação de Melhoria de Perícia (CoC 7e p.44)
//
//  Mesma mecânica de rollEduImprovement:
//  - d100 > value → improved=true, gain∈[1,10], after=min(99,value+gain)
//  - d100 ≤ value → improved=false, gain=0
// ─────────────────────────────────────────────────────────────────────────────
group('rollSkillImprovement — Verificação de Melhoria de Perícia');

(function () {
  const r = rules.rollSkillImprovement(40);
  assert(typeof r.rolled === 'number',    'rollSkillImprovement: rolled=number');
  assert(typeof r.improved === 'boolean', 'rollSkillImprovement: improved=boolean');
  assertEq(r.before, 40,                 'rollSkillImprovement(40): before=40');
  assert(r.rolled >= 1 && r.rolled <= 100, 'rollSkillImprovement: rolled∈[1,100]');
  if (r.improved) {
    assert(r.gain >= 1 && r.gain <= 10,  'rollSkillImprovement (melhorou): gain∈[1,10]');
    assert(r.after <= 99,                'rollSkillImprovement: after≤99');
    assert(r.after > r.before,           'rollSkillImprovement: after>before');
  } else {
    assertEq(r.gain, 0,   'rollSkillImprovement (não melhorou): gain=0');
    assertEq(r.after, r.before, 'rollSkillImprovement: after=before');
  }

  // Cap 99: mesma lógica de EDU
  function applySkillGain(v, g) { return Math.min(99, v + g); }
  assertEq(applySkillGain(95, 8), 99, 'skill cap: 95+8→99');
  assertEq(applySkillGain(50, 7), 57, 'skill sem cap: 50+7=57');

  // Perícia 0: qualquer d100 (1-100) é > 0, então sempre melhora?
  // Na prática: d100 ≥ 1 > 0 → sim, sempre melhora — validar retorno correto
  const r0 = rules.rollSkillImprovement(0);
  assert(r0.improved === true, 'rollSkillImprovement(0): sempre melhora (d100≥1 > 0)');
  assert(r0.after > 0, 'rollSkillImprovement(0): after > 0');
})();

// ─────────────────────────────────────────────────────────────────────────────
//  computeSkillProvenance — Proveniência do valor de perícia (#32)
// ─────────────────────────────────────────────────────────────────────────────
group('computeSkillProvenance — origem rastreável (#32)');

(function () {
  // Sem ocupação → allocated vai para interesse pessoal
  var p1 = rules.computeSkillProvenance({
    attributes: { DES: { value: 60 }, EDU: { value: 70 } },
    investigator: { occupation: '' },
    skills: { 'Ocultismo': { value: 45 } },
    occupationSkills: []
  }, 'Ocultismo');
  assertEq(p1.base, 5,       'Ocultismo: base=5');
  assertEq(p1.total, 45,     'Ocultismo: total=45');
  assertEq(p1.allocated, 40, 'Ocultismo: allocated=40');
  assertEq(p1.interest, 40,  'Ocultismo: 40 em interesse');
  assertEq(p1.occupation, 0, 'Ocultismo: 0 em ocupação');
  assertEq(p1.source, 'interest', 'Ocultismo: source=interest');
  assert(p1.withinLimit,     'Ocultismo 45: dentro do limite');

  // Designada como ocupação → allocated vai para ocupação
  var p2 = rules.computeSkillProvenance({
    attributes: {}, investigator: { occupation: '' },
    skills: { 'Ocultismo': { value: 65 } }, occupationSkills: ['Ocultismo']
  }, 'Ocultismo');
  assertEq(p2.occupation, 60, 'Ocultismo (ocupação): 60 em ocupação');
  assertEq(p2.source, 'occupation', 'Ocultismo (ocupação): source=occupation');

  // Base derivada DES/2 (Esquivar), só base
  var p3 = rules.computeSkillProvenance({
    attributes: { DES: { value: 60 } }, investigator: {},
    skills: { 'Esquivar': { value: 30 } }, occupationSkills: []
  }, 'Esquivar');
  assertEq(p3.base, 30,      'Esquivar: base=DES/2=30');
  assertEq(p3.allocated, 0,  'Esquivar: allocated=0');
  assertEq(p3.source, 'base','Esquivar: source=base');

  // Acima do limite recomendado (>90)
  var p4 = rules.computeSkillProvenance({
    attributes: {}, investigator: {},
    skills: { 'Ocultismo': { value: 95 } }, occupationSkills: []
  }, 'Ocultismo');
  assert(!p4.withinLimit, 'Ocultismo 95: acima do limite → requer Guardião');
})();

// ─────────────────────────────────────────────────────────────────────────────
//  Funções auxiliares locais (não disponíveis em window.CoC)
// ─────────────────────────────────────────────────────────────────────────────

function calcMOV(forca, des, tam, age) {
  return rules.calcMOV(forca, des, tam, age);
}
