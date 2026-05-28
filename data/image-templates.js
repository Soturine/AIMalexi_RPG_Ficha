/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/image-templates.js
   Biblioteca de templates de imagem (Fase 6)

   Estrutura:
     { id, name, kind: "svg"|"photo", svg?, path?, credit? }

   SVGs usam currentColor onde possível para herdar o tema ativo.
   Para adicionar fotos de domínio público próprias, baixe e salve em:
     assets/templates/banners/<arquivo>.jpg
     assets/templates/portraits/<arquivo>.jpg
   e depois adicione a entrada correspondente abaixo.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};

const _bg = "#1c1813";  // bg-card de referência (será aproximado pelo tema ao renderizar)
const _fg = "#b8924f";  // brass de referência

// ─── Helpers para SVGs ─────────────────────────────────────────────────
function _svg(viewBox, body, bg = _bg, fg = _fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice" style="background:${bg};color:${fg}">${body}</svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BANNERS (21:9)
// ═══════════════════════════════════════════════════════════════════════════

const BANNER_VB = "0 0 1200 515";

const bannerSvgs = [
  {
    id: "banner-art-deco-arch",
    name: "Arco Art Déco",
    svg: _svg(BANNER_VB, `
      <defs>
        <radialGradient id="g1" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="515" fill="url(#g1)"/>
      <g stroke="currentColor" stroke-width="2" fill="none" opacity="0.6">
        <path d="M600 50 Q400 50 400 250 L400 515 M600 50 Q800 50 800 250 L800 515"/>
        <path d="M450 250 L450 515 M750 250 L750 515" stroke-width="1"/>
        <circle cx="600" cy="180" r="60" stroke-width="3"/>
        <circle cx="600" cy="180" r="40"/>
        <path d="M540 180 L660 180 M600 120 L600 240" stroke-width="1"/>
      </g>
      <g fill="currentColor" opacity="0.4">
        <path d="M0 515 L600 480 L1200 515 Z"/>
      </g>
    `)
  },
  {
    id: "banner-victorian-filigree",
    name: "Filigrana Vitoriana",
    svg: _svg(BANNER_VB, `
      <g stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.5">
        <path d="M50 60 Q150 30 250 60 T 450 60 T 650 60 T 850 60 T 1050 60 T 1150 60"/>
        <path d="M50 455 Q150 485 250 455 T 450 455 T 650 455 T 850 455 T 1050 455 T 1150 455"/>
        <g transform="translate(600 257) scale(1)">
          <path d="M0 -120 Q-30 -60 0 0 Q30 -60 0 -120 Z" opacity="0.7"/>
          <path d="M0 120 Q-30 60 0 0 Q30 60 0 120 Z" opacity="0.7"/>
          <path d="M-120 0 Q-60 -30 0 0 Q-60 30 -120 0 Z" opacity="0.7"/>
          <path d="M120 0 Q60 -30 0 0 Q60 30 120 0 Z" opacity="0.7"/>
          <circle r="8" fill="currentColor"/>
          <circle r="60" stroke-width="1"/>
        </g>
      </g>
      <g fill="currentColor" opacity="0.15">
        <circle cx="150" cy="257" r="3"/>
        <circle cx="1050" cy="257" r="3"/>
        <circle cx="350" cy="257" r="2"/>
        <circle cx="850" cy="257" r="2"/>
      </g>
    `)
  },
  {
    id: "banner-occult-sigil",
    name: "Sigilo Oculto",
    svg: _svg(BANNER_VB, `
      <g transform="translate(600 257)" stroke="currentColor" fill="none" opacity="0.6">
        <circle r="180" stroke-width="2"/>
        <circle r="140" stroke-width="1"/>
        <circle r="100" stroke-width="1.5"/>
        <polygon points="0,-160 152,52 -94,128 94,128 -152,52" stroke-width="1.5"/>
        <g stroke-width="1" opacity="0.6">
          <line x1="-180" y1="0" x2="180" y2="0"/>
          <line x1="0" y1="-180" x2="0" y2="180"/>
          <line x1="-127" y1="-127" x2="127" y2="127"/>
          <line x1="-127" y1="127" x2="127" y2="-127"/>
        </g>
        <circle r="20" fill="currentColor" opacity="0.4"/>
      </g>
      <g fill="currentColor" opacity="0.25">
        <text x="100" y="80" font-family="serif" font-style="italic" font-size="24">Ph'nglui mglw'nafh</text>
        <text x="800" y="460" font-family="serif" font-style="italic" font-size="24">Cthulhu R'lyeh</text>
      </g>
    `)
  },
  {
    id: "banner-antique-map",
    name: "Mapa Antigo",
    svg: _svg(BANNER_VB, `
      <g stroke="currentColor" fill="none" opacity="0.4">
        <path d="M100 100 Q300 60 500 100 T 900 100 L 1100 80" stroke-width="1"/>
        <path d="M50 200 Q200 180 350 220 Q500 260 700 220 T 1150 220" stroke-width="1"/>
        <path d="M150 320 Q400 280 600 340 Q800 380 1050 340" stroke-width="1.5"/>
        <path d="M80 420 Q300 400 500 430 T 1100 430" stroke-width="1"/>
        <g stroke-width="2">
          <path d="M180 150 Q220 130 260 150 Q300 170 340 150" />
          <path d="M780 350 Q820 330 860 350 Q900 370 940 350" />
        </g>
        <circle cx="350" cy="250" r="8" fill="currentColor"/>
        <circle cx="780" cy="350" r="6" fill="currentColor"/>
        <circle cx="150" cy="180" r="5" fill="currentColor"/>
        <text x="370" y="245" font-family="serif" font-size="14" fill="currentColor">Arkham</text>
        <text x="800" y="345" font-family="serif" font-size="14" fill="currentColor">Innsmouth</text>
        <text x="170" y="175" font-family="serif" font-size="14" fill="currentColor">Boston</text>
      </g>
      <g transform="translate(1050 100)" stroke="currentColor" fill="none" opacity="0.5">
        <circle r="35" stroke-width="1"/>
        <path d="M0 -30 L0 30 M-30 0 L30 0" stroke-width="1"/>
        <path d="M0 -30 L8 -10 L0 -22 L-8 -10 Z" fill="currentColor"/>
        <text x="-4" y="-40" font-family="serif" font-size="12" fill="currentColor">N</text>
      </g>
    `)
  },
  {
    id: "banner-mist-abstract",
    name: "Névoa Abstrata",
    svg: _svg(BANNER_VB, `
      <defs>
        <radialGradient id="m1" cx="20%" cy="60%" r="50%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="m2" cx="70%" cy="40%" r="40%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="m3" cx="90%" cy="80%" r="30%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="515" fill="url(#m1)"/>
      <rect width="1200" height="515" fill="url(#m2)"/>
      <rect width="1200" height="515" fill="url(#m3)"/>
      <g stroke="currentColor" fill="none" opacity="0.15">
        <path d="M0 380 Q200 360 400 380 Q600 400 800 380 Q1000 360 1200 380" stroke-width="1"/>
        <path d="M0 420 Q200 400 400 420 Q600 440 800 420 Q1000 400 1200 420" stroke-width="1"/>
        <path d="M0 460 Q200 440 400 460 Q600 480 800 460 Q1000 440 1200 460" stroke-width="1"/>
      </g>
    `, _bg, _fg)
  },
  {
    id: "banner-gothic-arch",
    name: "Arco Gótico",
    svg: _svg(BANNER_VB, `
      <g stroke="currentColor" fill="none" opacity="0.6">
        <path d="M200 515 L200 250 Q200 100 400 100 Q600 100 600 250 L600 515" stroke-width="3"/>
        <path d="M600 515 L600 250 Q600 100 800 100 Q1000 100 1000 250 L1000 515" stroke-width="3"/>
        <path d="M250 515 L250 280 Q250 150 400 150 Q550 150 550 280 L550 515" stroke-width="1"/>
        <path d="M650 515 L650 280 Q650 150 800 150 Q950 150 950 280 L950 515" stroke-width="1"/>
      </g>
      <g fill="currentColor" opacity="0.3">
        <rect x="195" y="510" width="10" height="5"/>
        <rect x="595" y="510" width="10" height="5"/>
        <rect x="995" y="510" width="10" height="5"/>
      </g>
      <g transform="translate(400 220)" stroke="currentColor" fill="none" opacity="0.5">
        <circle r="30" stroke-width="2"/>
        <path d="M-30 0 L30 0 M0 -30 L0 30" stroke-width="1"/>
      </g>
      <g transform="translate(800 220)" stroke="currentColor" fill="none" opacity="0.5">
        <circle r="30" stroke-width="2"/>
        <path d="M-30 0 L30 0 M0 -30 L0 30" stroke-width="1"/>
      </g>
    `)
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// PORTRAITS (3:4)
// ═══════════════════════════════════════════════════════════════════════════

const PORTRAIT_VB = "0 0 300 400";

const portraitSvgs = [
  {
    id: "portrait-silhouette-investigator",
    name: "Silhueta · Investigador",
    svg: _svg(PORTRAIT_VB, `
      <defs>
        <radialGradient id="p1" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="300" height="400" fill="url(#p1)"/>
      <g fill="currentColor" opacity="0.85">
        <ellipse cx="150" cy="130" rx="48" ry="58"/>
        <path d="M80 400 L80 260 Q80 200 150 200 Q220 200 220 260 L220 400 Z"/>
        <rect x="125" y="60" width="50" height="35" rx="3"/>
        <rect x="115" y="90" width="70" height="6"/>
      </g>
      <g stroke="currentColor" fill="none" opacity="0.4">
        <circle cx="150" cy="200" r="80" stroke-width="1"/>
      </g>
    `)
  },
  {
    id: "portrait-silhouette-cultist",
    name: "Silhueta · Cultista",
    svg: _svg(PORTRAIT_VB, `
      <g fill="currentColor" opacity="0.85">
        <path d="M150 60 Q90 60 80 200 L70 400 L230 400 L220 200 Q210 60 150 60 Z"/>
        <ellipse cx="150" cy="140" rx="30" ry="35" fill="#0a0807"/>
        <path d="M125 130 Q140 110 150 110 Q160 110 175 130" stroke="currentColor" stroke-width="2" fill="none"/>
      </g>
      <g stroke="currentColor" fill="none" opacity="0.5">
        <circle cx="150" cy="140" r="55" stroke-width="1"/>
        <path d="M150 195 L150 250 M120 220 L180 220" stroke-width="1.5"/>
      </g>
    `)
  },
  {
    id: "portrait-occult-eye",
    name: "Olho Oculto",
    svg: _svg(PORTRAIT_VB, `
      <g transform="translate(150 200)" stroke="currentColor" fill="none">
        <circle r="120" stroke-width="2" opacity="0.6"/>
        <circle r="80" stroke-width="1" opacity="0.5"/>
        <path d="M-90 0 Q0 -60 90 0 Q0 60 -90 0 Z" stroke-width="2" fill="currentColor" fill-opacity="0.15"/>
        <circle r="35" fill="currentColor" fill-opacity="0.4"/>
        <circle r="15" fill="#0a0807"/>
        <g stroke-width="1" opacity="0.4">
          <line x1="-120" y1="0" x2="-140" y2="0"/>
          <line x1="120" y1="0" x2="140" y2="0"/>
          <line x1="0" y1="-120" x2="0" y2="-140"/>
          <line x1="0" y1="120" x2="0" y2="140"/>
        </g>
      </g>
    `)
  },
  {
    id: "portrait-frame-classic",
    name: "Moldura Clássica",
    svg: _svg(PORTRAIT_VB, `
      <g stroke="currentColor" fill="none" stroke-width="3" opacity="0.7">
        <rect x="20" y="20" width="260" height="360"/>
        <rect x="35" y="35" width="230" height="330" stroke-width="1"/>
      </g>
      <g fill="currentColor" opacity="0.5">
        <path d="M20 20 L50 20 L50 50 L20 50 Z"/>
        <path d="M250 20 L280 20 L280 50 L250 50 Z"/>
        <path d="M20 350 L50 350 L50 380 L20 380 Z"/>
        <path d="M250 350 L280 350 L280 380 L250 380 Z"/>
      </g>
      <g fill="currentColor" opacity="0.35">
        <text x="150" y="200" font-family="serif" font-style="italic" font-size="60" text-anchor="middle">?</text>
        <text x="150" y="250" font-family="serif" font-size="14" text-anchor="middle" letter-spacing="2">RETRATO</text>
      </g>
    `)
  },
  {
    id: "portrait-alchemy-symbol",
    name: "Símbolo Alquímico",
    svg: _svg(PORTRAIT_VB, `
      <g transform="translate(150 200)" stroke="currentColor" fill="none">
        <circle r="100" stroke-width="2" opacity="0.7"/>
        <polygon points="0,-90 78,45 -78,45" stroke-width="2" opacity="0.6"/>
        <polygon points="0,90 78,-45 -78,-45" stroke-width="2" opacity="0.5"/>
        <circle r="40" stroke-width="1" opacity="0.5"/>
        <circle r="6" fill="currentColor" opacity="0.6"/>
        <g opacity="0.4" font-family="serif" font-style="italic" font-size="14" fill="currentColor">
          <text x="-3" y="-110" text-anchor="middle">☉</text>
          <text x="-100" y="55" text-anchor="middle">☽</text>
          <text x="100" y="55" text-anchor="middle">☿</text>
        </g>
      </g>
    `)
  },
  {
    id: "portrait-misty-figure",
    name: "Figura Enevoada",
    svg: _svg(PORTRAIT_VB, `
      <defs>
        <radialGradient id="mistP" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.5"/>
          <stop offset="60%" stop-color="currentColor" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="300" height="400" fill="url(#mistP)"/>
      <g fill="currentColor" opacity="0.4">
        <ellipse cx="150" cy="150" rx="45" ry="55"/>
        <path d="M80 400 L100 260 Q100 200 150 200 Q200 200 200 260 L220 400 Z"/>
      </g>
      <g stroke="currentColor" fill="none" opacity="0.2">
        <path d="M0 320 Q75 310 150 320 Q225 330 300 320"/>
        <path d="M0 350 Q75 340 150 350 Q225 360 300 350"/>
        <path d="M0 380 Q75 370 150 380 Q225 390 300 380"/>
      </g>
    `)
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// FOTOS DE DOMÍNIO PÚBLICO
// Vazio por padrão para não mostrar templates quebrados. Para habilitar:
//   1. Baixe a foto (Wikimedia Commons / Public Domain Review)
//   2. Salve em assets/templates/banners/ ou /portraits/
//   3. Adicione a entrada no array correspondente, ex:
//      { id: "banner-photo-library", name: "Biblioteca Vitoriana", kind: "photo",
//        path: "assets/templates/banners/victorian-library.jpg",
//        credit: "Wikimedia Commons · Public Domain" }
// ═══════════════════════════════════════════════════════════════════════════

const bannerPhotos = [];

const portraitPhotos = [];

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR
// ═══════════════════════════════════════════════════════════════════════════

window.CoCData.imageTemplates = {
  banners: [
    ...bannerSvgs.map(t => ({ ...t, kind: "svg" })),
    ...bannerPhotos
  ],
  portraits: [
    ...portraitSvgs.map(t => ({ ...t, kind: "svg" })),
    ...portraitPhotos
  ]
};

/* Como adicionar suas próprias fotos:
   1. Baixe imagem de domínio público (Wikimedia Commons, Public Domain Review etc.)
   2. Salve em assets/templates/banners/ ou assets/templates/portraits/
   3. Adicione entrada em bannerPhotos / portraitPhotos acima com o path correto
   4. Recarregue a página — aparece automaticamente na biblioteca
*/
