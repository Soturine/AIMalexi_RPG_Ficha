/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/occupations.js
   Matriz de Ocupações do Chamado de Cthulhu 7E (PT-BR)
   Dados puros — atribui a window.CoCData.occupations
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};

/**
 * Estrutura de cada ocupação:
 * {
 *   name:           string       — nome em PT-BR
 *   pointsFormula:  string       — expressão usando EDU/DES/FOR/APA/POD (ex: "EDU*2+DES*2")
 *                                   Algumas têm OR: "EDU*4 | EDU*2+DES*2"
 *   skills:         string[]     — perícias da ocupação (nomes exatos)
 *   anySkillsCount: number       — quantas perícias livres a ocupação permite escolher
 *   credit:         [min, max]   — faixa de Posses (Crédito) em %
 *   era:            string       — any | 1920s | modern
 *   description:    string       — descrição curta
 * }
 *
 * NOTA: "anySkills" são perícias que o jogador escolhe livremente para representar
 * especializações pessoais dentro da ocupação. Some à lista de skills da ocupação.
 *
 * O parser de pointsFormula está em js/engine/coc7e-rules.js (calcOccupationPoints).
 */

window.CoCData.occupations = [

  // ── CLÁSSICAS DOS ANOS 1920 ───────────────────────────────────────────
  {
    name: "Antiquário",
    pointsFormula: "EDU*4",
    skills: ["Avaliação", "Arte/Ofício", "História", "Usar Bibliotecas",
             "Outra Língua", "Outra Língua", "Encontrar"],
    anySkillsCount: 1,
    credit: [30, 70],
    era: "any",
    description: "Vendedor e curador de objetos raros. Acesso a livros antigos e contatos peculiares."
  },
  {
    name: "Antropólogo",
    pointsFormula: "EDU*4",
    skills: ["Antropologia", "Arqueologia", "História", "Outra Língua",
             "Ciência", "Encontrar", "Sobrevivência"],
    anySkillsCount: 1,
    credit: [10, 40],
    era: "any",
    description: "Estuda culturas humanas — viaja e documenta povos pouco conhecidos."
  },
  {
    name: "Arqueólogo",
    pointsFormula: "EDU*4",
    skills: ["Arqueologia", "Avaliação", "História", "Ciência",
             "Outra Língua", "Encontrar", "Consertos Mecânicos"],
    anySkillsCount: 1,
    credit: [10, 40],
    era: "any",
    description: "Escava sítios antigos. Frequentemente confronta o passado em formas literais."
  },
  {
    name: "Artista",
    pointsFormula: "EDU*2 + (APA*2 | DES*2 | POD*2)",
    skills: ["Arte/Ofício", "História", "Outra Língua", "Psicologia",
             "Encontrar", "Avaliação"],
    anySkillsCount: 2,
    credit: [9, 50],
    era: "any",
    description: "Pintor, escritor, escultor — vê o mundo de modo perigosamente sensível."
  },
  {
    name: "Atleta",
    pointsFormula: "EDU*2+DES*2",
    skills: ["Saltar", "Escalar", "Natação", "Lutar", "Cavalgar",
             "Primeiros Socorros", "Psicologia"],
    anySkillsCount: 1,
    credit: [9, 70],
    era: "any",
    description: "Corpo treinado. Resistência e agilidade acima da média."
  },
  {
    name: "Autor",
    pointsFormula: "EDU*4",
    skills: ["Arte/Ofício", "História", "Outra Língua", "Língua Nativa",
             "Usar Bibliotecas", "Psicologia"],
    anySkillsCount: 2,
    credit: [9, 30],
    era: "any",
    description: "Vive de escrever — romances, ensaios, jornalismo investigativo independente."
  },
  {
    name: "Clérigo",
    pointsFormula: "EDU*4",
    skills: ["Contabilidade", "História", "Outra Língua", "Língua Nativa",
             "Ocultismo", "Psicologia", "Lábia"],
    anySkillsCount: 2,
    credit: [9, 60],
    era: "any",
    description: "Pastor, padre, rabino — guia espiritual da comunidade. Cético ou crente?"
  },
  {
    name: "Criminoso",
    pointsFormula: "EDU*2 + (DES*2 | APA*2)",
    skills: ["Furtividade", "Chaveiro", "Psicologia", "Avaliação",
             "Lábia", "Disfarce", "Encontrar"],
    anySkillsCount: 1,
    credit: [5, 65],
    era: "any",
    description: "Vive das margens — ladrão, contrabandista, golpista. Aprendeu o submundo."
  },
  {
    name: "Detetive da Polícia",
    pointsFormula: "EDU*2 + (DES*2 | FOR*2)",
    skills: ["Armas de Fogo (Pistolas)", "Direito", "Escutar", "Psicologia",
             "Encontrar", "Persuasão", "Furtividade"],
    anySkillsCount: 1,
    credit: [20, 50],
    era: "any",
    description: "Investigador oficial. Tem distintivo, contatos na polícia, e perguntas demais."
  },
  {
    name: "Detetive Particular",
    pointsFormula: "EDU*2+DES*2",
    skills: ["Direito", "Arte/Ofício (Fotografia)", "Disfarce", "Lábia",
             "Psicologia", "Encontrar", "Furtividade"],
    anySkillsCount: 1,
    credit: [9, 30],
    era: "any",
    description: "Investigador autônomo. Casos que a polícia não toca."
  },
  {
    name: "Diletante",
    pointsFormula: "EDU*2+APA*2",
    skills: ["Outra Língua", "Cavalgar", "Armas de Fogo (Rifles/Espingardas)",
             "Arte/Ofício"],
    anySkillsCount: 3,
    credit: [50, 99],
    era: "any",
    description: "Rico ocioso. Hobbies caros, contatos na alta sociedade, nada para fazer."
  },
  {
    name: "Engenheiro",
    pointsFormula: "EDU*4",
    skills: ["Arte/Ofício (Desenho Técnico)", "Consertos Mecânicos", "Operar Maquinário Pesado",
             "Ciência (Engenharia)", "Ciência (Física)", "Encontrar"],
    anySkillsCount: 2,
    credit: [30, 60],
    era: "any",
    description: "Constrói pontes, máquinas, edifícios. Lógica e regras."
  },
  {
    name: "Jornalista",
    pointsFormula: "EDU*4",
    skills: ["Arte/Ofício (Fotografia)", "História", "Língua Nativa",
             "Outra Língua", "Psicologia", "Lábia"],
    anySkillsCount: 2,
    credit: [9, 30],
    era: "any",
    description: "Persegue manchetes. Cobre crimes, política, o estranho. Pergunta demais."
  },
  {
    name: "Médico",
    pointsFormula: "EDU*4",
    skills: ["Primeiros Socorros", "Medicina", "Outra Língua (Latim)", "Ciência (Biologia)",
             "Ciência (Farmácia)", "Psicologia"],
    anySkillsCount: 1,
    credit: [30, 80],
    era: "any",
    description: "Cura corpos. Vê o frágil que sustenta a vida — e o que pode quebrá-lo."
  },
  {
    name: "Militar",
    pointsFormula: "EDU*2 + (DES*2 | FOR*2)",
    skills: ["Armas de Fogo (Rifles/Espingardas)", "Sobrevivência", "Primeiros Socorros",
             "Navegação", "Escutar", "Encontrar", "Consertos Mecânicos"],
    anySkillsCount: 1,
    credit: [20, 70],
    era: "any",
    description: "Oficial ou veterano. Disciplina, comando, traumas de guerra."
  },
  {
    name: "Missionário",
    pointsFormula: "EDU*2 + (FOR*2 | APA*2 | DES*2 | CON*2)",
    skills: ["Arte/Ofício", "Medicina", "Consertos Mecânicos", "Outra Língua",
             "Primeiros Socorros", "Psicologia"],
    anySkillsCount: 2,
    credit: [0, 30],
    era: "any",
    description: "Viaja a regiões remotas pregando. Vê o que nenhum outro estrangeiro vê."
  },
  {
    name: "Operário",
    pointsFormula: "EDU*2 + (DES*2 | FOR*2)",
    skills: ["Operar Maquinário Pesado", "Consertos Mecânicos", "Lutar", "Primeiros Socorros",
             "Escutar", "Arte/Ofício", "Dirigir Automóveis"],
    anySkillsCount: 1,
    credit: [9, 30],
    era: "any",
    description: "Trabalhador braçal. Conhece pessoas, máquinas e a dureza da rua."
  },
  {
    name: "Professor",
    pointsFormula: "EDU*4",
    skills: ["Língua Nativa", "Outra Língua", "Outra Língua", "Usar Bibliotecas",
             "Psicologia", "Arte/Ofício"],
    anySkillsCount: 2,
    credit: [20, 70],
    era: "any",
    description: "Acadêmico ou de ensino básico. Conhecimento profundo de uma área."
  },
  {
    name: "Repórter",
    pointsFormula: "EDU*2 + (DES*2 | APA*2)",
    skills: ["Arte/Ofício (Fotografia)", "História", "Língua Nativa",
             "Outra Língua", "Psicologia", "Lábia", "Encontrar"],
    anySkillsCount: 1,
    credit: [9, 30],
    era: "any",
    description: "Variante do jornalista, mais focada em campo. Câmera no pescoço, dúvida no olhar."
  },
  {
    name: "Soldado",
    pointsFormula: "EDU*2 + (DES*2 | FOR*2)",
    skills: ["Escalar | Nadar", "Esquivar", "Armas de Fogo (Rifles/Espingardas) | Armas de Fogo (Submetralhadoras)",
             "Sobrevivência", "Lutar (Briga)", "Furtividade"],
    anySkillsCount: 1,
    credit: [9, 30],
    era: "any",
    description: "Soldado raso ou guerrilha. Treinamento direto, sem patente alta."
  },

  // ── MODERNAS (anos 1990+) ─────────────────────────────────────────────
  {
    name: "Hacker",
    pointsFormula: "EDU*4",
    skills: ["Usar Computadores", "Eletrônica", "Usar Bibliotecas",
             "Consertos Elétricos", "Outra Língua", "Encontrar"],
    anySkillsCount: 2,
    credit: [10, 70],
    era: "modern",
    description: "Manipula sistemas digitais. Acesso a redes, dados sensíveis, anonimato relativo."
  },
  {
    name: "Programador",
    pointsFormula: "EDU*4",
    skills: ["Usar Computadores", "Eletrônica", "Ciência (Matemática)", "Usar Bibliotecas",
             "Língua Nativa", "Encontrar"],
    anySkillsCount: 2,
    credit: [10, 70],
    era: "modern",
    description: "Constrói software para empresas. Vê padrões onde outros não veem."
  },

  // ── CUSTOM / LIVRE ────────────────────────────────────────────────────
  {
    name: "Personalizada (defina suas perícias)",
    pointsFormula: "EDU*2 + (FOR*2 | CON*2 | TAM*2 | DES*2 | APA*2 | POD*2)",
    skills: [],
    anySkillsCount: 8,
    credit: [0, 99],
    era: "any",
    description: "Concepção livre. Você escolhe 8 perícias e a fórmula de pontos. Combine com o Guardião."
  }

];

// Helper: lookup por nome
window.CoCData.findOccupation = function (name) {
  if (!name) return null;
  const needle = name.trim().toLowerCase();
  return window.CoCData.occupations.find(o => o.name.toLowerCase() === needle) || null;
};
