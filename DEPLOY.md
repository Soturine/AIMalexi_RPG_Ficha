# 📘 DEPLOY.md — Manual de Manutenção (para Malexi)

Este é seu guia pessoal de como **publicar, atualizar e gerenciar** este projeto no GitHub. Pressupõe que você **NÃO tem experiência prévia com git ou GitHub** — todo o passo-a-passo está aqui.

> ⚠️ **Você NÃO precisa usar a linha de comando.** Tudo é feito pelo **GitHub Desktop** (interface gráfica), que você já tem instalado.

---

## Visão Geral do Fluxo

Sempre que algum arquivo for modificado (por você ou pelo Claude), o ciclo é:

```
1. Claude (ou você) modifica arquivos na pasta local
        ↓
2. GitHub Desktop detecta as mudanças automaticamente
        ↓
3. Você escreve um "commit" (descrição da mudança) e clica "Commit"
        ↓
4. Você clica "Push origin" (envia para o servidor do GitHub)
        ↓
5. Em ~1 minuto, o site público é atualizado automaticamente
```

É isso. Repetido para sempre.

---

## 🚀 Setup Inicial — Ativando o GitHub Pages (FAZER UMA VEZ SÓ)

O **GitHub Pages** é o serviço gratuito da Microsoft/GitHub que transforma seu repositório numa **URL pública** acessível por qualquer pessoa no mundo. Você precisa ativá-lo manualmente UMA VEZ.

### Passo a passo

1. **Abra o GitHub Desktop** no seu PC

2. **Confirme que está vendo o repositório `AIMalexi_RPG_Ficha`**
   - Canto superior esquerdo, deve mostrar `Current repository: AIMalexi_RPG_Ficha`
   - Se não estiver, clique nesse dropdown e selecione

3. **Confirme que está vendo arquivos novos pendentes** na aba **"Changes"** à esquerda
   - Você deve ver: `.gitignore`, `LICENSE`, `README.md`, `GUIA-INICIANTE.md`, `DEPLOY.md`, `index.html`, `css/theme.css`

4. **Faça o primeiro commit:**
   - Lá embaixo à esquerda tem dois campos:
     - **Summary:** escreva `Fase 1: setup inicial do portal`
     - **Description (opcional):** `Cria estrutura base, portal de entrada, README, guia do iniciante, tema CSS compartilhado.`
   - Clique no botão **Commit to main**

5. **Suba (push) para o GitHub:**
   - Lá no topo aparecerá um botão **"Push origin"** com uma seta ↑
   - Clique nele
   - Aguarde alguns segundos. Vai pedir login se for primeira vez — autentique pelo navegador.

6. **Confirme que subiu — abra no navegador:**
   - Vá para: https://github.com/M4alexii/AIMalexi_RPG_Ficha
   - Você deve ver os arquivos `index.html`, `README.md`, etc. listados

7. **Ative o GitHub Pages:**
   - Ainda no GitHub, no repositório, clique na aba **"Settings"** (engrenagem, no topo)
   - No menu esquerdo, role para baixo e clique em **"Pages"**
   - Na seção **"Build and deployment"**:
     - **Source:** selecione **"Deploy from a branch"**
     - **Branch:** selecione **`main`** e **`/ (root)`**
     - Clique em **Save**
   - **Aguarde 1-2 minutos.** O GitHub vai construir e publicar.

8. **Acesse o site!**
   - URL pública: **https://m4alexii.github.io/AIMalexi_RPG_Ficha/**
   - Pode levar até 5 minutos na primeira publicação. Se aparecer 404, espere e atualize.

9. **🎉 Pronto.** A partir de agora, **qualquer pessoa no mundo** pode abrir esse link no celular ou PC e usar a ferramenta. Sem instalar nada.

---

## 🔁 Atualizações Futuras — Fluxo Repetido

Sempre que você (ou o Claude) modificar arquivos:

### 1. Abrir GitHub Desktop
Os arquivos modificados aparecem automaticamente na aba **"Changes"** à esquerda. Cada arquivo modificado tem uma cor (verde = adicionado, amarelo = modificado, vermelho = deletado).

### 2. Revisar (opcional)
Clique em qualquer arquivo da lista — o painel central mostra exatamente o que mudou (linhas vermelhas = removidas, verdes = adicionadas). Útil para conferir.

### 3. Escrever Commit
Lá embaixo à esquerda:
- **Summary** (obrigatório): descrição curta da mudança. Exemplos:
  - `Fase 2: adiciona engine de regras`
  - `Fase 3: ficha do investigador funcional`
  - `Fix: corrige bug no cálculo de SAN máxima`
  - `Adiciona ocupação "Repórter" ao dropdown`

  💡 **Dica de boa prática:** comece com um verbo no presente (`Adiciona`, `Corrige`, `Remove`, `Atualiza`). Em inglês também vale (`Add`, `Fix`, `Remove`, `Update`).

