/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-combat.js
   Suíte de testes — Sprint 3 (Combate)

   Cobertura:
   - isMajorWound (coc7e-rules.js)
   - store reducers: ADD_WEAPON, UPDATE_WEAPON, REMOVE_WEAPON
   - store reducer: ATTACK_RESOLVED (ammo decrement)
   - store reducer: APPLY_DAMAGE com BUG-07 + HP thresholds
   - schema.js: UUID atribuído a weapons sem .id

   Carregado por runner.js (assert, assertEq, group disponíveis como globais).
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const _rules    = window.CoC.rules;
const _store    = window.CoC.store;
const _schema   = window.CoC.schema;
const _executor = window.CoC.core.executor;

// ─── Helper: personagem mínimo com PV ────────────────────────────────────────
function _charWithHP(maxHP, currentHP) {
  return {
    derived: {
      PV: { value: maxHP, current: currentHP != null ? currentHP : maxHP }
    },
    weapons: [],
    status: {}
  };
}

function _charWithWeapons(weapons) {
  return { weapons: weapons.slice(), derived: { PV: { value: 10, current: 10 } }, status: {} };
}

// ─── Helper: dispatch e ler personagem do store ───────────────────────────────
function _dispatch(action) {
  _store.dispatch(action);
  return _store.getState().character;
}

function _loadChar(c) {
  _store.dispatch({ type: 'SET_CHARACTER', payload: c });
}

// ─────────────────────────────────────────────────────────────────────────────
//  isMajorWound — pura (sem side effects)
// ─────────────────────────────────────────────────────────────────────────────
group('isMajorWound — limites');

assert(typeof _rules.isMajorWound === 'function', 'isMajorWound exportada de rules');

// maxHP=10 → threshold = ceil(10/2) = 5
assert( _rules.isMajorWound(5, 10),  'dano=5 maxHP=10  → true  (= threshold)');
assert( _rules.isMajorWound(6, 10),  'dano=6 maxHP=10  → true  (> threshold)');
assert(!_rules.isMajorWound(4, 10),  'dano=4 maxHP=10  → false (< threshold)');

// maxHP ímpar: maxHP=9 → threshold = ceil(9/2) = 5
assert( _rules.isMajorWound(5, 9),   'dano=5 maxHP=9   → true  (ceil)');
assert(!_rules.isMajorWound(4, 9),   'dano=4 maxHP=9   → false');

// Limites extremos
assert(!_rules.isMajorWound(0,  10), 'dano=0 → false');
assert(!_rules.isMajorWound(10, 0),  'maxHP=0 → false (evita divisão)');
assert( _rules.isMajorWound(1,  1),  'dano=1 maxHP=1 → true (ceil(0.5)=1)');

// ─────────────────────────────────────────────────────────────────────────────
//  APPLY_DAMAGE — reducer puro (só HP) + executor (HP + status via state-machine)
//
//  Sprint 9: status (majorWound, unconscious, dying) foi removido do reducer.
//  Reducer muta HP; executor.execute() acumula efeitos via state-machine.
// ─────────────────────────────────────────────────────────────────────────────
group('APPLY_DAMAGE — reducer só muta HP (status removido do reducer)');

// maxHP=10, dano=5 → dispatch direto: só HP muta, sem status
_loadChar(_charWithHP(10, 10));
var afterDmg1 = _dispatch({ type: 'APPLY_DAMAGE', payload: { amount: 5 } });
assertEq(afterDmg1.derived.PV.current, 5,       'dispatch direto: HP 10→5');
assert(!afterDmg1.status.majorWound,            'dispatch direto: majorWound NÃO setado pelo reducer');
assert(!afterDmg1.status.unconscious,           'dispatch direto: unconscious NÃO setado pelo reducer');

// HP a 0 via dispatch direto — sem status
_loadChar(_charWithHP(10, 2));
var afterDmg2 = _dispatch({ type: 'APPLY_DAMAGE', payload: { amount: 2 } });
assertEq(afterDmg2.derived.PV.current, 0,       'dispatch direto: HP 2→0');
assert(!afterDmg2.status.unconscious,           'dispatch direto: HP=0 → unconscious NÃO setado (lógica no executor)');

