# AGENTS.md

Instruções para agentes de IA que trabalharem neste repositório.

## Primeiro Passo Obrigatório

1. Rode `git status --short --branch`.
2. Confirme a branch ativa.
3. Leia `README.md`, este arquivo, `docs/ROADMAP.md` e, quando a tarefa tocar
   arquitetura/regras, `Melhorias/DIRETRIZ_OFICIAL_V1.md`.
4. Audite o código antes de mudar comportamento.

## Princípios do Projeto

- O projeto é uma ferramenta web estática para GitHub Pages.
- Não introduza build obrigatório, framework pesado ou dependência desnecessária.
- Preserve caminhos relativos.
- Não altere regras, cálculos ou comportamento da ficha sem necessidade clara.
- Nunca copie textos longos, aventuras oficiais, PDFs, arte oficial ou conteúdo
  proprietário protegido.
- Prefira resumos originais e dados mecânicos mínimos quando documentar ou
  ampliar referências.

## Arquivos e Áreas Importantes

- `index.html`: portal.
- `investigator.html` + `js/investigator.js` + `js/views/`: ficha do jogador.
- `keeper.html` + `js/keeper*.js` + `js/campaign/`: Guardião e campanha.
- `compendium.html` + `js/compendium/`: referência.
- `js/engine/`: regras, dados, storage, dice e geradores auxiliares.
- `data/`: perícias, ocupações, bestiário, armas, NPCs e presets.
- `css/`: estilos por página e tema.
- `sw.js` e `manifest.json`: PWA/offline.
- `supabase/`: schema de campanha.
- `Melhorias/`: diretrizes históricas, auditorias e arquitetura.

## Verificações Recomendadas

Use conforme o risco da mudança:

```powershell
node js/tests/runner.js
```

Verificação simples de links locais em HTML:

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

Na auditoria de 2026-06-07, a suíte Node passou com `889/889` depois das
correções de ontologia, proveniência de perícias, arquitetura de views e KPIs do
Guardião. Se uma futura rodada voltar a falhar, investigue como regressão antes
de registrar como baseline.

## PWA e Cache

- Se adicionar ou remover arquivo JS/CSS/HTML essencial, revise `PRECACHE_URLS`
  em `sw.js`.
- Se alterar `PRECACHE_URLS`, incremente `CACHE_VERSION`.
- Não ative `skipWaiting` sem entender o impacto em sessões de jogo abertas.
- Enquanto Supabase for carregado por CDN, não prometa offline completo.

## Commits

- Faça commits pequenos e temáticos.
- Antes de cada commit, rode `git status --short`, confira o diff e execute uma
  verificação proporcional ao risco.
- Mensagens recomendadas:
  - `docs: atualizar README com status real do projeto`
  - `docs: adicionar roadmap do projeto`
  - `docs: adicionar instruções para agentes IA`
  - `docs: adicionar changelog inicial`
  - `fix: corrigir links e referências da documentação`

## Coisas Que Exigem Cuidado Extra

- Qualquer alteração em `js/engine/coc7e-rules.js`, `js/engine/dice.js` ou
  `data/`.
- Qualquer mudança de schema em `js/engine/storage.js`.
- Qualquer alteração em `js/config.js`, Supabase ou fluxo remoto.
- Qualquer mudança que afete exportação/importação de personagens.
- Qualquer conteúdo de regras que possa reproduzir material proprietário.
