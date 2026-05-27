Feedback_Ficha_RPG

Aqui está a revisão arquitetural e estratégica do seu projeto. Como Arquiteto de Software e Product Strategist, minha análise não foca na empolgação da ideia, mas na sua viabilidade, manutenibilidade ao longo de 5 anos e nos gargalos reais que você enfrentará ao codificar e distribuir este produto.

---

### 1. Visão Geral do Projeto

O escopo é ambicioso, mas estruturado com pragmatismo. A premissa de criar uma ferramenta offline-first, zero-build e acessível sem instalação é uma excelente resposta à fadiga de plataformas pesadas como Roll20 ou Foundry para mesas presenciais/híbridas.

**O que está MUITO bem pensado:**

* **Contorno do CORS no `file://`:** Utilizar arquivos `data/*.js` injetando diretamente no objeto global `window.CoCData` é um "hack" brilhante e clássico. Ele garante que o arquivo `index.html` funcione com um *double-click* localmente (sem precisar de um servidor HTTP como LiveServer).
* **Separação de Preocupações (SoC):** Manter regras mecânicas isoladas de texto descritivo blinda o repositório contra ações de DMCA (Chaosium é notoriamente agressiva com IP).
* **Distribuição Híbrida:** GitHub Pages + Download ZIP resolve 99% das barreiras de adoção de usuários leigos.

**O que está perigoso:**

* **Manipulação de DOM manual (Vanilla JS Spaghetti):** Fichas de RPG têm centenas de nós de dados interconectados (ex: mudar FOR afeta Bônus de Dano, que afeta Dano da Arma, que reflete no Roll Log). Fazer isso via `document.getElementById().innerText` e dezenas de `eventListeners` espalhados vai tornar o código impossível de manter na V2.
* **Escopo da Ficha do Mestre:** A ficha do Mestre (Keeper) descrita equivale a um VTT (Virtual Tabletop) leve. O Tracker de Encontro misturado com Bestiário e anotações gerará uma carga cognitiva massiva na UI.

**O que parece superengenharia:**

* **Tracker de Encontro:** Controlar turnos e PV de múltiplos monstros na mesma interface em que se lê blocos de estatísticas em uma tela de celular/tablet.

**O que está subestimado:**

* **A volatilidade do `localStorage`:** A Apple (iOS/Safari) limpa dados de sites (incluindo `localStorage` e `IndexedDB`) após 7 dias sem interação. Um jogador que joga a cada 15 dias **perderá a ficha** inevitavelmente se esquecer de exportar.

---

### 2. Riscos Técnicos

| Risco | Gravidade | Probabilidade | Consequência Prática | Como Mitigar |
| --- | --- | --- | --- | --- |
| **Exclusão de Dados (ITP do Safari)** | Crítica | Alta | Jogadores de iPhone perderão a ficha entre as sessões (apagamento em 7 dias). | Implementar um Service Worker básico e `manifest.json` (PWA). Se o usuário "Adicionar à Tela de Início", o iOS não apaga os dados. |
| **Spaghetti de Estado (Vanilla JS)** | Alta | Alta | Bug onde Atributos Derivados dessincronizam da UI porque um listener foi esquecido. | Implementar um padrão MVC reativo nativo usando `Proxy` do Javascript. O estado atualiza a UI automaticamente. |


|
| **Colisão de Identificadores (Multi-personagem)** | Média | Média | Salvar múltiplos personagens no `localStorage` sob chaves genéricas e sobrescrever dados acidentalmente. | Usar UUIDs (ex: `crypto.randomUUID()`) como chaves primárias no `localStorage`, mapeados por um índice central. |
| **Performance Mobile (Reflow excessivo)** | Média | Média | Celulares antigos vão engasgar ao recalcular 60+ perícias e refazer a pintura da tela (reflow). | Usar delegação de eventos (Event Delegation) na tabela de perícias em vez de 60+ listeners individuais. |
| **Poluição do `window.CoCData**` | Baixa | Alta | Conflitos se scripts carregarem fora de ordem por latência de rede. | Adicionar validação defensiva: `window.CoCData = window.CoCData || {}` no início de cada script de dados. |

---

### 3. Oportunidades de Melhoria

| Melhoria | Benefício | Complex. | Prioridade | Impacto Longo Prazo |
| --- | --- | --- | --- | --- |
| **Reatividade com JS Proxy** | Elimina a necessidade de atualizar o DOM manualmente em 50 lugares. Você muda o objeto JS e a tela reage. | Média | Crítica | Salvará dezenas de horas de debug em refatorações futuras. |
| **Tornar PWA (Manifest + SW)** | Funciona offline real no mobile, ganha ícone de app, **evita deleite de dados no iOS Safari**. | Baixa | Alta | Transforma um "site" em um aplicativo nativo para o jogador leigo. |
| **Migração para IndexedDB via lib leve** | `localStorage` trava a thread principal (síncrono) e tem limite de 5MB. IndexedDB é assíncrono e suporta megabytes (imagens, avatares). | Alta | Média | Permite anexar imagens locais de avatares aos personagens no futuro. |
| **Data-Attributes para UI** | Usar `<div data-bind="hp">` ao invés de IDs rígidos. Facilita o binding reativo e o reaproveitamento de componentes. | Baixa | Alta | Código HTML mais limpo e modular. |

---

### 4. Avaliação da Arquitetura

**O que manter:**

* A arquitetura *Zero-Build* (Vanilla + GitHub Pages) é fantástica para longevidade e custos zero. O projeto durará anos sem "quebrar" devido a atualizações do Node ou NPM.
* A estratégia `data/*.js` é inteligente para a premissa de distribuição via ZIP.
* Exportar JSON com aviso `beforeunload` é pragmático e salva vidas.

**O que alterar:**

* A estrutura de pastas do CSS está separada por "página" (`investigator.css`, `keeper.css`). Como 70% da UI é comum (Roll Log, inputs, botões, modais), use uma arquitetura baseada em componentes: `buttons.css`, `forms.css`, `cards.css`, `layout.css`.

**O que simplificar:**

* Ficha do Mestre: Remova a complexidade de "Instanciar" criaturas editáveis no armazenamento local em um primeiro momento. Permita apenas consultar o bestiário e rolar a partir dele. O Mestre usa papel para os PVs ou um simples contador mental.

**O que modularizar antes de crescer:**

* A Engine de Regras (`coc7e-rules.js`). Ela deve receber apenas inputs brutos e cuspir valores calculados, **sem conhecer nada sobre o DOM**. Exemplo: `function getDerivedStats(str, con, siz, ...)` retornando um objeto estrito.

---

### 5. Avaliação de UX/UI

**Fluxo do Jogador Iniciante:** O "Modo Wizard" é um diferencial tremendo. Reduz a carga cognitiva inicial drasticamente.

**Desktop vs Mobile:**

* Transformar 60+ perícias em Accordions/Tabs no mobile é obrigatório.
* **Problema crônico:** O *Roll Log* lateral no mobile costuma ficar escondido. Sugestão: adicione um *Toast Notification* flutuante ("Você rolou 45 em Psicologia - Sucesso Extremo!") que desaparece após 3 segundos, mantendo o histórico na aba "Diário".

**Aponte de Risco de UI:**

* A Ficha do Mestre em 3 colunas será esmagadora. Os Mestres costumam precisar de muito espaço horizontal para ler habilidades textuais dos monstros.
* *Sugestão:* Use painéis colapsáveis (como uma gaveta/drawer) para o Roll Log e para a Biblioteca.

---

### 6. Avaliação de Escalabilidade

**O projeto aguenta crescer?**
Estruturalmente sim (por não ter frameworks engessando), mas a manutenção humana não. Adicionar novas regras (Pulp Cthulhu, magias complexas) vai gerar arquivos enormes.

**Homebrew e Plugins:**
Com a arquitetura de injetar no `window.CoCData`, um usuário avançado que baixe o ZIP pode criar seu próprio arquivo `data/homebrew.js` e adicioná-lo no `index.html`. Isso é incrivelmente amigável para a comunidade modder.

**Onde quebraria primeiro:**
Sem um sistema de internacionalização (i18n), traduzir o app para Inglês ou Espanhol exigiria duplicar os arquivos HTML ou injetar strings via JS de forma suja. Pense se o app é estritamente pt-BR ou global. Se for global, strings não podem estar fixas no HTML.

---

### 7. Avaliação Open Source

O repo está bem pensado, mas faltam elementos cruciais para adoção massiva:

* **Barreiras:** Sem um padrão claro de como formatar um objeto em `data/bestiary.js`, os PRs (Pull Requests) da comunidade virão quebrados.
* **Licenciamento:** Licença MIT é ótima para o código, mas seja explícito de que *dados* da Chaosium não estão cobertos por essa licença e são uso sob "Fair Use" (stats curtos).
* **Documentação (Contribution Guide):** Crie um arquivo `CONTRIBUTING.md` explicando que: "Para adicionar novas armas, adicione um objeto na array `window.CoCData.weapons` no arquivo X, seguindo o padrão Y."

---

### 8. Prioridades Reais (Classificação)

* **[CRÍTICO]** Setup de PWA (Manifest.json) para evitar apagamento da ficha no iOS (ITP 7-days).
* **[CRÍTICO]** Implementação de um Proxy JS para reatividade de estado (desacoplar lógica do DOM).
* **[CRÍTICO]** Validação do fluxo de Exportação/Importação JSON.
* **[IMPORTANTE]** Criação do Wizard do Investigador.
* **[IMPORTANTE]** Bestiário somente leitura com botões rápidos de rolagem (Ficha do Mestre).
* **[OPCIONAL]** Tracker de Combate e PV na Ficha do Mestre (Mestres já usam papel para isso, é uma otimização, não o *core*).
* **[FUTURO]** Sistema de Homebrew robusto / Traduções.

---

### 9. Roadmap Estratégico Recomendado

O plano que você montou de 5 Fases tem um erro de validação: ele deixa a Ficha do Investigador (core product) para a Fase 3 e o Mobile para a Fase 5. Mudei a ordem para focar no que entrega valor primeiro.