// HP clamped via dispatch direto — sem status
_loadChar(_charWithHP(10, 1));
var afterDmg3 = _dispatch({ type: 'APPLY_DAMAGE', payload: { amount: 10 } });
assertEq(afterDmg3.derived.PV.current, -2,      'dispatch direto: HP clamped a PV_MIN=-2');
assert(!afterDmg3.status.dying,                 'dispatch direto: dying NÃO setado (lógica no executor)');

group('APPLY_DAMAGE — executor.execute seta HP + status via state-machine');

// Mesmo cenário, agora via executor — status deve ser setado
function _makeExecChar(maxHP, currentHP) {
  return {
    investigator: { name: 'Combat Test' },
    attributes: { FOR:{value:60}, CON:{value:60}, TAM:{value:60}, DES:{value:50},
                  APA:{value:50}, INT:{value:70}, POD:{value:60}, EDU:{value:75}, Sorte:{value:50} },
    derived: {
      PV:    { value: maxHP, current: currentHP != null ? currentHP : maxHP },
      SAN:   { value: 60, current: 60, max: 100 },
      PM:    { value: 12, current: 12 },
      Mitos: { value: 0 }, MOV: { value: 8 }, DB: { label: '+0' }, Build: { value: 0 }
    },
    status: { majorWound: false, unconscious: false, dying: false, dead: false,
              tempInsane: false, indefInsane: false, incurablyInsane: false, sanLossesToday: 0 },
    skills: {}, weapons: [], inventory: [], journal: [], spells: [], tomes: [],
  };
}

// maxHP=10, dano=5 → executor: majorWound ✓, HP=5 → inconsciente ✗
_loadChar(_makeExecChar(10, 10));
_executor.execute({ type: 'APPLY_DAMAGE', payload: { amount: 5 } });
var execChar1 = _store.getState().character;
assertEq(execChar1.derived.PV.current, 5,    'executor APPLY_DAMAGE(5): HP 10→5');
assert(execChar1.status.majorWound,          'executor: dano=metade HP → majorWound via ADD_STATUS');
assert(!execChar1.status.unconscious,        'executor: HP=5 → sem unconscious');

// dano=10 (HP=10): HP→0, majorWound ✓, unconscious ✓, dying ✗ (0 > -2)
_loadChar(_makeExecChar(10, 10));
_executor.execute({ type: 'APPLY_DAMAGE', payload: { amount: 10 } });
var execChar2 = _store.getState().character;
assertEq(execChar2.derived.PV.current, 0,    'executor APPLY_DAMAGE(10): HP 10→0');
assert(execChar2.status.majorWound,          'executor: dano≥5 → majorWound');
assert(execChar2.status.unconscious,         'executor: HP=0 → unconscious via ADD_STATUS');
assert(!execChar2.status.dying,              'executor: HP=0 ≠ ≤PV_MIN(-2) → sem dying');

// dano=12 (HP=10): HP→-2, majorWound ✓, unconscious ✓, dying ✓
_loadChar(_makeExecChar(10, 10));
_executor.execute({ type: 'APPLY_DAMAGE', payload: { amount: 12 } });
var execChar3 = _store.getState().character;
assertEq(execChar3.derived.PV.current, -2,   'executor APPLY_DAMAGE(12): HP clamped a PV_MIN=-2');
assert(execChar3.status.majorWound,          'executor: dano≥5 → majorWound');
assert(execChar3.status.unconscious,         'executor: HP=-2 ≤ 0 → unconscious');
assert(execChar3.status.dying,               'executor: HP=-2 ≤ PV_MIN → dying');

// ─────────────────────────────────────────────────────────────────────────────
//  ADD_WEAPON
// ─────────────────────────────────────────────────────────────────────────────
group('ADD_WEAPON — reducer');

_loadChar(_charWithWeapons([]));

