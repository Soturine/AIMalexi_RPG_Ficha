/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-state-machine.js
   Cobertura do state-machine.js — Sprint 8

   Testa:
   1. evaluate() — regras por action type (APPLY_DAMAGE, HEAL_DAMAGE, LOSE_SANITY, etc.)
   2. buildContext() — mapeamento do character do store para ctx
   3. Efeitos acumulados e hierarquia de regras
   4. Guards de segurança (guard lança exceção → regra não dispara)

   Carregado por runner.js (assert, assertEq, group disponíveis como globais).
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const _sm  = window.CoC.core.stateMachine;
const _ev  = _sm.evaluate;
const _ctx = _sm.buildContext;

// ── Estrutura pública ──────────────────────────────────────────────────────
group('state-machine — estrutura pública');

assert(typeof _sm === 'object' && _sm !== null, 'stateMachine é objeto');
assert(typeof _ev === 'function',               'evaluate é função');
assert(typeof _ctx === 'function',              'buildContext é função');
assert(typeof _sm.RULES === 'object',           'RULES é objeto');
assert(typeof _sm.COMBAT_ROUND_GRAPH === 'object', 'COMBAT_ROUND_GRAPH presente');
assert(typeof _sm.SKILL_ROLL_GRAPH   === 'object', 'SKILL_ROLL_GRAPH presente');

assert(Array.isArray(_sm.RULES.APPLY_DAMAGE),   'RULES.APPLY_DAMAGE é array');
assert(Array.isArray(_sm.RULES.HEAL_DAMAGE),    'RULES.HEAL_DAMAGE é array');
assert(Array.isArray(_sm.RULES.LOSE_SANITY),    'RULES.LOSE_SANITY é array');
assert(Array.isArray(_sm.RULES.RECOVER_SANITY), 'RULES.RECOVER_SANITY é array');
assert(Array.isArray(_sm.RULES.SPEND_LUCK),     'RULES.SPEND_LUCK é array');

// ── buildContext — mapeamento correto ─────────────────────────────────────
group('state-machine — buildContext');

assert(_ctx(null) === null, 'buildContext(null) → null');
assert(_ctx(undefined) === null, 'buildContext(undefined) → null');

const _char = {
  derived: {
    PV:    { value: 12, current: 8 },
    SAN:   { value: 60, current: 45, max: 100 },
    PM:    { value: 12, current: 10 },
    Mitos: { value: 5 },
  },
  status:     { majorWound: false, unconscious: false, dying: false, dead: false,
                tempInsane: false, indefInsane: false, sanLossesToday: 8 },
  attributes: { CON: { value: 55 }, POD: { value: 60 }, Sorte: { value: 45 } },
};
const _c = _ctx(_char);

assertEq(_c.currentHP,    8,   'buildContext: currentHP = PV.current');
assertEq(_c.maxHP,        12,  'buildContext: maxHP = PV.value');
assertEq(_c.currentSAN,   45,  'buildContext: currentSAN = SAN.current');
assertEq(_c.maxSAN,       100, 'buildContext: maxSAN = SAN.max');
assertEq(_c.sanLossToday, 8,   'buildContext: sanLossToday = status.sanLossesToday');
assertEq(_c.currentPM,    10,  'buildContext: currentPM = PM.current');
assertEq(_c.maxPM,        12,  'buildContext: maxPM = PM.value');
assertEq(_c.mythos,       5,   'buildContext: mythos = Mitos.value');
assert(_c.status === _char.status,       'buildContext: status é referência ao original');
assert(_c.attributes === _char.attributes, 'buildContext: attributes é referência ao original');

// fallback quando current é null: usa value
const _charNoCurrent = {
  derived: { PV: { value: 10 }, SAN: { value: 50 }, PM: { value: 8 } },
  status: {}, attributes: {},
};
const _cn = _ctx(_charNoCurrent);
assertEq(_cn.currentHP,  10, 'buildContext: PV.current ausente → usa PV.value');
assertEq(_cn.currentSAN, 50, 'buildContext: SAN.current ausente → usa SAN.value');
assertEq(_cn.currentPM,   8, 'buildContext: PM.current ausente → usa PM.value');
assertEq(_cn.mythos,      0, 'buildContext: Mitos ausente → 0');
assertEq(_cn.sanLossToday, 0, 'buildContext: sanLossesToday ausente → 0');

