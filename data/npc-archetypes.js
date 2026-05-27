/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/npc-archetypes.js
   Arquétipos rápidos de NPC + Modificadores estáticos
   ═══════════════════════════════════════════════════════════════════════════

   Filosofia:
   - Arquétipos são templates mínimos (Mestre customiza no Modo Completo).
   - Modificadores são objetos simples { stat: delta }. Sem pipelines.
   - Aplicação manual: o Mestre escolhe quais modificadores aplicar.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};

/**
 * Arquétipos: usados para gerar NPC aleatório com 1 clique.
 * Estrutura idêntica a window.CoCData.bestiary, mas SEM stats fixos —
 * o gerador rola atributos baseado no perfil.
 */
window.CoCData.npcArchetypes = [
  {
    id: "civil",
    name: "Civil",
    profile: "average",
    occupationHint: "Operário, comerciante, secretária, professor primário",
    suggestedSkills: ["Encontrar 30%", "Conduzir Veículo 30%", "Psicologia 25%"],
    notes: "Foge de violência. Útil como testemunha ou informante."
  },
  {
    id: "intelectual",
    name: "Acadêmico / Profissional",
    profile: "intellectual",
    occupationHint: "Médico, professor universitário, antiquário, advogado",
    suggestedSkills: ["Idioma Próprio 70%", "Pesquisar Bibliotecas 50%", "Persuasão 40%", "Ciência 50%"],
    notes: "Conhece pessoas em alta sociedade. Pode reconhecer símbolos básicos."
  },
  {
    id: "comerciante",
    name: "Comerciante / Lojista",
    profile: "average",
    occupationHint: "Dono de loja, mercador, taverneiro",
    suggestedSkills: ["Avaliação 50%", "Persuasão 45%", "Contabilidade 40%", "Psicologia 35%"],
    notes: "Sabe fofocas do bairro. Tem estoque útil. Pode ser sujo nos negócios."
  },
  {
    id: "lei",
    name: "Lei / Ordem",
    profile: "combatant",
    occupationHint: "Policial, detetive, segurança, juiz",
    suggestedSkills: ["Armas de Fogo (Pistola) 50%", "Direito 40%", "Intimidação 50%", "Encontrar 45%"],
    notes: "Pode ajudar ou atrapalhar. Cético com sobrenatural."
  },
  {
    id: "criminoso",
    name: "Criminoso de Rua",
    profile: "combatant",
    occupationHint: "Batedor de carteira, mafioso, contrabandista, golpista",
    suggestedSkills: ["Furtividade 50%", "Chaveiro 40%", "Lábia 50%", "Intimidação 45%"],
    notes: "Útil como contato no submundo. Não é confiável."
  },
  {
    id: "religioso",
    name: "Religioso",
    profile: "intellectual",
    occupationHint: "Padre, pastor, rabino, monge, missionário",
    suggestedSkills: ["Persuasão 50%", "Psicologia 45%", "História 35%", "Outra Língua 30%"],
    notes: "Pode reconhecer iconografia maligna. Hostil ou aliado contra Mythos."
  },
  {
    id: "artista",
    name: "Artista / Boêmio",
    profile: "average",
    occupationHint: "Pintor, músico, ator, escritor",
    suggestedSkills: ["Arte/Ofício 60%", "Psicologia 35%", "Lábia 40%", "Charme 45%"],
    notes: "Sensível. Pode ter visões/sonhos relacionados aos Mythos antes dos outros."
  }
];

/**
 * Modificadores estáticos. Aplicação manual pelo Mestre.
 *
 * Estrutura:
 * {
 *   id, name,
 *   description,
 *   apply: {
 *     stats?: { [STAT]: delta },
 *     derived?: { [field]: delta_or_set },
 *     skills?: [{ name, delta }],
 *     attacks?: [{ name, type, chance, damage }],   // adiciona ataque
 *     sanLoss?: string,    // SOBRESCREVE
 *     armor?: number,      // SOBRESCREVE
 *     notes?: [string]     // anexar às notas
 *   }
 * }
 */
