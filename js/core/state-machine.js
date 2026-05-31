/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/state-machine.js
   Motor de regras CoC 7e — Sprint 8

   Modelo declarativo do ciclo de vida de uma sessão de jogo.
   Torna regras do rulebook EXPLÍCITAS, AUDITÁVEIS e TESTÁVEIS
   — sem acoplamento a store, bus ou DOM.

   Estrutura:
   RULES[actionType] = array de regras que podem disparar para aquela ação.
   Cada regra: { label, ref, guard(action, ctx)→bool, effects[{type, payload}] }

   evaluate(actionType, action, ctx) → regras disparadas + effects acumulados
   buildContext(character) → ctx a partir do state.character do store

   ctx — contrato:
   {
     currentHP, maxHP,                 // vitais de PV
     currentSAN, maxSAN, sanLossToday, // SAN + perdas acumuladas na sessão
     currentPM, maxPM,                 // PM
     mythos,                           // pontuação de Mythos atual
     status: { majorWound, unconscious, dying, dead, tempInsane, indefInsane },
     attributes: { CON, POD, ... }     // valores brutos
   }

   Independente de window.CoC.rules: guards duplicam as fórmulas críticas
   para que o módulo seja auto-contido e testável sem engine.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC      = window.CoC      || {};
window.CoC.core = window.CoC.core || {};