// ── evaluate — ação desconhecida ───────────────────────────────────────────
group('state-machine — evaluate ação desconhecida');

const _ctx0 = { status: {}, attributes: {} };
const _res0 = _ev('ACAO_INEXISTENTE_XYZ', {}, _ctx0);
assert(Array.isArray(_res0.transitions), 'transitions é array mesmo para ação desconhecida');
assert(Array.isArray(_res0.effects),     'effects é array mesmo para ação desconhecida');
assertEq(_res0.transitions.length, 0,   'ação desconhecida → 0 transições');
assertEq(_res0.effects.length,     0,   'ação desconhecida → 0 effects');

// ── APPLY_DAMAGE — Major Wound ─────────────────────────────────────────────
group('state-machine — APPLY_DAMAGE: Major Wound');

// maxHP = 12; golpe ≥ 6 → Major Wound (Math.ceil(12/2) = 6)
const _ctxFull = { currentHP: 12, maxHP: 12,
                   status: { majorWound: false, unconscious: false, dying: false, dead: false },
                   attributes: {} };

const _mw = _ev('APPLY_DAMAGE', { payload: { amount: 6 } }, _ctxFull);
assert(_mw.transitions.some(function (r) { return r.label === 'Major Wound'; }),
  'golpe = metade HP → Major Wound dispara');
assert(_mw.effects.some(function (e) { return e.payload && e.payload.status === 'majorWound'; }),
  'Major Wound produz ADD_STATUS{majorWound}');

const _noMW = _ev('APPLY_DAMAGE', { payload: { amount: 5 } }, _ctxFull);
assert(!_noMW.transitions.some(function (r) { return r.label === 'Major Wound'; }),
  'golpe < metade HP → Major Wound NÃO dispara');

// já com majorWound — guard deve bloquear
const _alreadyMW = _ev('APPLY_DAMAGE', { payload: { amount: 8 } },
  Object.assign({}, _ctxFull, { status: { majorWound: true, unconscious: false, dying: false } }));
assert(!_alreadyMW.transitions.some(function (r) { return r.label === 'Major Wound'; }),
  'já tem majorWound → regra não re-dispara');

// ── APPLY_DAMAGE — Inconsciente ────────────────────────────────────────────
group('state-machine — APPLY_DAMAGE: Inconsciente');

// HP atual = 5; dano = 5 → HP resulta em 0 → inconsciente
const _ctxHP5 = { currentHP: 5, maxHP: 12,
                  status: { majorWound: false, unconscious: false, dying: false, dead: false },
                  attributes: {} };

const _unc = _ev('APPLY_DAMAGE', { payload: { amount: 5 } }, _ctxHP5);
assert(_unc.transitions.some(function (r) { return r.label === 'Inconsciente'; }),
  'HP = 0 após dano → Inconsciente dispara');
assert(_unc.effects.some(function (e) { return e.payload && e.payload.status === 'unconscious'; }),
  'Inconsciente produz ADD_STATUS{unconscious}');

// HP = 3, dano = 2 → HP = 1 → não inconsciente
const _notUnc = _ev('APPLY_DAMAGE', { payload: { amount: 2 } },
  Object.assign({}, _ctxHP5, { currentHP: 3 }));
assert(!_notUnc.transitions.some(function (r) { return r.label === 'Inconsciente'; }),
  'HP positivo após dano → Inconsciente NÃO dispara');

// ── APPLY_DAMAGE — Morrendo ────────────────────────────────────────────────
group('state-machine — APPLY_DAMAGE: Morrendo (PV_MIN = -2)');

// HP = 1, dano = 3 → HP = -2 → morrendo (≤ PV_MIN)
const _ctxLow = { currentHP: 1, maxHP: 12,
                  status: { majorWound: false, unconscious: false, dying: false, dead: false },
                  attributes: {} };

const _dying = _ev('APPLY_DAMAGE', { payload: { amount: 3 } }, _ctxLow);
assert(_dying.transitions.some(function (r) { return r.label === 'Morrendo'; }),
  'HP ≤ -2 após dano → Morrendo dispara');
assert(_dying.effects.some(function (e) { return e.payload && e.payload.status === 'dying'; }),
  'Morrendo produz ADD_STATUS{dying}');

// HP = 3, dano = 4 → HP = -1 → inconsciente mas NÃO morrendo
const _notDying = _ev('APPLY_DAMAGE', { payload: { amount: 4 } },
  Object.assign({}, _ctxLow, { currentHP: 3 }));
