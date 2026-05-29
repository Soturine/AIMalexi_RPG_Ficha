/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/skills.js
   Matriz de Perícias do Chamado de Cthulhu 7E (PT-BR)
   Dados puros — atribui a window.CoCData.skills

   NOMES CANÔNICOS conforme o PDF oficial (Livro do Guardião 7E, índice de
   perícias). Mudanças vs. versões anteriores (corrigindo traduções):
     Pesquisar Bibliotecas → Usar Bibliotecas
     Nadar                 → Natação
     Conduzir Veículo      → Dirigir Automóveis
     Eletricidade          → Consertos Elétricos
     Mecânica              → Consertos Mecânicos
     Computadores          → Usar Computadores
     Idioma Próprio        → Língua Nativa
     Mitos de Cthulhu      → Mythos de Cthulhu
     Armas de Fogo (…singular) → (…plural)  (Pistolas/Rifles/etc.)
   Removidas (não existem como perícia própria no 7E):
     Seguir Alguém · Uso de Bibliotecas (Internet)
     Biologia / Ciência Forense (são especializações de Ciência)
   Adicionadas (faltavam): Nível de Crédito, Mundo Natural, Mergulho,
     Leitura Labial, Treinar Animais, Artilharia, Demolições.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};

/**
 * Estrutura de cada perícia:
 * {
 *   name:           string         — nome em PT-BR (canônico do PDF)
 *   base:           number|null    — valor base em %; null se derivado
 *   baseFormula:    string?        — fórmula de derivação (ex: "DES/2")
 *   category:       string         — combat | investigative | social | physical | knowledge | technical | mythos
 *   era:            string         — any | 1920s | modern (anos 1920 vs hoje)
 *   specializable:  boolean        — admite sub-especialização (ex: Lutar, Idioma)
 *   examples:       string[]?      — exemplos de especialização
 *   note:           string?        — observação rápida
 * }
 */

