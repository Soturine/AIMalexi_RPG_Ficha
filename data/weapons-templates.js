/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/weapons-templates.js
   Templates de Armas comuns no Chamado de Cthulhu 7E
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};

/**
 * Estrutura de cada arma:
 * {
 *   name:       string     — nome em PT-BR
 *   category:   string     — melee | firearm | thrown | unarmed | natural | special
 *   skill:      string     — perícia para usar (nome exato em data/skills.js)
 *   damage:     string     — string de dado (ex: "1D6+DB", "1D10", "1D3+DB")
 *   range:      string     — alcance ("Toque", "15m", "30m", "DES m")
 *   ammo:       number?    — capacidade do pente/cilindro
 *   shots:      number?    — disparos por rodada
 *   malf:       number?    — chance de falha mecânica (a partir desse valor no D100)
 *   impale:     boolean?   — empala em sucesso extremo? (perfurantes em geral sim)
 *   era:        string     — any | 1920s | modern
 *   note:       string?
 * }
 *
 * Notação: "+DB" significa que se soma o Bônus de Dano do personagem ao dano da arma.
 */

window.CoCData.weapons = [

  // ── DESARMADO / NATURAL ────────────────────────────────────────────────
  {
    name: "Soco",
    category: "unarmed",
    skill: "Lutar",
    damage: "1D3+DB",
    range: "Toque",
    era: "any"
  },
  {
    name: "Chute",
    category: "unarmed",
    skill: "Lutar",
    damage: "1D6+DB",
    range: "Toque",
    era: "any"
  },
  {
    name: "Cabeçada",
    category: "unarmed",
    skill: "Lutar",
    damage: "1D4+DB",
    range: "Toque",
    era: "any"
  },

  // ── ARMAS BRANCAS ──────────────────────────────────────────────────────
  {
    name: "Faca",
    category: "melee",
    skill: "Lutar",
    damage: "1D4+DB",
    range: "Toque",
    impale: true,
    era: "any"
  },
  {
    name: "Adaga / Punhal",
    category: "melee",
    skill: "Lutar",
    damage: "1D4+2+DB",
    range: "Toque",
    impale: true,
    era: "any"
  },
  {
    name: "Espada Curta",
    category: "melee",
    skill: "Lutar",
    damage: "1D6+DB",
    range: "Toque",
    impale: true,
    era: "any"
  },
  {
    name: "Espada Longa / Sabre",
    category: "melee",
    skill: "Lutar",
    damage: "1D8+DB",
    range: "Toque",
    impale: true,
    era: "any"
  },
  {
    name: "Espada de Duas Mãos",
    category: "melee",
    skill: "Lutar",
    damage: "2D6+DB",
    range: "Toque",
    impale: true,
    era: "any"
  },
  {
    name: "Bengala-Espada",
    category: "melee",
    skill: "Lutar",
    damage: "1D6+DB",
    range: "Toque",
    impale: true,
    era: "any",
    note: "Empala em Sucesso Extremo (dano máx + nova rolagem)."
  },
  {
    name: "Machado de Mão",
    category: "melee",
    skill: "Lutar",
    damage: "1D6+1+DB",
    range: "Toque",
    impale: true,
    era: "any"
  },
  {
    name: "Machado de Combate",
    category: "melee",
    skill: "Lutar",
    damage: "1D8+2+DB",
    range: "Toque",
    impale: true,
    era: "any"
  },
  {
    name: "Bastão / Porrete",
    category: "melee",
    skill: "Lutar",
    damage: "1D6+DB",
    range: "Toque",
    era: "any"
  },
  {
    name: "Soqueira",
    category: "melee",
    skill: "Lutar",
    damage: "1D3+1+DB",
    range: "Toque",
    era: "any"
  },
  {
    name: "Chicote",
    category: "melee",
    skill: "Lutar",
    damage: "1D3+DB",
    range: "3m",
    era: "any"
  },
  {
    name: "Motosserra",
    category: "melee",
    skill: "Lutar",
    damage: "2D8+DB",
    range: "Toque",
    impale: true,
    malf: 91,
    era: "modern",
    note: "Falha mecânica em 91+. Dois rounds para ligar."
  },

  // ── ARMAS DE FOGO — PISTOLAS ───────────────────────────────────────────
  {
    name: "Revólver .22",
    category: "firearm",
    skill: "Armas de Fogo (Pistolas)",
    damage: "1D6",
    range: "10m",
    ammo: 6,
    shots: 3,
    malf: 100,
    impale: true,
    era: "any"
  },
  {
    name: "Revólver .38",
    category: "firearm",
    skill: "Armas de Fogo (Pistolas)",
    damage: "1D10",
    range: "15m",
    ammo: 6,
    shots: 2,
    malf: 100,
    impale: true,
    era: "any"
  },
  {
    name: "Revólver .45",
    category: "firearm",
    skill: "Armas de Fogo (Pistolas)",
    damage: "1D10+2",
    range: "15m",
    ammo: 6,
    shots: 1,
    malf: 100,
    impale: true,
    era: "any"
  },
  {
    name: "Pistola Semiautomática 9mm",
    category: "firearm",
    skill: "Armas de Fogo (Pistolas)",
    damage: "1D10",
    range: "15m",
    ammo: 15,
    shots: 3,
    malf: 100,
    impale: true,
    era: "any"
  },

  // ── ARMAS DE FOGO — RIFLES / ESCOPETAS ─────────────────────────────────
  {
    name: "Espingarda Cal. 12 (chumbo grosso)",
    category: "firearm",
    skill: "Armas de Fogo (Rifles/Espingardas)",
    damage: "4D6/2D6/1D6",
    range: "10/20/50m",
    ammo: 2,
    shots: 1,
    malf: 100,
    era: "any",
    note: "Dano cai com distância (curto/médio/longo)."
  },
  {
    name: "Rifle .30-06",
    category: "firearm",
    skill: "Armas de Fogo (Rifles/Espingardas)",
    damage: "2D6+4",
    range: "110m",
    ammo: 5,
    shots: 1,
    malf: 100,
    impale: true,
    era: "any"
  },
  {
    name: "Carabina .30 (Winchester)",
    category: "firearm",
    skill: "Armas de Fogo (Rifles/Espingardas)",
    damage: "2D6",
    range: "60m",
    ammo: 6,
    shots: 1,
    malf: 100,
    impale: true,
    era: "any"
  },

  // ── ARMAS DE FOGO — AUTOMÁTICAS ────────────────────────────────────────
  {
    name: "Submetralhadora Thompson .45",
    category: "firearm",
    skill: "Armas de Fogo (Submetralhadoras)",
    damage: "1D10+2",
    range: "20m",
    ammo: 30,
    shots: 4,
    malf: 96,
    impale: true,
    era: "any"
  },

  // ── ARMAS ARREMESSADAS ─────────────────────────────────────────────────
  {
    name: "Faca de Arremesso",
    category: "thrown",
    skill: "Arremessar",
    damage: "1D4",
    range: "DES m",
    impale: true,
    era: "any"
  },
  {
    name: "Pedra",
    category: "thrown",
    skill: "Arremessar",
    damage: "1D4",
    range: "DES m",
    era: "any"
  },
  {
    name: "Garrafa Molotov",
    category: "thrown",
    skill: "Arremessar",
    damage: "1D6 fogo (várias rodadas)",
    range: "DES m",
    era: "any",
    note: "Cobre área 1m raio. Vítimas pegam fogo se falharem teste de Esquivar."
  },
  {
    name: "Granada de Mão",
    category: "thrown",
    skill: "Arremessar",
    damage: "4D10",
    range: "20m",
    era: "any",
    note: "Dano cai por distância do epicentro. Vítimas testam Esquivar."
  }

];

// Helper: lookup por nome
window.CoCData.findWeapon = function (name) {
  if (!name) return null;
  const needle = name.trim().toLowerCase();
  return window.CoCData.weapons.find(w => w.name.toLowerCase() === needle) || null;
};

// Helper: filtrar por categoria ou era
window.CoCData.weaponsBy = function (filter) {
  filter = filter || {};
  return window.CoCData.weapons.filter(w => {
    if (filter.category && w.category !== filter.category) return false;
    if (filter.era && w.era !== "any" && w.era !== filter.era) return false;
    return true;
  });
};