assert(!_notDying.transitions.some(function (r) { return r.label === 'Morrendo'; }),
  'HP = -1 após dano → Morrendo NÃO dispara (acima de PV_MIN=-2)');

// ── APPLY_DAMAGE — Morte imediata ──────────────────────────────────────────
group('state-machine — APPLY_DAMAGE: Morte imediata');

// Morte imediata: HP resultante < PV_MIN - maxHP = -2 - 12 = -14
// HP = 12, dano = 27 → HP = -15 < (PV_MIN - maxHP) = -14 → morte imediata
const _instaDead = _ev('APPLY_DAMAGE', { payload: { amount: 27 } }, _ctxFull);
assert(_instaDead.transitions.some(function (r) { return r.label === 'Morte imediata'; }),
  'dano massivo (HP < PV_MIN - maxHP) → Morte imediata dispara');
assert(_instaDead.effects.some(function (e) { return e.payload && e.payload.status === 'dead'; }),
  'Morte imediata produz ADD_STATUS{dead}');

// HP = 5, dano = 5 → HP = 0 → não morte imediata
const _notInstaDead = _ev('APPLY_DAMAGE', { payload: { amount: 5 } },
  Object.assign({}, _ctxFull, { currentHP: 5 }));
assert(!_notInstaDead.transitions.some(function (r) { return r.label === 'Morte imediata'; }),
  'HP = 0 → Morte imediata NÃO dispara');

// ── APPLY_DAMAGE — hierarquia (múltiplas regras simultâneas) ───────────────
group('state-machine — APPLY_DAMAGE: múltiplas regras simultâneas');

// HP = 10, dano = 8, maxHP = 12
// Major Wound: 8 >= ceil(12/2)=6 ✓
// Inconsciente: 10-8=2 > 0 → NÃO
// Morrendo: 2 > -2 → NÃO
const _multi1 = _ev('APPLY_DAMAGE', { payload: { amount: 8 } },
  { currentHP: 10, maxHP: 12,
    status: { majorWound: false, unconscious: false, dying: false, dead: false },
    attributes: {} });
assert(_multi1.transitions.some(function (r) { return r.label === 'Major Wound'; }),
  'multi: Major Wound dispara');
assert(!_multi1.transitions.some(function (r) { return r.label === 'Inconsciente'; }),
  'multi: Inconsciente não dispara (HP ainda positivo)');

// HP = 6, dano = 8, maxHP = 12
// Major Wound: 8 >= 6 ✓ | Inconsciente: 6-8=-2 ≤ 0 ✓ | Morrendo: -2 ≤ -2 ✓
const _multi2 = _ev('APPLY_DAMAGE', { payload: { amount: 8 } },
  { currentHP: 6, maxHP: 12,
    status: { majorWound: false, unconscious: false, dying: false, dead: false },
    attributes: {} });
assert(_multi2.transitions.some(function (r) { return r.label === 'Major Wound'; }),
  'cascata: Major Wound');
assert(_multi2.transitions.some(function (r) { return r.label === 'Inconsciente'; }),
  'cascata: Inconsciente');
assert(_multi2.transitions.some(function (r) { return r.label === 'Morrendo'; }),
  'cascata: Morrendo');
assertEq(_multi2.effects.length, 3,
  'cascata: 3 effects acumulados (majorWound + unconscious + dying)');

// ── HEAL_DAMAGE — Recobrou consciência ────────────────────────────────────
group('state-machine — HEAL_DAMAGE: Recobrou consciência');

const _ctxUnc = { currentHP: -1, maxHP: 12,
                  status: { unconscious: true, dying: false }, attributes: {} };

const _revive = _ev('HEAL_DAMAGE', { payload: { amount: 2 } }, _ctxUnc);
assert(_revive.transitions.some(function (r) { return r.label === 'Recobrou consciência'; }),
  'heal faz HP > 0 e estava inconsciente → Recobrou consciência');

// cura insuficiente: HP = -1 + 1 = 0 → ainda ≤ 0 → não revive
const _noRevive = _ev('HEAL_DAMAGE', { payload: { amount: 1 } }, _ctxUnc);
assert(!_noRevive.transitions.some(function (r) { return r.label === 'Recobrou consciência'; }),
  'heal insuficiente (HP ainda ≤ 0) → não recobra consciência');

