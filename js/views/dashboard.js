/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/dashboard.js
   ETAPA 20 — Dashboard Executivo do investigador (topo da aba Personagem).

   Painel de relance: vitais em destaque (PV/SAN/PM/Sorte), últimas rolagens,
   condições ativas e equipamento principal. READ-ONLY — deriva do store + log.

   Expõe: window.CoC.views.dashboard = { init, render }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {
  'use strict';

  function _esc(s) {
    var ui = window.CoC.ui;
    if (ui && ui.escapeHtml) return ui.escapeHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // Condições conhecidas (espelha vitals.js + state-machine)
  var COND_LABELS = {
    sangrando: '🩸 Sangrando', envenenado: '☠ Envenenado', atordoado: '💫 Atordoado',
    exausto: '😵 Exausto', tempInsane: '🌀 Loucura Temp.', indefInsane: '🌑 Loucura Indef.',
    incurablyInsane: '⚫ Loucura Incurável', majorWound: '🩹 Ferimento Grave',
    unconscious: '💤 Inconsciente', dying: '⚰ Morrendo', dead: '☠ Morto'
  };

  function _vitalCard(label, cur, max, cls) {
    var frac = (max != null) ? (cur + '<span class="ed-vital-max">/' + max + '</span>') : cur;
    var pct = (max && max > 0) ? Math.max(0, Math.min(100, (cur / max) * 100)) : 100;
    return '<div class="ed-vital ' + cls + '">' +
      '<div class="ed-vital-label">' + label + '</div>' +
      '<div class="ed-vital-val">' + frac + '</div>' +
      (max != null ? '<div class="ed-vital-bar"><i style="width:' + pct + '%"></i></div>' : '') +
    '</div>';
  }

  function render() {
    var root = document.getElementById('exec-dashboard');
    if (!root) return;
    var store = window.CoC.store;
    var c = store ? store.getState().character : null;
    if (!c) { root.innerHTML = ''; return; }

    var d = c.derived || {};
    var pv = d.PV || {}, pm = d.PM || {}, san = d.SAN || {};
    var sorte = (c.attributes && c.attributes.Sorte) ? c.attributes.Sorte.value : 0;
    var name = (c.investigator && c.investigator.name) || 'Investigador';

    // ── Vitais ──
    var vitals = '<div class="ed-vitals">' +
      _vitalCard('Pontos de Vida', (pv.current != null ? pv.current : pv.value) || 0, pv.value || 0, 'pv') +
      _vitalCard('Sanidade', (san.current != null ? san.current : san.value) || 0, san.max || 0, 'san') +
      _vitalCard('Pontos de Magia', (pm.current != null ? pm.current : pm.value) || 0, pm.value || 0, 'pm') +
      _vitalCard('Sorte', sorte, null, 'luck') +
    '</div>';

    // ── Últimas rolagens (do log no DOM) ──
    var rollItems = [];
    var logLis = document.querySelectorAll('#roll-log ul li');
    for (var i = 0; i < Math.min(3, logLis.length); i++) {
      var li = logLis[i];
      var skill = li.querySelector('.skill');
      var level = li.querySelector('.level');
      rollItems.push('<div class="ed-roll ' + _esc(li.className.replace('roll-entry', '').trim()) + '">' +
        '<span class="ed-roll-skill">' + (skill ? skill.innerHTML : '—') + '</span>' +
        '<span class="ed-roll-level">' + (level ? level.textContent : '') + '</span>' +
      '</div>');
    }
    var rolls = '<div class="ed-block"><div class="ed-block-title">Últimas Rolagens</div>' +
      (rollItems.length ? rollItems.join('') : '<div class="ed-empty">Nenhuma rolagem ainda.</div>') + '</div>';

    // ── Condições ativas ──
    var status = c.status || {};
    var activeConds = Object.keys(COND_LABELS).filter(function (k) { return !!status[k]; });
    var conds = '<div class="ed-block"><div class="ed-block-title">Condições Ativas</div>' +
      (activeConds.length
        ? '<div class="ed-cond-chips">' + activeConds.map(function (k) {
            return '<span class="ed-cond">' + COND_LABELS[k] + '</span>';
          }).join('') + '</div>'
        : '<div class="ed-empty">Nenhuma — investigador saudável.</div>') + '</div>';

    // ── Equipamento principal (armas + slots equipados) ──
    var equip = [];
    (Array.isArray(c.weapons) ? c.weapons : []).slice(0, 4).forEach(function (w) {
      if (w && w.name) equip.push((w.icon ? w.icon + ' ' : '⚔ ') + _esc(w.name));
    });
    var slots = c.bodySlots || {};
    Object.keys(slots).forEach(function (sid) {
      var v = slots[sid];
      var items = v == null ? [] : (Array.isArray(v) ? v : [v]);
      items.forEach(function (it) { if (it && it.name && equip.length < 8) equip.push((it.icon ? it.icon + ' ' : '🎒 ') + _esc(it.name)); });
    });
    var equipBlock = '<div class="ed-block"><div class="ed-block-title">Equipamento Principal</div>' +
      (equip.length
        ? '<div class="ed-equip">' + equip.map(function (e) { return '<span class="ed-equip-item">' + e + '</span>'; }).join('') + '</div>'
        : '<div class="ed-empty">Sem equipamento registrado.</div>') + '</div>';

    root.innerHTML =
      '<div class="ed-head"><span class="ed-name">' + _esc(name) + '</span>' +
        '<span class="ed-tag">Resumo do Investigador</span></div>' +
      vitals +
      '<div class="ed-grid">' + rolls + conds + equipBlock + '</div>';
  }

  // Ações que afetam o dashboard (vitais, condições, equipamento, atributos)
  var WATCH = {
    APPLY_DAMAGE: 1, HEAL_DAMAGE: 1, LOSE_SANITY: 1, RECOVER_SANITY: 1,
    SPEND_MAGIC: 1, RESTORE_MAGIC: 1, ADD_MYTHOS: 1, RECALC_DERIVED: 1,
    ADD_STATUS: 1, REMOVE_STATUS: 1, SET_ARMOR: 1, SET_BODY_SLOT: 1,
    ADD_WEAPON: 1, UPDATE_WEAPON: 1, REMOVE_WEAPON: 1, RELOAD_WEAPON: 1,
    SET_ATTRIBUTE: 1
  };

  function init() {
    var bus = window.CoC.bus;
    if (!bus || !bus.subscribe) return;
    // Re-renderiza quando uma rolagem é registrada (log no DOM mudou)
    bus.subscribe('roll:badge-inc', function () { render(); });
    // Re-renderiza em mudanças de estado relevantes
    bus.subscribe('store:dispatch', function (event) {
      if (event && event.changed && event.action && WATCH[event.action.type]) render();
    });
  }

  window.CoC.views.dashboard = Object.freeze({ init: init, render: render });

})();
