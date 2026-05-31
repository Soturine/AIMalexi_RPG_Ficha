/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-store.js
   Suíte de testes para js/core/store.js (reducer + store público)

   Estratégia: testa apenas pela API pública — dispatch() + getState().
   O reducer é privado (IIFE); testar pelo contrato público é suficiente
   e protege contra qualquer futura reorganização interna.

   Grupos:
   1. SET_CHARACTER        — carga e deepClone
   2. PV (APPLY/HEAL)      — clamp em PV_MIN e PV.value
   3. SAN (LOSE/RECOVER)   — clamp em 0 e SAN.max
   4. PM (SPEND/RESTORE)   — clamp em 0 e PM.value
   5. SPEND_LUCK           — clamp em 0
   6. Inventário (M4.1)    — CRUD + preservação de id
   7. Journal (M4.2)       — CRUD + createdAt gerado
   8. Spells (M4.3)        — CRUD
   9. Tomes (M4.4+M4.5)   — CRUD + spellIds preservado/atualizado
  10. Imutabilidade        — nenhuma action muta o estado anterior
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const store = window.CoC.store;

// ── Helpers ───────────────────────────────────────────────────────────────

/** Personagem mínimo válido para todos os reducers cobertos nesta suíte. */
function makeChar(overrides) {
  return Object.assign({
    id: 'test-01',
    derived: {
      PV:  { value: 10, current: 10 },
      SAN: { value: 60, current: 60, max: 90 },
      PM:  { value: 12, current: 12 }
    },
    attributes: { Sorte: { value: 50 } },
    inventory: [],
    journal:   [],
    spells:    [],
    tomes:     []
  }, overrides || {});
}

/** Reseta o store para um personagem fresco. */
function reset() {
  store.dispatch({ type: 'SET_CHARACTER', payload: makeChar() });
}

/** Atalho para dispatch. */
function act(type, payload) {
  store.dispatch({ type, payload });
}

