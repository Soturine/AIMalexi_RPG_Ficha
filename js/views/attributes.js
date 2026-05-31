/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/attributes.js
   View de Atributos Primários — extração do investigator.js (Strangler M3.9)

   Responsabilidades:
   - Renderizar grid de atributos primários (#sidebar-attributes)
   - Suportar modo edição (contenteditable) com clamp 0–99
   - Disparar RECALC_DERIVED via store após edição manual
   - Publicar identity:persist-requested para persistência

   Depende de:
   - window.CoC.store   (dispatch RECALC_DERIVED + getState)
   - window.CoC.bus     (publish persist-requested)
   - window.CoC.dice    (half, fifth — para frações)
   - window.CoC.ui      (el, escapeHtml)
   - opts.getEditMode() — callback que retorna boolean (injetado pelo orquestrador)

   Nota: editMode vive em state do investigator.js. Enquanto o orquestrador não for
   migrado para store, o acesso se dá via callback para evitar acoplamento direto.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  var _store      = null;
  var _bus        = null;
  var _getEditMode = function() { return false; };

  var ATTRS = ['FOR', 'CON', 'TAM', 'DES', 'APA', 'INT', 'POD', 'EDU', 'Sorte'];

  function $s(sel)    { return document.querySelector(sel); }
  function _persist() { if (_bus) _bus.publish('identity:persist-requested', {}); }
  function _recalc()  { if (_store) _store.dispatch({ type: 'RECALC_DERIVED' }); }

  function _escHtml(s) {
    var ui = window.CoC.ui || {};
    if (ui.escapeHtml) return ui.escapeHtml(s);
    return String(s).replace(/[&<>"']/g, function(c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function _mkEl(tag, attrs, children) {
    var ui = window.CoC.ui || {};
    if (ui.el) return ui.el(tag, attrs, children);
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(k) {
      if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function(ch) {
      if (typeof ch === 'string') e.appendChild(document.createTextNode(ch));
      else if (ch) e.appendChild(ch);
    });
    return e;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    var grid = $s('#sidebar-attributes');
    if (!grid) return;
    grid.innerHTML = '';
    var c = _store ? _store.getState().character : null;
    if (!c || !c.attributes) return;

    var editMode = _getEditMode();
    var dice     = window.CoC.dice;

    ATTRS.forEach(function(code) {
      var attr = c.attributes[code];
      if (!attr) return;
      var v   = Number(attr.value) || 0;
      var row = _mkEl('div', { class: 'sattr-row', 'data-attr': code });

      var valNode = _mkEl('span', {
        class: 'sattr-value',
        contenteditable: editMode ? 'true' : 'false',
        title: _escHtml(attr.rolled || '')
      }, [String(v)]);

      var half  = dice ? dice.half(v)  : Math.floor(v / 2);
      var fifth = dice ? dice.fifth(v) : Math.floor(v / 5);

      row.appendChild(_mkEl('span', { class: 'sattr-label' }, [_escHtml(code)]));
      row.appendChild(valNode);
      row.appendChild(_mkEl('span', { class: 'sattr-fracs' }, ['½' + half + ' · ⅕' + fifth]));
      grid.appendChild(row);
    });

    if (editMode) {
      grid.querySelectorAll('.sattr-value').forEach(function(node) {
        node.onkeydown = function(e) {
          if (e.key === 'Enter')  { e.preventDefault(); node.blur(); }
          if (e.key === 'Escape') {
            e.preventDefault();
            var row  = node.closest('.sattr-row');
            var code = row && row.dataset.attr;
            var char = _store ? _store.getState().character : null;
            if (code && char && char.attributes && char.attributes[code]) {
              node.textContent = String(char.attributes[code].value);
            }
            node.blur();
          }
        };
        node.onblur = function() {
          var row  = node.closest('.sattr-row');
          var code = row && row.dataset.attr;
          if (!code) return;
          var char = _store ? _store.getState().character : null;
          if (!char || !char.attributes || !char.attributes[code]) return;
          var v = Math.max(0, Math.min(99, parseInt(node.textContent, 10) || 0));
          // Mutação direta ainda necessária enquanto state.character não está 100% no store
          char.attributes[code].value = v;
          render();
          _recalc();
          if (window.CoC.views.vitals && window.CoC.views.vitals.render) window.CoC.views.vitals.render();
          if (window.CoC.views.skills && window.CoC.views.skills.render) window.CoC.views.skills.render();
          _persist();
        };
      });
    }
  }

  function init(store, opts) {
    _store       = store || window.CoC.store;
    _bus         = window.CoC.bus;
    _getEditMode = (opts && typeof opts.getEditMode === 'function') ? opts.getEditMode : function() { return false; };
  }

  window.CoC.views.attributes = Object.freeze({ render: render, init: init });

})();