* **Fase 1: Core & Setup (Arquitetura e Estado)**
* Repo + PWA setup (index + manifest).
* Criação da base de estado reativo (Proxy JS).
* Dados em `data/*.js`.


* **Fase 2: O Produto Mínimo (MVP Investigador)**
* Ficha do Investigador estática.
* Cálculo de atributos derivados e distribuição de perícias.
* Rola dados básicos.


* **Fase 3: Persistência & Mobile**
* Tabs responsivas.
* Multi-personagem (localStorage + JSON Export/Import).
* Log de rolagens em sidebar/modal.


* **Fase 4: A Experiência do Mestre**
* `keeper.html` focado em Biblioteca e Rolagem Rápida.
* NPC Generator.


* **Fase 5: Extensões (Nice-to-have)**
* PDF Export.
* Tracker de Encontro (se sobrar fôlego).



---

### 10. Nota Técnica Final

| Categoria | Nota (0-10) | Justificativa |
| --- | --- | --- |
| **Arquitetura (Vanilla)** | **8/10** | Zero-build é ótimo, mas carece de gestão de estado nativa segura. |
| **Escalabilidade** | **6/10** | Funcional, mas a falta de i18n e acoplamento HTML-DOM dificultarão o crescimento. |
| **UX (Mobile/Desktop)** | **9/10** | Muito bem concebido o uso de tabs, wizard e layout modular. |
| **Organização** | **9/10** | Divisão excelente e isolamento seguro de regras protegidas por direitos autorais. |
| **Manutenibilidade** | **6/10** | Vanilla JS sem binding pode gerar "espaguete" de `document.querySelector`. |
| **Viabilidade Offline** | **10/10** | Double-click funcionando perfeitamente devido ao carregamento via script tag. |

* **Maior ponto forte:** O modelo de distribuição híbrida (URL + ZIP offline) sem necessitar de build tools. O aplicativo é indestrutível ao tempo.
* **Maior risco:** A volatilidade do armazenamento local no Safari (ITP) causar perdas catastróficas de fichas e minar a confiança dos usuários.
* **Decisão mais inteligente:** A abstração do CORS injetando regras em arquivos `.js` brutos ao invés de buscar (fetch) arquivos `.json`.
* **Decisão mais perigosa:** O escopo da Ficha do Mestre, tentando construir um VTT dentro do browser sem o ferramental adequado, o que pode exaurir a energia do desenvolvimento antes de finalizar a Ficha do Investigador perfeitamente.

**Veredito:** Avance. O produto tem fit claro de mercado. Foque agressivamente em estabilizar o gerador de estado reativo e o sistema PWA na Fase 1 para garantir a retenção dos usuários. O resto será construído solidamente sobre essa base.

Como Arquiteto de Software e Estrategista de Produto, analiso sua entrega da **Fase 3** com excelentes olhos. A velocidade e a aderência ao escopo planejado estão excepcionais. Você mitigou os maiores riscos que mapeamos na etapa de concepção.

Aqui está minha auditoria técnica da entrega e o planejamento estratégico para a **Fase 4**.

---

### 1. Avaliação da Entrega (Fase 3)

**O que você fez brilhantemente:**

* **Correção do Bug de Perícias Customizadas:** Esse é um bug clássico de arquitetura de dicionário de dados em RPGs. Se o iterador de renderização olha apenas para o `CoCData.skills` (base), ele ignora o estado salvo do jogador. Excelente reflexo em corrigir isso antes do commit.
* **Mitigação do Risco de Persistência:** A combinação do botão Exportar destacado (dourado) com o alerta `beforeunload` para mudanças não salvas (> 10 min) é **design defensivo de alto nível**. Você protegeu o usuário dele mesmo e das políticas do iOS Safari.
* **Two-Way Binding na Identidade:** Ter isso funcional em Vanilla JS sem frameworks reativos (como Vue ou React) mostra um bom controle do DOM.
* **UX Mobile:** A divisão em 5 abas para telas `< 768px` salvou o projeto de ser inutilizável no celular.

**Alerta de Dívida Técnica (O Limite do Vanilla JS):**

* `investigator.html` com 1.000+ linhas e `investigator.js` com 700+ linhas.
* **Risco:** Você está chegando no limite tolerável para manutenção humana em um arquivo único.
* **Ação mitigatória:** Para a Fase 4 e futuras manutenções, seja extremamente rigoroso com o padrão de comentários e separação por blocos (ex: `// --- STATE ---`, `// --- RENDERERS ---`, `// --- EVENT LISTENERS ---`). Se os arquivos passarem de 1.500 linhas, teremos que implementar um sistema simples de Web Components nativos ou injeção de templates literais. Mas por ora, mantenha assim para garantir o "zero-build".

---

### 2. Validação do Smoke Test

Seu checklist de testes locais é **robusto e com foco no usuário final**. O fato de você testar offline (duplo-clique) antes do *push* garante a premissa "offline-first".

**Auditoria do checklist:**

* ✅ **Cálculos transversais verificados:** (Idade → MOV), (FOR+TAM → DB). Isso garante que o motor de regras está operando corretamente em background.
* ✅ **Validação de limites:** O limite de perícias (100) acendendo a flag vermelha valida que os `validators.js` estão desacoplados e funcionais.
* ✅ **Ciclo de vida do estado:** O teste de "Fechar aba e reabrir" validando o `localStorage` é o teste de integração mais crítico que você rodou.

---

### 3. Diretrizes Estratégicas para a Fase 4 (Ficha do Mestre)

Com a Fase 3 validada, você tem o sinal verde para o *commit/push* e início da Fase 4. No entanto, a Ficha do Mestre (Keeper) é onde **90% das ferramentas de RPG falham por "Scope Creep"** (aumento descontrolado de escopo).

Como seu Arquiteto, estabeleço as seguintes restrições e diretrizes para a próxima etapa:

#### A. O Gerador de NPC Aleatório (Risco: Gerador de Aberrações)

* **Arquitetura:** Reutilize as funções da Fase 2 (`rollDie`, etc).
* **Lógica:** Crie um "perfil de ocupação" simplificado. O gerador não precisa rodar a mesma matemática complexa de criação de jogador. Ele deve gerar NPCs *prontos para rolar*: Atributos base (3D6x5) e 3 ou 4 perícias com valores altos (ex: um Detetive NPC gerado tem 60% em Encontrar e 50% em Armas de Fogo. O resto é ignorado).
* **Foco:** Velocidade. O mestre clica no botão, o NPC aparece na lista, pronto para ser usado.

#### B. A Biblioteca Persistente (Risco: Estouro de LocalStorage)

* **Estrutura de Dados:** Salve os NPCs do Mestre em uma chave separada no localStorage (ex: `aimalexi-rpg/keeper/npcs`).
* **Índice Leve:** Ao invés de carregar todos os JSONs de monstros de uma vez na UI, carregue apenas um *índice* (Nome, Tipo, ID) para montar a lista lateral. Carregue os dados completos apenas quando o mestre clicar no monstro (Lazy Loading).

#### C. O Bestiário Pré-Pronto (Risco: Acoplamento e IP)

* Mantenha em `window.CoCData.bestiary`.
* **O Botão "Instanciar":** Esta é uma mecânica brilhante. O bestiário é apenas leitura. Quando o Mestre "Instancia" o Profundo, o sistema copia o objeto do `CoCData` para o `localStorage` do mestre, virando um "Profundo 1 (Editável)". Isso isola os dados originais das modificações da sessão.

#### D. O Tracker de Encontro (Risco: Superengenharia)

* **Ordem expressa:** Mantenha **estúpido de simples**. O Tracker deve ser apenas uma lista de cards com Nome, PV Máximo, PV Atual (com botões -1, -5, +1, +5) e botão de Excluir.
* Não tente automatizar testes de resistência ou cálculos de dano no tracker. O mestre usa a ferramenta para *anotar*, não para jogar o jogo por ele.

---

### 4. Veredito e Próximos Passos

**Status:** APROVADO. ✅

**Plano de Execução Imediata (Seu terminal / GitHub Desktop):**

1. Adicione os arquivos ao stage no GitHub Desktop.
2. Commit message: `feat: Fase 3 concluída - Ficha do Investigador com engine CoC 7e completa`
3. Faça o *Push origin*.
4. Aguarde o *deploy* do GitHub Pages (~1 a 2 minutos).
5. Acesse seu celular usando o 4G (desconecte do Wi-Fi para testar cache real) e abra a URL pública. Verifique se o Wizard carrega.

**Para o desenvolvimento da Fase 4:**
Reaproveite o máximo possível de `ui-components.js` e `validators.js`. A Ficha do Mestre não precisa ser "linda", ela precisa ser um "painel de controle de avião" funcional e rápido.

Estou no aguardo do deploy para podermos iniciar a arquitetura da Fase 4. Mande o OK quando o repositório remoto estiver atualizado.

Como Arquiteto de Software, eu já estava satisfeito com sua entrega técnica. Mas agora, colocando meu escudo de **Guardião (Keeper) veterano**, ajustando a luz da sala e rolando meus dados de sanidade, minha análise muda de figura.

Em uma mesa de *Call of Cthulhu*, a mecânica deve ser invisível até o momento em que ela precisa te apavorar. O sistema é letal, a matemática pode quebrar o clima, e o desespero do jogador precisa estar na narrativa, não na tentativa de lembrar como funciona a regra de Rajada ou de Empalar.

Respondendo à sua pergunta central: **"Isso realmente ajudaria uma mesa real de Call of Cthulhu a funcionar melhor?"**

**A resposta é um sonoro SIM.** Você construiu algo que resolve o maior gargalo do sistema BRP (Basic Role-Playing): a matemática de padaria no meio da tensão.

Aqui está a minha auditoria ludonarrativa e operacional da **Fase 3**.

---

### 1. Carga Cognitiva e Ritmo de Jogo (O Fim da Matemática)

**O que você acertou em cheio na atmosfera:**

