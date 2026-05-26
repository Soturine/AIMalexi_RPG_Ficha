# AIMalexi RPG · Fichas Dinâmicas de Chamado de Cthulhu 7E

Ferramenta gratuita e aberta para mesas de **Chamado de Cthulhu 7ª Edição**. Duas fichas, uma engine, zero instalação.

> "Não é o conhecimento que enlouquece — é o que ele revela."

---

## O que tem aqui

- **🎲 Ficha do Investigador** — para o jogador criar e gerenciar seu personagem. Atributos rolados automaticamente, perícias com Sucesso Regular/Difícil/Extremo já calculados, tracker de PV/PM/SAN, arsenal com dano automático, perda de sanidade, multi-personagem.
- **📜 Ficha do Mestre/Guardião** — gerador de NPCs aleatórios, criador de monstros custom, biblioteca persistente e bestiário pré-pronto com criaturas do livro básico.
- **❓ Guia do Iniciante** — para quem nunca jogou Cthulhu. Em 15 minutos você cria um investigador e entra na primeira sessão.

---

## Como abrir

### Opção 1 — Online (recomendado, sem baixar nada)

Abra no navegador (celular ou computador):

**https://m4alexii.github.io/AIMalexi_RPG_Ficha/**

Tudo funciona direto. Seus personagens ficam salvos no navegador automaticamente.

### Opção 2 — Offline (para usar sem internet)

1. Clique no botão verde **`Code`** lá em cima nesta página do GitHub
2. Clique em **`Download ZIP`**
3. Extraia o ZIP em qualquer pasta do seu computador
4. Abra o arquivo `index.html` com duplo-clique

Pronto. Funciona em qualquer navegador (Chrome, Edge, Firefox, Safari), Windows, Mac ou Linux.

---

## Como usar (resumo rápido)

### Para o Jogador
1. Acesse o link e clique em **🎲 Ficha do Investigador**
2. Escolha "**Novo Personagem do Zero**" (ou "**Carregar Klein Moretti**" para ver um exemplo pronto)
3. Role atributos, escolha ocupação, distribua perícias — a ficha calcula tudo automaticamente
4. Clique no 🎲 ao lado de cada perícia para rolar contra dificuldade Regular / Difícil / Extrema
5. **Importante:** clique no botão **💾 Exportar JSON** ao terminar a sessão — é o backup do seu personagem

### Para o Mestre
1. Acesse o link e clique em **📜 Ficha do Mestre**
2. Use **🎲 Novo NPC Aleatório** para gerar um NPC pronto em segundos
3. Ou use **Criar Monstro Custom** para algo específico da sua campanha
4. Acesse o **Bestiário** lateral para criaturas clássicas do livro
5. Tudo que você criar fica salvo na **Biblioteca**, organizado por nome/tipo

---

## Perguntas frequentes

### Preciso pagar?
Não. É código aberto sob licença MIT — use, modifique, distribua. Sem cadastro, sem ads, sem servidor.

### Funciona no celular?
Sim. A interface se adapta a telas pequenas com navegação por abas.

### Meus dados são enviados para algum lugar?
Não. Tudo fica no seu navegador (localStorage). Nada sai do seu dispositivo.

### E se eu limpar o cache do navegador?
Seus personagens podem ser perdidos. **Use o botão Exportar JSON** regularmente para baixar um backup `.json` que você pode importar de volta a qualquer momento.

### O que é Chamado de Cthulhu?
Um RPG de horror cósmico onde os jogadores são **investigadores** comuns enfrentando entidades terríveis. Você é frágil, foge mais do que luta, e o objetivo é sobreviver e entender. Leia o **Guia do Iniciante** se nunca jogou.

### Preciso ter o livro?
Não para usar a ficha — toda a mecânica essencial está embutida. Mas se quiser aprofundar (cenários, lore, regras avançadas), o livro básico é uma compra recomendada da Chaosium (versão em PT-BR pela New Order Editora).

### Tem versão em inglês?
Por enquanto só em português. PRs com tradução são bem-vindos.

---

## Estrutura do projeto

```
AIMalexi_RPG_Ficha/
├── index.html              ← portal de entrada
├── investigator.html       ← ficha do jogador
├── keeper.html             ← ficha do mestre
├── css/                    ← estilos (tema gótico-vitoriano)
├── js/                     ← engine de regras + UI
├── data/                   ← perícias, ocupações, bestiário (todos em .js)
├── assets/                 ← ícones e imagens
├── GUIA-INICIANTE.md       ← guia para quem está começando
├── DEPLOY.md               ← instruções de manutenção (para o autor)
└── LICENSE                 ← MIT
```

---

## Contribuir

Sugestões, bugs e PRs são bem-vindos via [issues do GitHub](https://github.com/M4alexii/AIMalexi_RPG_Ficha/issues).

Quer adicionar uma ocupação, perícia ou criatura nova? Edite o arquivo correspondente em `data/` — eles são objetos JS simples.

---

## Créditos

- **Sistema:** Call of Cthulhu 7th Edition © Chaosium Inc. — esta ferramenta usa apenas dados mecânicos (não-protegíveis); descrições e narrativa são originais.
- **Personagem de exemplo Klein Moretti:** *Lord of the Mysteries* de Cuttlefish That Loves Diving.
- **Desenvolvido por:** Malexi (Matheus Gonzaga) com assistência de Claude (Anthropic).
- **Licença do código:** MIT — veja [LICENSE](LICENSE).

---

*"Pelas estradas mais escuras, viajam aqueles que devem ver o que jamais deveria ter sido visto."*
