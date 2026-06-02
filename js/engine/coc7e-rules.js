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
   *   SAN máx = 99 - Mythos de Cthulhu
   */
  function calcSANMax(mitos) {
    return Math.max(0, 99 - num(mitos));
  }

  /**
   * Ajustes de atributos primários por idade (CoC 7E p.35-36).
   *
   * Retorno:
   *   physical.points  — pontos a distribuir entre physical.attrs (mín 0 cada)
   *   physical.attrs   — atributos físicos afetados pela distribuição
   *   appReduction     — redução FIXA (não distribuída) em APA
   *   eduReduction     — redução FIXA em EDU (só faixa 15–19)
   *   eduImprovementChecks — nº de Verificações de Melhoria de EDU a realizar
   *   luckRerolls      — nº de re-rolls de Sorte (faixa 15–19 = 1)
   *
   * @param {number} age
   * @returns {{ physical:{points:number,attrs:string[]}, appReduction:number,
   *             eduReduction:number, eduImprovementChecks:number, luckRerolls:number } | null}
   *   null se a faixa não gera nenhum ajuste (< 15 anos)
   */
  function calcAgeAdjustments(age) {
    age = num(age);
    // Faixas etárias conforme CoC 7e p.35-36
    if (age >= 15 && age <= 19) return { physical: { points: 5,  attrs: ["FOR", "TAM"] }, appReduction: 0,  eduReduction: 5,  eduImprovementChecks: 0, luckRerolls: 1 };
    if (age >= 20 && age <= 39) return { physical: { points: 0,  attrs: []             }, appReduction: 0,  eduReduction: 0,  eduImprovementChecks: 1, luckRerolls: 0 };
    if (age >= 40 && age <= 49) return { physical: { points: 5,  attrs: ["FOR","CON","DES"] }, appReduction: 5,  eduReduction: 0, eduImprovementChecks: 2, luckRerolls: 0 };
    if (age >= 50 && age <= 59) return { physical: { points: 10, attrs: ["FOR","CON","DES"] }, appReduction: 10, eduReduction: 0, eduImprovementChecks: 3, luckRerolls: 0 };
    if (age >= 60 && age <= 69) return { physical: { points: 20, attrs: ["FOR","CON","DES"] }, appReduction: 15, eduReduction: 0, eduImprovementChecks: 4, luckRerolls: 0 };
    if (age >= 70 && age <= 79) return { physical: { points: 40, attrs: ["FOR","CON","DES"] }, appReduction: 20, eduReduction: 0, eduImprovementChecks: 4, luckRerolls: 0 };
    if (age >= 80)              return { physical: { points: 80, attrs: ["FOR","CON","DES"] }, appReduction: 25, eduReduction: 0, eduImprovementChecks: 4, luckRerolls: 0 };
    return null;
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
   * Língua Nativa (base = EDU).
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
   * Verificação de Melhoria de Perícia (CoC 7E p.44).
   * Mesma mecânica da melhoria de EDU, aplicada a qualquer valor de perícia.
   *
   * Fluxo: rola 1D100; se resultado > valor atual → ganha 1D10 (cap 99).
   *
   * @param {number} value - valor atual da perícia (0–99)
   * @returns {{ rolled: number, gain: number, before: number, after: number, improved: boolean }}
   */
  function rollSkillImprovement(value) {
    value = num(value);
    const diceFns = window.CoC && window.CoC.dice;
    const rollDie = diceFns ? diceFns.rollDie : (s) => Math.floor(Math.random() * s) + 1;
    const rolled = rollDie(100) || 1;
    if (rolled > value) {
      const gain  = rollDie(10) || 1;
      const after = Math.min(99, value + gain);
      return { rolled, gain: after - value, before: value, after, improved: true };
    }
    return { rolled, gain: 0, before: value, after: value, improved: false };
  }

  /**
   * Verificação de Melhoria de EDU (CoC 7E p.36).
   * Função pura — sem UI/DOM. Depende de dice.rollDie via window.CoC.dice.
   *
   * Fluxo oficial:
   *   1. Rola 1D100.
   *   2. Se resultado > EDU atual → ganha 1D10 (cap 99).
   *   3. Senão → sem ganho.
   *
   * @param {number} edu - valor atual de EDU (0–99)
   * @returns {{ rolled: number, gain: number, before: number, after: number, improved: boolean }}
   */
  function rollEduImprovement(edu) {
    edu = num(edu);
    const dice = window.CoC && window.CoC.dice;
    const rollDie = dice ? dice.rollDie : (s) => Math.floor(Math.random() * s) + 1;
    const rolled = rollDie(100) || 1;  // d100 via engine
    if (rolled > edu) {
      const gain   = rollDie(10) || 1;
      const after  = Math.min(99, edu + gain);
      return { rolled, gain: after - edu, before: edu, after, improved: true };
    }
    return { rolled, gain: 0, before: edu, after: edu, improved: false };
  }

  /**
   * Pontos de Interesse Pessoal — sempre INT × 2.
   */
  function calcPersonalInterestPoints(intelligence) {
    return num(intelligence) * 2;
  }

  /**
   * Resolve o conjunto EFETIVO de perícias da ocupação para um personagem.
   *
   * Em CoC 7E uma ocupação tem perícias obrigatórias (fixas na lista) MAIS um
   * número de perícias livres (`anySkillsCount`) que o jogador escolhe. As livres
   * precisam ser "designadas" pelo personagem para contarem no pool da ocupação —
   * é o que `character.occupationSkills` (array de nomes) representa. Sem isso,
   * ocupações com perícias livres (e em especial a "Personalizada", cuja lista é
   * vazia) ficam com pool de ocupação impossível de gastar.
   *
   * Função PURA: recebe dados, devolve conjuntos. Não toca no DOM.
   *
   * @param {Object|null} occ       - objeto da ocupação (window.CoCData.occupations[n])
   * @param {Object|null} character - personagem (usa character.occupationSkills)
   * @returns {{
   *   mandatory: Set<string>,  // perícias fixas da ocupação (todas as opções de "A | B")
   *   chosen:    Set<string>,  // perícias livres designadas pelo jogador (sem duplicar mandatórias)
   *   effective: Set<string>,  // mandatory ∪ chosen — o que conta no pool da ocupação
   *   freeBudget:number,       // anySkillsCount (quantas livres a ocupação permite)
   *   freeUsed:  number        // quantas livres já foram designadas
   * }}
   */
  function buildOccupationContext(occ, character) {
    const mandatory = new Set();
    if (occ && Array.isArray(occ.skills)) {
      for (const s of occ.skills) {
        // "Escalar | Nadar" = escolha uma; mantemos ambas elegíveis (lenient, não-bloqueante).
        String(s).split("|").map((x) => x.trim()).filter(Boolean).forEach((x) => mandatory.add(x));
      }
    }
    const chosen = new Set();
    const list = character && Array.isArray(character.occupationSkills) ? character.occupationSkills : [];
    for (const name of list) {
      const n = String(name || "").trim();
      if (n && !mandatory.has(n)) chosen.add(n);
    }
    const effective = new Set(mandatory);
    chosen.forEach((n) => effective.add(n));
    const freeBudget = occ ? num(occ.anySkillsCount) : 0;
    return { mandatory, chosen, effective, freeBudget, freeUsed: chosen.size };
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
  /**
   * Dinheiro e Patrimônio (CoC 7E) derivados do Crédito (Credit Rating 0–99).
   *
   * Tabela do livro básico ("Dinheiro e Patrimônio"):
   *   Crédito 0      → Pobretão · Gasto 0,5 · Dinheiro 0,5    · Patrimônio —
   *   Crédito 1–9    → Pobre    · Gasto 2   · Dinheiro CR×1   · Patrimônio CR×10
   *   Crédito 10–49  → Médio    · Gasto 10  · Dinheiro CR×2   · Patrimônio CR×50
   *   Crédito 50–89  → Abastado · Gasto 50  · Dinheiro CR×5   · Patrimônio CR×500
   *   Crédito 90–98  → Rico     · Gasto 250 · Dinheiro CR×20  · Patrimônio CR×2.000
   *   Crédito 99     → Ricaço   · Gasto 5000· Dinheiro 50.000 · Patrimônio 5.000.000
   *
   * "Dinheiro em Mãos" (cash) é o valor inicial à mão — ponto de partida da carteira.
   * Valores da era clássica (1920). @param {number} creditRating - Nível de Crédito (0–99)
   * @param {number} creditRating - valor do Crédito (0–99)
   * @returns {{creditRating, tier, tierLabel, spending, cash, assets}}
   */
  function calcFinances(creditRating) {
    let cr = Math.round(Number(creditRating));
    if (!isFinite(cr) || cr < 0) cr = 0;
    if (cr > 99) cr = 99;

    let tier, tierLabel, spending, cash, assets;
    if (cr === 0)      { tier = "penniless"; tierLabel = "Pobretão"; spending = 0.5;  cash = 0.5;   assets = 0; }
    else if (cr <= 9)  { tier = "poor";      tierLabel = "Pobre";    spending = 2;    cash = cr * 1;  assets = cr * 10; }
    else if (cr <= 49) { tier = "average";   tierLabel = "Médio";    spending = 10;   cash = cr * 2;  assets = cr * 50; }
    else if (cr <= 89) { tier = "wealthy";   tierLabel = "Abastado"; spending = 50;   cash = cr * 5;  assets = cr * 500; }
    else if (cr <= 98) { tier = "rich";      tierLabel = "Rico";     spending = 250;  cash = cr * 20; assets = cr * 2000; }
    else               { tier = "superrich"; tierLabel = "Ricaço";   spending = 5000; cash = 50000;  assets = 5000000; }

    return { creditRating: cr, tier, tierLabel, spending, cash, assets };
  }

  /**
   * Golpe Maior (Major Wound): dano único ≥ metade do PV máximo.
   * CoC 7e p.105 — requer rolagem de CON ou ficar inconsciente.
   * @param {number} damage  - dano do golpe
   * @param {number} maxHP   - PV máximo do personagem
   * @returns {boolean}
   */
  function isMajorWound(damage, maxHP) {
    return maxHP > 0 && damage >= Math.ceil(maxHP / 2);
  }

  window.CoC.rules = {
    calcHP,
    calcMP,
    calcSANInit,
    calcSANMax,
    calcMOV,
    calcDB,
    calcDodgeBase,
    calcOwnLanguageBase,
    calcFinances,
    calcOccupationPoints,
    calcPersonalInterestPoints,
    buildOccupationContext,
    sumSkillPointsSpent,
    validateCharacter,
    calcAgeAdjustments,
    rollEduImprovement,
    rollSkillImprovement,
    isMajorWound
  };

})();
