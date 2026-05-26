/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/engine/dice.js
   Engine de Dados — Chamado de Cthulhu 7E
   Atribui a window.CoC.dice — sem fetch, sem dependências
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  // ─── Utilitários básicos ───────────────────────────────────────────────
  const half  = (v) => Math.floor(v / 2);
  const fifth = (v) => Math.floor(v / 5);

  /**
   * Rola 1 dado de N lados (1..sides).
   * @param {number} sides
   * @returns {number}
   */
  function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  /**
   * Rola NdS (N dados de S lados). Retorna a soma.
   * @param {number} n
   * @param {number} sides
   * @returns {number}
   */
  function rollDice(n, sides) {
    let total = 0;
    for (let i = 0; i < n; i++) total += rollDie(sides);
    return total;
  }

  /**
   * Rola 1D100 com suporte a Bônus / Penalidade (regra 7E).
   *
   * @param {string|null} bp - null | "bonus" | "penalty"
   *   bonus:    rola 2 dados de dezena, usa o MENOR
   *   penalty:  rola 2 dados de dezena, usa o MAIOR
   *
   * @returns {{ value: number, units: number, tens: number, tensCandidates: number[], bp: string|null }}
   */
  function rollD100(bp = null) {
    const units  = rollDie(10) - 1;          // 0-9
    const tensA  = rollDie(10) - 1;          // 0-9
    let tens, tensCandidates;

    if (bp === "bonus" || bp === "penalty") {
      const tensB = rollDie(10) - 1;
      tens = bp === "bonus" ? Math.min(tensA, tensB) : Math.max(tensA, tensB);
      tensCandidates = [tensA, tensB];
    } else {
      tens = tensA;
      tensCandidates = [tensA];
    }

    // 00,0 = 100 (regra clássica do D100)
    const value = (tens === 0 && units === 0) ? 100 : (tens * 10 + units);

    return { value, units, tens, tensCandidates, bp: bp || null };
  }

  /**
   * Classifica o resultado de 1D100 contra um valor de perícia (CoC 7E).
   *
   * Crítico:   d100 === 1
   * Extremo:   d100 ≤ skill/5  (arredondado para baixo)
   * Sólido:    d100 ≤ skill/2
   * Regular:   d100 ≤ skill
   * Falha:     d100 >  skill
   * Fumble:    d100 === 100 (sempre, com skill 50+)
   *            d100 ≥ 96    (com skill < 50)
   *
   * @param {number} d100   - 1..100
   * @param {number} skill  - valor da perícia
   * @returns {"crit"|"extreme"|"hard"|"regular"|"fail"|"fumble"}
   */
  function classifyRoll(d100, skill) {
    if (d100 === 1) return "crit";
    const fumbleAt = skill < 50 ? 96 : 100;
    if (d100 >= fumbleAt) return "fumble";  // fumble tem prioridade sobre extreme/regular abaixo
    if (d100 <= fifth(skill)) return "extreme";
    if (d100 <= half(skill))  return "hard";
    if (d100 <= skill)        return "regular";
    return "fail";
  }

  /**
   * Compara o resultado contra um nível de dificuldade alvo (escolhido pelo Guardião).
   * Retorna true se o resultado bate a dificuldade.
   *
   * @param {string} level - "regular" | "hard" | "extreme"
   * @param {string} resultLevel - resultado de classifyRoll
   */
  function meetsDifficulty(level, resultLevel) {
    const rank = { crit: 5, extreme: 4, hard: 3, regular: 2, fail: 1, fumble: 0 };
    const needed = { regular: 2, hard: 3, extreme: 4 }[level] || 2;
    return rank[resultLevel] >= needed;
  }

  /**
   * Labels em PT-BR para os níveis de resultado.
   */
  const LEVEL_LABELS = {
    crit:    "CRÍTICO",
    extreme: "EXTREMO",
    hard:    "SÓLIDO",
    regular: "REGULAR",
    fail:    "FALHA",
    fumble:  "FUMBLE"
  };

  /**
   * Parser de notação de dados:
   *   "1D6"       → rola 1d6
   *   "2D6+3"     → rola 2d6, soma 3
   *   "1D10+DB"   → rola 1d10, soma o DB (precisa ser substituído antes)
   *   "4D6"       → rola 4d6
   *   "1D4+2+DB"  → 1d4+2+DB
   *
   * Substitui +DB, -DB, +db etc por uma string fornecida em `dbValue`.
   *
   * @param {string} notation
   * @param {string|number} dbValue - opcional, dano bônus já como string ("+1D4", "-2", "0")
   * @returns {{ total: number, rolls: Array<{n:number, sides:number, result:number, dice:number[]}>, expression: string }}
   */
  function rollNotation(notation, dbValue = "0") {
    if (notation == null) return { total: 0, rolls: [], expression: "" };
    let expr = String(notation).trim().toUpperCase().replace(/\s+/g, "");

    // Substitui +DB / -DB / DB pelo valor passado
    expr = expr.replace(/([+-]?)DB/g, (_, sign) => {
      if (!sign && dbValue.toString().match(/^[+-]/)) return dbValue.toString();
      const v = dbValue.toString().replace(/^[+]/, "");
      return (sign || "+") + v;
    });

    // Captura todos os blocos: NdM, +N, -N
    const tokens = expr.match(/[+-]?\d*D\d+|[+-]?\d+/gi) || [];
    let total = 0;
    const rolls = [];

    for (let tok of tokens) {
      tok = tok.trim();
      if (!tok) continue;
      const sign = tok.startsWith("-") ? -1 : +1;
      tok = tok.replace(/^[+-]/, "");

      if (tok.includes("D")) {
        const [nStr, sStr] = tok.split("D");
        const n = parseInt(nStr || "1", 10);
        const sides = parseInt(sStr, 10);
        if (isNaN(n) || isNaN(sides) || sides < 1) continue;
        const dice = [];
        let subtotal = 0;
        for (let i = 0; i < n; i++) {
          const r = rollDie(sides);
          dice.push(r);
          subtotal += r;
        }
        total += sign * subtotal;
        rolls.push({ n, sides, result: sign * subtotal, dice });
      } else {
        const v = parseInt(tok, 10);
        if (!isNaN(v)) total += sign * v;
      }
    }

    return { total, rolls, expression: expr };
  }

  /**
   * Rola dano de uma arma (atalho de rollNotation com nome de arma).
   * Substitui "+DB" pelo bônus do personagem se fornecido.
   */
  function rollDamage(weaponDamageString, db = "0", impale = false) {
    if (impale) {
      // Dano máximo (regra de empalar): substitui rolagens por valor máximo
      const result = rollNotation(weaponDamageString, db);
      // Re-calcular total como se cada dado fosse o máximo
      let max = 0;
      for (const r of result.rolls) {
        max += (r.n * r.sides) * (r.result < 0 ? -1 : 1);
      }
      // Adiciona termos numéricos (constantes)
      const constants = (weaponDamageString.match(/[+-]\d+(?!D)/gi) || [])
        .reduce((acc, t) => acc + parseInt(t, 10), 0);
      result.total = max + constants;
      result.impale = true;
      return result;
    }
    return rollNotation(weaponDamageString, db);
  }

  /**
   * Atalho: rola 3D6 (atributos comuns) ou 2D6+6 (atributos altos), multiplicado por 5.
   * @param {"3d6x5"|"2d6+6x5"} formula
   * @returns {{ total: number, raw: number[], rawSum: number, formula: string }}
   */
  function rollAttribute(formula) {
    if (formula === "2d6+6x5") {
      const raw = [rollDie(6), rollDie(6)];
      const rawSum = raw[0] + raw[1] + 6;
      return { total: rawSum * 5, raw, rawSum, formula };
    }
    // default: 3d6x5
    const raw = [rollDie(6), rollDie(6), rollDie(6)];
    const rawSum = raw[0] + raw[1] + raw[2];
    return { total: rawSum * 5, raw, rawSum, formula: "3d6x5" };
  }

  // ─── Expor no namespace global ─────────────────────────────────────────
  window.CoC.dice = {
    rollDie,
    rollDice,
    rollD100,
    classifyRoll,
    meetsDifficulty,
    rollNotation,
    rollDamage,
    rollAttribute,
    half,
    fifth,
    LEVEL_LABELS
  };

})();
