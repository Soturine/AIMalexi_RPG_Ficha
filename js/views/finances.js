/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/finances.js
   View de Finanças — extração do investigator.js (Strangler M3.7)

   Responsabilidades:
   - Renderizar card de finanças: Nível de Crédito, derivados, Dinheiro em Mãos
   - Bindar botões ±100/±10/±1 (ajuste de caixa)
   - Bindar input de Crédito (recalcula derivados sem full re-render)
   - Publicar bus events em vez de chamar persistCurrent/markDirty diretamente

   Bus events emitidos:
     finances:persist-requested → investigator.js chama persistCurrent()
     skill:persist-requested    → re-usa subscriber existente (Crédito é perícia)

   Depende de:
   - window.CoC.store, window.CoC.bus
   - window.CoC.rules.calcFinances
   - window.CoCData.findOccupation
   - window.CoC.ui.toast, window.CoC.views.skills.render (para sincronismo de perícia)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  var _store = null;
  var _bus   = null;

  function $s(sel, root) { return (root || document).querySelector(sel); }

  // ── Helpers de domínio ────────────────────────────────────────────────────
  function _ensureFinances(c) {
    if (!c.finances || typeof c.finances !== 'object') c.finances = { cash: 0 };
    c.finances.cash = Number(c.finances.cash) || 0;
    return c.finances;
  }

  function _getCreditRating(c) {
    return Number(c && c.skills && c.skills['Nível de Crédito'] && c.skills['Nível de Crédito'].value) || 0;
  }

  function _setCreditRating(c, v) {
    c.skills = c.skills || {};
    c.skills['Nível de Crédito'] = c.skills['Nível de Crédito'] || {};
    c.skills['Nível de Crédito'].value = v;
  }

  function _formatMoney(n) {
    var v = Number(n) || 0;
    var str = Number.isInteger(v)
      ? v.toLocaleString('pt-BR')
      : v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return '$' + str;
  }

  function _persist() {
    if (_bus) _bus.publish('finances:persist-requested', {});
  }

  // ── adjustCash (chamável externamente para testes de integração) ──────────
  function adjustCash(delta) {
    var c = _store ? _store.getState().character : null;
    if (!c) return;
    var fin = _ensureFinances(c);
    var next = fin.cash + delta;
    if (next < 0) next = 0;
    fin.cash = next;
    var span = $s('#fin-cash');
    if (span) span.textContent = _formatMoney(fin.cash);
    _persist();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    var host = $s('#finances-card');
    if (!host) return;
    var c = _store ? _store.getState().character : null;
    if (!c) { host.innerHTML = ''; return; }
    var fin = _ensureFinances(c);

    var occName  = c.investigator && c.investigator.occupation;
    var occ      = occName && window.CoCData ? window.CoCData.findOccupation(occName) : null;
    var range    = occ && Array.isArray(occ.credit) ? occ.credit : null;
    var cr       = _getCreditRating(c);
    var derived  = window.CoC.rules.calcFinances(cr);

    host.innerHTML = (
      '<div class="fin-credit-row">' +
        '<label class="fin-credit">Nível de Crédito' +
          '<input type="number" id="fin-cr" min="0" max="99" step="1" inputmode="numeric" value="' + cr + '" />' +
          '<span class="dim">/ 99</span>' +
        '</label>' +
        (range
          ? '<span class="fin-hint">Faixa da ocupação: <b>' + range[0] + '–' + range[1] + '%</b></span>'
          : '<span class="fin-hint dim">Defina a ocupação para ver a faixa de Posses</span>') +
      '</div>' +
      '<div class="fin-derived">' +
        'Nível: <b id="fin-tier">' + derived.tierLabel + '</b>' +
        ' · Nível de Gastos: <b id="fin-spend">' + _formatMoney(derived.spending) + '</b>' +
        ' · Patrimônio: <b id="fin-assets">' + _formatMoney(derived.assets) + '</b>' +
      '</div>' +
      '<div class="fin-wallet">' +
        '<span class="fin-wallet-label">Dinheiro em Mãos</span>' +
        '<span class="fin-wallet-value" id="fin-cash">' + _formatMoney(fin.cash) + '</span>' +
        '<button id="fin-seed" class="btn-ghost no-print" title="Definir o dinheiro à mão com a Caixa inicial do Crédito">↻ inicial</button>' +
      '</div>' +
      '<div class="fin-buttons no-print">' +
        '<div class="fin-btn-row">' +
          '<button type="button" data-cash="100"  class="btn-cash gain">+100</button>' +
          '<button type="button" data-cash="10"   class="btn-cash gain">+10</button>' +
          '<button type="button" data-cash="1"    class="btn-cash gain">+1</button>' +
        '</div>' +
        '<div class="fin-btn-row">' +
          '<button type="button" data-cash="-100" class="btn-cash spend">−100</button>' +
          '<button type="button" data-cash="-10"  class="btn-cash spend">−10</button>' +
          '<button type="button" data-cash="-1"   class="btn-cash spend">−1</button>' +
        '</div>' +
      '</div>'
    );

    // Crédito: recalcula derivados sem full re-render
    var crInput = $s('#fin-cr', host);
    crInput.onchange = function() {
      var v = Math.round(Number(crInput.value));
      if (!isFinite(v) || v < 0) v = 0;
      if (v > 99) v = 99;
      crInput.value = v;
      _setCreditRating(c, v);
      var d = window.CoC.rules.calcFinances(v);
      $s('#fin-tier',   host).textContent = d.tierLabel;
      $s('#fin-spend',  host).textContent = _formatMoney(d.spending);
      $s('#fin-assets', host).textContent = _formatMoney(d.assets);
      // "Nível de Crédito" é perícia — sincroniza a aba de perícias
      if (window.CoC.views.skills && window.CoC.views.skills.render) {
        window.CoC.views.skills.render();
      }
      // Reutiliza subscriber skill:persist-requested em boot() (Crédito é perícia)
      if (_bus) _bus.publish('skill:persist-requested', {});
    };

    // Semente de caixa inicial
    $s('#fin-seed', host).onclick = function() {
      var d = window.CoC.rules.calcFinances(_getCreditRating(c));
      fin.cash = d.cash;
      $s('#fin-cash', host).textContent = _formatMoney(fin.cash);
      _persist();
      var ui = window.CoC.ui || {};
      if (ui.toast) {
        ui.toast(
          'Dinheiro em Mãos definido em ' + _formatMoney(fin.cash) +
          ' (inicial do Nível de Crédito ' + _getCreditRating(c) + ').',
          { type: 'success', duration: 2600 }
        );
      }
    };

    // Botões ±100/±10/±1
    host.querySelectorAll('[data-cash]').forEach(function(b) {
      b.onclick = function() { adjustCash(parseInt(b.dataset.cash, 10)); };
    });
  }

  function init(store) {
    _store = store || window.CoC.store;
    _bus   = window.CoC.bus;
  }

  window.CoC.views.finances = Object.freeze({ render: render, init: init, adjustCash: adjustCash });

})();
