/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/background.js
   View de Antecedentes — extração do investigator.js (Strangler M3.6)

   Responsabilidades:
   - Preencher campos de texto do background (description, ideology, etc.)
   - Preencher status toggles (majorWound, unconscious, dying, insanity)
   - Preencher textarea de equipamento livre
   - Publicar bus events em vez de chamar markDirty/persistCurrent diretamente

   Bus events emitidos:
     background:dirty            → investigator.js chama markDirty()
     background:persist-requested → investigator.js chama persistCurrent()

   Depende de: window.CoC.store, window.CoC.bus
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  var _store = null;
  var _bus   = null;

  var BG_TEXT_FIELDS = [
    'description', 'ideology', 'significantPeople', 'meaningfulLocations',
    'treasuredPossessions', 'traits', 'injuriesScars', 'phobiasManias',
    'tomes', 'encounters'
  ];
  var STATUS_BOOL_FIELDS   = ['majorWound', 'unconscious', 'dying'];
  var STATUS_STRING_FIELDS = ['temporaryInsanity', 'indefiniteInsanity'];

  function $s(sel) { return document.querySelector(sel); }

  function _dirty()   { if (_bus) _bus.publish('background:dirty', {}); }
  function _persist() { if (_bus) _bus.publish('background:persist-requested', {}); }

  function render() {
    var c = _store ? _store.getState().character : null;
    if (!c) return;
    c.background = c.background || {};
    c.status     = c.status     || {};

    // Campos de texto
    BG_TEXT_FIELDS.forEach(function(f) {
      var node = document.querySelector('[data-bind="background.' + f + '"]');
      if (!node) return;
      node.value   = c.background[f] || '';
      node.oninput = function() { c.background[f] = node.value; _dirty(); };
      node.onblur  = _persist;
    });

    // Status — checkboxes booleanos
    STATUS_BOOL_FIELDS.forEach(function(f) {
      var node = document.querySelector('[data-bind="status.' + f + '"]');
      if (!node) return;
      node.checked  = !!c.status[f];
      node.onchange = function() { c.status[f] = node.checked; _persist(); };
    });

    // Status — campos de texto livre (insanias)
    STATUS_STRING_FIELDS.forEach(function(f) {
      var node = document.querySelector('[data-bind="status.' + f + '"]');
      if (!node) return;
      node.value   = c.status[f] || '';
      node.oninput = function() { c.status[f] = node.value; _dirty(); };
      node.onblur  = _persist;
    });

    // Equipamento livre como textarea (array serializado em linhas)
    var equipNode = $s('#bg-equipment');
    if (equipNode) {
      equipNode.value   = (c.equipment || []).join('\n');
      equipNode.oninput = function() {
        c.equipment = equipNode.value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
        _dirty();
      };
      equipNode.onblur  = _persist;
    }
  }

  function init(store) {
    _store = store || window.CoC.store;
    _bus   = window.CoC.bus;
  }

  window.CoC.views.background = Object.freeze({ render: render, init: init });

})();
