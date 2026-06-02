/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/keeper-journal.js
   ETAPA 6 (#14) — Diário avançado do Guardião.

   Substitui a textarea livre por tópicos estruturados:
     { id, category, title, content, date, order }

   Categorias: Sessão, NPCs, Locais, Mistérios, Pistas, Eventos, Cronologia, Observações.
   Persistência local (localStorage, prefixo aimalexi-rpg/). Migra o keeper-journal
   antigo (texto livre) para um tópico de "Observações" na primeira execução.

   Expõe: window.CoC.keeperJournal = { init, render }
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var PREFIX = 'aimalexi-rpg/';
  var KEY    = 'keeper-journal-topics';

  var CATEGORIES = [
    { id: 'sessao',      label: 'Sessão',      icon: '🎬' },
    { id: 'npc',         label: 'NPCs',         icon: '🎭' },
    { id: 'local',       label: 'Locais',       icon: '🗺️' },
    { id: 'misterio',    label: 'Mistérios',    icon: '🔮' },
    { id: 'pista',       label: 'Pistas',       icon: '🔍' },
    { id: 'evento',      label: 'Eventos',      icon: '⚡' },
    { id: 'cronologia',  label: 'Cronologia',   icon: '📅' },
    { id: 'observacao',  label: 'Observações',  icon: '📝' },
  ];

  var _filter = 'all';

  // ── Storage ─────────────────────────────────────────────────────────────────
  function _load() {
    try { var v = localStorage.getItem(PREFIX + KEY); return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  }
  function _save(topics) {
    try { localStorage.setItem(PREFIX + KEY, JSON.stringify(topics)); } catch (e) {}
  }
  function _uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'j-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
  }

  // Migração one-time do diário antigo (texto livre) → tópico de Observações.
  function _getTopics() {
    var topics = _load();
    if (topics != null) return topics;
    topics = [];
    try {
      var oldRaw = localStorage.getItem(PREFIX + 'keeper-journal');
      var old = oldRaw ? JSON.parse(oldRaw) : '';
      if (old && typeof old === 'string' && old.trim()) {
        topics.push({
          id: _uuid(), category: 'observacao',
          title: 'Anotações (importadas)', content: old,
          date: new Date().toISOString().slice(0, 10), order: 0
        });
      }
    } catch (e) {}
    _save(topics);
    return topics;
  }

  function _catMeta(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return { id: id, label: id, icon: '•' };
  }
  function _esc(s) {
    var ui = window.CoC && window.CoC.ui;
    if (ui && ui.escapeHtml) return ui.escapeHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    var container = document.getElementById('journal-topics');
    if (!container) return;
    var topics = _getTopics();

    // Ordena por order, depois data desc
    var sorted = topics.slice().sort(function (a, b) {
      if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
      return (b.date || '').localeCompare(a.date || '');
    });
    var visible = _filter === 'all' ? sorted : sorted.filter(function (t) { return t.category === _filter; });

    if (visible.length === 0) {
      container.innerHTML = '<p class="journal-empty">Nenhum tópico' +
        (_filter !== 'all' ? ' nesta categoria' : '') +
        '. Clique em <b>+ Novo Tópico</b>.</p>';
      return;
    }

    container.innerHTML = visible.map(function (t) {
      var cat = _catMeta(t.category);
      return '<article class="journal-card" data-id="' + _esc(t.id) + '">' +
        '<div class="journal-card-head">' +
          '<span class="journal-cat-badge">' + cat.icon + ' ' + _esc(cat.label) + '</span>' +
          '<span class="journal-date">' + _esc(t.date || '') + '</span>' +
          '<div class="journal-card-actions">' +
            '<button class="btn-ghost btn-icon" data-journal-edit="' + _esc(t.id) + '" title="Editar">✎</button>' +
            '<button class="btn-danger btn-icon" data-journal-del="' + _esc(t.id) + '" title="Remover">🗑️</button>' +
          '</div>' +
        '</div>' +
        '<h4 class="journal-title">' + _esc(t.title || '(sem título)') + '</h4>' +
        '<div class="journal-content">' + _esc(t.content || '').replace(/\n/g, '<br>') + '</div>' +
      '</article>';
    }).join('');
  }

  // ── Edição (modal) ──────────────────────────────────────────────────────────
  function _openEditor(topic) {
    var ui = window.CoC && window.CoC.ui;
    if (!ui || !ui.modal) { _openEditorFallback(topic); return; }
    var isNew = !topic;
    var t = topic || {
      id: _uuid(), category: 'sessao', title: '', content: '',
      date: new Date().toISOString().slice(0, 10), order: 0
    };

    var body = document.createElement('div');
    body.innerHTML =
      '<div style="display:grid;gap:0.5rem;">' +
        '<div><label>Categoria</label><select id="jt-cat" style="width:100%">' +
          CATEGORIES.map(function (c) {
            return '<option value="' + c.id + '"' + (c.id === t.category ? ' selected' : '') + '>' + c.icon + ' ' + c.label + '</option>';
          }).join('') +
        '</select></div>' +
        '<div><label>Título</label><input id="jt-title" value="' + _esc(t.title) + '" style="width:100%" /></div>' +
        '<div><label>Data</label><input id="jt-date" type="date" value="' + _esc(t.date) + '" style="width:100%" /></div>' +
        '<div><label>Conteúdo</label><textarea id="jt-content" rows="6" style="width:100%">' + _esc(t.content) + '</textarea></div>' +
        '<div><label>Ordem (menor aparece antes)</label><input id="jt-order" type="number" value="' + (t.order || 0) + '" style="width:100%" /></div>' +
      '</div>';

    ui.modal({
      title: isNew ? 'Novo Tópico' : 'Editar Tópico',
      body: body,
      actions: [
        { label: 'Cancelar' },
        { label: 'Salvar', primary: true, onClick: function () {
          t.category = document.getElementById('jt-cat').value;
          t.title    = (document.getElementById('jt-title').value || '').trim();
          t.date     = document.getElementById('jt-date').value || t.date;
          t.content  = document.getElementById('jt-content').value || '';
          t.order    = parseInt(document.getElementById('jt-order').value, 10) || 0;
          var topics = _getTopics();
          var idx = topics.findIndex(function (x) { return x.id === t.id; });
          if (idx >= 0) topics[idx] = t; else topics.push(t);
          _save(topics);
          render();
        }}
      ]
    });
  }

  function _openEditorFallback(topic) {
    // Sem modal disponível — prompt simples
    var title = window.prompt('Título do tópico:', topic ? topic.title : '');
    if (title == null) return;
    var content = window.prompt('Conteúdo:', topic ? topic.content : '');
    var topics = _getTopics();
    var t = topic || { id: _uuid(), category: 'observacao', date: new Date().toISOString().slice(0, 10), order: 0 };
    t.title = title; t.content = content || '';
    var idx = topics.findIndex(function (x) { return x.id === t.id; });
    if (idx >= 0) topics[idx] = t; else topics.push(t);
    _save(topics);
    render();
  }

  function _deleteTopic(id) {
    var topics = _getTopics().filter(function (t) { return t.id !== id; });
    _save(topics);
    render();
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    var addBtn = document.getElementById('btn-add-journal-topic');
    if (addBtn) addBtn.onclick = function () { _openEditor(null); };

    var filterSel = document.getElementById('journal-filter');
    if (filterSel) filterSel.onchange = function () { _filter = filterSel.value; render(); };

    var container = document.getElementById('journal-topics');
    if (container && !container._journalDelegated) {
      container._journalDelegated = true;
      container.addEventListener('click', function (e) {
        var ed = e.target.closest('[data-journal-edit]');
        if (ed) {
          var topic = _getTopics().find(function (t) { return t.id === ed.dataset.journalEdit; });
          if (topic) _openEditor(topic);
          return;
        }
        var del = e.target.closest('[data-journal-del]');
        if (del) {
          var ui = window.CoC && window.CoC.ui;
          if (ui && ui.confirm) {
            ui.confirm('Remover este tópico do diário?', { title: 'Remover', danger: true })
              .then(function (ok) { if (ok) _deleteTopic(del.dataset.journalDel); });
          } else if (window.confirm('Remover este tópico?')) {
            _deleteTopic(del.dataset.journalDel);
          }
        }
      });
    }

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.CoC = window.CoC || {};
  window.CoC.keeperJournal = { init: init, render: render };
})();
