/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-schema.js
   Suíte de testes para js/core/schema.js

   Cobertura:
   - null/undefined input → minimal valid output
   - _meta defaults e schemaWarnings[]
   - attributes: campo ausente, tipo errado, coerção de value
   - derived: PV/SAN/PM ausentes, SAN.max default
   - Array sections: inventory/spells/tomes/etc. faltando
   - Object sections: skills/background/etc. com tipo errado
   - Passthrough: character válido → dados preservados, warnings=[]
   - Imutabilidade: input não é mutado
   - Campos desconhecidos: preservados (forward-compat)

   Carregado por runner.js, que expõe assert(), assertEq() e group() como globais.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const normalize = window.CoC.schema.normalizeCharacter;

// ─────────────────────────────────────────────────────────────────────────────
//  Null / undefined input
// ─────────────────────────────────────────────────────────────────────────────
group('schema — null/undefined input');

const _null = normalize(null);
assert(_null !== null,                     'normalize(null): retorna objeto (não null)');
assert(typeof _null === 'object',          'normalize(null): retorna object');
assert(Array.isArray(_null._meta.schemaWarnings), 'normalize(null): schemaWarnings é array');
assert(_null._meta.schemaWarnings.length > 0,     'normalize(null): gera pelo menos 1 warning');
assert(Array.isArray(_null.inventory),     'normalize(null): inventory[] criado');
assert(Array.isArray(_null.spells),        'normalize(null): spells[] criado');
assert(Array.isArray(_null.tomes),         'normalize(null): tomes[] criado');
assert(typeof _null.derived.PV === 'object', 'normalize(null): derived.PV criado');
assert(typeof _null.derived.SAN === 'object','normalize(null): derived.SAN criado');
assert(typeof _null.derived.PM === 'object', 'normalize(null): derived.PM criado');

const _undef = normalize(undefined);
assert(_undef !== null, 'normalize(undefined): retorna objeto');

// ─────────────────────────────────────────────────────────────────────────────
//  _meta defaults
// ─────────────────────────────────────────────────────────────────────────────
group('schema — _meta defaults');

// Ausente
const _noMeta = normalize({ name: 'Fulano' });
assert(_noMeta._meta !== null,             '_meta criado quando ausente');
assert('version' in _noMeta._meta,         '_meta.version definido');
// _meta ausente não gera warning próprio (apenas defaults preenchidos silenciosamente)
assert(!_noMeta._meta.schemaWarnings.some(w => w.includes('_meta')),
  '_meta ausente → sem warning específico sobre _meta');

// Tipo errado (_meta = array)
const _badMeta = normalize({ _meta: ['a', 'b'] });
assert(typeof _badMeta._meta === 'object' && !Array.isArray(_badMeta._meta),
  '_meta array → reset para objeto');
assert(_badMeta._meta.schemaWarnings.some(w => w.includes('_meta')),
  '_meta inválido → warning gerado');

// ─────────────────────────────────────────────────────────────────────────────
//  attributes
// ─────────────────────────────────────────────────────────────────────────────
group('schema — attributes');

// Campo ausente → default
const _noAttr = normalize({});
assertEq(_noAttr.attributes.FOR.value, 0,  'attributes.FOR ausente → value = 0');
assertEq(_noAttr.attributes.Sorte.value, 0,'attributes.Sorte ausente → value = 0');

// Coerção de tipo: value = string numérica → number
const _strVal = normalize({ attributes: { FOR: { value: '55' }, CON: { value: 30 },
  TAM: { value: 0 }, DES: { value: 0 }, APA: { value: 0 },
  INT: { value: 0 }, POD: { value: 0 }, EDU: { value: 0 }, Sorte: { value: 0 } } });
assertEq(typeof _strVal.attributes.FOR.value, 'number', 'attributes.FOR.value "55" coercida para number');
assertEq(_strVal.attributes.FOR.value, 55,              'attributes.FOR.value "55" → 55');
assert(!_strVal._meta.schemaWarnings.some(w => w.includes('FOR') && w.includes('coerced')),
  'string numérica válida → sem warning de coerção para FOR');

// Coerção de tipo: value = string inválida → 0 + warning
const _badVal = normalize({ attributes: { FOR: { value: 'abc' }, CON: { value: 0 },
  TAM: { value: 0 }, DES: { value: 0 }, APA: { value: 0 },
  INT: { value: 0 }, POD: { value: 0 }, EDU: { value: 0 }, Sorte: { value: 0 } } });
assertEq(_badVal.attributes.FOR.value, 0,  'attributes.FOR.value "abc" → 0');
assert(_badVal._meta.schemaWarnings.some(w => w.includes('FOR') && w.includes('coerced')),
  'attributes.FOR.value inválido → warning com "FOR" e "coerced"');

// attributes seção com tipo errado
const _arrAttr = normalize({ attributes: [1, 2, 3] });
assert(typeof _arrAttr.attributes === 'object' && !Array.isArray(_arrAttr.attributes),
  'attributes = array → reset para objeto');
