/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/settings.js
   ETAPA 8 (#23) — Central de Configurações.

   Preferências GLOBAIS de UI (não por personagem) — persistidas em localStorage
   (aimalexi-rpg/settings). Aplicadas em qualquer página que carregue este módulo
   (investigador, guardião). Abre via botão ⚙️.

   Cobre: Tema · Cor de destaque · Idioma (i18n) · Efeitos visuais (reduzir
   animações, efeitos de rolagem) · Interface (densidade, escala de fonte) ·
   Acessibilidade (alto contraste).

   API: window.CoC.settings = { get, set, open, apply, init }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {
  'use strict';

  var KEY = 'aimalexi-rpg/settings';

  var THEMES = [
    { id: 'arkham',     label: 'Arkham (Clássico CoC)' },
    { id: 'miskatonic', label: 'Miskatonic (Acadêmico)' },
    { id: 'sepia',      label: 'Sépia (Claro/Histórico)' },
    { id: 'obsidian',   label: 'Obsidian (Escuro/Moderno)' },
    { id: 'eldritch',   label: 'Eldritch (Horror Cósmico)' },
  ];

  var DEFAULTS = {
    theme:        'arkham',
    accent:       '',          // vazio = usa o accent do tema
    language:     'pt',
    fontScale:    1.0,         // 0.85 – 1.3
    density:      'comfortable',
    reduceMotion: false,
    highContrast: false,
    rollEffects:  true,
  };

  var _settings = null;

  function _load() {
    try { var v = localStorage.getItem(KEY); return v ? Object.assign({}, DEFAULTS, JSON.parse(v)) : Object.assign({}, DEFAULTS); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function _save() {
    try { localStorage.setItem(KEY, JSON.stringify(_settings)); } catch (e) {}
  }

  function get(key) { if (!_settings) _settings = _load(); return key ? _settings[key] : Object.assign({}, _settings); }
  function set(key, val) {
    if (!_settings) _settings = _load();
    _settings[key] = val;
    _save();
    apply();
  }

  // ── Aplica as preferências ao DOM (global) ─────────────────────────────────
  function apply() {
    if (!_settings) _settings = _load();
    var s = _settings;
    var body = document.body;
    if (!body) return;

    // Tema
    body.dataset.theme = s.theme || 'arkham';

    // Cor de destaque (override do --accent do tema)
    if (s.accent) {
      document.documentElement.style.setProperty('--accent', s.accent);
      document.documentElement.style.setProperty('--accent-glow', s.accent + '55');
    } else {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent-glow');
    }

    // Escala de fonte (root font-size base 16px)
    var scale = Math.max(0.85, Math.min(1.3, Number(s.fontScale) || 1));
    document.documentElement.style.fontSize = (16 * scale) + 'px';

    // Densidade / contraste / movimento / efeitos de rolagem → classes no body
    body.classList.toggle('density-compact', s.density === 'compact');
    body.classList.toggle('high-contrast',   !!s.highContrast);
    body.classList.toggle('reduce-motion',   !!s.reduceMotion);
    body.classList.toggle('no-roll-fx',      !s.rollEffects);

    // Idioma
    if (window.CoC.i18n) {
      window.CoC.i18n.setLang(s.language || 'pt');
      window.CoC.i18n.applyTranslations(document);
    }
  }

  // ── Modal de configurações ─────────────────────────────────────────────────
  function open() {
    if (!_settings) _settings = _load();
    var ui = window.CoC.ui;
    var i18n = window.CoC.i18n;
    var T = i18n ? i18n.t : function (k) { return k; };
    if (!ui || !ui.modal) { console.warn('[settings] modal indisponível'); return; }

    var s = _settings;
    var body = document.createElement('div');
    body.className = 'settings-form';
    body.innerHTML =
      // Tema
      '<div class="settings-row"><label>' + T('settings.theme') + '</label>' +
        '<select id="set-theme">' + THEMES.map(function (t2) {
          return '<option value="' + t2.id + '"' + (t2.id === s.theme ? ' selected' : '') + '>' + t2.label + '</option>';
        }).join('') + '</select></div>' +
      // Cor de destaque
      '<div class="settings-row"><label>' + T('settings.accent') + '</label>' +
        '<input type="color" id="set-accent" value="' + (s.accent || '#b8924f') + '" />' +
        '<button type="button" id="set-accent-clear" class="btn-ghost btn-sm">✕</button></div>' +
      // Idioma
      '<div class="settings-row"><label>' + T('settings.language') + '</label>' +
        '<select id="set-lang">' +
          '<option value="pt"' + (s.language === 'pt' ? ' selected' : '') + '>Português</option>' +
          '<option value="en"' + (s.language === 'en' ? ' selected' : '') + '>English</option>' +
        '</select></div>' +
      // Escala de fonte
      '<div class="settings-row"><label>' + T('settings.fontScale') + ' (<span id="set-scale-val">' + Math.round(s.fontScale * 100) + '%</span>)</label>' +
        '<input type="range" id="set-scale" min="0.85" max="1.3" step="0.05" value="' + s.fontScale + '" /></div>' +
      // Densidade
      '<div class="settings-row"><label>' + T('settings.density') + '</label>' +
        '<select id="set-density">' +
          '<option value="comfortable"' + (s.density === 'comfortable' ? ' selected' : '') + '>' + T('settings.density.comfortable') + '</option>' +
          '<option value="compact"' + (s.density === 'compact' ? ' selected' : '') + '>' + T('settings.density.compact') + '</option>' +
        '</select></div>' +
      // Toggles
      '<div class="settings-row toggle"><label><input type="checkbox" id="set-motion"' + (s.reduceMotion ? ' checked' : '') + ' /> ' + T('settings.reduceMotion') + '</label></div>' +
      '<div class="settings-row toggle"><label><input type="checkbox" id="set-contrast"' + (s.highContrast ? ' checked' : '') + ' /> ' + T('settings.highContrast') + '</label></div>' +
      '<div class="settings-row toggle"><label><input type="checkbox" id="set-rollfx"' + (s.rollEffects ? ' checked' : '') + ' /> ' + T('settings.rollEffects') + '</label></div>';

    function $(id) { return body.querySelector('#' + id); }

    // Live preview — cada mudança aplica imediatamente
    $('set-theme').onchange   = function () { set('theme', this.value); };
    $('set-accent').oninput   = function () { set('accent', this.value); };
    $('set-accent-clear').onclick = function () { set('accent', ''); $('set-accent').value = '#b8924f'; };
    $('set-lang').onchange     = function () { set('language', this.value); };
    $('set-scale').oninput     = function () {
      set('fontScale', parseFloat(this.value));
      var lbl = $('set-scale-val'); if (lbl) lbl.textContent = Math.round(parseFloat(this.value) * 100) + '%';
    };
    $('set-density').onchange  = function () { set('density', this.value); };
    $('set-motion').onchange   = function () { set('reduceMotion', this.checked); };
    $('set-contrast').onchange = function () { set('highContrast', this.checked); };
    $('set-rollfx').onchange   = function () { set('rollEffects', this.checked); };

    ui.modal({
      title: '⚙️ ' + T('settings.title'),
      body: body,
      actions: [
        { label: T('settings.reset'), onClick: function () {
          _settings = Object.assign({}, DEFAULTS);
          _save(); apply();
          // Reabre para refletir o reset
          setTimeout(open, 50);
        } },
        { label: T('settings.close'), primary: true }
      ]
    });
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    _settings = _load();
    apply();
    var btn = document.getElementById('btn-settings');
    if (btn) btn.onclick = open;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.CoC.settings = { get: get, set: set, open: open, apply: apply, init: init };

})();
