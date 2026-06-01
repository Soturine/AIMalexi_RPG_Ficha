/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/keeper-notes.js
   Fase RK — persistência local da Lore (T6) e do Diário do Mestre (T7).
   Textareas salvas em localStorage (prefixo aimalexi-rpg/), debounced.
   Sobrevivem a reload. (Persistência multi-dispositivo virá com a Fase M.)
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var PREFIX = 'aimalexi-rpg/';

  function _get(key, def) {
    try { var v = localStorage.getItem(PREFIX + key); return v == null ? def : JSON.parse(v); }
    catch (e) { return def; }
  }
  function _set(key, val) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (e) {}
  }
  function _debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
  function _bind(el, read, write) {
    if (!el) return;
    el.value = read() || '';
    el.addEventListener('input', _debounce(function () { write(el.value); }, 400));
  }

  function init() {
    // T6 — Lore por categoria
    var lore = _get('keeper-lore', {});
    ['faccoes', 'misterios', 'locais', 'pistas', 'personagens', 'cronologia'].forEach(function (f) {
      _bind(document.getElementById('lore-' + f),
        function () { return lore[f]; },
        function (v) { lore[f] = v; _set('keeper-lore', lore); });
    });

    // T7 — Diário do Mestre (texto livre)
    _bind(document.getElementById('keeper-journal'),
      function () { return _get('keeper-journal', ''); },
      function (v) { _set('keeper-journal', v); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.CoC = window.CoC || {};
  window.CoC.keeperNotes = { init: init };
})();
