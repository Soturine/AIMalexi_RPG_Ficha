/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/skills-encyclopedia.js
   ETAPA 9 (#30) — Base de conhecimento das perícias do Chamado de Cthulhu 7e.

   Cada entrada (por nome de perícia):
     descricao    — função resumida da perícia
     podeFazer[]  — usos práticos permitidos
     naoPodeFazer[] — limitações
     exemplos[]   — exemplos narrativos
     interacoes[] — perícias relacionadas
     acoes[]      — (opcional) ações contextuais rápidas { label, difficulty? }

   Cobre as perícias mais usadas; as demais caem no fallback da UI (usa note/
   examples da definição base). Conteúdo resumido para consulta rápida em mesa.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};

window.CoCData.skillsEncyclopedia = {
  "Esquivar": {
    descricao: "Mover-se reflexivamente para fora do caminho de um ataque ou perigo iminente.",
    podeFazer: ["Evitar um ataque corpo a corpo", "Escapar de um perigo súbito (queda, desmoronamento)", "Reagir mesmo sem ação no round"],
    naoPodeFazer: ["Esquivar de armas de fogo (exceto se ciente do disparo)", "Atacar no mesmo movimento", "Ser usada proativamente para atacar"],
    exemplos: ["Você se joga para o lado quando o cultista avança com a faca."],
    interacoes: ["Lutar", "Saltar"],
    acoes: [{ label: "Realizar Esquiva" }]
  },
  "Lutar": {
    descricao: "Combate corpo a corpo: socos, golpes com armas brancas e improvisadas.",
    podeFazer: ["Atacar em combate próximo", "Contra-atacar quando atacado", "Executar manobras (derrubar, desarmar)"],
    naoPodeFazer: ["Atingir alvos fora de alcance", "Substituir Armas de Fogo"],
    exemplos: ["Você acerta um gancho no maxilar do capanga."],
    interacoes: ["Esquivar", "Armas de Fogo (Pistolas)"],
    acoes: [{ label: "Atacar" }, { label: "Contra-atacar" }, { label: "Manobra" }]
  },
  "Armas de Fogo (Pistolas)": {
    descricao: "Uso de armas de fogo curtas: pistolas e revólveres.",
    podeFazer: ["Disparar à distância", "Tiro mirado (sacrificando ação por bônus)", "Disparos múltiplos conforme a arma"],
    naoPodeFazer: ["Atingir além do alcance da arma sem penalidade", "Recarregar e atirar no mesmo round (geralmente)"],
    exemplos: ["Você saca o revólver e dispara contra a criatura."],
    interacoes: ["Esquivar", "Encontrar"],
    acoes: [{ label: "Disparar" }, { label: "Tiro Mirado", difficulty: "hard" }]
  },
  "Encontrar": {
    descricao: "Localizar objetos ocultos, pistas e detalhes do ambiente com busca ativa.",
    podeFazer: ["Achar passagens secretas", "Notar pistas físicas", "Revistar um cômodo"],
    naoPodeFazer: ["Perceber intenções (use Psicologia)", "Ouvir sons (use Escutar)"],
    exemplos: ["Você nota o assoalho solto que esconde o diário."],
    interacoes: ["Escutar", "Usar Bibliotecas", "Psicologia"]
  },
  "Escutar": {
    descricao: "Perceber e interpretar sons — conversas, passos, ruídos sutis.",
    podeFazer: ["Ouvir conversa atrás de uma porta", "Detectar alguém se aproximando", "Identificar um som suspeito"],
    naoPodeFazer: ["Ver no escuro", "Ler lábios (use Leitura Labial)"],
    exemplos: ["Você ouve sussurros em uma língua desconhecida no porão."],
    interacoes: ["Encontrar", "Furtividade"]
  },
  "Psicologia": {
    descricao: "Ler emoções, intenções e estado mental de outras pessoas.",
    podeFazer: ["Detectar mentiras", "Avaliar a sinceridade de um NPC", "Perceber medo, hostilidade ou instabilidade"],
    naoPodeFazer: ["Ler mentes", "Diagnosticar transtornos (use Psicanálise)", "Garantir certeza absoluta"],
    exemplos: ["Você percebe que o delegado esconde algo ao mencionar a vítima."],
    interacoes: ["Psicanálise", "Persuasão", "Intimidação"],
    acoes: [{ label: "Analisar Comportamento" }]
  },
  "Usar Bibliotecas": {
    descricao: "Encontrar a informação certa em arquivos, bibliotecas e registros.",
    podeFazer: ["Localizar referências e documentos", "Pesquisar histórico de um local/pessoa", "Encontrar artigos de jornal"],
    naoPodeFazer: ["Compreender textos do Mythos (use Mythos/Ocultismo)", "Obter o que não existe no acervo"],
    exemplos: ["Após horas, você encontra a escritura original da mansão."],
    interacoes: ["História", "Ocultismo", "Direito"]
  },
  "Charme": {
    descricao: "Influenciar pelo carisma, simpatia e atração pessoal.",
    podeFazer: ["Ganhar simpatia de um NPC", "Negociar de forma amistosa", "Causar boa primeira impressão"],
    naoPodeFazer: ["Forçar contra a vontade (use Intimidação)", "Enganar com mentiras (use Lábia)"],
    exemplos: ["Seu sorriso convence a recepcionista a abrir uma exceção."],
    interacoes: ["Persuasão", "Lábia", "Intimidação"],
    acoes: [{ label: "Encantar Alvo" }]
  },
  "Intimidação": {
    descricao: "Coagir por medo, ameaça ou demonstração de força.",
    podeFazer: ["Forçar cooperação por medo", "Arrancar informações sob pressão", "Afastar uma ameaça"],
    naoPodeFazer: ["Criar lealdade genuína", "Funcionar contra quem não teme consequências"],
    exemplos: ["Você encurrala o informante e ele entrega o endereço."],
    interacoes: ["Charme", "Persuasão", "Lutar"],
    acoes: [{ label: "Intimidar Alvo" }]
  },
  "Persuasão": {
    descricao: "Convencer pela lógica, argumentação e razão, ao longo do tempo.",
    podeFazer: ["Mudar a opinião de alguém com argumentos", "Negociar acordos", "Convencer de uma verdade"],
    naoPodeFazer: ["Efeito instantâneo em multidões", "Vencer alguém irredutível num só teste"],
    exemplos: ["Você argumenta até o curador permitir o acesso ao arquivo restrito."],
    interacoes: ["Charme", "Lábia", "Psicologia"],
    acoes: [{ label: "Convencer Alvo" }]
  },
  "Lábia": {
    descricao: "Enganar, blefar e despistar com lábia rápida e meias-verdades.",
    podeFazer: ["Mentir de forma convincente", "Criar distrações verbais", "Disfarçar intenções"],
    naoPodeFazer: ["Sustentar mentira facilmente verificável", "Convencer por mérito real (use Persuasão)"],
    exemplos: ["Você convence o guarda de que é o novo inspetor."],
    interacoes: ["Persuasão", "Disfarce", "Charme"]
  },
  "Primeiros Socorros": {
    descricao: "Cuidados imediatos para estabilizar ferimentos.",
    podeFazer: ["Recuperar 1 PV de um ferido", "Estabilizar quem está morrendo", "Estancar sangramento"],
    naoPodeFazer: ["Curar grandes quantidades de PV (use Medicina)", "Tratar doenças/venenos complexos", "Ser usada duas vezes no mesmo ferimento"],
    exemplos: ["Você improvisa um torniquete e estabiliza o companheiro caído."],
    interacoes: ["Medicina"],
    acoes: [{ label: "Aplicar Primeiros Socorros" }]
  },
  "Medicina": {
    descricao: "Conhecimento médico para diagnóstico e tratamento prolongado.",
    podeFazer: ["Tratar ferimentos ao longo de dias", "Diagnosticar doenças", "Reconhecer causa de morte"],
    naoPodeFazer: ["Curar instantaneamente em combate", "Operar sem instrumentos adequados (penalidade)"],
    exemplos: ["Sua avaliação revela que a vítima foi envenenada, não esfaqueada."],
    interacoes: ["Primeiros Socorros", "Ciência", "Psicanálise"],
    acoes: [{ label: "Tratar Ferimentos" }, { label: "Tratamento de Longo Prazo" }]
  },
  "Ocultismo": {
    descricao: "Reconhecer símbolos, crenças, tradições, lendas e práticas esotéricas.",
    podeFazer: ["Reconhecer símbolos arcanos", "Identificar cultos conhecidos", "Interpretar textos esotéricos", "Relacionar mitos e entidades"],
    naoPodeFazer: ["Conjurar magias", "Substituir Mythos de Cthulhu", "Identificar automaticamente entidades desconhecidas"],
    exemplos: ["Você reconhece o símbolo na parede como um selo de proteção medieval.", "Você sabe que este ritual pertence a uma seita antiga."],
    interacoes: ["Usar Bibliotecas", "História", "Antropologia", "Mythos de Cthulhu"]
  },
  "Psicanálise": {
    descricao: "Terapia para tratar traumas mentais e recuperar Sanidade.",
    podeFazer: ["Recuperar SAN de um paciente ao longo do tempo", "Ajudar a sair de loucura indefinida", "Acalmar surtos"],
    naoPodeFazer: ["Curar SAN instantaneamente", "Reverter perda permanente por Mythos"],
    exemplos: ["Sessões semanais ajudam o investigador a reconstruir sua psique."],
    interacoes: ["Psicologia", "Medicina"]
  },
  "Mythos de Cthulhu": {
    descricao: "Compreensão das verdades cósmicas — conhecimento que corrói a mente.",
    podeFazer: ["Reconhecer entidades e fenômenos do Mythos", "Compreender magias e tomos", "Prever comportamento de criaturas"],
    naoPodeFazer: ["Ser adquirida na criação de personagem", "Subir por estudo comum — só por exposição ao Mythos"],
    exemplos: ["Você reconhece o ser amorfo como um shoggoth e sabe o que ele faz."],
    interacoes: ["Ocultismo"],
    nota: "Cada ponto reduz a SAN máxima em 1 (SAN máx = 99 − Mythos)."
  },
  "Furtividade": {
    descricao: "Mover-se silenciosamente e permanecer despercebido.",
    podeFazer: ["Passar por guardas sem ser visto", "Aproximar-se sem ruído", "Esconder-se"],
    naoPodeFazer: ["Ficar invisível", "Funcionar em terreno barulhento sem penalidade"],
    exemplos: ["Você atravessa o salão de baile sem que ninguém note."],
    interacoes: ["Escutar", "Disfarce"]
  },
  "Disfarce": {
    descricao: "Alterar a aparência para se passar por outra pessoa ou tipo.",
    podeFazer: ["Fingir ser outra pessoa", "Misturar-se a um grupo", "Ocultar identidade"],
    naoPodeFazer: ["Enganar quem conhece bem o alvo de perto", "Mudar drasticamente de tamanho/voz sem apoio"],
    exemplos: ["Vestido de zelador, você entra na ala restrita sem suspeitas."],
    interacoes: ["Lábia", "Furtividade", "Arte/Ofício"]
  },
  "Escalar": {
    descricao: "Subir superfícies verticais usando força, técnica e equilíbrio.",
    podeFazer: ["Escalar paredes, rochas, fachadas", "Descer por cordas"],
    naoPodeFazer: ["Escalar superfícies impossíveis sem equipamento", "Ignorar quedas em falha grave"],
    exemplos: ["Você sobe pela parede de hera até a janela do segundo andar."],
    interacoes: ["Saltar", "Sobrevivência"]
  },
  "História": {
    descricao: "Conhecimento de eventos, períodos e contextos históricos.",
    podeFazer: ["Reconhecer artefatos e épocas", "Saber sobre eventos passados", "Contextualizar um local antigo"],
    naoPodeFazer: ["Saber detalhes ocultos do Mythos", "Prever o futuro"],
    exemplos: ["Você identifica o brasão como pertencente a uma família extinta no séc. XVIII."],
    interacoes: ["Usar Bibliotecas", "Arqueologia", "Ocultismo"]
  }
};

// Helper: lookup tolerante (tenta o nome, depois sem a especialização entre parênteses)
window.CoCData.findSkillEncyclopedia = function (name) {
  if (!name) return null;
  var enc = window.CoCData.skillsEncyclopedia;
  if (enc[name]) return enc[name];
  var base = name.replace(/\s*\(.+\)$/, "");
  return enc[base] || null;
};