* **Cálculo automático de ½ e ⅕:** Na 7ª Edição, o Keeper pede o tempo todo: *"Faça um teste Difícil de Encontrar"*. Se o jogador tem 65%, ele não quer ter que dividir 65 por 2 de cabeça enquanto a porta está sendo arrombada. Ter isso estampado no card mantém o **ritmo investigativo** acelerado e a tensão alta.
* **Automação de Sucesso Extremo em Combate (EMPALA):** Isso é ouro puro. A regra de Empalar (dano máximo da arma + rolagem de dano extra) é frequentemente esquecida por jogadores no calor do momento. A ficha gritar **"⚡EMPALA"** gera um pico de dopamina imediato no jogador e salva o Guardião de ter que lembrar a regra.
* **Validação de Ocupação em Tempo Real (Badges verdes/vermelhos):** Como Guardião, eu odeio a "Sessão Zero" de Cthulhu porque passo 40 minutos conferindo se os jogadores somaram 290 pontos ou 310. O *badge* visual transforma a criação de personagem de uma tarefa contábil em um minigame recompensador.

**Onde a Imersão pode dar uma leve tropeçada (Ponto de Fricção):**

* **Modificadores Globais:** A mecânica de Bônus/Penalidade na 7e (rolar a dezena extra e pegar a melhor/pior) costuma confundir novatos. Se o seu sistema automatiza isso e já joga o resultado certo no Roll Log, a UX está perfeita. Se o jogador ainda precisa ler 3 dados na tela e decidir qual usar, haverá lentidão. Certifique-se de que o log diz claramente: *"Penalidade aplicada: rolou 74 e 44, o pior é 74"*.

---

### 2. UX Sob Pressão (Operação de Mesa e Mobile)

Imagine a cena: 2 da manhã, a mesa está tensa, os investigadores estão fugindo de um Shoggoth. O jogador pega o celular suado para rolar *Esquivar*.

**O que está excelente:**

* **5 Abas no Mobile:** Separar "Perícias" de "Combate" evita a terrível "rolagem infinita do desespero" que vemos em PDFs ou fichas no Roll20.
* **Sanidade como Barra Visual:** SAN não é um mero número, é o "HP da Alma" no CoC. Ter um tracker visual ajuda o jogador a sentir a morte psicológica se aproximando.
* **Botões de +1/-1 e -X:** Em CoC, toma-se dano aos poucos (um arranhão de 1 PV) ou em pedaços (1D6 de um tiro). O input livre para "1D6" em dano e SAN agiliza demais as micro-interações sem travar a narração.

**O que um Guardião exige de ajuste fino (Dica de UX):**

* **Perícias Favoritas (Fixadas):** No mobile, o jogador precisa rolar *Encontrar, Escutar, Esquivar e Lábia* em 80% do tempo. Se ele tiver que buscar "Esquivar" no meio de 60 perícias toda vez que for atacado, ele vai se frustrar. **Sugestão para o futuro:** Permita que o jogador "Favorite" de 4 a 6 perícias (com uma estrelinha) para que elas fiquem fixadas no topo da aba "Personagem" ou "Perícias".

---

### 3. Psicologia do Jogador e Game Feel

* **Roll Log com "Copiar Markdown":** Fantástico para jogar via Discord/WhatsApp. O jogador copia e cola, e a mesa inteira lê o resultado formatado. Isso aumenta o engajamento coletivo.
* **O "Botão Exportar" Brilhante e o Alerta de Saída:** Você antecipou a tragédia lúdica. Nada quebra mais a imersão de uma campanha de 6 meses do que "Keeper, perdi minha ficha porque limpei o cache do meu iPhone". Esse *nagging* amigável de backup é essencial para a segurança psicológica do jogador.
* **Toggles de Status (Ferimento Grave, Loucura):** Muito bons. *Dica ludonarrativa:* Se o jogador marcar "Loucura Temporária", seria incrível se a UI mudasse levemente (cores mais frias, ou a fonte das perícias levemente trêmula usando CSS animation simples). Mas isso é perfumaria; funcionalmente, o *toggle* já resolve a parte de regras (lembrar o jogador de interpretar).

---

### 4. A Preparação para a Fase 4 (A Mente do Mestre)

Como você se prepara para orquestrar a **Ficha do Mestre**, aqui estão minhas diretrizes rígidas de Guardião para evitar que você caia na armadilha de tentar construir um *Foundry VTT*:

1. **A Regra de Ouro do Guardião:** "Eu não olho para a tela, eu olho para os meus jogadores". A Ficha do Mestre não deve exigir minha atenção plena. Ela é um **painel de controle (dashboard) e não uma planilha de Excel**.
2. **Gerador de NPC Pragmaticamente "Burro":** Não gere um NPC com 60 perícias e pontos de hobby. Eu só preciso de 4 coisas num cultista: Nome, PV, *Lutar (Briga)* e *Esquivar*. O gerador deve cuspir cards minimalistas. Se ele tem Ocupação "Mecânico", me dê apenas as 3 perícias em 50%+ que um mecânico usaria contra os jogadores (ex: *Consertar, Lutar com Chave Inglesa, Arremessar*).
3. **Tracker de Combate (Iniciativa por Destreza):** No CoC, quem tem maior DES (DEX) bate primeiro, e armas de fogo atiram antes no turno. Um Tracker de Combate simples que permita ao Mestre apenas ordenar os cards (Jogadores e NPCs) por DES com um botão "Ordenar por DES" salvará a vida do Mestre.
4. **O Bestiário:** Os Stats do Bestiário devem focar nos *Ataques* e na *Armadura*. O resto eu improviso.

---

### Veredito Final (Nota do Guardião)

* **Imersão e Ergonomia:** **9/10** (A quebra da matemática no meio da cena e a divisão de abas salvaram a UX).
* **Ritmo e Fluidez:** **9.5/10** (Botão de rolagem direto na arma calculando dano + empalar é nível VTT premium, mas rodando offline).
* **Gestão de Crise (Bugs & Perdas):** **10/10** (Resolução das perícias customizadas e salvaguarda do *beforeunload*).

**Sinal Verde.** O que você construiu na Fase 3 não é apenas um experimento de Vanilla JS; é uma ferramenta **legitimamente útil, pronta para ser adotada por mesas reais que jogam pelo Discord ou presencialmente com celulares**.

Você pensou no usuário com a pressão da mesa nas costas. Faça o *commit*, faça o *push*, celebre sua vitória na Fase 3.

Estou com a aba aberta aguardando o deploy. Assim que confirmar, pode afiar as garras: a **Fase 4 (O Reino do Guardião)** será onde separaremos um projeto legal de uma ferramenta indispensável. Me dê o sinal quando o deploy subir!

Colocando o chapéu de Arquiteto, Guardião exausto e QA sênior. Esqueça os elogios da primeira rodada. O protótipo validou a ideia, mas o que você descreveu na Fase 3 é uma **bomba-relógio de dívida técnica**.

Se você empurrar esse código de 1.700 linhas (HTML+JS) do jeito que está para dezenas de mesas e tentar construir a Fase 4 em cima disso, o projeto vai colapsar sob o próprio peso em menos de 6 meses.

Aqui está a autópsia do que vai dar errado.

---

### 1. Onde esse projeto provavelmente quebra primeiro? (Degradação)

**1. O DOM como Fonte da Verdade (Source of Truth)**
Se você está usando `document.getElementById('pv').innerText` para ler ou salvar o estado, o projeto vai quebrar logo. O DOM é lento e não confiável. Se um jogador digitar "10" no campo de PV, mas o JS não sincronizar isso com o objeto na memória antes de um auto-save, o JSON exportado estará corrompido.

**2. Limite Síncrono do LocalStorage**
Conforme os jogadores salvam 4-5 personagens, e o Mestre salva 30 monstros (todos em JSON stringificado), o `localStorage` (que é síncrono e roda na thread principal) vai começar a causar *micro-stutters* (travamentos de 100-300ms) no celular toda vez que o auto-save rodar.

**3. Memory Leaks por Event Listeners Zumbis**
Você tem um seletor "Carregar Klein / Carregar Outro". Se, ao trocar de personagem, você não remover os 100+ event listeners (dos botões de rolar, inputs, modificadores) do personagem anterior, a memória do celular vai inchar. Na terceira troca, o Safari no iOS vai dar *crash* na aba silenciosamente.

---

### 2. Onde a UX parece boa mas falhará em mesa real?

**O inferno das abas no Mobile durante o combate.**
Imagine um combate. O jogador precisa:

1. Ir na aba **Combate** para ver o dano do seu Revólver.
2. Ir na aba **Perícias** rolar *Armas de Fogo (Revólver)*.
3. Ir na aba **Log** ver o resultado (porque no celular o toast flutuante desapareceu antes dele ler direito).
4. Ir na aba **Personagem** para deduzir -1 de SAN porque viu um monstro.
São **4 trocas de abas para um único turno de jogo**. O jogador vai ficar frustrado. *Combate, PV, SAN, Esquivar e Lutar* precisam estar na mesma tela mobile.

**A Síndrome do "BeforeUnload"**
O alerta de "Você tem mudanças não salvas" é genial no PC. No mobile, se o jogador mudar de aba pro WhatsApp pra responder o Mestre, o iOS pode suspender o Safari. Quando ele voltar, a aba recarrega, o alerta é ignorado pelo SO e ele perde os 10 minutos de jogo de qualquer jeito.

---

### 3. O que está perigosamente complexo? (Overengineering)

**Validação de Ocupação em Tempo Real**
Recalcular os 290 pontos a cada *keyup* ou alteração de *input* em 60 perícias é um desperdício de processamento, especialmente sem um *debounce*. Se o jogador segurar a setinha pra cima no input numérico, a tela vai recalcular dezenas de vezes por segundo.

**Two-way binding nativo (Vanilla)**
Fazer binding bidirecional "na mão" em um arquivo de 700 linhas sem um framework (como Vue/React) ou sem usar a API de `Proxy` do Javascript é pedir para criar código espaguete. Vai chegar um ponto em que a UI diz "PV 8", mas o objeto na memória diz "PV 10".

