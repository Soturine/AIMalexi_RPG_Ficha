/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/chat.js
   ETAPA 7 (#18) — Chat de campanha (Guardião ⇄ Investigadores).

   Reutilizável em investigator.html (aba Log) e keeper.html. Usa o transport
   de campanha (BroadcastChannel/Supabase) quando há campanha ativa; caso
   contrário exibe localmente com aviso de "offline".

   Formato exibido:
     [Investigador · Nome]  mensagem        12:34
     [Guardião]             mensagem        12:35

   Suporta: timestamp, histórico (em sessionStorage), scroll automático.

   API: window.CoC.views.chat = { mount, send, receive }
     mount({ listEl, inputEl, sendBtnEl, getAuthor, getRole })
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {
  'use strict';

  var HISTORY_KEY = 'aimalexi-rpg/chat-history';
  var MAX_HISTORY = 200;

  var _ctx = null;       // { listEl, inputEl, sendBtnEl, getAuthor, getRole }
  var _seen = {};        // dedup por msgId

  function _esc(s) {
    var ui = window.CoC && window.CoC.ui;
    if (ui && ui.escapeHtml) return ui.escapeHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function _uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'm-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
  }

  // ── Histórico (sessionStorage) ──────────────────────────────────────────────
  function _loadHistory() {
    try { var v = sessionStorage.getItem(HISTORY_KEY); return v ? JSON.parse(v) : []; }
    catch (e) { return []; }
  }
  function _saveHistory(list) {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-MAX_HISTORY))); } catch (e) {}
  }

  // ── Transport ───────────────────────────────────────────────────────────────
  function _transport() {
    return window.CoC.campaign && window.CoC.campaign.transport;
  }
  function _campaignActive() {
    var store = window.CoC.campaign && window.CoC.campaign.store;
    if (!store || !store.getState) return false;
    var st = store.getState();
    return st && st.status === 'active';
  }

  // ── Render de uma mensagem ──────────────────────────────────────────────────
  function _msgHTML(m) {
    var isKeeper = m.role === 'keeper';
    var who = isKeeper ? 'Guardião' : ('Investigador · ' + (m.author || '—'));
    var time = '';
    try {
      time = new Date(m.ts || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {}
    return '<div class="chat-msg ' + (isKeeper ? 'keeper' : 'player') + '">' +
      '<div class="chat-msg-head"><span class="chat-author">' + _esc(who) + '</span>' +
      '<span class="chat-time">' + _esc(time) + '</span></div>' +
      '<div class="chat-text">' + _esc(m.text) + '</div>' +
    '</div>';
  }

  function _append(m, opts) {
    opts = opts || {};
    if (m.msgId && _seen[m.msgId]) return;   // dedup
    if (m.msgId) _seen[m.msgId] = true;

    if (_ctx && _ctx.listEl) {
      var div = document.createElement('div');
      div.innerHTML = _msgHTML(m);
      _ctx.listEl.appendChild(div.firstChild);
      // Scroll automático
      _ctx.listEl.scrollTop = _ctx.listEl.scrollHeight;
    }
    if (!opts.skipHistory) {
      var hist = _loadHistory();
      hist.push(m);
      _saveHistory(hist);
    }
  }

  // ── Render inicial do histórico ─────────────────────────────────────────────
  function _renderHistory() {
    if (!_ctx || !_ctx.listEl) return;
    _ctx.listEl.innerHTML = '';
    var hist = _loadHistory();
    hist.forEach(function (m) {
      if (m.msgId) _seen[m.msgId] = true;
      var div = document.createElement('div');
      div.innerHTML = _msgHTML(m);
      _ctx.listEl.appendChild(div.firstChild);
    });
    _ctx.listEl.scrollTop = _ctx.listEl.scrollHeight;
  }

  // ── Enviar ──────────────────────────────────────────────────────────────────
  function send(text) {
    text = (text || '').trim();
    if (!text || !_ctx) return;
    var author = _ctx.getAuthor ? _ctx.getAuthor() : 'Anônimo';
    var role   = _ctx.getRole   ? _ctx.getRole()   : 'player';
    var msg = { type: 'CHAT_MESSAGE', author: author, role: role, text: text, msgId: _uuid(), ts: Date.now() };

    // Exibe localmente (sempre)
    _append(msg);

    // Broadcast se houver campanha ativa
    var t = _transport();
    if (t && t.broadcast && _campaignActive()) {
      var ont = window.CoC.campaign && window.CoC.campaign.ontology;
      var ev = ont && ont.make ? ont.make('CHAT_MESSAGE', msg) : msg;
      try { t.broadcast(ev); } catch (e) { /* offline-first: nunca quebra */ }
    } else if (_ctx.hintEl) {
      _ctx.hintEl.textContent = 'Sem campanha ativa — mensagem visível só aqui.';
    }
  }

  // ── Receber (do transport) ──────────────────────────────────────────────────
  function receive(ev) {
    if (!ev || ev.type !== 'CHAT_MESSAGE') return;
    _append({
      author: ev.author, role: ev.role, text: ev.text,
      msgId: ev.msgId, ts: ev.ts
    });
  }

  // ── Mount ─────────────────────────────────────────────────────────────────
  function mount(ctx) {
    _ctx = ctx || {};
    if (!_ctx.listEl) return;

    _renderHistory();

    if (_ctx.sendBtnEl) {
      _ctx.sendBtnEl.onclick = function () {
        if (_ctx.inputEl) { send(_ctx.inputEl.value); _ctx.inputEl.value = ''; _ctx.inputEl.focus(); }
      };
    }
    if (_ctx.inputEl) {
      _ctx.inputEl.onkeydown = function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send(_ctx.inputEl.value);
          _ctx.inputEl.value = '';
        }
      };
    }

    // Registra receptor no transport (idempotente — transport deduplica handlers)
    var t = _transport();
    if (t && t.onEvent) t.onEvent(receive);
  }

  window.CoC.views.chat = { mount: mount, send: send, receive: receive };

})();