assert(_arrAttr._meta.schemaWarnings.some(w => w.includes('attributes')),
  'attributes inválido → warning');

// ─────────────────────────────────────────────────────────────────────────────
//  derived
// ─────────────────────────────────────────────────────────────────────────────
group('schema — derived');

// PV ausente
const _noPV = normalize({ derived: { PM: { value: 5, current: 5 }, SAN: { value: 50, current: 50 } } });
assertEq(_noPV.derived.PV.value,   0, 'derived.PV ausente → value = 0');
assertEq(_noPV.derived.PV.current, 0, 'derived.PV ausente → current = 0');
assert(_noPV._meta.schemaWarnings.some(w => w.includes('PV')), 'derived.PV ausente → warning');

// SAN.max ausente → 99
const _noMax = normalize({ derived: {
  PV:  { value: 10, current: 10 },
  PM:  { value: 5,  current: 5  },
  SAN: { value: 60, current: 60 }   // max ausente
}});
assertEq(_noMax.derived.SAN.max, 99, 'derived.SAN.max ausente → 99 (padrão CoC 7e)');
assert(!_noMax._meta.schemaWarnings.some(w => w.includes('SAN')),
  'SAN sem max → sem warning sobre SAN (apenas default silencioso)');

// derived seção ausente
const _noDerived = normalize({});
assert(typeof _noDerived.derived.PV  === 'object', 'derived ausente → PV criado');
assert(typeof _noDerived.derived.SAN === 'object', 'derived ausente → SAN criado');
assert(typeof _noDerived.derived.PM  === 'object', 'derived ausente → PM criado');

// ─────────────────────────────────────────────────────────────────────────────
//  Array sections
// ─────────────────────────────────────────────────────────────────────────────
group('schema — array sections');

// inventory ausente
const _noInv = normalize({ inventory: undefined });
assert(Array.isArray(_noInv.inventory), 'inventory undefined → []');

// spells = object (não array) → reset
const _objSpells = normalize({ spells: { 0: 'spell_a' } });
assert(Array.isArray(_objSpells.spells),     'spells = object → []');
assert(_objSpells._meta.schemaWarnings.some(w => w.includes('spells')),
  'spells inválido → warning');

// tomes = null → reset sem warning (null é tratado como ausente, não como tipo errado)
const _nullTomes = normalize({ tomes: null });
assert(Array.isArray(_nullTomes.tomes),      'tomes = null → []');
assertEq(_nullTomes._meta.schemaWarnings.filter(w => w.includes('tomes')).length, 0,
  'tomes null → sem warning (null = ausente, não tipo errado)');

// ─────────────────────────────────────────────────────────────────────────────
//  Passthrough — character válido completo
// ─────────────────────────────────────────────────────────────────────────────
group('schema — passthrough (character válido)');

const _valid = {
  id: 'char-001',
  _meta: { createdAt: '2026-01-01', updatedAt: '2026-05-30', version: '1.0.0' },
  attributes: {
    FOR: { value: 65 }, CON: { value: 60 }, TAM: { value: 55 },
    DES: { value: 70 }, APA: { value: 50 }, INT: { value: 75 },
    POD: { value: 55 }, EDU: { value: 80 }, Sorte: { value: 45 }
  },
  derived: {
    PV:  { value: 11, current: 11 },
    PM:  { value: 11, current: 11 },
    SAN: { value: 55, current: 55, max: 99 }
  },
  skills: { 'Biblioteca': { value: 65 } },
  occupationSkills: ['Biblioteca'],
  inventory: [{ id: 'it-1', name: 'Revólver' }],
  journal: [],
  spells: [],
  tomes: [],
  weapons: [],
  equipment: [],
  background: { description: 'Lorem ipsum' },
  finances: { cash: 200 },
  status: { majorWound: false },
  pointsAllocation: { occupationSpent: 320, personalSpent: 80 },
  customField: 'preserved'
};

const _out = normalize(_valid);

assertEq(_out._meta.schemaWarnings.length, 0,   'character válido → schemaWarnings = []');
assertEq(_out.attributes.FOR.value, 65,          'character válido → FOR.value preservado');
assertEq(_out.derived.PV.current,  11,           'character válido → PV.current preservado');
assertEq(_out.derived.SAN.max,     99,           'character válido → SAN.max preservado');
assertEq(_out.inventory[0].name,  'Revólver',    'character válido → inventory preservada');
assertEq(_out.customField, 'preserved',           'campo desconhecido → preservado (forward-compat)');

// ─────────────────────────────────────────────────────────────────────────────
//  Imutabilidade — input não é mutado
// ─────────────────────────────────────────────────────────────────────────────
group('schema — imutabilidade do input');

const _orig = { attributes: { FOR: { value: 50 } }, inventory: ['item'] };
const _origSnapshot = JSON.stringify(_orig);
normalize(_orig);
assertEq(JSON.stringify(_orig), _origSnapshot, 'normalizeCharacter não muta o objeto original');