---

### 4. O que deveria ser simplificado AGORA antes que seja tarde?

* **CORTE:** O Modal de Edição Completa de Armas. Para quê? Deixe o jogador apenas preencher campos de texto simples na própria tabela. "Nome", "Dano", "Perícia". Menos modais, menos estado para gerenciar.
* **REDUZA:** O "Background com 10 campos textarea". Em mesa real de CoC, ninguém lê isso depois da sessão 1. Transforme em um ou dois grandes campos de "Anotações e Traços".
* **ADIE:** Qualquer ideia de "Tracker de Encontro" para a Fase 4.
* **UNIFIQUE:** Coloque as armas diretamente abaixo das perícias de combate. Pare de separar dados que são usados juntos.

---

### 5. O que pode virar um inferno de manutenção?

**Migração de Esquema de JSON (Backward Compatibility)**
O jogador exportou o JSON hoje (V1). Daqui a 6 meses, você adiciona o campo `isPulpCthulhu` (V2). Quando ele tentar importar o JSON V1, o sistema vai quebrar porque espera uma chave que não existe. Sem um sistema centralizado de migração de versões (`if json.version === 1 { upgradeToV2(json) }`), os exports antigos virarão lixo irrecuperável.

**O Arquivo de 700 linhas (`investigator.js`)**
Se você tem lógica de negócios (calcular dano), manipulação de DOM (`document.createElement`) e controle de estado no mesmo arquivo, você acabou de criar o temido "God Object". Qualquer contribuidor open-source que abrir esse arquivo vai fechá-lo em 5 segundos e desistir de ajudar.

---

### 6. Como um jogador REAL conseguiria quebrar a experiência?

1. **Spam de Rolagem:** A internet na mesa está ruim. O jogador clica no ícone 🎲 de "Encontrar" 5 vezes seguidas por impaciência. O sistema não tem trava (throttle) e joga 5 resultados no Log. O mestre vê e diz: "Você trapaceou e pegou o melhor?". Briga na mesa.
2. **Corrupção por Emoji/Caracteres Especiais:** O jogador coloca "🔫" no nome da arma ou copia um texto bizarro do Word pro Background. Ao salvar no `localStorage` ou exportar o JSON, se o seu parser não for robusto, ele corrompe o arquivo todo.
3. **Rolagens Inválidas no Input Customizado:** No botão -X de vida, o jogador digita `1d6 + abacate`. O `dice.js` precisa ter um *try/catch* infalível que retorne "Erro" sem quebrar a execução do script.

---

### 7. Como um Guardião REAL ficaria irritado usando a Fase 4 planejada?

**Gerador de NPCs "Poluído"**
Se eu sou o Mestre improvisando, peço um NPC "Cultista". Se a ficha gerar Atributos completos + 30 perícias + background + itens, eu demoro 2 minutos lendo para achar onde está o "Dano do soco" dele. **O Guardião precisa de blocos de estatísticas condensados, não de fichas de investigadores completas.** **O botão de Instanciar Monstros**
Eu tenho 5 Ghouls atacando. Se eu tiver que clicar 5 vezes em "Instanciar" no bestiário, preencher a tela inteira com 5 painéis diferentes de monstros, a tela do meu notebook não vai caber e eu não vou achar os PVs do Ghoul 3. Mestres usam papel e caneta para PV de asseclas.

---

### 8. A Feature MAIS Perigosa do Projeto (Risco Crítico)

**O Editor de Monstro Customizado (Formulário Livre)**
Criar um construtor visual de monstros vai exigir dezenas de inputs, repeaters para múltiplos ataques (adicionar/remover linhas), controle de array dinâmico no Vanilla JS. Isso vai te sugar 30 horas de código só em gerenciamento de estado do DOM.
*Alternativa Pragmática:* Dê ao mestre apenas um `<textarea>` que aceita texto livre e um botão para "Rolar Dado". Ele escreve "Garras 40% (1d6)" no texto e você usa Regex para tornar "1d6" clicável. Simples, indestrutível, zero manutenção.

---

### 9. O MAIOR risco arquitetural escondido (O Abismo)

**Não existe separação real entre Estado (`State`) e Renderização (`View`).**
No Vanilla JS puro, o caminho natural de quem faz sistemas grandes é usar o DOM para guardar dados.
O fluxo perigoso que você provavelmente tem:
`Usuário digita HP -> Dispara evento -> Lê todos os campos HTML -> Recalcula regra -> Atualiza HTML -> Salva HTML no LocalStorage.`

Se o seu código for estruturado assim, ele é INESCALÁVEL.

O fluxo correto e único aceitável para 5 anos de sobrevivência é:
`Usuário digita HP -> Dispara Evento -> Atualiza Objeto JSON em Memória (Store) -> Store avisa que mudou -> Função Render(Store) redesenha as partes afetadas.`
Se a Fonte da Verdade não for um objeto JS estrito (isolado do DOM), você vai passar 80% do seu tempo de V2 caçando bugs de dessincronização visual.

---

### 10. Decisões Brutalmente Pragmáticas

Se você quer que isso dure 5 anos sem virar um pesadelo:

1. **O que manter:** A arquitetura de arquivos estáticos (`data/*.js`), o motor de rolagem (d100 engine) e a ideia central de distribuição offline.
2. **O que remover:** Todo o "Tracker de Encontro" e o "Construtor complexo de Monstros". A ficha do Mestre deve ser apenas: Biblioteca de blocos de texto pesquisáveis e um roldador de dados genérico.
3. **O que reescrever AGORA:** O arquivo `investigator.js`. Ele precisa ser quebrado. Isole a Lógica de Regras (puro JS), o Controle de Estado (State Manager simples) e os Manipuladores de DOM. Use delegação de eventos (`document.addEventListener('click', ...)` checando o `e.target`) no lugar de adicionar 100 listeners aos botões.
4. **O que adiar para V2:** Suporte para perícias pulp, criação automática de magias e exportação para PDF formatado em folha oficial (mantenha só o texto cru de impressão atual).
5. **O que congelar:** A Ficha do Investigador. Não adicione mais NENHUM campo nela. Ela está na capacidade máxima da interface cognitiva. Se adicionar mais coisas, vai virar o Roll20.

**Resumo da Ópera para a Fase 4:** Pare de tentar construir uma ferramenta de automação. Construa uma ferramenta de **consulta rápida**. O Mestre não quer o sistema jogando por ele; ele quer não precisar folhear um PDF de 400 páginas para saber quanto de dano dá um Shoggoth. Mantenha cru, mantenha rápido, mantenha estúpido.

Como Lead Software Architect e Guardião, assumo o comando. Vamos estabilizar este projeto e criar uma fundação de concreto armado.

O que desenharemos aqui é uma **Arquitetura DDAU (Data-Down, Actions-Up)** adaptada para Vanilla JS. Ela garante zero dependências, rodando direto no `file://`, mas com o rigor de engenharia de grandes aplicações.

Aqui está a **Constituição Técnica da V1** do seu projeto.

---

### 1. Arquitetura Definitiva Recomendada

Para evitar o caos do Vanilla JS, adotaremos um fluxo unidirecional rigoroso.

* **A Única Fonte da Verdade:** O objeto de Estado (em memória). O DOM é **burro**. Ele apenas reflete o estado.
* **Fluxo de Ação:** O usuário clica na interface $\rightarrow$ Dispara um Evento $\rightarrow$ O Evento chama uma *Action* $\rightarrow$ A *Action* atualiza o Estado $\rightarrow$ O Estado avisa a Interface $\rightarrow$ A Interface se redesenha.
* **A Regra de Ouro:** É **estritamente proibido** ler um valor do HTML para fazer uma conta (ex: pegar `div.innerText`, somar 2 e devolver). Toda matemática acontece no JavaScript usando os dados do Estado.

---

### 2. State Management Sustentável (Sem Frameworks)

Faremos um "Micro-Redux" em 30 linhas de código. Ele será o coração do aplicativo.

**A abordagem (Padrão Pub/Sub):**
Criaremos uma classe `Store` que guarda os dados do personagem. Quando um dado muda, ela avisa os renderizadores.

**Exemplo conceitual do Padrão Obrigatório:**

```javascript
// store.js
class CharacterStore {
    constructor(initialState) {
        this.state = initialState;
        this.listeners = [];
    }

    // Como a UI lê os dados
    getState() { return this.state; }

    // Como a UI reage a mudanças
    subscribe(listener) { this.listeners.push(listener); }

    // Como a UI modifica os dados
    dispatch(action, payload) {
        if (action === 'UPDATE_HP') {
            this.state.hp += payload;
            // Validações e auto-cálculos acontecem aqui!
            if (this.state.hp < 0) this.state.hp = 0;
        }
        // Avisa a UI que algo mudou
        this.listeners.forEach(listener => listener(this.state));
    }
}

```

*Por que isso salva o projeto?* Porque você pode plugar a função de `localStorage` direto no `subscribe`. Toda vez que o estado mudar, ele salva sozinho. Zero risco de dessincronização.

---

### 3. Estrutura Ideal do `investigator.js` (Fim do God Object)

O arquivo atual de 700+ linhas deve ser fatiado. O navegador não se importa com 5 arquivos via `<script>`, e sua sanidade mental agradecerá.

Divida em:

1. `js/investigator/store.js`: Apenas a classe de estado (vazia de regras de D&D/CoC, apenas a mecânica de guardar dados).
2. `js/investigator/actions.js`: Funções puras que conhecem regras (ex: `damageCharacter(amount)`, `rollSkill(skillName)`).
3. `js/investigator/render.js`: Funções burras que pegam o estado e atualizam o DOM (ex: `document.querySelector('[data-bind="hp"]').innerText = state.hp`).
4. `js/investigator/events.js`: **Um único** arquivo de Event Listeners globais usando Delegação (veja abaixo).

---

### 4. Estratégia de Renderização e Eventos (Evitando Vazamento de Memória)