/** Atalho para ler o personagem atual. */
function char() {
  return store.getState().character;
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. SET_CHARACTER — carga de personagem e deepClone
// ─────────────────────────────────────────────────────────────────────────────
group('SET_CHARACTER — carga e deepClone');

reset();
assertEq(char().id, 'test-01', 'SET_CHARACTER: id preservado');
assert(char().derived.PV !== null, 'SET_CHARACTER: derived.PV carregado');

// deepClone: mutação do payload original não afeta o store
const original = makeChar();
original.id = 'test-before';
act('SET_CHARACTER', original);
original.id = 'test-mutated-after';           // muta o original após dispatch
assertEq(char().id, 'test-before', 'SET_CHARACTER: deepClone isola payload original');

// Null destrói o personagem ativo
act('SET_CHARACTER', null);
assert(char() === null, 'SET_CHARACTER(null): character === null');

// ─────────────────────────────────────────────────────────────────────────────
//  2. PV — APPLY_DAMAGE / HEAL_DAMAGE
//     PV_MIN = -2, PV.value = 10 (teto)
// ─────────────────────────────────────────────────────────────────────────────
group('PV — APPLY_DAMAGE / HEAL_DAMAGE');

reset();
act('APPLY_DAMAGE', { amount: 4 });
assertEq(char().derived.PV.current, 6,  'APPLY_DAMAGE(4): 10→6');

act('APPLY_DAMAGE', { amount: 3 });
assertEq(char().derived.PV.current, 3,  'APPLY_DAMAGE(3): 6→3');

act('HEAL_DAMAGE',  { amount: 5 });
assertEq(char().derived.PV.current, 8,  'HEAL_DAMAGE(5): 3→8');

// Clamp inferior: PV_MIN = -2
reset();
act('APPLY_DAMAGE', { amount: 999 });
assertEq(char().derived.PV.current, -2, 'APPLY_DAMAGE(999): clamp em PV_MIN = -2');

// Clamp superior: PV.value = 10
reset();
act('APPLY_DAMAGE', { amount: 5 });
act('HEAL_DAMAGE',  { amount: 999 });
assertEq(char().derived.PV.current, 10, 'HEAL_DAMAGE(999): clamp em PV.value = 10');

// No-op sem personagem
act('SET_CHARACTER', null);
const statePvNull = store.getState();
act('APPLY_DAMAGE', { amount: 5 });
assert(store.getState() === statePvNull, 'APPLY_DAMAGE sem personagem: no-op (mesma referência)');

// ─────────────────────────────────────────────────────────────────────────────
//  3. SAN — LOSE_SANITY / RECOVER_SANITY
//     piso = 0, teto = SAN.max = 90
// ─────────────────────────────────────────────────────────────────────────────
group('SAN — LOSE_SANITY / RECOVER_SANITY');

reset();
act('LOSE_SANITY', { amount: 10 });
assertEq(char().derived.SAN.current, 50, 'LOSE_SANITY(10): 60→50');

act('LOSE_SANITY', { amount: 20 });
assertEq(char().derived.SAN.current, 30, 'LOSE_SANITY(20): 50→30');

act('RECOVER_SANITY', { amount: 15 });
assertEq(char().derived.SAN.current, 45, 'RECOVER_SANITY(15): 30→45');

// Clamp inferior: nunca < 0
reset();
act('LOSE_SANITY', { amount: 999 });
assertEq(char().derived.SAN.current, 0,  'LOSE_SANITY(999): clamp em 0');

// Clamp superior: nunca > SAN.max (90)
reset();
act('LOSE_SANITY', { amount: 30 });         // 60→30
act('RECOVER_SANITY', { amount: 999 });
assertEq(char().derived.SAN.current, 90, 'RECOVER_SANITY(999): clamp em SAN.max = 90');

// ─────────────────────────────────────────────────────────────────────────────
//  4. PM — SPEND_MAGIC / RESTORE_MAGIC
//     piso = 0, teto = PM.value = 12
// ─────────────────────────────────────────────────────────────────────────────
group('PM — SPEND_MAGIC / RESTORE_MAGIC');

reset();
act('SPEND_MAGIC', { amount: 5 });
assertEq(char().derived.PM.current, 7,  'SPEND_MAGIC(5): 12→7');

act('RESTORE_MAGIC', { amount: 3 });
assertEq(char().derived.PM.current, 10, 'RESTORE_MAGIC(3): 7→10');

// Clamp inferior
reset();
act('SPEND_MAGIC', { amount: 999 });
assertEq(char().derived.PM.current, 0,  'SPEND_MAGIC(999): clamp em 0');

// Clamp superior
reset();
act('SPEND_MAGIC', { amount: 6 });
act('RESTORE_MAGIC', { amount: 999 });
assertEq(char().derived.PM.current, 12, 'RESTORE_MAGIC(999): clamp em PM.value = 12');

// ─────────────────────────────────────────────────────────────────────────────
//  5. SPEND_LUCK
//     piso = 0 (não existe RESTORE_LUCK — Sorte só cresce via progressão)
// ─────────────────────────────────────────────────────────────────────────────
group('SPEND_LUCK');

reset();
act('SPEND_LUCK', { amount: 10 });
assertEq(char().attributes.Sorte.value, 40, 'SPEND_LUCK(10): 50→40');

act('SPEND_LUCK', { amount: 15 });
assertEq(char().attributes.Sorte.value, 25, 'SPEND_LUCK(15): 40→25');

// Clamp: Sorte nunca negativa
act('SPEND_LUCK', { amount: 999 });
assertEq(char().attributes.Sorte.value,  0, 'SPEND_LUCK(999): clamp em 0');

// ─────────────────────────────────────────────────────────────────────────────
//  6. Inventário — M4.1
// ─────────────────────────────────────────────────────────────────────────────
group('Inventário — ADD / UPDATE / REMOVE_INVENTORY_ITEM');

// ADD sem id: id gerado automaticamente
reset();
act('ADD_INVENTORY_ITEM', { item: { name: 'Revólver', qty: 1 } });
const invItem = char().inventory[0];
assert(invItem && typeof invItem.id === 'string' && invItem.id.length > 0,
  'ADD_INVENTORY_ITEM sem id: id gerado');
assertEq(invItem.name, 'Revólver', 'ADD_INVENTORY_ITEM: nome preservado');
assertEq(char().inventory.length, 1, 'ADD_INVENTORY_ITEM: length = 1');

// ADD com id explícito: id preservado
act('ADD_INVENTORY_ITEM', { item: { id: 'item-abc', name: 'Lanterna', qty: 1 } });
assertEq(char().inventory.length, 2,        'ADD_INVENTORY_ITEM(2): length = 2');
assertEq(char().inventory[1].id, 'item-abc','ADD_INVENTORY_ITEM com id: id preservado');

// UPDATE: muda nome, preserva id, NÃO cria novo item
act('UPDATE_INVENTORY_ITEM', { item: { id: 'item-abc', name: 'Lanterna Elétrica', qty: 2 } });
assertEq(char().inventory.length, 2,          'UPDATE_INVENTORY_ITEM: sem adição (length = 2)');
assertEq(char().inventory[1].name, 'Lanterna Elétrica', 'UPDATE_INVENTORY_ITEM: nome atualizado');
assertEq(char().inventory[1].id,   'item-abc',           'UPDATE_INVENTORY_ITEM: id preservado');

// REMOVE: remove apenas o alvo
act('REMOVE_INVENTORY_ITEM', { id: 'item-abc' });
assertEq(char().inventory.length, 1,       'REMOVE_INVENTORY_ITEM: length = 1');
assert(char().inventory[0].id !== 'item-abc', 'REMOVE_INVENTORY_ITEM: item correto removido');

// ─────────────────────────────────────────────────────────────────────────────
//  7. Journal — M4.2
// ─────────────────────────────────────────────────────────────────────────────
group('Journal — ADD / UPDATE / REMOVE_JOURNAL_ENTRY');

reset();
act('ADD_JOURNAL_ENTRY', { entry: { title: 'Chegada em Arkham', content: 'Dia chuvoso.' } });
const entry = char().journal[0];
assert(entry && typeof entry.id === 'string' && entry.id.length > 0,
  'ADD_JOURNAL_ENTRY: id gerado');
assert(typeof entry.createdAt === 'number' && entry.createdAt > 0,
  'ADD_JOURNAL_ENTRY: createdAt gerado (timestamp)');
assertEq(entry.title, 'Chegada em Arkham', 'ADD_JOURNAL_ENTRY: título preservado');

// Segundo entry para testar isolamento no REMOVE
act('ADD_JOURNAL_ENTRY', { entry: { id: 'j-002', title: 'Noite de terror', content: '...' } });
assertEq(char().journal.length, 2, 'ADD_JOURNAL_ENTRY(2): length = 2');

// UPDATE: atualiza content, preserva id e createdAt
const originalCreatedAt = char().journal[0].createdAt;
act('UPDATE_JOURNAL_ENTRY', { entry: { id: entry.id, content: 'Dia chuvoso. Encontrei algo.' } });
assertEq(char().journal[0].content, 'Dia chuvoso. Encontrei algo.', 'UPDATE_JOURNAL_ENTRY: content atualizado');
assertEq(char().journal[0].createdAt, originalCreatedAt, 'UPDATE_JOURNAL_ENTRY: createdAt preservado');

// REMOVE: remove entry correta, preserva outra
act('REMOVE_JOURNAL_ENTRY', { id: entry.id });
assertEq(char().journal.length, 1,     'REMOVE_JOURNAL_ENTRY: length = 1');
assertEq(char().journal[0].id, 'j-002','REMOVE_JOURNAL_ENTRY: entry restante intacta');

// ─────────────────────────────────────────────────────────────────────────────
//  8. Spells — M4.3
// ─────────────────────────────────────────────────────────────────────────────
group('Spells — ADD / UPDATE / REMOVE_SPELL');

reset();
act('ADD_SPELL', { spell: { name: 'Invocar Byakhee', mpCost: '1D6', sanCost: '1D6' } });
const spell = char().spells[0];
assert(spell && typeof spell.id === 'string' && spell.id.length > 0,
  'ADD_SPELL: id gerado');
assertEq(spell.name, 'Invocar Byakhee', 'ADD_SPELL: nome preservado');

act('ADD_SPELL', { spell: { id: 'sp-002', name: 'Contatar Ghoul', mpCost: '2', sanCost: '1' } });
assertEq(char().spells.length, 2, 'ADD_SPELL(2): length = 2');

// UPDATE: muda mpCost, preserva id
act('UPDATE_SPELL', { spell: { id: spell.id, mpCost: '2D6' } });
assertEq(char().spells[0].mpCost,  '2D6',           'UPDATE_SPELL: mpCost atualizado');
assertEq(char().spells[0].id,       spell.id,        'UPDATE_SPELL: id preservado');
assertEq(char().spells.length,      2,               'UPDATE_SPELL: sem adição (length = 2)');

// REMOVE: remove spell correta, preserva outra
act('REMOVE_SPELL', { id: spell.id });
assertEq(char().spells.length, 1,       'REMOVE_SPELL: length = 1');
assertEq(char().spells[0].id, 'sp-002', 'REMOVE_SPELL: spell restante intacta');

// ─────────────────────────────────────────────────────────────────────────────
//  9. Tomes — M4.4 + M4.5 (spellIds[])
// ─────────────────────────────────────────────────────────────────────────────
group('Tomes — ADD / UPDATE / REMOVE_TOME + spellIds (M4.5)');

reset();
// studyProgress = 0 por default quando ausente
act('ADD_TOME', { tome: { name: 'De Vermis Mysteriis', author: 'Ludwig Prinn' } });
const tome = char().tomes[0];
assert(tome && typeof tome.id === 'string' && tome.id.length > 0,
  'ADD_TOME: id gerado');
assertEq(tome.studyProgress, 0,                    'ADD_TOME: studyProgress default = 0');
assertEq(tome.name, 'De Vermis Mysteriis',          'ADD_TOME: nome preservado');

// studyProgress explícito = 3 → preservado (não sobrescrito a 0)
act('ADD_TOME', { tome: { id: 'tome-002', name: 'Necronomicon', studyProgress: 3 } });
assertEq(char().tomes[1].studyProgress, 3,          'ADD_TOME studyProgress=3: preservado (não zerado)');

// UPDATE: muda nome, preserva id
act('UPDATE_TOME', { tome: { id: tome.id, name: 'De Vermis Mysteriis (Latim)' } });
assertEq(char().tomes[0].name, 'De Vermis Mysteriis (Latim)', 'UPDATE_TOME: nome atualizado');
assertEq(char().tomes[0].id,   tome.id,                      'UPDATE_TOME: id preservado');

// M4.5: spellIds[] é gravado via UPDATE_TOME
act('UPDATE_TOME', { tome: { id: tome.id, spellIds: ['sp-001', 'sp-002'] } });
assertEq(
  char().tomes[0].spellIds.join(','), 'sp-001,sp-002',
  'UPDATE_TOME: spellIds[] persistido'
);

// M4.5: UPDATE com outros campos preserva spellIds já gravados
act('UPDATE_TOME', { tome: { id: tome.id, studyProgress: 5 } });
assertEq(
  char().tomes[0].spellIds.join(','), 'sp-001,sp-002',
  'UPDATE_TOME (outro campo): spellIds não apagado'
);
assertEq(char().tomes[0].studyProgress, 5, 'UPDATE_TOME: studyProgress atualizado junto');

// REMOVE: remove tomo correto, preserva outro
act('REMOVE_TOME', { id: tome.id });
assertEq(char().tomes.length, 1,          'REMOVE_TOME: length = 1');
assertEq(char().tomes[0].id, 'tome-002',  'REMOVE_TOME: tomo restante intacto');

// ─────────────────────────────────────────────────────────────────────────────
//  10. Imutabilidade — nenhuma action muta o estado anterior
//
//  O reducer usa deepClone(c) antes de qualquer modificação e retorna um
//  novo objeto de estado via Object.assign({}, state, {...}). Este grupo
//  verifica que o invariante se mantém em tempo de execução.
// ─────────────────────────────────────────────────────────────────────────────
group('Imutabilidade — reducer não muta estado anterior');

// Captura referência antes do dispatch
reset();
const stateBefore = store.getState();
const sanBefore   = stateBefore.character.derived.SAN.current; // 60

act('LOSE_SANITY', { amount: 25 });

const stateAfter = store.getState();

// Novos objetos criados
assert(stateBefore !== stateAfter,
  'LOSE_SANITY: dispatch cria novo objeto de estado');
assert(stateBefore.character !== stateAfter.character,
  'LOSE_SANITY: dispatch cria novo objeto character');

// Estado anterior não foi mutado
assertEq(stateBefore.character.derived.SAN.current, sanBefore,
  'LOSE_SANITY: estado anterior não mutado (SAN = 60)');
assertEq(stateAfter.character.derived.SAN.current, 35,
  'LOSE_SANITY: estado novo tem SAN = 35');

// deepClone: modificar a referência captured não afeta o store
stateAfter.character.derived.SAN.current = 999;  // mutação externa
reset(); act('LOSE_SANITY', { amount: 10 });
assertEq(store.getState().character.derived.SAN.current, 50,
  'Store: mutação externa de referência não afeta próximos dispatches');

// No-op: dispatch sem personagem ativo não altera referência de estado
act('SET_CHARACTER', null);
const stateNull = store.getState();
act('APPLY_DAMAGE',   { amount: 5 });
act('LOSE_SANITY',    { amount: 5 });
act('SPEND_LUCK',     { amount: 5 });
assert(store.getState() === stateNull,
  'No-op (sem personagem): múltiplos dispatches preservam mesma referência');
