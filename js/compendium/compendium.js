/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/compendium/compendium.js
   Popula o Compêndio de Regras a partir dos dados existentes.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {

  function $s(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  function _initTabs() {
    var tabs     = $all('.comp-tab');
    var sections = $all('.comp-section');

    tabs.forEach(function (tab) {
      tab.onclick = function () {
        var target = tab.dataset.section;
        tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.section === target); });
        sections.forEach(function (s) { s.classList.toggle('active', s.dataset.section === target); });
      };
    });
  }

  // ── Skills ────────────────────────────────────────────────────────────────
  function _renderSkills() {
    var container = $s('#skills-ref-grid');
    if (!container) return;
    var skills = (window.CoCData && window.CoCData.skills) || [];

    var catLabels = {
      combat:        'Combate',
      investigative: 'Investigação',
      social:        'Social',
      physical:      'Físico',
      knowledge:     'Conhecimento',
      technical:     'Técnico',
      mythos:        'Mythos',
      art:           'Arte',
      language:      'Idioma'
    };

    container.innerHTML = skills.map(function (sk) {
      var baseLabel = sk.base != null
        ? sk.base + '%'
        : (sk.baseFormula || '—');
      return '<div class="skill-ref-row">' +
        '<span class="srr-name">' + esc(sk.name) + '</span>' +
        '<span class="srr-cat">' + esc(catLabels[sk.category] || sk.category || '') + '</span>' +
        '<span class="srr-base">' + esc(baseLabel) + '</span>' +
      '</div>';
    }).join('');
  }

  // ── Occupations ───────────────────────────────────────────────────────────
  function _renderOccupations() {
    var container = $s('#occupations-ref-grid');
    if (!container) return;
    var occs = (window.CoCData && window.CoCData.occupations) || [];

    container.innerHTML = occs.map(function (occ) {
      var creditStr = occ.credit ? occ.credit[0] + '–' + occ.credit[1] + '%' : '—';
      var skills    = (occ.skills || []).join(', ');
      var anyNote   = occ.anySkillsCount ? ' + ' + occ.anySkillsCount + ' livre(s)' : '';
      return '<div class="occ-ref-card">' +
        '<div class="orc-name">' + esc(occ.name) + '</div>' +
        '<div class="orc-formula">Pontos: <b>' + esc(occ.pointsFormula || '—') + '</b></div>' +
        '<div class="orc-credit">Nível de Crédito: ' + creditStr + '</div>' +
        '<div class="orc-skills">' + esc(skills + anyNote) + '</div>' +
        (occ.description ? '<div class="orc-desc">' + esc(occ.description) + '</div>' : '') +
      '</div>';
    }).join('');
  }

  // ── Bestiary reference ────────────────────────────────────────────────────
  function _renderBestiary() {
    var container = $s('#bestiary-ref-grid');
    if (!container) return;
    var creatures = (window.CoCData && window.CoCData.bestiary) || [];

    container.innerHTML = creatures.map(function (cr) {
      var s   = cr.stats   || {};
      var der = cr.derived || {};
      return '<div class="bref-card type-' + esc(cr.type || 'mythos') + '">' +
        '<div class="brc-name">' + esc(cr.name) + '</div>' +
        '<div class="brc-type">' + esc(cr.category || cr.type || '') + '</div>' +
        '<div class="brc-stats">' +
          '<span><b>PV</b> ' + esc(der.hp || '?') + '</span>' +
          '<span><b>MOV</b> ' + esc(der.mov || '?') + '</span>' +
          '<span><b>BD</b> ' + esc(der.db || '0') + '</span>' +
          (cr.armor ? '<span><b>Arm</b> ' + esc(cr.armor) + '</span>' : '') +
        '</div>' +
        '<div class="brc-san">SAN ' + esc(cr.sanLoss || '—') + '</div>' +
      '</div>';
    }).join('');
  }

  // ── Search ────────────────────────────────────────────────────────────────
  function _initSearch() {
    var input = $s('#comp-search');
    if (!input) return;

    input.oninput = function () {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        $all('.skill-ref-row, .occ-ref-card, .bref-card, .attr-ref-card').forEach(function (el) {
          el.style.display = '';
        });
        return;
      }
      $all('.skill-ref-row, .occ-ref-card, .bref-card, .attr-ref-card').forEach(function (el) {
        var text = el.textContent.toLowerCase();
        el.style.display = text.includes(q) ? '' : 'none';
      });
    };
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    _initTabs();
    _renderSkills();
    _renderOccupations();
    _renderBestiary();
    _initSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