// morrendo → guarda dying bloqueia (tem que estabilizar primeiro)
const _ctxDying = Object.assign({}, _ctxUnc, { status: { unconscious: true, dying: true } });
const _noReviveDying = _ev('HEAL_DAMAGE', { payload: { amount: 3 } }, _ctxDying);
assert(!_noReviveDying.transitions.some(function (r) { return r.label === 'Recobrou consciência'; }),
  'inconsciente + morrendo → Recobrou consciência bloqueado (dying=true)');

// ── HEAL_DAMAGE — Estabilizado ─────────────────────────────────────────────
group('state-machine — HEAL_DAMAGE: Estabilizado');

// HP = -3, cura = 2 → HP = -1 > PV_MIN(-2) → estabilizado
const _ctxDying2 = { currentHP: -3, maxHP: 12,
                     status: { unconscious: true, dying: true }, attributes: {} };
const _stab = _ev('HEAL_DAMAGE', { payload: { amount: 2 } }, _ctxDying2);
assert(_stab.transitions.some(function (r) { return r.label === 'Estabilizado (não morrendo)'; }),
  'HP volta acima de -2 → Estabilizado dispara');
assert(_stab.effects.some(function (e) { return e.payload && e.payload.status === 'dying'; }),
  'Estabilizado produz REMOVE_STATUS{dying}');

// cura insuficiente: HP = -3 + 1 = -2 → ainda ≤ PV_MIN → não estabiliza
const _noStab = _ev('HEAL_DAMAGE', { payload: { amount: 1 } }, _ctxDying2);
assert(!_noStab.transitions.some(function (r) { return r.label === 'Estabilizado (não morrendo)'; }),
  'HP chega exato ao PV_MIN=-2 → não estabilizado (guard usa >)');

// ── LOSE_SANITY — Cheque de Loucura Temporária ────────────────────────────
group('state-machine — LOSE_SANITY: Cheque de Loucura Temporária');

const _ctxSan = { currentSAN: 50, maxSAN: 60, sanLossToday: 5, mythos: 0,
                  status: { tempInsane: false, indefInsane: false, incurablyInsane: false },
                  attributes: {} };

// perda > 4 → cheque temporário
const _tempChk = _ev('LOSE_SANITY', { payload: { amount: 5 } }, _ctxSan);
assert(_tempChk.transitions.some(function (r) {
  return r.label === 'Cheque de Loucura Temporária';
}), 'perda de 5 SAN → cheque temporário dispara');
assertEq(_tempChk.transitions.filter(function (r) {
  return r.label === 'Cheque de Loucura Temporária';
})[0].effects.length, 0,
  'Cheque temporário não tem effects diretos (Guardião decide narrativa)');

// perda ≤ 4 → cheque temporário NÃO dispara
const _noTemp = _ev('LOSE_SANITY', { payload: { amount: 4 } }, _ctxSan);
assert(!_noTemp.transitions.some(function (r) {
  return r.label === 'Cheque de Loucura Temporária';
}), 'perda de 4 SAN → cheque temporário NÃO dispara (guard usa >)');

// ── LOSE_SANITY — Cheque de Loucura Indefinida ────────────────────────────
group('state-machine — LOSE_SANITY: Cheque de Loucura Indefinida (1/5 acumulado)');

// SAN atual = 50; 1/5 = 10; sanLossToday = 7, perda = 4 → total = 11 ≥ 10 → indef check
const _ctxSanIndef = { currentSAN: 50, maxSAN: 60, sanLossToday: 7, mythos: 0,
                       status: { tempInsane: false, indefInsane: false, incurablyInsane: false },
                       attributes: {} };
const _indefChk = _ev('LOSE_SANITY', { payload: { amount: 4 } }, _ctxSanIndef);
assert(_indefChk.transitions.some(function (r) {
  return r.label === 'Cheque de Loucura Indefinida';
}), 'acumulado ≥ 1/5 SAN atual → cheque indefinido dispara');

// sanLossToday = 2, perda = 3 → total = 5 < 10 → não dispara
const _noIndef = _ev('LOSE_SANITY', { payload: { amount: 3 } },
  Object.assign({}, _ctxSanIndef, { sanLossToday: 2 }));
assert(!_noIndef.transitions.some(function (r) {
  return r.label === 'Cheque de Loucura Indefinida';
}), 'acumulado < 1/5 SAN → cheque indefinido NÃO dispara');

