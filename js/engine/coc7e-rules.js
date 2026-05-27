/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/engine/coc7e-rules.js
   Regras Derivadas do Chamado de Cthulhu 7E
   Atribui a window.CoC.rules
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  // ─── Helpers locais ────────────────────────────────────────────────────
  const num = (v) => (typeof v === "number" && !isNaN(v) ? v : 0);
  const floor = Math.floor;

  /**
   * Avalia uma expressão aritmética SIMPLES contendo apenas:
   *   dígitos · ponto decimal · + - * / · parênteses
   *
   * Implementa Shunting Yard + avaliação em RPN. Sem new Function, sem eval,
   * sem chance de injeção de código ou crash por sintaxe inválida.
   *
   * @param {string} expr - já sanitizada (whitelist enforcada externamente)
   * @returns {number} resultado, ou lança Error em malformações
   */
  function safeEvalArithmetic(expr) {
    if (!expr || typeof expr !== "string") return 0;
    const tokens = tokenize(expr);
    const rpn = toRPN(tokens);
    return evalRPN(rpn);
  }

  function tokenize(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "(" || c === ")" || c === "+" || c === "*" || c === "/") {
        out.push(c); i++; continue;
      }
      if (c === "-") {
        // Detecta menos unário: início, ou após operador/parêntese aberto
        const prev = out[out.length - 1];
        if (out.length === 0 || prev === "(" || /^[+\-*/]$/.test(prev)) {
          // unário: trata como 0 - (...) ou negativa o próximo número
          out.push("0"); out.push("-"); i++;
        } else {
          out.push("-"); i++;
        }
        continue;
      }
      if (/[0-9.]/.test(c)) {
        let j = i + 1;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const num = parseFloat(s.slice(i, j));
        if (isNaN(num)) throw new Error("Bad number");
        out.push(num);
        i = j;
        continue;
      }
      throw new Error("Bad char: " + c);
    }
    return out;
  }

  function toRPN(tokens) {
    const out = [];
    const ops = [];
    const prec = { "+": 1, "-": 1, "*": 2, "/": 2 };
    for (const t of tokens) {
      if (typeof t === "number") {
        out.push(t);
      } else if (t === "(") {
        ops.push(t);
      } else if (t === ")") {
        while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop());
        if (ops.pop() !== "(") throw new Error("Mismatched parens");
      } else if (prec[t] != null) {
        while (ops.length) {
          const top = ops[ops.length - 1];
          if (top !== "(" && prec[top] >= prec[t]) out.push(ops.pop());
          else break;
        }
        ops.push(t);
      } else {
        throw new Error("Bad token: " + t);
      }
    }
    while (ops.length) {
      const op = ops.pop();
      if (op === "(" || op === ")") throw new Error("Mismatched parens");
      out.push(op);
    }
    return out;
  }

  function evalRPN(rpn) {
    const stack = [];
    for (const t of rpn) {
      if (typeof t === "number") {
        stack.push(t);
      } else {
        const b = stack.pop();
        const a = stack.pop();
        if (a === undefined || b === undefined) throw new Error("Bad RPN");
        switch (t) {
          case "+": stack.push(a + b); break;
          case "-": stack.push(a - b); break;
          case "*": stack.push(a * b); break;
          case "/":
            if (b === 0) throw new Error("Division by zero");
            stack.push(a / b); break;
          default: throw new Error("Bad op: " + t);
        }
      }
    }
    if (stack.length !== 1) throw new Error("Bad expression");
    return stack[0];
  }

  /**
   * Pontos de Vida (PV).
   *   PV = floor((CON + TAM) / 10)
   */
  function calcHP(con, tam) {
    return floor((num(con) + num(tam)) / 10);
  }

  /**
   * Pontos de Magia (PM).
   *   PM = floor(POD / 5)
   */
  function calcMP(pod) {
    return floor(num(pod) / 5);
  }

  /**
   * Sanidade Inicial.
   *   SAN inicial = POD
   */
  function calcSANInit(pod) {
    return num(pod);
  }

  /**
   * Sanidade Máxima.
   *   SAN máx = 99 - Mitos de Cthulhu
   */
  function calcSANMax(mitos) {
    return Math.max(0, 99 - num(mitos));
  }

  /**
   * Movimento (MOV) — depende da idade e da relação entre FOR/DES/TAM.
   *
   * Regra base (CoC 7E):
   *   - Se DES < TAM E FOR < TAM:  MOV 7
   *   - Se DES ≥ TAM OU FOR ≥ TAM: MOV 8
   *   - Se DES > TAM E FOR > TAM:  MOV 9
   *
   * Ajustes por idade (sobre o MOV base):
   *   40s: -1, 50s: -2, 60s: -3, 70s: -4, 80s: -5
   *
   * @param {number} forca
   * @param {number} des
   * @param {number} tam
   * @param {number} age - idade do investigador (anos)
   * @returns {number} MOV final (mínimo 1)
   */
  function calcMOV(forca, des, tam, age = 30) {
    forca = num(forca); des = num(des); tam = num(tam); age = num(age);
    let mov;
    if (des < tam && forca < tam) mov = 7;
    else if (des > tam && forca > tam) mov = 9;
    else mov = 8;

    if (age >= 80) mov -= 5;
    else if (age >= 70) mov -= 4;
    else if (age >= 60) mov -= 3;
    else if (age >= 50) mov -= 2;
    else if (age >= 40) mov -= 1;

    return Math.max(1, mov);
  }

  /**
   * Bônus de Dano (DB) e Corpo (Build).
   * Faz lookup na tabela window.CoCData.dbTable.
   * @returns {{ db: string, build: number, forPlusTam: number }}
   */
  function calcDB(forca, tam) {
    const sum = num(forca) + num(tam);
    if (!window.CoCData || !window.CoCData.lookupDB) {
      return { db: "0", build: 0, forPlusTam: sum };
    }
    const { db, build } = window.CoCData.lookupDB(sum);
    return { db, build, forPlusTam: sum };
  }

  /**
   * Esquivar (base = DES/2).
   */
  function calcDodgeBase(des) {
    return floor(num(des) / 2);
  }

  /**
   * Idioma Próprio (base = EDU).
   */
  function calcOwnLanguageBase(edu) {
    return num(edu);
  }

  /**
   * Parser de fórmula de pontos de Ocupação.
   *
   * Formato esperado (case-insensitive):
   *   "EDU*4"
   *   "EDU*2+DES*2"
   *   "EDU*2 + (DES*2 | FOR*2)"
   *
   * Variantes com pipe ("|") significam "escolha uma" — o caller pode passar
   * `choices` para decidir, OU receber o array de fórmulas alternativas.
   *
   * Estratégia: simplifica para sempre escolher a opção que **maximiza** os pontos.
   * Atributos disponíveis: FOR, CON, TAM, DES, APA, INT, POD, EDU.
   *
   * @param {string} formula
   * @param {Object} attrs - { FOR, CON, TAM, DES, APA, INT, POD, EDU }
   * @returns {{ points: number, expression: string, breakdown: string }}
   */
  function calcOccupationPoints(formula, attrs) {
    if (!formula) return { points: 0, expression: "", breakdown: "" };

    const upperAttrs = {};
    for (const k in attrs) upperAttrs[k.toUpperCase()] = num(attrs[k]);

    // Substitui nomes de atributos pelos valores E avalia com parser próprio
    // (sem new Function — elimina risco de injeção e crash por sintaxe).
    function evalSingle(expr) {
      let e = expr.replace(/\s+/g, "").toUpperCase().replace(/×/g, "*");
      // Troca cada nome de atributo pelo valor
      ["FOR", "CON", "TAM", "DES", "APA", "INT", "POD", "EDU"].forEach((a) => {
        const re = new RegExp("\\b" + a + "\\b", "g");
        e = e.replace(re, String(upperAttrs[a] != null ? upperAttrs[a] : 0));
      });
      // Whitelist estrita: só dígitos, ponto, + - * / ( )
      if (!/^[0-9+\-*/().]*$/.test(e)) return 0;
      try {
        const result = safeEvalArithmetic(e);
        return typeof result === "number" && !isNaN(result) && isFinite(result) ? result : 0;
      } catch (err) {
        return 0;
      }
    }

    // Descompõe "EDU*2 + (DES*2 | FOR*2)" em alternativas
    // Estratégia: encontra o grupo entre parênteses com '|' e expande
    function expandAlternatives(expr) {
      const m = expr.match(/\(([^()]*\|[^()]*)\)/);
      if (!m) return [expr];
      const [whole, inner] = m;
      const parts = inner.split("|").map((p) => p.trim());
      const expanded = [];
      for (const p of parts) {
        expanded.push(expr.replace(whole, p));
      }
      // Recursivo: se sobraram mais grupos, expande cada um
      const final = [];
      for (const e of expanded) {
        final.push(...expandAlternatives(e));
      }
      return final;
    }

    const alternatives = expandAlternatives(formula);
    let bestVal = 0;
    let bestExpr = alternatives[0];
    for (const alt of alternatives) {
      const v = evalSingle(alt);
      if (v > bestVal) { bestVal = v; bestExpr = alt; }
    }

    return {
      points: Math.floor(bestVal),
      expression: bestExpr,
      breakdown: `${bestExpr} = ${bestVal}` + (alternatives.length > 1 ? ` (melhor de ${alternatives.length} opções)` : "")
    };
  }

  /**
   * Pontos de Interesse Pessoal — sempre INT × 2.
   */
  function calcPersonalInterestPoints(intelligence) {
    return num(intelligence) * 2;
  }

  /**
   * Soma de pontos GASTOS em um conjunto de perícias.
   * @param {Array<{base?: number, value: number}>} skillList
   *   Cada item: { base: valor padrão da perícia, value: valor atual após alocação }
   * @returns {number} pontos alocados (soma de (value - base) para value > base)
   */
  function sumSkillPointsSpent(skillList) {
    if (!Array.isArray(skillList)) return 0;
    return skillList.reduce((acc, s) => {
      const base = num(s.base);
      const value = num(s.value);
      return acc + Math.max(0, value - base);
    }, 0);
  }

  /**
   * Valida criação de personagem contra limites do CoC 7E.
   * @param {Object} character - estrutura padrão da ficha
   * @returns {{ valid: boolean, issues: string[], warnings: string[] }}
   */
  function validateCharacter(character) {
    const issues = [];
    const warnings = [];

    // Limite de 75 por perícia na criação (regra do livro)
    if (Array.isArray(character.skills)) {
      character.skills.forEach((s) => {
        if (num(s.value) > 90) {
          issues.push(`${s.name}: ${s.value}% excede o cap absoluto (90% mesmo com aprovação do Guardião)`);
        } else if (num(s.value) > 75) {
          warnings.push(`${s.name}: ${s.value}% acima do cap padrão (75) — exige aprovação do Guardião`);
        }
      });
    }

    // Atributos dentro da faixa esperada (15-90 = 3-18 × 5)
    if (character.attributes) {
      for (const [name, attr] of Object.entries(character.attributes)) {
        const v = num(typeof attr === "object" ? attr.value : attr);
        if (v < 15 || v > 90) {
          warnings.push(`${name}: ${v} fora da faixa típica (15-90)`);
        }
      }
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  // ─── Expor no namespace global ─────────────────────────────────────────
  window.CoC.rules = {
    calcHP,
    calcMP,
    calcSANInit,
    calcSANMax,
    calcMOV,
    calcDB,
    calcDodgeBase,
    calcOwnLanguageBase,
    calcOccupationPoints,
    calcPersonalInterestPoints,
    sumSkillPointsSpent,
    validateCharacter
  };

})();
