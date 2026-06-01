/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-occupation.js
   Trava o contrato de DISTRIBUIÇÃO DE PONTOS de ocupação — em especial a
   "Personalizada" (perícias livres) — exigido pela DIRETRIZ OFICIAL §4.

   Cobre: cálculo de pontos (alternativas), contexto (mandatory/chosen/effective/
   freeBudget), atribuição de gasto (ocupação × interesse), idempotência a reload
   (round-trip JSON) e a intenção da correção de migração (renomear occupationSkills).

   Funções puras vêm de js/engine/coc7e-rules.js (carregado pelo runner).
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  group("Occupation — distribuição de pontos (Personalizada)");

  var rules = window.CoC.rules;

  // Espelha a entrada real "Personalizada (defina suas perícias)" de data/occupations.js
  var personalizada = {
    name: "Personalizada (defina suas perícias)",
    pointsFormula: "EDU*2 + (FOR*2 | CON*2 | TAM*2 | DES*2 | APA*2 | POD*2)",
    skills: [],
    anySkillsCount: 8
  };
  var attrs = { EDU: 60, FOR: 50, CON: 40, TAM: 55, DES: 70, APA: 45, POD: 65, INT: 50 };

  // 1) Pontos = EDU*2 + max(FOR,CON,TAM,DES,APA,POD)*2 = 120 + 140 (DES=70) = 260
  var pts = rules.calcOccupationPoints(personalizada.pointsFormula, attrs);
  assertEq(pts.points, 260, "Personalizada: pontos = EDU*2 + melhor alternativa*2");

  // 2) Contexto: sem obrigatórias, 8 livres; designadas viram chosen/effective
  var charBase = {
    attributes: Object.fromEntries(Object.entries(attrs).map(function (e) { return [e[0], { value: e[1] }]; })),
    occupationSkills: ["Esquivar", "Furtividade", "Lábia"]
  };
  var ctx = rules.buildOccupationContext(personalizada, charBase);
  assertEq(ctx.mandatory.size, 0, "Personalizada: nenhuma perícia obrigatória");
  assertEq(ctx.freeBudget, 8, "Personalizada: 8 perícias livres");
  assertEq(ctx.freeUsed, 3, "Personalizada: 3 livres designadas");
  assertEq(ctx.effective.size, 3, "Personalizada: effective = chosen quando não há obrigatórias");
  assert(ctx.effective.has("Lábia"), "Personalizada: perícia designada entra no pool da ocupação");

  // 3) Atribuição de gasto (base 0 p/ custom): designadas → ocupação; resto → interesse.
  //    Replica a lógica de js/views/skills.js#_sumSkillSpend (base=0) de forma pura.
  var skillsSpent = { "Esquivar": 50, "Furtividade": 30, "Lábia": 20, "Ocultismo": 40 };
  var occSpent = 0, piSpent = 0;
  Object.keys(skillsSpent).forEach(function (name) {
    var spent = skillsSpent[name]; // base 0 → gasto = valor
    if (ctx.effective.has(name)) occSpent += spent; else piSpent += spent;
  });
  assertEq(occSpent, 100, "Gasto de ocupação = soma das 3 designadas (50+30+20)");
  assertEq(piSpent, 40, "Gasto de interesse = perícia não designada (Ocultismo)");
  assert(occSpent <= pts.points, "Gasto de ocupação dentro do orçamento (sem perda de pontos)");

  // 4) Idempotência a reload/importação: round-trip JSON preserva o contexto.
  var clone = JSON.parse(JSON.stringify(charBase));
  var ctx2 = rules.buildOccupationContext(personalizada, clone);
  assertEq(ctx2.freeUsed, ctx.freeUsed, "Round-trip: freeUsed estável");
  assertEq(ctx2.effective.size, ctx.effective.size, "Round-trip: effective estável");

  // 5) Intenção da correção de migração v3 (storage.js): renomear occupationSkills
  //    para que perícias livres designadas continuem casando com as chaves renomeadas.
  var RENAMES = { "Nadar": "Natação", "Seguir Alguém": "Furtividade" };
  var legacyOccSkills = ["Nadar", "Seguir Alguém", "Lábia"];
  var migrated = legacyOccSkills.map(function (n) { return RENAMES[n] || n; });
  var renamedSkills = { "Natação": { value: 60 }, "Furtividade": { value: 50 }, "Lábia": { value: 40 } };
  assertEq(migrated[0], "Natação", "Migração: occupationSkills 'Nadar' → 'Natação'");
  var allMatch = migrated.every(function (n) {
    return Object.prototype.hasOwnProperty.call(renamedSkills, n);
  });
  assert(allMatch, "Migração: toda perícia livre migrada casa com chave renomeada (sem perda)");

  // 6) Ocupação oficial com obrigatórias continua coerente.
  var medico = { name: "Médico", pointsFormula: "EDU*4", skills: ["Medicina", "Primeiros Socorros"], anySkillsCount: 1 };
  var ctxMed = rules.buildOccupationContext(medico, { occupationSkills: ["Psicologia"] });
  assertEq(ctxMed.mandatory.size, 2, "Médico: 2 obrigatórias");
  assertEq(ctxMed.freeBudget, 1, "Médico: 1 livre");
  assert(ctxMed.effective.has("Medicina") && ctxMed.effective.has("Psicologia"),
    "Médico: effective = obrigatórias ∪ designadas");
  assertEq(rules.calcOccupationPoints("EDU*4", attrs).points, 240, "Médico: EDU*4 = 240");
})();