// ── LOSE_SANITY — Loucura Indefinida (SAN a 0) ────────────────────────────
group('state-machine — LOSE_SANITY: Loucura Indefinida (SAN = 0)');

const _ctxSan3 = { currentSAN: 3, maxSAN: 60, sanLossToday: 0, mythos: 0,
                   status: { tempInsane: false, indefInsane: false, incurablyInsane: false },
                   attributes: {} };

// SAN 3 - 3 = 0 → loucura indefinida automática
const _indefAuto = _ev('LOSE_SANITY', { payload: { amount: 3 } }, _ctxSan3);
assert(_indefAuto.transitions.some(function (r) {
  return r.label === 'Loucura Indefinida (SAN a 0)';
}), 'SAN chega a 0 → loucura indefinida automática');
assert(_indefAuto.effects.some(function (e) {
  return e.payload && e.payload.status === 'indefInsane';
}), 'Loucura a 0 produz ADD_STATUS{indefInsane}');

// SAN 3 - 2 = 1 → não dispara
const _noIndefAuto = _ev('LOSE_SANITY', { payload: { amount: 2 } }, _ctxSan3);
assert(!_noIndefAuto.transitions.some(function (r) {
  return r.label === 'Loucura Indefinida (SAN a 0)';
}), 'SAN > 0 → loucura indefinida automática NÃO dispara');

// ── LOSE_SANITY — Loucura Incurável (Mythos ≥ SAN) ────────────────────────
group('state-machine — LOSE_SANITY: Loucura Incurável (Mythos ≥ SAN)');

// SAN 15, Mythos 10, perda 5 → SAN depois = 10 = Mythos → incurável
const _ctxMythos = { currentSAN: 15, maxSAN: 60, sanLossToday: 0, mythos: 10,
                     status: { tempInsane: false, indefInsane: false, incurablyInsane: false },
                     attributes: {} };
const _incurable = _ev('LOSE_SANITY', { payload: { amount: 5 } }, _ctxMythos);
assert(_incurable.transitions.some(function (r) {
  return r.label === 'Loucura Incurável (Mythos ≥ SAN)';
}), 'Mythos ≥ SAN resultante → loucura incurável dispara');

// SAN 15, Mythos 5, perda 5 → SAN = 10 > Mythos = 5 → não incurável
const _notIncurable = _ev('LOSE_SANITY', { payload: { amount: 5 } },
  Object.assign({}, _ctxMythos, { mythos: 5 }));
assert(!_notIncurable.transitions.some(function (r) {
  return r.label === 'Loucura Incurável (Mythos ≥ SAN)';
}), 'Mythos < SAN resultante → loucura incurável NÃO dispara');

// Mythos = 0 → nunca dispara
const _noMythos = _ev('LOSE_SANITY', { payload: { amount: 5 } },
  Object.assign({}, _ctxMythos, { mythos: 0 }));
assert(!_noMythos.transitions.some(function (r) {
  return r.label === 'Loucura Incurável (Mythos ≥ SAN)';
}), 'Mythos = 0 → loucura incurável nunca dispara');

// ── RECOVER_SANITY ──────────────────────────────────────────────────────────
group('state-machine — RECOVER_SANITY');

const _ctxRecover = { currentSAN: 5, maxSAN: 60, sanLossToday: 0, mythos: 0,
                      status: { indefInsane: true, incurablyInsane: false },
                      attributes: {} };

// SAN atual = 5, cura = 3 → SAN = 8 > 0, indefInsane=true, não incurável → remove status
const _rec = _ev('RECOVER_SANITY', { payload: { amount: 3 } }, _ctxRecover);
assert(_rec.transitions.some(function (r) {
  return r.label === 'Recuperação de loucura indefinida';
}), 'RECOVER_SANITY com SAN>0 e indefInsane → remove status');
assert(_rec.effects.some(function (e) {
  return e.type === 'REMOVE_STATUS' && e.payload && e.payload.status === 'indefInsane';
}), 'RECOVER_SANITY produz REMOVE_STATUS{indefInsane}');

// incuravelmente insano → tratamento bloqueado
const _noRec = _ev('RECOVER_SANITY', { payload: { amount: 3 } },
  Object.assign({}, _ctxRecover, { status: { indefInsane: true, incurablyInsane: true } }));
assert(!_noRec.transitions.some(function (r) {
  return r.label === 'Recuperação de loucura indefinida';
}), 'incuravelmente insano → recuperação bloqueada');