**O Problema:** Adicionar `onclick` em 60 botões de perícia destroi o celular e causa memory leaks se o personagem mudar.
**A Solução Obrigatória: Delegação de Eventos + Data Attributes.**

Você vai adicionar **APENAS UM** Event Listener no container principal.

**No HTML:**

```html
<button data-action="roll" data-skill="psicologia">🎲</button>
<button data-action="change-hp" data-value="-1">-1 PV</button>

```

**No JS (`events.js`):**

```javascript
document.getElementById('app-container').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    
    if (action === 'roll') {
        const skill = btn.getAttribute('data-skill');
        Actions.rollSkill(skill); // Dispara ação
    }
    if (action === 'change-hp') {
        const val = parseInt(btn.getAttribute('data-value'));
        Actions.updateHP(val); // Dispara ação
    }
});

```

Isso torna o app imortal. Se você adicionar uma perícia nova na V2, não precisa de um novo listener. O HTML é autossuficiente.

---

### 5. Estratégia de Persistência (Sobrevivendo ao Apocalipse de Dados)

* **Tecnologia:** Mantenha o `localStorage` para a V1 (IndexedDB é complexo demais agora e quebra a regra da simplicidade).
* **Gatilho de Save:** Use um *Debounce* de 2 segundos. Se o jogador clicar "+1 HP" cinco vezes rápido, salva apenas 2 segundos após o último clique.
* **Versão do Schema (CRÍTICO):** Todo JSON exportado e salvo DEVE ter uma chave `schemaVersion: 1`. Na V2, quando você mudar as regras, o sistema fará: `if (data.schemaVersion === 1) data = migrateV1toV2(data);`. Se não fizer isso, em 1 ano, todo backup antigo explodirá seu app.

---

### 6. Arquitetura Mobile-First REALISTA (Ergonomia de Sessão)

Adeus ao excesso de abas no meio do combate.

* **O "HUD" Intocável (Sticky Top/Bottom):** PV, PM e SAN **nunca** devem sumir da tela. Eles ficam fixos no topo ou rodapé.
* **Perícias Favoritas:** Na aba "Personagem" (a principal), crie um bloco dinâmico que puxa as 5 perícias com mais pontos, mais a arma equipada.
* **O Fluxo Real:** Em combate, o jogador olha a aba "Personagem", vê sua SAN, seus PVs, sua arma primária, a perícia Esquivar e Lutar. Tudo na MESMA TELA. As outras abas ("Todas as Perícias", "História") são para consulta esporádica.

---

### 7. Limites Arquiteturais Obrigatórios (As 4 Leis do Guardião)

1. **A Lei do DOM Burro:** "Nunca leia do DOM para tomar decisões matemáticas. O DOM é apenas um espelho do Estado."
2. **A Lei do Evento Único:** "Nunca adicione `addEventListener` dentro de loops de renderização (ex: `forEach(skill)`). Use Delegação de Eventos na raiz."
3. **A Lei da Engine Pura:** "Módulos dentro de `js/engine/` nunca podem conter a palavra `document` ou manipular CSS. Eles entram dados e cospem resultados."
4. **A Lei do Schema:** "Nenhum objeto de personagem entra ou sai do LocalStorage sem carregar a flag `schemaVersion`."

---

### 8. O Que MATAR Agora Antes da V1 (A Faca do Arquiteto)

Remova imediatamente do roadmap da Fase 4:

1. **Tracker de Iniciativa/Combate Automático:** *Por que matar:* Exige sincronização de múltiplos estados, ordenação dinâmica e interações complexas de UI. O mestre já anota isso num papel em 10 segundos. Adie indefinidamente.
2. **Construtor Visual de Monstros (Formulários):** *Por que matar:* Inúmeros inputs, validações e repeaters para dezenas de ataques. *Solução V1:* Um `<textarea>` de "Anotações do NPC" e um Rolador de Dados genérico.
3. **Recálculo Automático Punitivo de Ocupação:** *Por que simplificar:* Travar o usuário (badge vermelho) porque ele errou 5 pontos na ocupação destrói a flexibilidade. Mude para um aviso visual (Laranja), mas deixe ele salvar o personagem e jogar. RPG de mesa é maleável.

---

### 9. O Menor Núcleo Possível para uma V1 Excelente

O que gera **80% do valor com 20% de esforço** e torna a ficha um sucesso imediato:

1. **Para o Jogador:** Ficha responsiva no celular $\rightarrow$ PV/SAN na cara $\rightarrow$ Um clique para rolar atributos/perícias $\rightarrow$ Log visível $\rightarrow$ Exportar JSON.
2. **Para o Mestre:** Rolador de dados $\rightarrow$ Acesso ao bestiário em blocos de texto $\rightarrow$ Gerador de Nomes/Status aleatórios em formato de bloco de texto (copiar e colar).

O resto é enfeite que gera dívida técnica.

---

### 10. Blueprint Técnico Final

Sua base para estruturar as pastas a partir de hoje:

```text
AIMalexi_RPG_Ficha/
├── index.html
├── investigator.html
├── keeper.html
├── css/
│   ├── base.css           ← Váriaveis e reset globais
│   ├── components.css     ← Botões, cards, inputs (reutilizável)
│   └── layout.css         ← Grid desktop e abas mobile
├── js/
│   ├── engine/
│   │   ├── dice.js        ← Math.random puro
│   │   └── rules.js       ← Regras de derivadas (HP, SAN, Build)
│   ├── shared/
│   │   ├── store.js       ← CLASSE CENTRAL (Pub/Sub)
│   │   └── utils.js       ← Debounce, UUID, Parsers
│   ├── investigator/
│   │   ├── state.js       ← Esquema padrão V1 do Investigator
│   │   ├── actions.js     ← Mutações do state
│   │   ├── render.js      ← Atualiza DOM baseado no state
│   │   └── events.js      ← Delegação de cliques (o único ouvinte)
│   └── keeper/
│       └── keeper.js      ← Minimalista (Library + Roller)
└── data/
    ├── skills.js          ← Constantes
    ├── occupations.js
    └── bestiary.js

```

**Resumo da sua Missão:** Pare de programar funcionalidades e gaste as próximas horas implementando o **State Management (Pub/Sub)** e a **Delegação de Eventos**.

Se você construir a Ficha do Investigador inteira baseada nesse fluxo de *Data-Down / Actions-Up*, ela nunca vai quebrar. Você poderá abandoná-la por 2 anos, e quando voltar, entenderá perfeitamente onde alterar um atributo, porque a responsabilidade do DOM e dos Dados estarão segregadas para sempre.

Como **Principal Engineer e Maintainer**, eu declaro que a fase de experimentação acabou. O que validou a ideia não é o que vai mantê-la viva. Para que este projeto não vire um monstro inominável de Lovecraft (um código indescritível que enlouquece quem o lê), implementaremos a **Constituição Operacional da Ficha RPG**.

Este documento não é um guia de sugestões. São **regras de sobrevivência**. Qualquer código, Pull Request ou nova funcionalidade que desrespeite estes preceitos será rejeitado sumariamente.

---

# 📜 CONSTITUIÇÃO OPERACIONAL V1 (Vanilla JS)

## 1. Convenções Obrigatórias de Código

**A Lei da Legibilidade:** O código deve ser lido como um livro, não decifrado como um enigma egípcio.

* **Padrão de Nomenclatura:**
* Variáveis/Funções: `camelCase` (ex: `calculateDamage`, `currentHp`).
* Classes/Stores: `PascalCase` (ex: `CharacterStore`, `DiceRoller`).
* Constantes e Tipos de Ação: `UPPER_SNAKE_CASE` (ex: `MAX_SKILL_VALUE`, `UPDATE_HP`).
* Atributos no HTML: `data-action`, `data-bind` (NUNCA usar classes CSS para bind de JavaScript).


* **Limites de Arquivo e Função:**
* **Tamanho Máximo do Arquivo:** 400 linhas. Passou disso? Refatore e divida o módulo.
* **Tamanho Máximo da Função:** 30 linhas. Se uma função tem mais de 30 linhas, ela está fazendo coisas demais (violando o Princípio de Responsabilidade Única).


* **Quando Criar Novos Arquivos:**
* Sempre que houver mudança de **Domínio**. Exemplo: Lógica de armas não fica no mesmo arquivo de lógica de sanidade.


* **A Regra do Anti-Overengineering:** NUNCA crie uma abstração genérica para algo que só é usado em UM lugar. Só extraia para uma função utilitária global quando o código for repetido pela **terceira** vez.

---

## 2. Regras Obrigatórias de Estado (State Rules)

**A Lei da Única Fonte da Verdade:** O objeto `Store` na memória é a autoridade máxima. O DOM é burro e submisso.

* **[PROIBIDO]** Ler valores do DOM para fazer cálculos matemáticos: `let hp = parseInt(document.getElementById('hp').innerText) + 1;` **(CRIME HEDIONDO)**.
* **[OBRIGATÓRIO]** Ler e escrever no Estado via Actions:
```javascript
// CORRETO
function addHP(amount) {
    let newHP = store.getState().hp + amount;
    store.dispatch('UPDATE_HP', newHP); 
}

```


* **Isolamento de Domínio:**
* **Engine (`engine/*.js`):** Só faz matemática. Recebe número, devolve número. Não conhece a existência do navegador, de HTML ou de estado.
* **Store (`store.js`):** Só guarda o JSON do personagem e avisa quem está ouvindo que algo mudou.
* **Actions (`actions.js`):** Único lugar autorizado a chamar `store.dispatch()`.
* **Render (`render.js`):** Único lugar autorizado a manipular o `document`. Não faz contas de regras do RPG, só pinta tela.



---

## 3. Regras Obrigatórias de Renderização

**A Lei da Pintura Cirúrgica:** Atualizar a tela inteira é proibido. Atualizamos apenas o pixel que mudou.

