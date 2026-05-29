/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/presets/empty.js
   Preset: ficha em branco (ponto de partida para criação do zero)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};
window.CoCData.presets = window.CoCData.presets || {};

window.CoCData.presets.empty = {
  schema: "coc7e/1.0",

  investigator: {
    name: "",
    playerName: "",
    occupation: "",
    age: 25,
    sex: "",
    residence: "",
    birthplace: "",
    pronouns: "",
    tagline: "",
    bannerId: null,
    portraitId: null
  },

  // Atributos zerados (devem ser rolados ou inseridos)
  attributes: {
    FOR: { label: "Força",        value: 0 },
    CON: { label: "Constituição", value: 0 },
    TAM: { label: "Tamanho",      value: 0 },
    DES: { label: "Destreza",     value: 0 },
    APA: { label: "Aparência",    value: 0 },
    INT: { label: "Inteligência", value: 0 },
    POD: { label: "Poder",        value: 0 },
    EDU: { label: "Educação",     value: 0 },
    Sorte: { label: "Sorte",      value: 0 }
  },

  // Derivados — todos zero, recalculados ao mudar atributos
  derived: {
    PV:    { label: "Pontos de Vida",  value: 0, current: 0 },
    PM:    { label: "Pontos de Magia", value: 0, current: 0 },
    SAN:   { label: "Sanidade",        value: 0, current: 0, max: 99 },
    Mitos: { label: "Mythos de Cthulhu", value: 0 },
    MOV:   { label: "Movimento",       value: 0 },
    DB:    { label: "Bônus de Dano",   value: "0" },
    Build: { label: "Corpo",           value: 0 }
  },

  // Sem perícias customizadas — usa só os bases de window.CoCData.skills
  // Estrutura: { "Nome da Perícia": { value: número, base?: número, note?: string } }
  skills: {},

  // Pontos alocados rastreados separadamente (para validação)
  pointsAllocation: {
    occupationSpent: 0,
    personalSpent: 0
  },

  // Finanças (CoC 7E): a perícia "Nível de Crédito" define Gasto/Dinheiro/Patrimônio
  // (ver coc7e-rules.calcFinances). "cash" é a carteira corrente, ajustável em jogo;
  // parte do JSON → viaja no backup. O Crédito vive em skills["Nível de Crédito"].
  finances: {
    cash: 0            // dinheiro em mãos
  },

  weapons: [],

  equipment: [],

  background: {
    description: "",
    ideology: "",
    significantPeople: "",
    meaningfulLocations: "",
    treasuredPossessions: "",
    traits: "",
    injuriesScars: "",
    phobiasManias: "",
    tomes: "",
    encounters: ""
  },

  // Status transitórios (ajustáveis em jogo)
  status: {
    majorWound: false,
    temporaryInsanity: "",
    indefiniteInsanity: "",
    sanLossesToday: 0,
    unconscious: false,
    dying: false
  },

  _meta: {
    createdAt: null,
    updatedAt: null,
    version: "1.0.0",
    preset: "empty"
  }
};
