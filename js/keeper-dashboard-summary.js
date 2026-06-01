/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/keeper-dashboard-summary.js
   Fase D — Dashboard executivo do Guardião (acima das abas).

   Visão de 10s da campanha: KPIs (investigadores/NPCs), alertas (SAN crítica) e
   últimos eventos. SÓ LEITURA — deriva de campaign-store + bestiário; não altera
   store/persistência/engine. A matemática dos KPIs é PURA (testável no runner).

   Expõe: window.CoC.keeperOverview = { init, computeInvestigatorKpis }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {
  'use strict';

  function num(x) { return Number(x) || 0; }

  // PURA: KPIs dos investigadores a partir do mapa campaign-store.investigators.
  function computeInvestigatorKpis(investigators) {
    var list = Object.keys(investigators || {}).map(function (k) { return investigators[k]; });
    var total = list.length;
    function avg(sel) {
      if (!total) return 0;
      return Math.round(list.reduce(function (a, i) { return a + num(sel(i)); }, 0) / total);
    }
    var critical = list.filter(function (i) {
      var s = i && i.status ? i.status : {};
      var max = num(s.sanMax) || 99;
      return num(s.san) > 0 && num(s.san) <= Math.max(1, Math.round(max * 0.2));
    });
    return {
      total:   total,
      online:  list.filter(function (i) { return i && i.online; }).length,
      alive:   list.filter(function (i) { return num(i.status && i.status.hp) > 0; }).length,
      sanAvg:  avg(function (i) { return i.status && i.status.san; }),
      hpAvg:   avg(function (i) { return i.status && i.status.hp; }),
      critical: critical
    };
  }

  // ── Render (DOM; validado no navegador) ─────────────────────────────────────
  function _esc(s) {
    var ui = window.CoC.ui;
    if (ui && ui.escapeHtml) return ui.escapeHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function _kpi(label, value, hint) {
    return '<div class="ko-kpi"><span class="ko-kpi-val">' + _esc(value) + '</span>' +
           '<span class="ko-kpi-label">' + _esc(label) + '</span>' +
           (hint ? '<span class="ko-kpi-hint">' + _esc(hint) + '</span>' : '') + '</div>';
  }

  function _bestiaryCount() {
    try { return (window.CoCData && window.CoCData.bestiary ? window.CoCData.bestiary.length : 0); }
    catch (e) { return 0; }
  }

  function render() {
    var root = document.getElementById('keeper-overview');
    if (!root) return;

    var store = window.CoC.campaign && window.CoC.campaign.store;
    var st = store ? store.getState() : { investigators: {}, timeline: [], status: 'disconnected' };
    var k = computeInvestigatorKpis(st.investigators);
    var connected = st.status === 'active';

    var statusEl = document.getElementById('ko-status');
    if (statusEl) statusEl.textContent = connected ? (k.online + '/' + k.total + ' online') : 'Sem campanha ativa';

    // KPIs
    var kpis = document.getElementById('ko-kpis');
    if (kpis) {
      if (!connected && k.total === 0) {
        kpis.innerHTML = '<div class="ko-empty">Nenhuma campanha ativa. Crie ou entre na aba <b>Investigadores</b>.</div>';
      } else {
        kpis.innerHTML =
          _kpi('Investigadores', k.total, k.online + ' online') +
          _kpi('Vivos', k.alive + '/' + k.total) +
          _kpi('SAN média', k.sanAvg) +
          _kpi('PV médio', k.hpAvg) +
          _kpi('NPCs', _bestiaryCount(), 'no bestiário');
      }
    }

    // Alertas
    var alerts = document.querySelector('#ko-alerts .ko-body');
    if (alerts) {
      if (k.critical.length) {
        alerts.innerHTML = k.critical.map(function (i) {
          return '<div class="ko-alert">🧠 <b>' + _esc(i.characterName || i.playerName || '—') +
                 '</b> · SAN crítica (' + num(i.status && i.status.san) + ')</div>';
        }).join('');
      } else {
        alerts.innerHTML = '<div class="ko-none">Sem alertas.</div>';
      }
    }

    // Últimos eventos (timeline)
    var tl = document.querySelector('#ko-timeline .ko-body');
    if (tl) {
      var ev = (st.timeline || []).slice(-6).reverse();
      tl.innerHTML = ev.length
        ? ev.map(function (e) { return '<div class="ko-ev ' + _esc(e.cls || '') + '">' + _esc(e.text || e.type || '') + '</div>'; }).join('')
        : '<div class="ko-none">Sem eventos ainda.</div>';
    }
  }

  function init() {
    if (!document.getElementById('keeper-overview')) return;
    var store = window.CoC.campaign && window.CoC.campaign.store;
    if (store && store.subscribe) store.subscribe(render);
    render();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  window.CoC.keeperOverview = { init: init, computeInvestigatorKpis: computeInvestigatorKpis };
})();