- **Description** (opcional): detalhes adicionais se quiser.

Clique em **Commit to main**.

### 4. Push origin
Clique no botão **"Push origin"** no topo. Pronto.

### 5. Aguardar Pages atualizar
Em ~1-2 minutos, a URL https://m4alexii.github.io/AIMalexi_RPG_Ficha/ reflete a mudança. Force F5 / Ctrl+Shift+R se não ver de imediato (cache do navegador).

---

## 🧪 Testando Local SEM Commitar

Você NÃO precisa fazer commit para testar mudanças. Para ver como ficou:

### Opção A — Duplo-clique
1. Abra a pasta `M:\...\AIMalexi_RPG_Ficha\` no Explorador de Arquivos
2. Dê duplo-clique em `index.html`
3. O Chrome/Edge abre direto

### Opção B — Servidor local (preferível, evita problemas de CORS no futuro)

Se você tem Python instalado (deveria, pelo CLAUDE.md do vault):

```powershell
cd "M:\INTELIGÊNCIA COMERCIAL\GERENCIAL\2026\3. BASES DE DADOS\26. Mapa Neural\AIMalexi_RPG_Ficha"
python -m http.server 8765
```

Depois abra: http://localhost:8765/

Para parar o servidor: Ctrl+C no terminal.

---

## 🔥 Troubleshooting

### "GitHub Pages mostra 404"
- **Verifique se ativou na Settings → Pages** corretamente (Source = `main` branch, `/ (root)`)
- **Aguarde 5 minutos** — a primeira publicação pode demorar
- **Verifique o nome do repositório** — a URL é `m4alexii.github.io/AIMalexi_RPG_Ficha/` (case-sensitive!)

### "Minha mudança não apareceu no site"
- **Force refresh:** Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
- **Espere 2 minutos** — Pages tem cache
- **Verifique se fez push:** GitHub Desktop deve mostrar "no commits to push" depois do push

### "GitHub Desktop diz 'this branch is X commits behind'"
- Clique em **"Fetch origin"** primeiro (botão no topo)
- Depois clique em **"Pull origin"**
- Resolva conflitos se aparecerem (raríssimo neste projeto, já que é só você editando)

### "Tem conflito de merge"
- Não entre em pânico. Clique em **"Open in Visual Studio Code"** (ou outro editor)
- Os arquivos com conflito têm marcadores `<<<<<<<`, `=======`, `>>>>>>>`
- Decide qual versão fica, deleta os marcadores, salva
- Volta no GitHub Desktop, faz commit do merge, push

### "Esqueci de instalar Python e o servidor local não funciona"
- Não precisa de Python para a ficha — só o `python -m http.server` que é uma alternativa
- A Opção A (duplo-clique em `index.html`) funciona sem Python

### "Acidentalmente commitei o PDF do livro"
- 🚨 **IMPORTANTE** — você precisa **remover do histórico** do git (não basta deletar e commitar)
- Avisa o Claude: "**Removi o PDF do repo mas ainda está no histórico, me ajuda a limpar**"
- Ele vai usar `git filter-repo` ou equivalente para limpar o histórico

---

## 📂 Estrutura de Trabalho

Pasta local do projeto:
```
M:\INTELIGÊNCIA COMERCIAL\GERENCIAL\2026\3. BASES DE DADOS\26. Mapa Neural\AIMalexi_RPG_Ficha\
```

Repositório online:
```
https://github.com/M4alexii/AIMalexi_RPG_Ficha
```

Site público:
```
https://m4alexii.github.io/AIMalexi_RPG_Ficha/
```

---

## ✅ Checklist da Fase 1 (faça agora)

- [ ] Abrir GitHub Desktop e confirmar que vê os arquivos novos na aba Changes
- [ ] Commit com summary: `Fase 1: setup inicial do portal`
- [ ] Push origin
- [ ] Abrir `https://github.com/M4alexii/AIMalexi_RPG_Ficha` e confirmar que os arquivos estão lá
- [ ] Settings → Pages → Source = `main` branch, `/ (root)` → Save
- [ ] Aguardar 2 minutos
- [ ] Acessar `https://m4alexii.github.io/AIMalexi_RPG_Ficha/` e ver o portal
- [ ] Testar no celular (escanear QR code da URL ou abrir manualmente)
- [ ] Avisar Claude: **"Fase 1 publicada com sucesso, podemos seguir para Fase 2"**

---

## 🆘 Quando pedir ajuda ao Claude

Sempre que algo der errado ou você quiser modificar algo:

1. Tire um screenshot do erro/problema (se houver)
2. Abra o Claude Code nesta pasta do vault
3. Descreva o que aconteceu: *"Tentei ativar GitHub Pages mas dá 404 — segue print"*
4. Claude resolve. Não precisa decorar comandos de git.

---

*Você está no controle. O git é só uma máquina do tempo do código — ele guarda toda versão pra você poder voltar atrás se quiser.*
