# AGENTS.md

Instrucoes para agentes de IA que trabalharem neste repositorio.

## Primeiro Passo Obrigatorio

1. Rode `git status --short --branch`.
2. Confirme a branch ativa.
3. Leia `README.md`, este arquivo, `docs/ROADMAP.md` e, quando a tarefa tocar
   arquitetura/regras, `Melhorias/DIRETRIZ_OFICIAL_V1.md`.
4. Audite o codigo antes de mudar comportamento.

## Principios do Projeto

- O projeto e uma ferramenta web estatica para GitHub Pages.
- Nao introduza build obrigatorio, framework pesado ou dependencia desnecessaria.
- Preserve caminhos relativos.
- Nao altere regras, calculos ou comportamento da ficha sem necessidade clara.
- Nunca copie textos longos, aventuras oficiais, PDFs, arte oficial ou conteudo
  proprietario protegido.
- Prefira resumos originais e dados mecanicos minimos quando documentar ou
  ampliar referencias.

## Arquivos e Areas Importantes

- `index.html`: portal.
- `investigator.html` + `js/investigator.js` + `js/views/`: ficha do jogador.
- `keeper.html` + `js/keeper*.js` + `js/campaign/`: Guardiao e campanha.
- `compendium.html` + `js/compendium/`: referencia.
- `js/engine/`: regras, dados, storage, dice e geradores auxiliares.
- `data/`: pericias, ocupacoes, bestiario, armas, NPCs e presets.
- `css/`: estilos por pagina e tema.
- `sw.js` e `manifest.json`: PWA/offline.
- `supabase/`: schema de campanha.
- `Melhorias/`: diretrizes historicas, auditorias e arquitetura.

## Verificacoes Recomendadas

Use conforme o risco da mudanca:

```powershell
node js/tests/runner.js
```

Verificacao simples de links locais em HTML:

```powershell
$files = @('index.html','investigator.html','keeper.html','guia-iniciante.html','compendium.html')
$broken = @()
foreach ($file in $files) {
  $html = Get-Content -Raw -Encoding UTF8 $file
  $matches = [regex]::Matches($html, '(?:href|src)="([^"]+)"')
  foreach ($m in $matches) {
    $url = $m.Groups[1].Value
    if ($url.StartsWith('http') -or $url.StartsWith('data:') -or $url.StartsWith('#') -or $url.StartsWith('mailto:')) { continue }
    $path = $url.Split('#')[0].Split('?')[0]
    if ($path -and -not (Test-Path -LiteralPath $path)) { $broken += "$file -> $url" }
  }
}
$broken
```

No estado auditado em 2026-06-07, a suite Node falhava antes das mudancas de
documentacao (`873/889 passed`). Se isso ainda ocorrer, registre como baseline
em vez de ocultar.

## PWA e Cache

- Se adicionar ou remover arquivo JS/CSS/HTML essencial, revise `PRECACHE_URLS`
  em `sw.js`.
- Se alterar `PRECACHE_URLS`, incremente `CACHE_VERSION`.
- Nao ative `skipWaiting` sem entender o impacto em sessoes de jogo abertas.
- Enquanto Supabase for carregado por CDN, nao prometa offline completo.

## Commits

- Faca commits pequenos e tematicos.
- Antes de cada commit, rode `git status --short`, confira o diff e execute uma
  verificacao proporcional ao risco.
- Mensagens recomendadas:
  - `docs: atualizar README com status real do projeto`
  - `docs: adicionar roadmap do projeto`
  - `docs: adicionar instrucoes para agentes IA`
  - `docs: adicionar changelog inicial`
  - `fix: corrigir links e referencias da documentacao`

## Coisas Que Exigem Cuidado Extra

- Qualquer alteracao em `js/engine/coc7e-rules.js`, `js/engine/dice.js` ou
  `data/`.
- Qualquer mudanca de schema em `js/engine/storage.js`.
- Qualquer alteracao em `js/config.js`, Supabase ou fluxo remoto.
- Qualquer mudanca que afete exportacao/importacao de personagens.
- Qualquer conteudo de regras que possa reproduzir material proprietario.
