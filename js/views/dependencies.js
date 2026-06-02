/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/dependencies.js
   ETAPA 10 (#31) — Painel "Ver Dependências" (grafo de regras CoC 7e).

   READ-ONLY. Mostra, para cada atributo/fonte, o que ele afeta, com os valores
   derivados ATUAIS do personagem (calculados pela engine via store.derived +
   rules). Ajuda o jogador a entender os efeitos reais de cada atributo.

   O recálculo automático em si já é feito por RECALC_DERIVED no store + as
   subscriptions de skills/vitals. Este painel apenas VISUALIZA o grafo.

   API: window.CoC.views.dependencies = { open }
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

  // Mapa estático do grafo: cada fonte → efeitos. fn(c, rules) devolve o valor atual.
  function _graph(c, rules) {
    var a = function (k) { return Number(c && c.attributes && c.attributes[k] && c.attributes[k].value) || 0; };
    var d = function (k) { return c && c.derived && c.derived[k] ? c.derived[k].value : '—'; };
    var occName = c && c.investigator && c.investigator.occupation;
    var occ = occName && window.CoCData ? window.CoCData.findOccupation(occName) : null;
    var occPts = (occ && rules.calcOccupationPoints) ? rules.calcOccupationPoints(occ.pointsFormula, _attrsFlat(c)).points : '—';

    return [
      { src: 'FOR', val: a('FOR'), affects: [
        { label: 'Movimento (MOV)', value: d('MOV') },
        { label: 'Bônus de Dano', value: d('DB') },
        { label: 'Constituição Física (Build)', value: d('Build') },
        { label: 'Combate corpo a corpo', value: '—' },
      ]},
      { src: 'CON', val: a('CON'), affects: [
        { label: 'Pontos de Vida (PV)', value: d('PV') + '  =⌊(CON+TAM)/10⌋' },
      ]},
      { src: 'TAM', val: a('TAM'), affects: [
        { label: 'Pontos de Vida (PV)', value: d('PV') },
        { label: 'Movimento (MOV)', value: d('MOV') },
        { label: 'Bônus de Dano / Build', value: d('DB') + ' / ' + d('Build') },
      ]},
      { src: 'DES', val: a('DES'), affects: [
        { label: 'Movimento (MOV)', value: d('MOV') },
        { label: 'Esquivar (base)', value: Math.floor(a('DES') / 2) + '  =DES/2' },
      ]},
      { src: 'POD', val: a('POD'), affects: [
        { label: 'Pontos de Magia (PM)', value: d('PM') + '  =⌊POD/5⌋' },
        { label: 'Sanidade inicial', value: a('POD') },
      ]},
      { src: 'INT', val: a('INT'), affects: [
        { label: 'Pontos de Interesse Pessoal', value: (a('INT') * 2) + '  =INT×2' },
      ]},
      { src: 'EDU', val: a('EDU'), affects: [
        { label: 'Pontos de Ocupação', value: occPts },
        { label: 'Língua Nativa (base)', value: a('EDU') + '  =EDU' },
      ]},
      { src: 'APA', val: a('APA'), affects: [
        { label: 'Perícias sociais / aparência', value: '—' },
      ]},
      { src: 'Idade', val: (c && c.investigator && c.investigator.age) || 25, affects: [
        { label: 'EDU, FOR, CON, DES, APA (ajustes)', value: 'via Rolar Tudo' },
        { label: 'Movimento (penalidade 40+)', value: d('MOV') },
        { label: 'Sorte (re-roll 15–19)', value: '—' },
      ]},
      { src: 'Mythos', val: d('Mitos'), affects: [
        { label: 'Sanidade máxima', value: (c && c.derived && c.derived.SAN ? c.derived.SAN.max : '—') + '  =99−Mythos' },
      ]},
    ];
  }

  function _attrsFlat(c) {
    var o = {};
    var src = (c && c.attributes) || {};
    Object.keys(src).forEach(function (k) { o[k] = src[k].value; });
    return o;
  }

  function open() {
    var ui = window.CoC.ui;
    var store = window.CoC.store;
    var rules = window.CoC.rules;
    if (!ui || !ui.modal || !store) return;
    var c = store.getState().character;
    if (!c) { if (ui.toast) ui.toast('Nenhum personagem carregado.', { type: 'info' }); return; }

    var rows = _graph(c, rules);
    var body = document.createElement('div');
    body.className = 'deps-panel';
    body.innerHTML =
      '<p class="deps-intro">Tudo abaixo é recalculado automaticamente pela engine quando a fonte muda. ' +
      'Valores derivados não são editáveis manualmente.</p>' +
      rows.map(function (r) {
        return '<div class="deps-row">' +
          '<div class="deps-src"><span class="deps-src-name">' + _esc(r.src) + '</span>' +
            '<span class="deps-src-val">' + _esc(r.val) + '</span></div>' +
          '<div class="deps-affects">' +
            r.affects.map(function (x) {
              return '<div class="deps-affect"><span class="deps-affect-label">' + _esc(x.label) + '</span>' +
                     '<span class="deps-affect-val">' + _esc(x.value) + '</span></div>';
            }).join('') +
          '</div>' +
        '</div>';
      }).join('');

    ui.modal({
      title: '🔗 Dependências de Regras',
      body: body,
      actions: [{ label: 'Fechar', primary: true }]
    });
  }

  window.CoC.views.dependencies = { open: open };

})();