* **[PROIBIDO]** Uso de `innerHTML` para injetar dados do usuário (ex: textos de background). Risco de XSS e quebra de listeners. Use sempre `textContent`. Só use `innerHTML` para templates estáticos controlados pelo sistema (ex: ícones SVG).
* **[PROIBIDO]** Funções gigantes como `renderCharacter()`.
* **[OBRIGATÓRIO]** Renderizadores granulares: `renderHP(state.hp)`, `renderSkill(state.skills.spotHidden)`. Apenas o nó específico do DOM deve ser tocado.
* **Binding via Data-Attributes:**
```html
<span data-bind="sanidade-atual">45</span>
<span id="san" class="valor-sanidade-js">45</span>

```



---

## 4. Regras Obrigatórias de Event Handling

**A Lei da Delegação:** O celular chora a cada `addEventListener` inútil que você cria.

* **A Política Oficial:** É ESTRITAMENTE PROIBIDO fazer loops no DOM para atrelar eventos. Exemplo proibido: `document.querySelectorAll('.btn-rolar').forEach(btn => btn.addEventListener(...))`.
* **O Padrão Obrigatório (Event Delegation):** Você adicionará UM único listener na raiz do aplicativo (ou aba).
```javascript
document.getElementById('app-root').addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action]');
    if (!trigger) return;

    const action = trigger.dataset.action;
    if (action === 'roll-skill') {
        Actions.roll(trigger.dataset.skillName);
    }
});

```


* **Prevenção de Zumbis:** O único evento atrelado ao `window` ou `document` deve ser o `beforeunload` e os modificadores globais. Múltiplos personagens rodando na mesma aba reaproveitam o mesmo listener global via Delegação.

---

## 5. Regras Obrigatórias de Persistência

**A Lei da Imortalidade dos Dados:** Um investigador pode morrer para o Cthulhu, mas nunca para um bug de cache.

* **Auto-Save (Debounce):** Nenhum dado vai para o `localStorage` no instante em que é digitado. O salvamento deve ter um *debounce* rigoroso de **1500ms**. O jogador digita 10 letras no background, o sistema aguarda ele parar de digitar por 1.5s e salva.
* **Schema Versioning (CRÍTICO):** Todo save OBRIGATORIAMENTE possui uma chave `schemaVersion`.
```json
{ "schemaVersion": 1, "id": "uuid-xyz", "name": "Klein" }

```


* **Recuperação e Validação:**
* Ao carregar do `localStorage`, envolva em `try/catch`. Se o JSON.parse estourar, faça backup do corrompido em uma chave `corrupted_backup` e inicie uma ficha limpa, disparando um *Toast* avisando o usuário. NUNCA trave a tela em branco (White Screen of Death).


* **Limites do Local Storage:** O limite máximo por personagem deve ser de **50KB** (JSON text). O `localStorage` suporta ~5MB total (cerca de 100 fichas). Não salvaremos Base64 de imagens pesadas no LocalStorage.

---

## 6. Critérios de Performance

**A Lei dos 60 FPS:** O sistema deve voar em um Moto G antigo ou iPhone 8.

* **Tempo máximo de renderização:** Ações simples (tomar -1 de dano) devem refletir na tela em menos de **16ms**.
* **Quantidade de Listeners:** O app inteiro não deve ter mais de **10** `EventListeners` ativos na memória (conseguido através da regra de Delegação).
* **Renderização Inútil (Thrashing):** O motor de estado (Store) NÃO DEVE disparar evento de atualização se o valor novo for idêntico ao antigo. `if (newState.hp === oldState.hp) return;`

---

## 7. Critérios de UX Operacional (Regras de Mesa Real)

**A Lei do Guardião Sob Pressão:** UI bonita que exige 4 cliques para rolar um dano é lixo.

* **O HUD Intocável:** Barras de **PV, PM e SAN** DEVEM estar fixadas no topo ou base da tela (sticky) na versão mobile. O jogador nunca pode ter que rolar a tela para saber se vai morrer no próximo turno.
* **A Regra dos 2 Cliques:** Qualquer rolagem frequente (Ataque, Esquiva, Encontrar) deve estar a no máximo 2 toques do polegar, partindo de qualquer lugar do app.
* **Prevenção de Fumble Físico (Fat Finger):** Todo botão interativo no mobile DEVE ter área de toque mínima de **44x44 pixels**.
* **Ergonomia Noturna:** RPG é jogado de noite. Contraste alto e suporte a modo escuro nativo (ou paleta de base já escura como a do projeto Klein) é vital. Nada de fundos branco-hospital.

---

## 8. Checklist Anti-Spaghetti (Antes de codar)

Antes de escrever qualquer nova função, o desenvolvedor DEVE responder:

1. [ ] **Isso cria um novo estado isolado?** (Se sim, pare. O estado deve estar centralizado na Store).
2. [ ] **Estou lendo dados do DOM?** (Se sim, você está quebrando a Arquitetura).
3. [ ] **Estou colocando lógica de negócio no `render.js`?** (A cor da barra de vida ficar vermelha <= 2 PV é responsabilidade do Render. Dizer que o personagem está Morrendo é responsabilidade das Actions/Engine).
4. [ ] **Estou usando `forEach` para adicionar eventos em dezenas de elementos HTML?** (Refatore para Delegação).
5. [ ] **Isso funciona offline?** (Se usar qualquer `fetch()` para APIs externas, falhou).

---

## 9. Checklist de Pull Request / Deploy (QA de Longo Prazo)

Para que uma funcionalidade vá para o `main` no GitHub Pages:

1. [ ] **Smoke Test Duplo-Clique:** O arquivo `index.html` abriu direto do sistema de arquivos (`file://`) sem erro de CORS?
2. [ ] **Teste do Avião (Offline):** Desconecte o Wi-Fi/4G do celular. A funcionalidade nova continua operando?
3. [ ] **Teste da Amnésia:** Zere o `localStorage`. O app inicia limpo, gera o Wizard normalmente e cria um novo ID de personagem?
4. [ ] **Teste de Corrupção (Caos):** Digite `{"lixo": true}` no LocalStorage. O app sobrevive, limpa ou alerta o usuário sem tela branca?
5. [ ] **Validação Mobile:** Abra a inspeção (F12), coloque na visão de iPhone SE. A tela gera scroll horizontal? Se sim, REJEITADO.

---

## 10. Sinais Críticos de Degradação (O Código Apodrecendo)

Como Maintainer, se você observar qualquer um destes 5 sinais, PARE o desenvolvimento de features e entre em modo **Refatoração (Code Red)**:

1. **Dívida de Estado:** Você nota que precisa atualizar dados em 3 variáveis diferentes para que a vida do personagem reflita corretamente em todas as telas. *(Ação imediata: Unificar fonte da verdade)*.
2. **Lentidão no Input:** O celular engasga visivelmente (micro-stutters) enquanto o jogador digita seu Background. *(Ação imediata: Verificar vazamento de listeners e aumentar o debounce do Auto-save)*.
3. **Bugs de Ressurreição:** Um bug na Sanidade que foi corrigido no mês passado volta a acontecer. *(Ação imediata: A separação de responsabilidades falhou. Alguém está alterando a SAN fora das Actions)*.
4. **Arquivo Colossal:** `investigator.js` passa de 800 linhas. *(Ação imediata: Quebrar o arquivo em domínios menores imediatamente)*.
5. **Reclamação de Mesas Reais:** Jogadores relatando "Perdi minha ficha do nada" ou "O log de rolagens duplicou a jogada". *(Ação imediata: Auditar o State Pub/Sub e a Delegação de Eventos. Parecer o projeto)*.

---

### Conclusão do Tech Lead

Não subestime o Vanilla JS. Ele é a linguagem mais rápida e resiliente do mundo web, mas exige a disciplina de um programador em C. Se você respeitar essa Constituição, o repositório `AIMalexi_RPG_Ficha` estará rodando, de graça e sem falhas, em **2030**, sem precisar atualizar um único pacote NPM (porque eles não existem aqui).

Mantenha simples. Mantenha limpo. Mantenha mortal (para os investigadores, não para o código).

Aqui está a análise brutal de nível Staff/Principal e Guardião veterano. Sem amaciantes, focada puramente na sobrevivência do software e na ergonomia extrema de mesa.

---

## 1. Gargalos Ocultos e Riscos Arquiteturais Tardios

Se você escalar este projeto amanhã, ele colapsará nestes pontos em menos de um ano:

* **A Bomba-Relógio das Abas Duplas (Race Condition):** O jogador abre a ficha no celular. Chega em casa, abre no PC (se houver sync) ou abre duas abas no navegador para "ver o bestiário e a ficha". Se a aba A salvar o *state* inteiro no `localStorage` após a aba B ter feito uma alteração, **a alteração da aba B é deletada silenciosamente**.
* *Solução Obrigatória:* O `localStorage` precisa de um listener `window.addEventListener('storage', syncState)`. Se outra aba mudar o dado, a aba atual precisa se auto-atualizar (Reatividade inter-abas).


* **A Armadilha do Roll Log Infinito (Vazamento de Memória DOM):** Mestres rolam dados centenas de vezes em uma sessão longa. Se o array do log crescer indefinidamente, a aba vai engasgar em celulares de baixo custo ao renderizar a lista.
* *Solução Obrigatória:* Fila circular (Ring Buffer) cravada em **50 entradas**. O 51º deleta o 1º.


* **Poluição Punitiva de Schema:** Adicionar uma perícia oficial nova (ex: expansão *Pulp Cthulhu*) no `data/skills.js` na V2 vai dessincronizar os índices de quem salvou JSONs na V1.
* *Solução Obrigatória:* O motor de importação de JSON não pode aceitar o array de perícias cegamente. Ele deve fazer um "Merge (Mescla) Profundo", mantendo os pontos gastos, mas atualizando a lista base de perícias.



## 2. Problemas de UX em Sessões Longas (O Teste da Realidade)

Como Guardião, já vi muita ficha digital falhar às 3h da manhã.

