/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/i18n.js
   ETAPA 8 (#23) — Infraestrutura de tradução (i18n).

   Arquitetura preparada para novos idiomas: dicionários por chave, fallback
   para PT-BR, e applyTranslations(root) que troca texto/atributos em elementos
   marcados com data-i18n / data-i18n-attr.

   Uso no HTML:
     <span data-i18n="settings.title">Configurações</span>
     <input data-i18n-attr="placeholder:chat.placeholder" />

   API: window.CoC.i18n = { t, setLang, getLang, applyTranslations, addDict }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {
  'use strict';

  // Dicionários. PT-BR é a fonte; EN traduz um subconjunto inicial (a base
  // arquitetural permite expandir sem tocar no código).
  var DICT = {
    'pt': {
      'settings.title':        'Configurações',
      'settings.theme':        'Tema',
      'settings.colors':       'Cores',
      'settings.language':     'Idioma',
      'settings.effects':      'Efeitos Visuais',
      'settings.interface':    'Interface',
      'settings.accessibility':'Acessibilidade',
      'settings.fontScale':    'Tamanho da fonte',
      'settings.density':      'Densidade',
      'settings.density.comfortable': 'Confortável',
      'settings.density.compact':     'Compacto',
      'settings.reduceMotion': 'Reduzir animações',
      'settings.highContrast': 'Alto contraste',
      'settings.rollEffects':  'Efeitos de rolagem',
      'settings.accent':       'Cor de destaque',
      'settings.reset':        'Restaurar padrões',
      'settings.close':        'Fechar',
      'common.save':           'Salvar',
      'common.cancel':         'Cancelar',
    },
    'en': {
      'settings.title':        'Settings',
      'settings.theme':        'Theme',
      'settings.colors':       'Colors',
      'settings.language':     'Language',
      'settings.effects':      'Visual Effects',
      'settings.interface':    'Interface',
      'settings.accessibility':'Accessibility',
      'settings.fontScale':    'Font size',
      'settings.density':      'Density',
      'settings.density.comfortable': 'Comfortable',
      'settings.density.compact':     'Compact',
      'settings.reduceMotion': 'Reduce motion',
      'settings.highContrast': 'High contrast',
      'settings.rollEffects':  'Roll effects',
      'settings.accent':       'Accent color',
      'settings.reset':        'Restore defaults',
      'settings.close':        'Close',
      'common.save':           'Save',
      'common.cancel':         'Cancel',
    }
  };

  var _lang = 'pt';

  function getLang() { return _lang; }
  function setLang(lang) {
    _lang = DICT[lang] ? lang : 'pt';
    try { document.documentElement.lang = (_lang === 'pt' ? 'pt-BR' : 'en'); } catch (e) {}
  }

  // t(key) → string traduzida (fallback: PT, depois a própria chave)
  function t(key) {
    var d = DICT[_lang] || DICT.pt;
    if (d[key] != null) return d[key];
    if (DICT.pt[key] != null) return DICT.pt[key];
    return key;
  }

  // Permite módulos registrarem dicionários adicionais (forward-compat).
  function addDict(lang, entries) {
    DICT[lang] = DICT[lang] || {};
    Object.keys(entries || {}).forEach(function (k) { DICT[lang][k] = entries[k]; });
  }

  // Aplica traduções a um root (default: document). Troca textContent em
  // [data-i18n] e atributos em [data-i18n-attr="attr:key;attr2:key2"].
  function applyTranslations(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-i18n]');
    Array.prototype.forEach.call(nodes, function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    var attrNodes = root.querySelectorAll('[data-i18n-attr]');
    Array.prototype.forEach.call(attrNodes, function (el) {
      var spec = el.getAttribute('data-i18n-attr') || '';
      spec.split(';').forEach(function (pair) {
        var parts = pair.split(':');
        if (parts.length === 2) el.setAttribute(parts[0].trim(), t(parts[1].trim()));
      });
    });
  }

  window.CoC.i18n = {
    t: t, setLang: setLang, getLang: getLang,
    applyTranslations: applyTranslations, addDict: addDict
  };

})();