window.CoCData.npcModifiers = [
  {
    id: "fanatico",
    name: "Fanático",
    description: "Crente convicto. Não recua, não negocia, luta até morrer.",
    apply: {
      stats: { pow: +20, app: -10 },
      notes: [
        "Não testa para se render — luta até PV ≤ 0.",
        "Imune a Intimidação."
      ]
    }
  },
  {
    id: "armado",
    name: "Armado (Pistola)",
    description: "Carrega revólver. Sabe usar minimamente.",
    apply: {
      attacks: [
        { name: "Revólver", type: "firearm", chance: 35, damage: "1D10", note: "6 balas" }
      ],
      skills: [
        { name: "Armas de Fogo (Pistola)", delta: 0 }   // garante perícia presente
      ]
    }
  },
  {
    id: "armado-rifle",
    name: "Armado (Rifle)",
    description: "Carrega rifle. Atirador de longa distância.",
    apply: {
      attacks: [
        { name: "Rifle .30-06", type: "firearm", chance: 45, damage: "2D6+4", note: "Empala. Alcance longo." }
      ]
    }
  },
  {
    id: "veterano",
    name: "Veterano",
    description: "Ex-combatente. Não entra em pânico facilmente. Resistente.",
    apply: {
      stats: { con: +10, pow: +10 },
      skills: [
        { name: "Esquivar", delta: +20 },
        { name: "Primeiros Socorros", delta: +20 },
        { name: "Lutar", delta: +20 }
      ],
      notes: [
        "Calmo sob fogo cruzado. Não foge.",
        "Pode comandar outros NPCs em combate."
      ]
    }
  },
  {
    id: "ferido",
    name: "Ferido",
    description: "Já sofreu dano antes da cena começar.",
    apply: {
      derived: { hp: -3 },
      stats: { dex: -10, con: -5 },
      notes: [
        "PV reduzido. Pode estar sangrando — perde 1 PV/rd até ser tratado."
      ]
    }
  },
  {
    id: "ferimento-grave",
    name: "Ferimento Grave",
    description: "Próximo do colapso. Cada turno é uma luta para continuar.",
    apply: {
      derived: { hp: -6 },
      stats: { dex: -20, con: -10 },
      notes: [
        "Major Wound ativo. Teste de CON×5 a cada rodada ou cai inconsciente.",
        "Movimento reduzido pela metade."
      ]
    }
  },
  {
    id: "drogado",
    name: "Sob Influência (drogas/álcool)",
    description: "Reflexos prejudicados. Desinibido.",
    apply: {
      stats: { dex: -15, int: -10, pow: +5 },
      notes: [
        "Sem medo de testar combate suicida.",
        "Pode ignorar dor por 1D3 rodadas."
      ]
    }
  },
  {
    id: "iniciado",
    name: "Iniciado nos Mythos",
    description: "Estudou tomos proibidos. Conhece pelo menos 1 feitiço.",
    apply: {
      stats: { pow: +10, int: +5 },
      skills: [
        { name: "Ocultismo", delta: +30 },
        { name: "Mitos de Cthulhu", delta: +15 }
      ],
      sanLoss: "0/1D3",
      notes: [
        "Conhece 1-2 feitiços menores. Pode invocar criatura ligada ao seu culto.",
        "SAN máxima reduzida pelos Mythos (Sanidade atual 50-70%)."
      ]
    }
  },
  {
    id: "idoso",
    name: "Idoso",
    description: "Sabedoria acumulada, mas corpo lento.",
    apply: {
      stats: { str: -10, con: -10, dex: -15, edu: +20 },
      skills: [
        { name: "Pesquisar Bibliotecas", delta: +20 },
        { name: "História", delta: +20 }
      ],
      notes: [
        "MOV -2.",
        "Pode lembrar de eventos antigos relevantes para a investigação."
      ]
    }
  }
];

/**
 * Aplica modificadores a uma criatura, retornando NOVO objeto (não muta original).
 * Mestre escolhe quais modificadores aplicar; aplicação é determinística.
 *
 * @param {Object} creature - estrutura padrão do bestiary
 * @param {string[]} modifierIds - lista de IDs em window.CoCData.npcModifiers
 * @returns {Object} criatura com modificadores aplicados
 */
window.CoCData.applyModifiers = function (creature, modifierIds) {
  if (!creature) return null;
  // Deep clone
  const out = JSON.parse(JSON.stringify(creature));
  out.appliedModifiers = (out.appliedModifiers || []).concat(modifierIds);

  for (const modId of modifierIds || []) {
    const mod = window.CoCData.npcModifiers.find(m => m.id === modId);
    if (!mod || !mod.apply) continue;
    const a = mod.apply;

    // Stats
    if (a.stats) {
      out.stats = out.stats || {};
      for (const [k, delta] of Object.entries(a.stats)) {
        const cur = Number(out.stats[k]) || 0;
        out.stats[k] = Math.max(0, cur + delta);
      }
    }

    // Derived (números são deltas; strings sobrescrevem)
    if (a.derived) {
      out.derived = out.derived || {};
      for (const [k, val] of Object.entries(a.derived)) {
        if (typeof val === "number") {
          const cur = Number(out.derived[k]) || 0;
          out.derived[k] = Math.max(0, cur + val);
        } else {
          out.derived[k] = val;
        }
      }
    }

    // Skills (adiciona ou ajusta)
    if (Array.isArray(a.skills)) {
      out.skills = out.skills || [];
      for (const s of a.skills) {
        const existing = out.skills.find(x => x.name === s.name);
        if (existing) existing.value = Math.max(0, Number(existing.value) + Number(s.delta || 0));
        else out.skills.push({ name: s.name, value: Math.max(0, Number(s.delta) || 0) });
      }
    }

    // Attacks (adiciona)
    if (Array.isArray(a.attacks)) {
      out.attacks = out.attacks || [];
      for (const atk of a.attacks) out.attacks.push(Object.assign({}, atk));
    }

    // Sobrescreve sanLoss / armor
    if (a.sanLoss != null) out.sanLoss = a.sanLoss;
    if (a.armor != null) out.armor = a.armor;

    // Anexa notes
    if (Array.isArray(a.notes)) {
      out.notes = (out.notes || []).concat(a.notes);
    }
  }

  return out;
};