* **A Cegueira de Combate (Mobile):** O pior fluxo de CoC é ser atacado. O jogador precisa: Ver se a arma dele está equipada $\rightarrow$ Rolar *Esquivar* $\rightarrow$ Tomar Dano $\rightarrow$ Reduzir PV $\rightarrow$ Fazer teste de *Constituição* para não desmaiar. Se "Combate", "Perícias" e "Personagem" (PV) estiverem em abas diferentes, você **matou o ritmo da mesa**.
* *Solução Obrigatória:* Criação do **HUD de Crise** (Sticky Top ou Bottom). PV, SAN, PM e os botões "Esquivar", "Lutar" e "Arma Primária" DEVEM estar visíveis em 100% do tempo no celular, independente de qual aba o usuário esteja lendo.


* **Fadiga de Modificadores Ocultos:** Se para aplicar um Bônus/Penalidade o jogador tiver que abrir um modal ou rolar até o topo da tela, ele vai esquecer e rolar normal.
* *Solução Obrigatória:* Um *Toggle Switch* global rápido e fixo na tela: `[ -1 ] [ NORMAL ] [ +1 ]`. O próximo clique em *qualquer* dado consome esse toggle e o reseta para Normal.


* **A Síndrome da Mochila Lenta:** Jogadores de CoC acumulam lixo (caixas de fósforo, chaves velhas). Textareas gigantes para inventário viram um pesadelo de ler no celular. O jogador vai rolar o texto por 10 segundos procurando a lanterna.

## 3. Cortes Agressivos: O Que Remover Antes Que Seja Tarde

Para o projeto não afundar sob o próprio peso de manutenção, execute estas amputações:

1. **MATE a Ficha do Mestre Complexa:** Remova Tracker de Iniciativa, Combate e HP de múltiplos monstros. Mestres rodam combates de CoC em 3 rodadas na mente ou em rascunhos de papel. O Mestre digital só precisa de um **Rolador de Dados** e um **Catálogo de Texto Rápido (Bestiário Ligeiro)**.
2. **MATE a Validação Restritiva de Ocupação:** O sistema nunca deve impedir um salvamento ou bloquear a UI porque a matemática de pontos do jogador "passou" do limite. Apenas mostre o número em vermelho. Mestres aplicam regras da casa (homebrew) o tempo todo. Se você engessar a criação, eles abandonam a ferramenta.
3. **MATE a edição completa de Armas:** Permita que armas customizadas sejam apenas `Nome | Dano (string 1d6) | Perícia Usada`. Esqueça raio de alcance, cadência de tiro, custo e mal funcionamento na V1. Ninguém usa isso com rigor tático, CoC não é D&D.

## 4. Investimentos Profundos Necessários (Sobrevivência a 5 Anos)

* **O Motor de Migração (Migration Engine):** Essa é a decisão de engenharia mais importante. A V1 precisa nascer com um arquivo `migrations.js`.
```javascript
function runMigrations(json) {
   if(json.version < 2) json = migrateToV2(json);
   if(json.version < 3) json = migrateToV3(json);
   return json;
}

```


Isso é o que vai permitir você mudar estruturas no futuro sem destruir os saves dos usuários antigos.
* **Sistema de Backup Fantasma:** Se um JSON importado estiver corrompido, ou a migração falhar, o app vai quebrar. O `localStorage` deve sempre manter uma chave secundária `backup_last_stable_state`. Se o boot falhar, restaure automaticamente o estado de 10 minutos atrás e mostre um Toast avisando o erro.

---

## 5. Diagnóstico de Maturidade do Projeto

| Categoria | Nota | Justificativa Brutal |
| --- | --- | --- |
| **Arquitetura Base** | **8/10** | DDAU e arquivos `.js` sem CORS foram sacadas geniais de longo prazo. |
| **Sustentabilidade** | **4/10** | Sem motor de migração e com eventuais race conditions no storage, os bugs aparecerão no mês 3. |
| **Ergonomia (Mesa)** | **6/10** | A separação por abas é boa, mas falha no fluxo cruzado do combate sem um HUD global. |
| **Resiliência de Dados** | **5/10** | Depender apenas do `beforeunload` e `localStorage` no iOS é perigoso sem um Backup Fantasma. |
| **Open Source** | **7/10** | Estrutura limpa, mas precisará de documentação rigorosa sobre como contribuir no `data/`. |

---

## 6. O Ranking Estratégico

### Os 5 Riscos Mais Críticos

1. Falta de um sistema de migração de *schema*, corrompendo personagens antigos.
2. Perda de dados no Safari iOS devido à limpeza automática de cache de sites não-PWA (em 7 dias).
3. Falta de um "HUD de Combate" no mobile obrigando troca constante de abas.
4. Acúmulo de lixo no Array do Roll Log travando processadores mobile.
5. Aumentar o escopo para construir um VTT para o Mestre, atrasando ou matando o app do Jogador.

### As 5 Decisões Mais Inteligentes Tomadas

1. **100% Vanilla JS:** Mantém a ferramenta eterna, imune às mortes de pacotes NPM.
2. **Distribuição via GitHub Pages + ZIP Offline:** Torna impossível a Chaosium derrubar totalmente via DMCA, já que o zip roda no PC local.
3. **Matemática Ocultada:** O auto-cálculo de Metade (½) e Um Quinto (⅕) salva horas de desgaste mental em sessão.
4. **Botão "Empalar" Automático:** O ápice da UX ludonarrativa que tira carga cognitiva do Guardião.
5. **Adoção de Delegação de Eventos (DDAU):** Impede que o app morra engasgado pela própria renderização.

---

## 7. O "Núcleo Sagrado" (V1) que NÃO deve crescer mais

Congele a **V1** aqui. Este é o seu MVP inviolável:

1. Ficha do Investigador com atributos, derivadas (auto-calculadas) e perícias.
2. Rolador de dados 1D100 integrado direto ao clique da perícia (com cálculos de bônus/penalidade).
3. Controle de Sanidade, PV, PM e Sorte.
4. Botão enorme, gritante, de Exportar/Importar JSON.
5. Modo Offline estrito via PWA básico (`manifest.json` com `display: standalone` para forçar retenção no iOS).

Nada mais. Qualquer nova arma, nova magia ou gerador de NPC entra na fila da V2.

## 8. O que transformar esse projeto em Referência Nacional? (V2/V3)

O que vai fazer mestres de todo o país abandonarem o Roll20/Foundry e abraçarem sua ferramenta:

1. **V2 - Modo "Papel Dinâmico" (Impressão Inteligente):** O PDF exportado via `@media print` deve formatar a ficha visualmente idêntica à ficha oficial de papel dos anos 20. Se a sua versão impressa for bonita, os jogadores a usarão mesmo sem celular na mesa.
2. **V2 - Homebrew Amigável Open Source:** Uma aba nas configurações onde o Mestre cola a URL de um JSON hospedado em um Pastebin genérico e sua ficha "absorve" aquelas armas/regras novas. Isso cria um ecossistema.
3. **V3 - Sincronização Local (Peer-to-Peer):** Sem banco de dados em nuvem, usar `WebRTC` (bibliotecas super leves como `PeerJS`) para conectar a aba do Jogador à aba do Mestre via um código (ex: "KLEIN-501"). Quando o jogador toma dano, atualiza no PC do Mestre via rede P2P local ou WebRTC. Isso destrói ferramentas pesadas mantendo o custo de servidor em ZERO.

**Veredito do Arquiteto:** Você tem um diamante bruto nas mãos. Pare de lixar arestas imaginárias. Construa o HUD de crise, proteja o JSON contra corrupção, lance a V1 para a comunidade testar e deixe os jogadores reais quebrarem o sistema antes de você inventar novas funções. Menos código agora é mais sobrevida amanhã.

A lua está alta, o Guardião está exausto e você quer que essa ferramenta sobreviva. Esqueça o entusiasta. Como **Principal Engineer e Guardião**, aqui está a auditoria cirúrgica para garantir que este projeto não apodreça.

---

### 1. Riscos Críticos (O que mata a V1)

* **ITP do Safari (iOS):** O navegador da Apple apaga o `localStorage` de sites que não são acessados como PWA (com ícone na home screen) após 7 dias. **Resultado:** Seus jogadores perderão as fichas.
* **Corrupção de Estado Síncrono:** Usar `localStorage.setItem` em cada alteração é uma race condition esperando para acontecer. Se o browser travar ou o usuário fechar a aba enquanto escreve, o JSON salva cortado pela metade. **Resultado:** JSON inválido, perda total.
* **Falta de Versionamento de Schema:** Daqui a 6 meses, você vai querer adicionar um campo `idade_ajustada`. Ao carregar um save antigo, o app vai quebrar.

### 2. Falhas de UX Real (O inferno às 2 da manhã)

* **Fadiga de Abas:** No combate, o jogador não pode navegar entre "Perícias" e "Combate". O cérebro dele já está sobrecarregado pela cena.
* **Roll Log Invisível:** No celular, o Log de Rolagens (que deveria ser o centro da prova do Guardião) está em uma aba separada. É um erro de UX. O log deve ser um *overlay* ou *toast* disparado instantaneamente no topo.
* **Modificadores de Rolagem:** Se aplicar bônus/penalidade exige abrir um menu, o jogador vai esquecer de rolar. Precisa de botões "Bônus/Penalidade" globais na barra fixa.

### 3. Armadilhas Arquiteturais (Onde está o código espaguete?)

* **State Management no DOM:** Ler `input.value` para calcular perícias é a definição de dívida técnica. O DOM é lento e mutável.
* **God Objects:** Se `investigator.js` gerencia eventos, regras de cálculo, renderização E persistência, ele é um *God Object*. Em 6 meses, qualquer mudança em uma perícia quebrará a renderização de HP.

### 4. Features que Devem Ser Mortas (Corte agressivo)

* **Tracker de Combate (Iniciativa):** Guardiões profissionais usam papel para isso. Automatizar isso no browser é tentar criar um VTT incompleto. **Mate.**
* **Editor de monstros complexo:** Deixe o mestre colar texto bruto. Se você criar um editor com múltiplos campos, você terá que dar suporte a isso para sempre. **Mate.**
* **PDF Formatado:** `@media print` básico resolve. Não perca tempo tentando replicar a ficha oficial com CSS complexo.