// não estava indefInsane → sem efeito
const _noIndRec = _ev('RECOVER_SANITY', { payload: { amount: 3 } },
  Object.assign({}, _ctxRecover, { status: { indefInsane: false, incurablyInsane: false } }));
assert(!_noIndRec.transitions.some(function (r) {
  return r.label === 'Recuperação de loucura indefinida';
}), 'indefInsane=false → recuperação indefinida não dispara');

// ── SPEND_LUCK ─────────────────────────────────────────────────────────────
group('state-machine — SPEND_LUCK');

const _ctxLuck = { status: {}, attributes: { Sorte: { value: 40 } } };

// 30 ≤ 40 → sorte suficiente
const _luck = _ev('SPEND_LUCK', { payload: { amount: 30 } }, _ctxLuck);
assert(_luck.transitions.some(function (r) { return r.label === 'Reformulação de rolagem'; }),
  'Sorte suficiente → Reformulação de rolagem dispara');
assert(!_luck.transitions.some(function (r) { return r.label === 'Sorte insuficiente'; }),
  'Sorte suficiente → regra de bloqueio não dispara');

// 50 > 40 → sorte insuficiente
const _noLuck = _ev('SPEND_LUCK', { payload: { amount: 50 } }, _ctxLuck);
assert(_noLuck.transitions.some(function (r) { return r.label === 'Sorte insuficiente'; }),
  'Sorte insuficiente → regra de bloqueio dispara');
assert(!_noLuck.transitions.some(function (r) { return r.label === 'Reformulação de rolagem'; }),
  'Sorte insuficiente → Reformulação de rolagem não dispara');

// Sorte ausente nos atributos → insuficiente
const _noLuckAttr = _ev('SPEND_LUCK', { payload: { amount: 5 } },
  { status: {}, attributes: {} });
assert(_noLuckAttr.transitions.some(function (r) { return r.label === 'Sorte insuficiente'; }),
  'Sorte ausente nos atributos → regra de bloqueio dispara');

// ── Guard exception — segurança ────────────────────────────────────────────
group('state-machine — guard exception não propaga');

// Injeta regra com guard que lança exceção
const _saved = _sm.RULES.APPLY_DAMAGE;
// Não podemos mutar RULES (frozen) — testamos via ctx/action malformados
// Um guard que recebe ctx=null deve ser capturado internamente
const _boom = _ev('APPLY_DAMAGE', { payload: { amount: 5 } }, null);
assert(Array.isArray(_boom.transitions), 'guard com ctx=null → não lança, retorna vazio');
assertEq(_boom.transitions.length, 0,   'todos os guards falharam silenciosamente com ctx=null');

// ── Grafos documentados ────────────────────────────────────────────────────
group('state-machine — grafos documentados (COMBAT_ROUND_GRAPH, SKILL_ROLL_GRAPH)');

const _crg = _sm.COMBAT_ROUND_GRAPH;
assert(Array.isArray(_crg.states),      'COMBAT_ROUND_GRAPH.states é array');
assert(Array.isArray(_crg.transitions), 'COMBAT_ROUND_GRAPH.transitions é array');
assert(_crg.states.includes('OUT_OF_COMBAT'),   'estado OUT_OF_COMBAT presente');
assert(_crg.states.includes('INITIATIVE_PHASE'), 'estado INITIATIVE_PHASE presente');
assert(_crg.states.includes('DAMAGE_PHASE'),     'estado DAMAGE_PHASE presente');
assert(_crg.transitions.some(function (t) {
  return t.from === 'OUT_OF_COMBAT' && t.action === 'ENCOUNTER_BEGUN';
}), 'transição ENCOUNTER_BEGUN → INITIATIVE_PHASE presente');
assertEq(_crg.status, 'documented', 'COMBAT_ROUND_GRAPH.status = "documented"');

const _srg = _sm.SKILL_ROLL_GRAPH;
assert(Array.isArray(_srg.states),      'SKILL_ROLL_GRAPH.states é array');
assert(_srg.states.includes('IDLE'),    'estado IDLE presente');
assert(_srg.states.includes('PUSHED'),  'estado PUSHED presente');
assert(_srg.transitions.some(function (t) {
  return t.from === 'IDLE' && t.action === 'ROLL_SKILL';
}), 'transição ROLL_SKILL de IDLE presente');
assertEq(_srg.status, 'documented', 'SKILL_ROLL_GRAPH.status = "documented"');