window.CoCData.skills = [

  // ── COMBATE ────────────────────────────────────────────────────────────
  { name: "Esquivar",                  base: null, baseFormula: "DES/2", category: "combat", era: "any" },
  { name: "Lutar",                     base: 25,   category: "combat", era: "any", specializable: true,
    note: "Especialização padrão: Briga.",
    examples: ["Briga", "Espadas", "Machados", "Lanças", "Garrote", "Chicotes", "Manguais", "Motosserras"] },
  { name: "Armas de Fogo (Pistolas)",          base: 20, category: "combat", era: "any" },
  { name: "Armas de Fogo (Rifles/Espingardas)", base: 25, category: "combat", era: "any" },
  { name: "Armas de Fogo (Submetralhadoras)",  base: 15, category: "combat", era: "any" },
  { name: "Armas de Fogo (Metralhadoras)",     base: 10, category: "combat", era: "any" },
  { name: "Arremessar",                base: 20, category: "combat", era: "any" },
  { name: "Artilharia",                base: 1,  category: "combat", era: "any",
    note: "Opcional — Guardião decide se está disponível na campanha." },

  // ── INVESTIGAÇÃO / PERCEPÇÃO ──────────────────────────────────────────
  { name: "Encontrar",                 base: 25, category: "investigative", era: "any" },
  { name: "Escutar",                   base: 20, category: "investigative", era: "any" },
  { name: "Usar Bibliotecas",          base: 20, category: "investigative", era: "any" },
  { name: "Psicologia",                base: 10, category: "investigative", era: "any" },
  { name: "Rastrear",                  base: 10, category: "investigative", era: "any" },
  { name: "Leitura Labial",            base: 1,  category: "investigative", era: "any",
    note: "Opcional — ler lábios à distância." },

  // ── SOCIAL ─────────────────────────────────────────────────────────────
  { name: "Charme",                    base: 15, category: "social", era: "any" },
  { name: "Intimidação",               base: 15, category: "social", era: "any" },
  { name: "Lábia",                     base: 5,  category: "social", era: "any" },
  { name: "Persuasão",                 base: 10, category: "social", era: "any" },
  { name: "Disfarce",                  base: 5,  category: "social", era: "any" },
  { name: "Nível de Crédito",          base: 0,  category: "social", era: "any",
    note: "Posses/status. Valor inicial vem da faixa da ocupação; define Dinheiro, Gasto e Patrimônio." },

  // ── FÍSICAS ────────────────────────────────────────────────────────────
  { name: "Escalar",                   base: 20, category: "physical", era: "any" },
  { name: "Furtividade",               base: 20, category: "physical", era: "any" },
  { name: "Natação",                   base: 20, category: "physical", era: "any" },
  { name: "Saltar",                    base: 20, category: "physical", era: "any" },
  { name: "Cavalgar",                  base: 5,  category: "physical", era: "any" },
  { name: "Mergulho",                  base: 1,  category: "physical", era: "any",
    note: "Mergulho autônomo / em apneia." },
  { name: "Sobrevivência",             base: 10, category: "physical", era: "any", specializable: true,
    examples: ["Deserto", "Floresta", "Selva", "Mar", "Polar", "Montanha"] },

  // ── CONHECIMENTO / CIÊNCIAS ───────────────────────────────────────────
  { name: "Antropologia",              base: 1,  category: "knowledge", era: "any" },
  { name: "Arqueologia",               base: 1,  category: "knowledge", era: "any" },
  { name: "Ciência",                   base: 1,  category: "knowledge", era: "any", specializable: true,
    examples: ["Astronomia", "Biologia", "Botânica", "Química", "Criptografia", "Engenharia", "Farmácia",
               "Física", "Forense", "Geologia", "Matemática", "Meteorologia", "Zoologia"] },
  { name: "Direito",                   base: 5,  category: "knowledge", era: "any" },
  { name: "História",                  base: 5,  category: "knowledge", era: "any" },
  { name: "Medicina",                  base: 1,  category: "knowledge", era: "any" },
  { name: "Mundo Natural",             base: 10, category: "knowledge", era: "any",
    note: "Conhecimento tradicional (não científico) da natureza, rastros e espécies." },
  { name: "Ocultismo",                 base: 5,  category: "knowledge", era: "any" },
  { name: "Psicanálise",               base: 1,  category: "knowledge", era: "any" },
  { name: "Língua Nativa",             base: null, baseFormula: "EDU", category: "knowledge", era: "any",
    note: "Igual ao seu valor de EDU. Língua materna." },
  { name: "Outra Língua",              base: 1,  category: "knowledge", era: "any", specializable: true,
    examples: ["Inglês", "Francês", "Alemão", "Latim", "Grego Antigo", "Árabe", "Mandarim", "Russo"] },

  // ── TÉCNICAS / OFÍCIOS ────────────────────────────────────────────────
  { name: "Avaliação",                 base: 5,  category: "technical", era: "any" },
  { name: "Chaveiro",                  base: 1,  category: "technical", era: "any" },
  { name: "Contabilidade",             base: 5,  category: "technical", era: "any" },
  { name: "Consertos Elétricos",       base: 10, category: "technical", era: "any" },
  { name: "Consertos Mecânicos",       base: 10, category: "technical", era: "any" },
  { name: "Navegação",                 base: 10, category: "technical", era: "any" },
  { name: "Operar Maquinário Pesado",  base: 1,  category: "technical", era: "any" },
  { name: "Pilotar",                   base: 1,  category: "technical", era: "any", specializable: true,
    examples: ["Aeronaves", "Aeronave Civil", "Aeronave Militar", "Barco", "Navio"] },
  { name: "Primeiros Socorros",        base: 30, category: "technical", era: "any" },
  { name: "Dirigir Automóveis",        base: 20, category: "technical", era: "any",
    note: "Carros, motos, caminhões comuns." },
  { name: "Treinar Animais",           base: 5,  category: "technical", era: "any",
    note: "Opcional — domar/treinar animais." },
  { name: "Demolições",                base: 1,  category: "technical", era: "any",
    note: "Opcional — explosivos e cargas." },
  { name: "Arte/Ofício",               base: 5,  category: "technical", era: "any", specializable: true,
    examples: ["Atuação", "Belas Artes", "Carpintaria", "Culinária", "Escrita", "Falsificação",
               "Fotografia", "Forjar", "Música", "Pintura", "Tipografia"] },

  // ── MODERNAS (anos 1990+) ─────────────────────────────────────────────
  { name: "Usar Computadores",         base: 5,  category: "technical", era: "modern",
    note: "Hardware, software, programação." },
  { name: "Eletrônica",                base: 1,  category: "technical", era: "modern" },

  // ── MÍTICA ─────────────────────────────────────────────────────────────
  { name: "Mythos de Cthulhu",         base: 0,  category: "mythos", era: "any",
    note: "ÚNICA perícia que NÃO pode ser adicionada na criação. Só sobe ao expor-se aos Mythos. Cada ponto reduz SAN máxima em 1." },

  // ── HIPNOSE (opcional) ────────────────────────────────────────────────
  { name: "Hipnose",                   base: 1,  category: "knowledge", era: "any",
    note: "Opcional — Guardião decide se está disponível na campanha." }

];

// Helper: lookup rápido por nome (case-insensitive)
window.CoCData.findSkill = function (name) {
  if (!name) return null;
  const needle = name.trim().toLowerCase();
  return window.CoCData.skills.find(s => s.name.toLowerCase() === needle) || null;
};

// Helper: agrupar por categoria
window.CoCData.skillsByCategory = function () {
  const groups = {};
  for (const s of window.CoCData.skills) {
    (groups[s.category] = groups[s.category] || []).push(s);
  }
  return groups;
};

// Helper: labels de categorias em PT-BR
window.CoCData.categoryLabels = {
  combat:        "Combate",
  investigative: "Investigação",
  social:        "Social",
  physical:      "Físicas",
  knowledge:     "Conhecimento",
  technical:     "Técnicas / Ofícios",
  mythos:        "Mítica"
};
