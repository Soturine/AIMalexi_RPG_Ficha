/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · data/image-templates.js
   Imagens-padrão temáticas (1920s / Mitos) para banner e retrato.

   São SVGs inline (data-URI) — zero assets binários, leves, offline.
   Consumíveis diretamente por window.CoC.mediaPicker.render(el, uri):
   o render aceita data-URI da mesma forma que um blobId de upload.

   Atribui a window.CoCData.imageTemplates.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoCData = window.CoCData || {};

(function () {

  // Converte um SVG textual em data-URI (encode seguro de #, espaços, etc.)
  function svgURI(svg) {
    return "data:image/svg+xml," + encodeURIComponent(svg.replace(/\s{2,}/g, " ").trim());
  }

  const BANNER_FOG = `
    <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='300'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#1c1813'/>
          <stop offset='1' stop-color='#0a0807'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='300' fill='url(#g)'/>
      <g fill='none' stroke='#b8924f' stroke-opacity='0.22'>
        <path d='M0 210 Q300 170 600 210 T1200 210'/>
        <path d='M0 240 Q300 200 600 240 T1200 240'/>
        <path d='M0 270 Q300 230 600 270 T1200 270'/>
      </g>
    </svg>`;

  const BANNER_DECO = `
    <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='300'>
      <rect width='1200' height='300' fill='#15110d'/>
      <g stroke='#b8924f' stroke-opacity='0.5' fill='none' stroke-width='2'>
        <rect x='20' y='20' width='1160' height='260'/>
        <path d='M600 30 L640 70 L600 110 L560 70 Z' fill='#b8924f' fill-opacity='0.3'/>
        <line x1='40' y1='150' x2='540' y2='150'/>
        <line x1='660' y1='150' x2='1160' y2='150'/>
      </g>
    </svg>`;

  const BANNER_SIGIL = `
    <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='300'>
      <defs>
        <radialGradient id='r' cx='0.5' cy='0.5' r='0.6'>
          <stop offset='0' stop-color='#241e17'/>
          <stop offset='1' stop-color='#0a0807'/>
        </radialGradient>
      </defs>
      <rect width='1200' height='300' fill='url(#r)'/>
      <g transform='translate(600 150)' stroke='#5a7a8a' stroke-opacity='0.45' fill='none'>
        <circle r='90'/>
        <circle r='60'/>
        <path d='M0 -90 L78 45 L-78 45 Z'/>
      </g>
    </svg>`;

  const PORTRAIT_SILHOUETTE = `
    <svg xmlns='http://www.w3.org/2000/svg' width='480' height='640'>
      <rect width='480' height='640' fill='#15110d'/>
      <g transform='translate(240 360)' fill='#0a0807' stroke='#b8924f' stroke-opacity='0.35'>
        <ellipse cx='0' cy='-140' rx='95' ry='110'/>
        <path d='M-160 220 Q-160 40 0 40 Q160 40 160 220 Z'/>
      </g>
    </svg>`;

  window.CoCData.imageTemplates = [
    { id: "banner-fog",    kind: "banner",   name: "Névoa de Arkham",  uri: svgURI(BANNER_FOG) },
    { id: "banner-deco",   kind: "banner",   name: "Art Déco",         uri: svgURI(BANNER_DECO) },
    { id: "banner-sigil",  kind: "banner",   name: "Selo dos Mitos",   uri: svgURI(BANNER_SIGIL) },
    { id: "portrait-silh", kind: "portrait", name: "Silhueta",         uri: svgURI(PORTRAIT_SILHOUETTE) }
  ];

  // Atalho: retorna templates de um tipo ("banner" | "portrait").
  window.CoCData.imageTemplatesOf = function (kind) {
    return window.CoCData.imageTemplates.filter((t) => t.kind === kind);
  };

})();
