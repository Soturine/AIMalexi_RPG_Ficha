/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/keeper-tabs.js
   Fase RK — controlador das 7 abas do Mestre. Mostra/oculta .ktab-panel
   conforme a aba ativa; lembra a última aba (localStorage). Independente do
   keeper.js (não toca em ids existentes).
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var KEY = 'aimalexi-rpg/keeper-tab';

  function init() {
    var nav = document.getElementById('keeper-tabs');
    if (!nav) return;
    var tabs   = Array.prototype.slice.call(nav.querySelectorAll('.keeper-tab'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.ktab-panel'));
    if (!tabs.length || !panels.length) return;

    function show(name) {
      tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.ktab === name); });
      panels.forEach(function (p) { p.classList.toggle('active', p.dataset.ktab === name); });
      try { localStorage.setItem(KEY, name); } catch (e) {}
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { show(t.dataset.ktab); });
    });

    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved && document.querySelector('.ktab-panel[data-ktab="' + saved + '"]')) show(saved);

    _initOverflow();
  }

  // §13 mobile — menu overflow ⋮ do toolbar (dropdown)
  function _initOverflow() {
    var btn = document.getElementById('btn-overflow');
    var actions = document.getElementById('toolbar-actions');
    if (!btn || !actions) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = actions.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    actions.addEventListener('click', function (e) {
      if (e.target.closest('button, a')) {
        actions.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('click', function (e) {
      if (actions.classList.contains('open') &&
          !e.target.closest('#toolbar-actions') && !e.target.closest('#btn-overflow')) {
        actions.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