var wBase = { name: 'Faca', skill: 'Lutar', damage: '1D4+2', ammo: null };
var afterAdd = _dispatch({ type: 'ADD_WEAPON', payload: { weapon: wBase } });
assertEq(afterAdd.weapons.length, 1,              'ADD_WEAPON: lista tem 1 arma');
assertEq(afterAdd.weapons[0].name, 'Faca',        'ADD_WEAPON: nome correto');
assert(typeof afterAdd.weapons[0].id === 'string','ADD_WEAPON: .id gerado (string)');
assert(afterAdd.weapons[0].id.length > 0,         'ADD_WEAPON: .id não vazio');

// Adicionar segunda — ids distintos
_dispatch({ type: 'ADD_WEAPON', payload: { weapon: { name: 'Pistola', skill: 'Armas de Fogo (Pistola)', damage: '1D10', ammo: 6 } } });
var afterAdd2 = _store.getState().character;
assertEq(afterAdd2.weapons.length, 2,             'ADD_WEAPON: duas armas na lista');
assert(afterAdd2.weapons[0].id !== afterAdd2.weapons[1].id, 'ADD_WEAPON: ids distintos');

// ─────────────────────────────────────────────────────────────────────────────
//  UPDATE_WEAPON
// ─────────────────────────────────────────────────────────────────────────────
group('UPDATE_WEAPON — reducer');

var w1id = afterAdd2.weapons[0].id;
var afterUpdate = _dispatch({ type: 'UPDATE_WEAPON', payload: { weapon: { id: w1id, name: 'Adaga', damage: '1D4+1' } } });
var updated = afterUpdate.weapons.find(function(w) { return w.id === w1id; });
assertEq(updated.name, 'Adaga',         'UPDATE_WEAPON: nome atualizado');
assertEq(updated.damage, '1D4+1',       'UPDATE_WEAPON: damage atualizado');
assertEq(updated.skill, 'Lutar',        'UPDATE_WEAPON: campos não tocados preservados');
assertEq(afterUpdate.weapons.length, 2, 'UPDATE_WEAPON: quantidade de armas não muda');

// UPDATE com id inexistente → lista inalterada
var beforeLen = afterUpdate.weapons.length;
var afterBadUpdate = _dispatch({ type: 'UPDATE_WEAPON', payload: { weapon: { id: 'nao-existe', name: 'X' } } });
assertEq(afterBadUpdate.weapons.length, beforeLen, 'UPDATE_WEAPON id inválido: lista inalterada');

// ─────────────────────────────────────────────────────────────────────────────
//  REMOVE_WEAPON
// ─────────────────────────────────────────────────────────────────────────────
group('REMOVE_WEAPON — reducer');

var w2id = afterUpdate.weapons[1].id;
var afterRemove = _dispatch({ type: 'REMOVE_WEAPON', payload: { id: w2id } });
assertEq(afterRemove.weapons.length, 1,           'REMOVE_WEAPON: lista tem 1 arma');
assert(afterRemove.weapons[0].id !== w2id,        'REMOVE_WEAPON: arma correta removida');

// REMOVE com id inexistente → no-op
var afterBadRemove = _dispatch({ type: 'REMOVE_WEAPON', payload: { id: 'fantasma' } });
assertEq(afterBadRemove.weapons.length, 1,        'REMOVE_WEAPON id inválido: lista inalterada');

// ─────────────────────────────────────────────────────────────────────────────
//  ATTACK_RESOLVED — ammo decrement
// ─────────────────────────────────────────────────────────────────────────────
group('ATTACK_RESOLVED — ammo decrement');

var pistola = { id: 'gun-1', name: 'Pistola', skill: 'Armas de Fogo (Pistola)', damage: '1D10', ammo: 6, shots: 1 };
var faca    = { id: 'melee-1', name: 'Faca', skill: 'Lutar', damage: '1D4' };  // sem ammo
_loadChar({ weapons: [pistola, faca], derived: { PV: { value: 10, current: 10 } }, status: {} });

// Tiro com isFired=true → ammo decrementa
var afterFire = _dispatch({ type: 'ATTACK_RESOLVED', payload: { weaponId: 'gun-1', isFired: true } });
var pistolaNow = afterFire.weapons.find(function(w) { return w.id === 'gun-1'; });
assertEq(pistolaNow.ammo, 5,                      'ATTACK_RESOLVED: ammo decrementa de 6 para 5');

