/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/presets/klein-moretti.js
   Preset: Klein Moretti — Investigador exemplo (Lord of the Mysteries)
   Migrado de PROJETOS/Ficha-RPG-Klein/character.json (v1.0)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};
window.CoCData.presets = window.CoCData.presets || {};

window.CoCData.presets.klein = {
  schema: "coc7e/1.0",

  investigator: {
    name: "Klein Moretti",
    playerName: "Malexi",
    occupation: "Detetive Particular",
    age: 22,
    sex: "Masculino",
    residence: "Tingen / Backlund",
    birthplace: "Tingen",
    pronouns: "ele/dele",
    tagline: "O detetive que descobriu que a solução do crime é mais aterrorizante que o próprio ato.",
    transmigrated: "Zhou Mingrui"
  },

  attributes: {
    FOR:   { label: "Força",        value: 40, rolled: "3D6×5 (40 = 8×5)" },
    CON:   { label: "Constituição", value: 50, rolled: "3D6×5 (50 = 10×5)" },
    TAM:   { label: "Tamanho",      value: 50, rolled: "(2D6+6)×5 (50 = 10×5)" },
    DES:   { label: "Destreza",     value: 70, rolled: "3D6×5 (70 = 14×5)" },
    APA:   { label: "Aparência",    value: 60, rolled: "3D6×5 (60 = 12×5)" },
    INT:   { label: "Inteligência", value: 90, rolled: "(2D6+6)×5 (90 = 18×5) — máx natural" },
    POD:   { label: "Poder",        value: 90, rolled: "3D6×5 (90 = 18×5) — máx natural" },
    EDU:   { label: "Educação",     value: 75, rolled: "(2D6+6)×5 (75 = 15×5)" },
    Sorte: { label: "Sorte",        value: 50, rolled: "3D6×5 (média)" }
  },

  derived: {
    PV:    { label: "Pontos de Vida",  value: 10, current: 10 },
    PM:    { label: "Pontos de Magia", value: 18, current: 18 },
    SAN:   { label: "Sanidade",        value: 90, current: 90, max: 99 },
    Mitos: { label: "Mitos de Cthulhu", value: 0 },
    MOV:   { label: "Movimento",       value: 8 },
    DB:    { label: "Bônus de Dano",   value: "0" },
    Build: { label: "Corpo",           value: 0 }
  },

  // Perícias customizadas (sobrepõem o base de window.CoCData.skills)
  // Estrutura: { "Nome da Perícia": { value: total final, note?: string } }
  skills: {
    "Psicologia":              { value: 75, note: "Desarmar mentiras, ler intenções" },
    "Encontrar":               { value: 80, note: "Cada pista é uma confissão silenciosa" },
    "Disfarce":                { value: 75, note: "Trocar de persona em segundos" },
    "Pesquisar Bibliotecas":   { value: 70 },
    "Lábia":                   { value: 65, note: "Perícia interpessoal escolhida da Ocupação" },
    "Arte/Ofício (Atuação)":   { value: 65, note: "Mecânica central — manter a máscara sob horror cósmico" },
    "Direito":                 { value: 15, note: "Obrigatória do Detetive" },
    "Arte/Ofício (Fotografia)": { value: 10, note: "Obrigatória do Detetive" },
    "Ocultismo":               { value: 55, note: "Decifrar símbolos, ler tomos" },
    "Escutar":                 { value: 30 },
    "Chaveiro":                { value: 10 },
    "História":                { value: 15, note: "Era vitoriana, instituições" },
    "Outra Língua (Hermes)":   { value: 5 },
    "Armas de Fogo (Pistola)": { value: 25, note: "Para o Revólver .38" },
    "Lutar":                   { value: 25 },
    "Lutar (Espada)":          { value: 20, note: "Para a Bengala-Espada" },
    "Arremessar":              { value: 20, note: "Para o Tarô de Prata" },
    "Esquivar":                { value: 35, note: "Base = DES/2 = 35" },
    "Primeiros Socorros":      { value: 30 },
    "Intimidação":             { value: 15, note: "Persona Gehrman (base — use Edit Mode para subir)" }
  },

  pointsAllocation: {
    occupationSpent: 0,  // recalculado quando a ficha carrega
    personalSpent: 0,
    note: "Pontos do Detetive: EDU×2+DES×2 = 290 | Pessoal: INT×2 = 180"
  },

  weapons: [
    {
      name: "Revólver .38",
      skill: "Armas de Fogo (Pistola)",
      damage: "1D10",
      range: "15m",
      shots: 2,
      ammo: 6,
      malf: 100,
      icon: "🔫",
      impale: true,
      note: "2 disparos por rodada. Principal fonte de dano mundano."
    },
    {
      name: "Bengala-Espada",
      skill: "Lutar (Espada)",
      damage: "1D6+DB",
      range: "Toque",
      icon: "🗡️",
      impale: true,
      note: "Empala em Sucesso Extremo (dano máx + nova rolagem)."
    },
    {
      name: "Tarô de Prata",
      skill: "Arremessar",
      damage: "1D4",
      range: "DES m",
      icon: "🃏",
      note: "Eficaz contra mortos-vivos. Sem DB em armas leves arremessadas."
    },
    {
      name: "Apito de Azik",
      skill: "POD",
      damage: "Especial",
      range: "—",
      icon: "🎺",
      magical: true,
      cost: { PM: 3, SAN: 0 },
      note: "Artefato Mágico: invoca um esqueleto espectral aliado por 1D6 rodadas."
    },
    {
      name: "Pêndulo de Topázio",
      skill: "Ocultismo",
      damage: "—",
      range: "—",
      icon: "🔱",
      magical: true,
      cost: { PM: 1, SAN: 0 },
      bonus: true,
      note: "Concede Dado de Bônus em Encontrar ou Ocultismo (adivinhação)."
    }
  ],

  equipment: [
    "Roupas de gentleman (paletó, chapéu coco, luvas)",
    "Caderno de anotações e caneta",
    "Câmera fotográfica vitoriana",
    "Lupa",
    "Chaves-mestras",
    "Carteira de identificação (Sherlock Moriarty, Detetive Particular)",
    "Caixa de tarô em estojo de couro",
    "Diário de campo do mundo original (Zhou Mingrui)"
  ],

  background: {
    description: "Acadêmico de aparência comum e modos cautelosos. Transmigrado de Zhou Mingrui após ritual de suicídio interrompido.",
    ideology: "Preservação da humanidade através da 'Atuação'. A máscara protege a alma da corrupção.",
    significantPeople: "Benson Moretti (irmão), Melissa Moretti (irmã), Clube do Tarô (família esotérica)",
    meaningfulLocations: "Biblioteca de Tingen, Palácio etéreo acima da névoa, Backlund (residência atual)",
    treasuredPossessions: "Apito de Azik, Caixa de Tarô herdada, Diário do mundo original",
    traits: "Analítico, Cauteloso, Sarcástico (monólogos internos), Empático com humanos comuns",
    injuriesScars: "",
    phobiasManias: "",
    tomes: "Os Fragmentos de Eltdown (transmigração entre realidades), Os Sete Livros Enigmáticos de Hsan",
    encounters: ""
  },

  status: {
    majorWound: false,
    temporaryInsanity: "",
    indefiniteInsanity: "",
    sanLossesToday: 0,
    unconscious: false,
    dying: false
  },

  // Personas (extensão custom — usadas pela versão antiga; opcional)
  personas: [
    { id: "klein",    name: "Klein Moretti",     color: "#7a8590", tagline: "O acadêmico cauteloso. Identidade civil de Zhou Mingrui." },
    { id: "sherlock", name: "Sherlock Moriarty", color: "#3d6b4a", tagline: "O detetive particular de Backlund. Cartão de visita oficial." },
    { id: "gehrman",  name: "Gehrman Sparrow",   color: "#8b1a1a", tagline: "O caçador implacável. Máscara de violência." },
    { id: "dwayne",   name: "Dwayne Dantès",     color: "#b8924f", tagline: "O nobre vingador. Identidade aristocrática." },
    { id: "merlin",   name: "Merlin Hermes",     color: "#6b3d8a", tagline: "O mago erudito. Estudioso do oculto." },
    { id: "fool",     name: "The Fool",          color: "#e8e0cc", tagline: "O Senhor dos Paradoxos Traiçoeiros. Trono frio acima da névoa." }
  ],

  // House rules custom (mecânica homebrew)
  houseRules: {
    title: "Castelo de Névoa Cinza (Sefirah Castle)",
    subtitle: "Mecânicas homebrew — não estão no livro básico do CoC 7E",
    rules: [
      {
        name: "Acesso ao Castelo",
        cost: { SAN: "1/1D6" },
        description: "Custo de SAN no primeiro acesso lúcido. Falha crítica → Acesso de Loucura imediato."
      },
      {
        name: "Convocar Clube do Tarô",
        cost: { PM: 8, SAN: 1 },
        description: "Alvos hostis exigem teste resistido de POD. Klein recebe Dado de Bônus pela amplificação do Castelo."
      },
      {
        name: "Exame da Realidade via Atuação",
        cost: { PM: 0, SAN: 0 },
        description: "Em Insanidade Latente, teste de Arte/Ofício (Atuação) — se sucesso, ignora delírios e mantém fachada por 1 turno."
      },
      {
        name: "Fardo do Conhecimento",
        cost: {},
        description: "Cada revelação aumenta Mitos de Cthulhu, reduzindo SAN máxima (99 − Mitos)."
      },
      {
        name: "Fachada de O Louco",
        cost: {},
        description: "Se falhar em manter aura divina perante o Clube, surto de Megalomania — acreditar ser onipotente; perda de empatia."
      }
    ]
  },

  _meta: {
    createdAt: "2026-05-25",
    updatedAt: "2026-05-26",
    version: "1.0.0",
    preset: "klein-moretti",
    source: "PROJETOS/Ficha-RPG-Klein/character.json (migrado para Fase 3)"
  }
};