(function () {

  var PV_MIN = -2; // HP abaixo do qual o personagem está morrendo (p.112)

  // ── Helpers de guard ──────────────────────────────────────────────────────

  // CoC 7e p.109 — Major Wound: golpe único ≥ metade do PV máximo
  function _isMajorWound(dmg, maxHP) {
    return maxHP > 0 && dmg >= Math.ceil(maxHP / 2);
  }

  // Porcentagem de SAN perdida em relação ao valor máximo de referência
  // CoC 7e p.161 — Loucura Indefinida se perder ≥ 1/5 do valor de SAN ATUAL
  function _isIndefInsanityThreshold(totalLostToday, currentSAN) {
    return currentSAN > 0 && totalLostToday >= Math.floor(currentSAN / 5);
  }

  // ── Regras por action type ────────────────────────────────────────────────
  //
  // HIERARQUIA DE EFEITOS: múltiplas regras podem disparar simultaneamente.
  // Ex: um golpe único pode acionar majorWound + unconscious + dying em cascata.
  //
  // EFEITOS são apenas declaração de intenção (actions a despachar).
  // O chamador decide o que fazer com eles — estado machine não executa.

  var RULES = {

    // ── APPLY_DAMAGE ────────────────────────────────────────────────────────
    APPLY_DAMAGE: [
      {
        label: 'Major Wound',
        ref:   'CoC 7e p.109',
        guard: function (action, ctx) {
          return !ctx.status.majorWound &&
                 _isMajorWound(action.payload.amount, ctx.maxHP);
        },
        effects: [
          { type: 'ADD_STATUS', payload: { status: 'majorWound' } }
        ],
        note: 'Requer rolagem de CON ou perde uma ação extra + possível inconsciente',
      },
      {
        label: 'Inconsciente',
        ref:   'CoC 7e p.112',
        guard: function (action, ctx) {
          return !ctx.status.unconscious &&
                 (ctx.currentHP - action.payload.amount) <= 0;
        },
        effects: [
          { type: 'ADD_STATUS', payload: { status: 'unconscious' } }
        ],
        note: 'Personagem perde ação. Primeiro socorro necessário em 1 rodada.',
      },
      {
        label: 'Morrendo',
        ref:   'CoC 7e p.112',
        guard: function (action, ctx) {
          return !ctx.status.dying &&
                 (ctx.currentHP - action.payload.amount) <= PV_MIN;
        },
        effects: [
          { type: 'ADD_STATUS', payload: { status: 'dying' } }
        ],
        note: 'HP ≤ -2. Sem primeiros-socorros em 1 rodada → morte automática.',
      },
      {
        label: 'Morte imediata',
        ref:   'CoC 7e p.112',
        guard: function (action, ctx) {
          // Golpe único que excede o PV máximo em negativo → morte imediata
          return (ctx.currentHP - action.payload.amount) < PV_MIN - ctx.maxHP;
        },
        effects: [
          { type: 'ADD_STATUS', payload: { status: 'dead' } }
        ],
        note: 'Dano massivo instantâneo excede reserva total de HP.',
      },
    ],

    // ── HEAL_DAMAGE ─────────────────────────────────────────────────────────
    HEAL_DAMAGE: [
      {
        label: 'Recobrou consciência',
        ref:   'CoC 7e p.112',
        guard: function (action, ctx) {
          return ctx.status.unconscious &&
                 !ctx.status.dying &&
                 (ctx.currentHP + action.payload.amount) > 0;
        },
        effects: [
          { type: 'REMOVE_STATUS', payload: { status: 'unconscious' } }
        ],
        note: 'Primeiros socorros bem-sucedidos — personagem recupera consciência.',
      },
      {
        label: 'Estabilizado (não morrendo)',
        ref:   'CoC 7e p.112',
        guard: function (action, ctx) {
          return ctx.status.dying &&
                 (ctx.currentHP + action.payload.amount) > PV_MIN;
        },
        effects: [
          { type: 'REMOVE_STATUS', payload: { status: 'dying' } }
        ],
        note: 'Primeiros socorros evitam morte — HP voltou acima de PV_MIN.',
      },
    ],

    // ── LOSE_SANITY ─────────────────────────────────────────────────────────
    LOSE_SANITY: [
      {
        label: 'Cheque de Loucura Temporária',
        ref:   'CoC 7e p.161',
        guard: function (action, ctx) {
          // Perda de > 4 pontos de SAN de uma vez → rolar para loucura temporária
          return action.payload.amount > 4 && !ctx.status.tempInsane;
        },
        effects: [],  // O Guardião decide o gatilho narrativo — apenas alerta
        note: 'Perda > 4 SAN de uma vez. INT roll ou o personagem entra em choque.',
      },
      {
        label: 'Cheque de Loucura Indefinida',
        ref:   'CoC 7e p.162',
        guard: function (action, ctx) {
          // Perda acumulada na sessão ≥ 1/5 do SAN ANTES da perda atual
          var totalLost = ctx.sanLossToday + action.payload.amount;
          return !ctx.status.indefInsane &&
                 _isIndefInsanityThreshold(totalLost, ctx.currentSAN);
        },
        effects: [],  // POW roll — o resultado decide o efeito
        note: 'Perdeu ≥ 1/5 do SAN na sessão. Rola POW ou loucura indefinida.',
      },
      {
        label: 'Loucura Indefinida (SAN a 0)',
        ref:   'CoC 7e p.162',
        guard: function (action, ctx) {
          return !ctx.status.indefInsane &&
                 (ctx.currentSAN - action.payload.amount) <= 0;
        },
        effects: [
          { type: 'ADD_STATUS', payload: { status: 'indefInsane' } }
        ],
        note: 'SAN chega a 0 → loucura indefinida automática (sem roll).',
      },
      {
        label: 'Loucura Incurável (Mythos ≥ SAN)',
        ref:   'CoC 7e p.167',
        guard: function (action, ctx) {
          var sanAfter = ctx.currentSAN - action.payload.amount;
          return !ctx.status.incurablyInsane &&
                 ctx.mythos > 0 &&
                 ctx.mythos >= sanAfter;
        },
        effects: [
          { type: 'ADD_STATUS', payload: { status: 'incurablyInsane' } }
        ],
        note: 'Mythos ≥ SAN restante → personagem não pode mais ser curado.',
      },
    ],

    // ── RECOVER_SANITY ──────────────────────────────────────────────────────
    RECOVER_SANITY: [
      {
        label: 'Recuperação de loucura indefinida',
        ref:   'CoC 7e p.169',
        guard: function (action, ctx) {
          // Cura completa de indef insanity requer SAN acima de 0 + tratamento
          // Esta regra só remove o status após healing explícito
          return ctx.status.indefInsane &&
                 (ctx.currentSAN + action.payload.amount) > 0 &&
                 !ctx.status.incurablyInsane;
        },
        effects: [
          { type: 'REMOVE_STATUS', payload: { status: 'indefInsane' } }
        ],
        note: 'Tratamento psiquiátrico bem-sucedido + SAN recuperada.',
      },
    ],

    // ── ATTACK_RESOLVED ─────────────────────────────────────────────────────
    ATTACK_RESOLVED: [
      {
        label: 'Dano aplicado ao alvo (NPC/Guardião)',
        ref:   'CoC 7e p.106',
        guard: function (action) {
          return action.payload && action.payload.hit === true;
        },
        effects: [],
        note: 'Dano ao alvo gerenciado pelo Guardião — aplicar APPLY_DAMAGE separado.',
      },
    ],

    // ── SPEND_LUCK ──────────────────────────────────────────────────────────
    SPEND_LUCK: [
      {
        label: 'Reformulação de rolagem',
        ref:   'CoC 7e p.18',
        guard: function (action, ctx) {
          return ctx.attributes.Sorte &&
                 (ctx.attributes.Sorte.value || 0) >= action.payload.amount;
        },
        effects: [],
        note: 'Gasta Sorte para ajustar resultado. 1 pt Sorte = 1 pt de melhoria no roll.',
      },
      {
        label: 'Sorte insuficiente',
        ref:   'CoC 7e p.18',
        guard: function (action, ctx) {
          return ((ctx.attributes.Sorte && ctx.attributes.Sorte.value) || 0) < action.payload.amount;
        },
        effects: [],
        note: 'Bloqueado: tentativa de gastar mais Sorte do que disponível.',
      },
    ],
  };

  // ── Avaliador puro ────────────────────────────────────────────────────────
  //
  // Retorna as regras disparadas + lista acumulada de effects.
  // O chamador decide o que fazer com os effects — nenhum dispatch aqui.
  function evaluate(actionType, action, ctx) {
    var fired = (RULES[actionType] || []).filter(function (rule) {
      try {
        return !rule.guard || rule.guard(action, ctx);
      } catch (e) {
        console.error('[state-machine] guard error for', actionType, rule.label, e);
        return false;
      }
    });
    var effects = fired.reduce(function (acc, rule) {
      return acc.concat(rule.effects || []);
    }, []);
    return { transitions: fired, effects: effects };
  }

  // ── Construtor de contexto a partir do state.character do store ─────────
  //
  // Isola o state machine do formato interno do store.
  function buildContext(character) {
    if (!character) return null;
    var d  = character.derived  || {};
    var pv = d.PV  || {};
    var san = d.SAN || {};
    var pm  = d.PM  || {};
    return {
      currentHP:    pv.current  != null ? pv.current  : (pv.value  || 0),
      maxHP:        pv.value    || 0,
      currentSAN:   san.current != null ? san.current : (san.value || 0),
      maxSAN:       san.max     || san.value || 0,
      sanLossToday: (character.status && character.status.sanLossesToday) || 0,
      currentPM:    pm.current  != null ? pm.current  : (pm.value  || 0),
      maxPM:        pm.value    || 0,
      mythos:       (d.Mitos && d.Mitos.value) || 0,
      status:       character.status || {},
      attributes:   character.attributes || {},
    };
  }

  // ── Grafo do round de combate (CoC 7e p.106) — documentado, não wired ─────
  //
  // Representa a sequência canônica de um round.
  // Não usa FSM estrito: múltiplos atacantes/defensores em paralelo.
  var COMBAT_ROUND_GRAPH = Object.freeze({
    states: [
      'OUT_OF_COMBAT',
      'INITIATIVE_PHASE',   // DEX determina ordem; empates simultâneos
      'ACTION_PHASE',       // ator ativo declara intenção
      'RESOLUTION_PHASE',   // rolagem de ataque; defensor pode reagir (dodge/parry)
      'DAMAGE_PHASE',       // dano aplicado; gatilhos de status checados
      'ROUND_END',          // todos os atores agiram; preparar próximo round
    ],
    transitions: [
      { from: 'OUT_OF_COMBAT',   action: 'ENCOUNTER_BEGUN',  to: 'INITIATIVE_PHASE' },
      { from: 'INITIATIVE_PHASE', action: 'INITIATIVE_SET',  to: 'ACTION_PHASE',
        note: 'Todos os atores declaram DEX / rolam DEX × 5 para desempate' },
      { from: 'ACTION_PHASE',    action: 'ATTACK_RESOLVED',  to: 'RESOLUTION_PHASE' },
      { from: 'RESOLUTION_PHASE',action: 'ATTACK_RESOLVED',  to: 'DAMAGE_PHASE',
        note: 'Defensor pode reagir com dodge (DEX×5) ou parry (arma compatível)' },
      { from: 'DAMAGE_PHASE',    action: 'APPLY_DAMAGE',     to: 'ACTION_PHASE',
        note: 'Próximo ator na fila de DEX; gatilhos de status verificados' },
      { from: 'ACTION_PHASE',    action: 'TURN_ADVANCED',    to: 'ROUND_END',
        note: 'Todos os atores agiram neste round' },
      { from: 'ROUND_END',       action: 'TURN_ADVANCED',    to: 'ACTION_PHASE',
        note: 'Inicia novo round (ordem DEX mantida)' },
      { from: 'ROUND_END',       action: 'ENCOUNTER_ENDED',  to: 'OUT_OF_COMBAT' },
    ],
    status: 'documented',
    note: 'CoC 7e p.106-115. Requer encounter view (M4). Wiring: INITIATIVE_SET no store.',
  });

  // ── Grafo do ciclo de uma rolagem de perícia ──────────────────────────────
  var SKILL_ROLL_GRAPH = Object.freeze({
    states: ['IDLE', 'ROLLED', 'PUSHED', 'FINAL'],
    transitions: [
      { from: 'IDLE',   action: 'ROLL_SKILL',      to: 'ROLLED',
        note: 'D100 < perícia = success; ≤ perícia/5 = extremo; 1 = crítico; ≥ 96 = fumble' },
      { from: 'ROLLED', action: 'PUSH_ROLL',        to: 'PUSHED',
        guard: 'result !== "fumble"',
        note: 'Push permitido apenas em failure (não fumble). Consequências mais graves se falhar.' },
      { from: 'PUSHED', action: 'ROLL_SKILL',       to: 'FINAL',
        note: 'Resultado final — independente do resultado, cena avança' },
      { from: 'ROLLED', action: 'REGISTER_FUMBLE',  to: 'FINAL',
        note: 'Fumble: consequência narrativa imediata — sem push possível' },
    ],
    status: 'documented',
    note: 'CoC 7e p.24-26. Parcialmente implementado em views/rolls.js fora do store.',
  });

  window.CoC.core.stateMachine = Object.freeze({
    RULES:              RULES,
    COMBAT_ROUND_GRAPH: COMBAT_ROUND_GRAPH,
    SKILL_ROLL_GRAPH:   SKILL_ROLL_GRAPH,
    evaluate:           evaluate,
    buildContext:       buildContext,
  });

})();