// Segundo tiro
_dispatch({ type: 'ATTACK_RESOLVED', payload: { weaponId: 'gun-1', isFired: true } });
var pistola2 = _store.getState().character.weapons.find(function(w) { return w.id === 'gun-1'; });
assertEq(pistola2.ammo, 4,                        'ATTACK_RESOLVED: ammo decrementa de 5 para 4');

// Melee com isFired=false → nenhuma mudança
var facaNow = afterFire.weapons.find(function(w) { return w.id === 'melee-1'; });
assert(facaNow.ammo == null,                      'ATTACK_RESOLVED: melee sem ammo não afetado');

// isFired=false → store retorna estado idêntico (ammo não muda)
var stateBeforeNoFire = _store.getState().character.weapons.find(function(w){ return w.id === 'gun-1'; }).ammo;
_dispatch({ type: 'ATTACK_RESOLVED', payload: { weaponId: 'gun-1', isFired: false } });
var stateAfterNoFire = _store.getState().character.weapons.find(function(w){ return w.id === 'gun-1'; }).ammo;
assertEq(stateAfterNoFire, stateBeforeNoFire,     'ATTACK_RESOLVED isFired=false: ammo inalterado');

// Ammo zerada → não vai abaixo de 0
_loadChar({ weapons: [{ id: 'gun-2', name: 'Derringer', damage: '1D6', ammo: 1 }], derived: { PV: { value: 10, current: 10 } }, status: {} });
_dispatch({ type: 'ATTACK_RESOLVED', payload: { weaponId: 'gun-2', isFired: true } });  // 1→0
var afterEmpty = _dispatch({ type: 'ATTACK_RESOLVED', payload: { weaponId: 'gun-2', isFired: true } });  // tenta 0→-1
var gunEmpty = afterEmpty.weapons.find(function(w) { return w.id === 'gun-2'; });
assertEq(gunEmpty.ammo, 0,                        'ATTACK_RESOLVED: ammo não vai abaixo de 0');

// weaponId inexistente → no-op sem erro
var stateBeforeInvalid = JSON.stringify(_store.getState().character.weapons);
_dispatch({ type: 'ATTACK_RESOLVED', payload: { weaponId: 'nao-existe', isFired: true } });
assertEq(JSON.stringify(_store.getState().character.weapons), stateBeforeInvalid,
  'ATTACK_RESOLVED weaponId inválido: weapons inalterado');

// ─────────────────────────────────────────────────────────────────────────────
//  schema.js — UUID em weapons sem .id
// ─────────────────────────────────────────────────────────────────────────────
group('schema — weapons UUID migration');

var _norm = window.CoC.schema.normalizeCharacter;

// Arma sem .id → UUID atribuído
var rawWithWeapon = { weapons: [{ name: 'Machado', skill: 'Lutar', damage: '1D6+DB' }] };
var normW1 = _norm(rawWithWeapon);
assert(typeof normW1.weapons[0].id === 'string',  'schema: weapon sem .id recebe UUID (string)');
assert(normW1.weapons[0].id.length > 0,           'schema: UUID não vazio');
assert(normW1._meta.schemaWarnings.some(function(w){ return w.includes('UUID'); }),
  'schema: warning emitido para weapon sem .id');

// Arma COM .id → .id preservado
var rawWithId = { weapons: [{ id: 'existente-123', name: 'Espada', skill: 'Lutar', damage: '1D8+DB' }] };
var normW2 = _norm(rawWithId);
assertEq(normW2.weapons[0].id, 'existente-123',   'schema: .id existente preservado');
assert(!normW2._meta.schemaWarnings.some(function(w){ return w.includes('UUID'); }),
  'schema: sem warning quando .id já existe');

// Múltiplas armas — ids distintos gerados
var rawMulti = { weapons: [{ name: 'A', skill: 'Lutar', damage: '1D4' }, { name: 'B', skill: 'Lutar', damage: '1D6' }] };
var normW3 = _norm(rawMulti);
assert(normW3.weapons[0].id !== normW3.weapons[1].id, 'schema: UUIDs distintos para cada weapon sem .id');
