/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/damage-bonus-table.js
   Tabela de Bônus de Dano (DB) e Corpo (Build) por faixa FOR+TAM
   Chamado de Cthulhu 7E — pp. 32-33 do livro básico
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};

/**
 * Cada entrada: [forTamMin, forTamMax, dbString, build]
 * - dbString: notação de dano ("0" ou "-1" para nenhum, "+1D4", "+2D6", etc.)
 * - build: número inteiro (usado para combate corpo-a-corpo, manobras, agarrar)
 *
 * Use window.CoCData.lookupDB(for + tam) para obter [db, build].
 */

window.CoCData.dbTable = [
  // [min, max, db,        build]
  [   2,  64,  "-2",       -2 ],
  [  65,  84,  "-1",       -1 ],
  [  85, 124,   "0",        0 ],
  [ 125, 164,  "+1D4",     +1 ],
  [ 165, 204,  "+1D6",     +2 ],
  [ 205, 284,  "+2D6",     +3 ],
  [ 285, 364,  "+3D6",     +4 ],
  [ 365, 444,  "+4D6",     +5 ],
  [ 445, 524,  "+5D6",     +6 ]
];

/**
 * Faz lookup do DB/Build para um valor FOR+TAM.
 * Retorna { db: string, build: number }. Para valores fora da tabela, usa a faixa adjacente.
 */
window.CoCData.lookupDB = function (forPlusTam) {
  const v = Math.max(2, Number(forPlusTam) || 0);
  for (const row of window.CoCData.dbTable) {
    if (v >= row[0] && v <= row[1]) return { db: row[2], build: row[3] };
  }
  // Acima do maior: usa último intervalo
  const last = window.CoCData.dbTable[window.CoCData.dbTable.length - 1];
  return { db: last[2], build: last[3] };
};