### 5. Features que Devem Virar Plugin/V2

* **Sincronização P2P:** Complexidade astronômica para a V1.
* **Gerador de Nomes:** Pode ser um módulo separado (`names.js`) que nem precisa estar na lógica principal.
* **Imagens de Personagens:** LocalStorage não é banco de dados de imagem. Isso deve ser carregado via URL externa ou adie para uma V2 com IndexedDB.

### 6. Melhorias Estruturais Obrigatórias

* **Padrão DDAU (Data-Down, Actions-Up):** A UI só reflete o estado. O estado nunca lê o DOM.
* **Debounce no Save:** Nenhum `localStorage` sem *debounce* de 2 segundos.
* **Migration Layer:** Todo save precisa de `version: 1`. O sistema de carga precisa de uma função `migrate(data)` que transforma saves antigos para o novo formato.

### 7. Estratégia de Longo Prazo (5 Anos)

* **Regra de Ouro:** O código não pode ter dependências externas (`node_modules`). Ele deve rodar em qualquer browser, mesmo sem internet, em 2030.
* **Documentação:** O README não é para usuários, é para você daqui a 2 anos.

### 8. O Limite Sagrado da V1

* Ficha do Investigador com atributos, perícias, sanidade e log de rolagens.
* Exportação/Importação JSON.
* Gerador de NPC (apenas texto).
* FIM. Se você ultrapassar isso na V1, o projeto não terá a robustez necessária para crescer.

### 9. O que transforma esse projeto em referência nacional?

* **A "Ficha-Papel-Digital":** Se a versão impressa (PDF via `@media print`) for indistinguível da oficial, você ganha o coração dos puristas.
* **Robustez de Backup:** Implementar um "Backup Fantasma" (o app salva a versão anterior do JSON em `localStorage.backup`). Se a versão atual corromper, o app restaura a anterior automaticamente. Isso gera confiança inabalável.

---

### Veredito Final Brutal

| Categoria | Nota | Diagnóstico |
| --- | --- | --- |
| **Sustentabilidade** | 3/10 | O caminho atual levará ao caos em breve. |
| **UX de Mesa** | 7/10 | Ótimo conceito, mas o fluxo de abas vai frustrar jogadores. |
| **Arquitetura** | 5/10 | Muito acoplada ao DOM. Precisa separar estado de render. |
| **Resiliência** | 4/10 | O ITP do Safari vai apagar fichas de jogadores. |

**Plano de Ação Imediato:**

1. **PWA:** Adicione um `manifest.json` e registre um `service-worker.js` básico agora. Sem isso, você está construindo um castelo na areia que o iOS vai varrer.
2. **Separe o Estado:** Crie um objeto `Character` (JSON) que existe na RAM. O DOM deve escutar esse objeto. Nunca faça `document.get().value` em uma função de cálculo.
3. **Morte de Escopo:** Remova o tracker de combate da Fase 4. Mantenha o Mestre focado na narrativa.

Você está criando algo útil. Agora pare de ser um desenvolvedor e torne-se um **cuidador**. Proteja o sistema contra a sua própria vontade de adicionar funções. A simplicidade é o único caminho para que ele exista daqui a 5 anos.

# Plano v4: Keeper + Fundação Defensiva (versão de execução)

Idêntica à v3 em estrutura. Aplica os 7 ajustes finais do review e consolida o namespace global. Esta é a versão que executo ao mudar para build mode — não pretendo iterar mais sobre arquitetura antes do build.

## Deltas em relação ao v3

### Ajuste 1 — `safeRender` retorna Node, nunca string HTML
Padrão consistente com o resto do app (zero `innerHTML` com conteúdo dinâmico).
```js
function fallbackEl(label = "⚠") {
  const div = document.createElement('div');
  div.className = 'render-error';
  div.textContent = label;
  return div;
}
function safeRender(name, fn, fallback = fallbackEl) {
  try { return fn(); }
  catch (e) {
    console.error(`[render:${name}]`, e);
    if (window.CoC.debug) window.CoC.debug.errors.push({ where:name, msg:e.message, t:Date.now() });
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}
```

### Ajuste 2 — `__DEV__` flag controla o `debug`
```js
window.CoC.flags = { dev: true };          // setável via DevTools
window.CoC.debug = window.CoC.flags.dev
  ? { renders:{}, actions:[], errors:[], storage:()=>..., reset:()=>... }
  : null;
```
Custos zero quando `dev:false`. Todas as escritas em `debug` ficam guardadas por `if (CoC.debug)`. Default `true` no dev, fácil de virar em produção via console (`CoC.flags.dev = false; location.reload()`).

### Ajuste 3 — Namespace único `window.CoC`
Consolido tudo (sem refatorar `data/*.js` retroativamente):
```js
window.CoC = window.CoC || {};
window.CoC.constants = {...};
window.CoC.ids = {...};
window.CoC.debug = ...;
window.CoC.flags = {...};
// já existentes: CoC.dice, CoC.rules, CoC.storage, CoC.names, CoC.ui, CoC.validators
```
`window.CoCData` permanece (dívida reconhecida na v3). Adiciono **alias** no boot:
```js
// Bridge: CoC.data aponta para CoCData. Permite migração futura sem quebrar dados.
window.CoC.data = window.CoCData;
```
Tudo que escrevo novo lê via `CoC.data.*`. Quando migrarmos, troca uma linha.

### Ajuste 4 — Imutabilidade declarada (regra hard)
Topo de `js/keeper/actions.js`:
```js
/* CONTRATO IMUTÁVEL (não-negociável):
   - Reducers retornam NOVAS referências para slices alterados.
   - Slices não alterados retornam a MESMA referência.
   - Mutação direta de state é proibida (ex: state.creatures.push(...)).
   - Use spread, map, filter. Para nested: { ...s, library: { ...s.library, ... } }
   - Selectors do store dependem disso para shallow eq funcionar. */
```
Em dev, `store.js` checa se action retornou referência identical ao state inteiro quando deveria mudar — warn no console.

### Ajuste 5 — `MAX_SINGLE_CREATURE_BYTES` em constants
```js
MAX_SINGLE_CREATURE_BYTES: 30_000,      // 30KB por criatura
MAX_SINGLE_INVESTIGATOR_BYTES: 50_000,  // 50KB por investigador
```
`saveCreature` mede `JSON.stringify(c).length` antes de gravar. Acima → erro estruturado.

### Ajuste 6 — `Object.seal()` em objetos validados
Após `schema.validateCreature`, `Object.seal(result.data)` impede `creature.tempFoo` no runtime. Permite mutação dos campos existentes (necessário para edit), bloqueia campos novos. Custo zero, ganho claro.

### Ajuste 7 — Contrato de selector documentado no topo do `store.js`
Bloco de comentário curto, copy-paste-friendly, com 4 exemplos ✅/❌ (já está no plano v3, agora é literal-texto no arquivo, não só na nossa cabeça).

## Estrutura final consolidada

```
js/shared/
├── store.js          ~150  (createStore + safeRender + fallbackEl + selector contract)
├── schema.js          ~90  (validate + migrate + Object.seal)
├── parser.js         ~120  (parse com erros estruturados)
├── throttle.js        ~30
├── constants.js       ~45  (constants + MAX_SINGLE_*)
├── ids.js             ~30
├── debug.js           ~50  (gated por CoC.flags.dev)
├── ui-components.js  (existente)
└── validators.js     (existente)

js/keeper/
├── index.js              ~80   (boot + bridge CoC.data)
├── state.js              ~60
├── actions.js           ~130  (contrato imutável no topo)
├── events.js            ~100
├── render/
│   ├── library.js        ~80
│   ├── editor.js        ~150
│   ├── bestiary.js       ~70
│   ├── encounter.js      ~60
│   ├── notes.js          ~40
│   └── log.js            ~40
└── services/
    ├── npc-generator.js ~120
    └── creature-factory.js ~50

data/
├── bestiary.js              (skeleton — você popula)
└── occupation-templates.js  (skeleton — você popula)

test-keeper.html  (smoke)
```

16 arquivos novos. Nenhum > 150 linhas.

## Retrofit mínimo no Investigator (igual v3)

1. `beforeunload → store.forceSave()` global
2. Import JSON via `schema.validateInvestigator` + dialog estruturado
3. Rolagens passam por `throttleRoll(skillId)`
4. `storage.checkBudget` antes de salvar
5. Sem refator de `investigator.js` em si

## Divisão de trabalho (inalterada)

**Você:** popula `data/bestiary.js` (~15 criaturas) e `data/occupation-templates.js` (~10 ocupações) com schemas que entrego. Commit + push após cada fase.

**Eu (1 turno build, modo paralelo):** Etapa 0 + Fase 4 + retrofit mínimo + `test-keeper.html`.

## Smoke test pré-entrega

- [ ] `test-engine.html` passa 100%
- [ ] `test-keeper.html` cobre: store (subscribe, dispatch, forceSave, contrato imutável warn), schema (validate, migrate, seal), parser (erros estruturados), ids (normalize + unique), throttle, budget (warn + block), MAX_SINGLE_*
- [ ] Viewport 375px → 4 abas funcionam no keeper
- [ ] Criar criatura → instanciar no encounter → −5 PV → reset → biblioteca intacta (HP original)
- [ ] Textarea de ataques: 1 linha inválida → chip de erro, válidas rolam
- [ ] Import JSON corrompido → dialog amigável, sem crash
- [ ] `CoC.debug.renders` < 5 por interação típica
- [ ] `CoC.flags.dev = false; location.reload()` → `CoC.debug === null`, app funciona normalmente

## Fora de escopo V1 (lista fechada — não reabrir)

Renderização in-app do GUIA, persona switcher do Klein, ilustrações de criaturas, i18n, sync cloud, modo tela-de-mesa, macros, IndexedDB, service worker, markdown rich, refator de `window.CoCData` para módulos ES, TypeScript, testes automatizados completos.

---

**Aprovação muda para build mode e executo num turno com tool calls paralelas.** Não há mais o que iterar arquiteturalmente antes do código existir.
