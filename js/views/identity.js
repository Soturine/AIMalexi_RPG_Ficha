/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/identity.js
   View de Identidade — extração do investigator.js (Strangler M3.8)

   Responsabilidades:
   - Preencher campos de texto da identidade (nome, ocupação, idade, etc.)
   - Atualizar sidebar (nome e ocupação)
   - Bindar imagem de retrato via mediaPicker
   - Publicar bus events em vez de chamar markDirty/persistCurrent diretamente
   - Disparar RECALC_DERIVED via store ao mudar idade

   Bus events emitidos:
     identity:persist-requested → investigator.js chama persistCurrent()
     identity:dirty             → investigator.js chama markDirty()

   Depende de:
   - window.CoC.store, window.CoC.bus
   - window.CoC.mediaPicker
   - window.CoC.views.skills.render, window.CoC.views.finances.render
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  var _store = null;
  var _bus   = null;

  var ID_FIELDS = ['name', 'playerName', 'occupation', 'age', 'sex', 'residence', 'birthplace', 'tagline'];

  function $s(sel)        { return document.querySelector(sel); }
  function _dirty()       { if (_bus) _bus.publish('identity:dirty', {}); }
  function _persist()     { if (_bus) _bus.publish('identity:persist-requested', {}); }
  function _recalc()      { if (_store) _store.dispatch({ type: 'RECALC_DERIVED' }); }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    var c = _store ? _store.getState().character : null;
    if (!c) return;
    c.investigator = c.investigator || {};

    // Preenche campos
    ID_FIELDS.forEach(function(f) {
      var node = document.querySelector('[data-bind="investigator.' + f + '"]');
      if (node) node.value = c.investigator[f] != null ? c.investigator[f] : '';
    });

    // Tagline display
    var tagline = c.investigator.tagline ? '“' + c.investigator.tagline + '”' : '';
    var dispNode = $s('#identity-display');
    if (dispNode) dispNode.textContent = tagline;

    // Sidebar
    var sName = $s('#sidebar-name');
    var sOcc  = $s('#sidebar-occupation');
    if (sName) sName.textContent = c.investigator.name       || '—';
    if (sOcc)  sOcc.textContent  = c.investigator.occupation || '—';

    // Occupation change: recalc skills + finances
    var occInput = $s('#id-occupation');
    if (occInput) {
      occInput.onchange = function() {
        c.investigator.occupation = occInput.value;
        var _sOcc = $s('#sidebar-occupation');
        if (_sOcc) _sOcc.textContent = c.investigator.occupation || '—';
        if (window.CoC.views.skills   && window.CoC.views.skills.render)   window.CoC.views.skills.render();
        if (window.CoC.views.finances && window.CoC.views.finances.render) window.CoC.views.finances.render();
        _persist();
      };
    }

    // Bind genérico — todos os campos
    ID_FIELDS.forEach(function(f) {
      var node = document.querySelector('[data-bind="investigator.' + f + '"]');
      if (!node) return;
      node.oninput = function() {
        c.investigator[f] = node.value;
        // Side effects por campo
        if (f === 'name') {
          var sn = $s('#sidebar-name');
          if (sn) sn.textContent = node.value || '—';
        }
        if (f === 'occupation') {
          var so = $s('#sidebar-occupation');
          if (so) so.textContent = node.value || '—';
        }
        if (f === 'tagline') {
          var d = $s('#identity-display');
          if (d) d.textContent = node.value ? '“' + node.value + '”' : '';
        }
        if (f === 'age') {
          _recalc();
          if (window.CoC.views.vitals && window.CoC.views.vitals.render) window.CoC.views.vitals.render();
          var newAge = Number(node.value) || 25;
          var rules  = window.CoC && window.CoC.rules;
          if (rules && rules.calcAgeAdjustments) {
            var adj = rules.calcAgeAdjustments(newAge);
            if (adj && adj.totalReduction > 0) {
              var ui = window.CoC.ui || {};
              if (ui.toast) {
                ui.toast(
                  'Idade ' + newAge + ' anos: redistribua -' + adj.totalReduction +
                  ' pts entre ' + adj.attrs.join('/') + ' manualmente ou clique "Rolar Tudo".',
                  { type: 'info', duration: 8000 }
                );
              }
            }
          }
        }
        _dirty();
      };
      node.onblur = _persist;
    });

    // Imagem de retrato
    _bindImages(c);
  }

  // ── Image slots ─────────────────────────────────────────────────────────────
  function _bindImages(c) {
    if (!window.CoC.mediaPicker) return;
    // Main portrait (in identity section) — primary editing interaction
    _setupSlot($s('#portrait-main'), 'portraitId', c, { maxDim: 640, label: 'retrato' });
  }

  function _setupSlot(slotEl, field, c, opts) {
    if (!slotEl) return;
    var mp = window.CoC.mediaPicker;
    mp.render(slotEl, c.investigator && c.investigator[field] ? c.investigator[field] : null);
    _refreshRemoveBtn(slotEl, field, c, opts);

    slotEl.onclick = function(e) {
      if (e.target && e.target.classList && e.target.classList.contains('img-remove')) return;
      mp.pick({ maxDim: opts.maxDim }).then(function(blobId) {
        if (!blobId) return;
        c.investigator = c.investigator || {};
        c.investigator[field] = blobId;
        _persist();
        mp.render(slotEl, blobId);
        _refreshRemoveBtn(slotEl, field, c, opts);
        var ui = window.CoC.ui || {};
        if (ui.toast) ui.toast('Imagem de ' + opts.label + ' atualizada.', { type: 'success', duration: 1800 });
      });
    };
  }

  function _refreshRemoveBtn(slotEl, field, c, opts) {
    var hasImg = !!(c.investigator && c.investigator[field]);
    var btn    = slotEl.querySelector('.img-remove');
    var ui     = window.CoC.ui || {};
    var mkEl   = ui.el || function(tag, attrs) {
      var e = document.createElement(tag);
      Object.keys(attrs || {}).forEach(function(k) {
        if (k === 'text') e.textContent = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
      return e;
    };

    if (hasImg && !btn) {
      btn = mkEl('button', { class: 'img-remove no-print', title: 'Remover ' + opts.label, text: '✕', type: 'button' });
      btn.onclick = function(e) {
        e.stopPropagation();
        var oldId = c.investigator[field];
        c.investigator[field] = null;
        _persist();
        window.CoC.mediaPicker.render(slotEl, null);
        _syncSidebarPortrait(c);
        // Blobids de upload (não data-URI) são apagáveis no storage
        var storage = window.CoC && window.CoC.storage;
        if (oldId && typeof oldId === 'string' && !oldId.startsWith('data:') && storage && storage.deleteBlob) {
          storage.deleteBlob(oldId);
        }
        _refreshRemoveBtn(slotEl, field, c, opts);
      };
      slotEl.appendChild(btn);
    } else if (!hasImg && btn) {
      btn.remove();
    }
  }

  function init(store) {
    _store = store || window.CoC.store;
    _bus   = window.CoC.bus;
  }

  window.CoC.views.identity = Object.freeze({ render: render, init: init });

})();
