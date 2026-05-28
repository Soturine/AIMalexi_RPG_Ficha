# Templates de imagem (Fase 6)

Esta pasta guarda **fotos de domínio público** opcionais para a biblioteca de
banners/retratos da ficha e do bestiário.

Por padrão a biblioteca usa apenas os **SVGs ornamentais** (definidos inline em
`data/image-templates.js`) — eles funcionam offline, são leves e combinam com o
tema gótico. As fotos são um complemento opcional.

## Como adicionar uma foto

1. Baixe uma imagem de domínio público. Boas fontes:
   - [Wikimedia Commons](https://commons.wikimedia.org/) (filtre por "Public domain")
   - [Public Domain Review](https://publicdomainreview.org/)
   - [Old Book Illustrations](https://www.oldbookillustrations.com/)
2. Salve em:
   - `assets/templates/banners/` — para banners (proporção ~21:9 fica melhor)
   - `assets/templates/portraits/` — para retratos (proporção ~3:4)
3. Registre a entrada em `data/image-templates.js`, no array `bannerPhotos` ou
   `portraitPhotos`:
   ```js
   { id: "banner-photo-library", name: "Biblioteca Vitoriana", kind: "photo",
     path: "assets/templates/banners/victorian-library.jpg",
     credit: "Wikimedia Commons · Public Domain" }
   ```
4. Recarregue a página — a foto aparece automaticamente na aba "Biblioteca" do
   seletor de imagem.

## Sugestões temáticas (Chamado de Cthulhu, anos 1920)

- **Banners:** biblioteca vitoriana, porto na névoa, mansão sombria, rua urbana
  noturna, paisagem rural decadente, gravura art-déco.
- **Retratos:** silhueta vitoriana, retrato sépia antigo, moldura ornamental.

> Sempre confirme a licença antes de usar. Domínio público é o mais seguro.
