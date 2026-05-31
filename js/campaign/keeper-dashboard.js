/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/keeper-dashboard.js
   Orquestra o painel de campanha na página do Guardião.

   Responsabilidades:
   - Botão "Criar Campanha": gera PIN, inicializa transport + store
   - Botão "Gerenciar Campanha": modal com PIN exibido + lista de jogadores
   - Escuta eventos de transport: INVESTIGATOR_STATUS, PLAYER_CONNECTED, etc.
   - Atualiza #investigators-cards e #timeline-list
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {

  var _cs      = null;
  var _tp      = null;
  var _pinSys  = null;
  var _ontology = null;

  function $s(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function init() {
    _cs       = window.CoC.campaign && window.CoC.campaign.store;
    _tp       = window.CoC.campaign && window.CoC.campaign.transport;
    _pinSys   = window.CoC.campaign && window.CoC.campaign.pin;
    _ontology = window.CoC.campaign && window.CoC.campaign.ontology;

    if (!_cs || !_tp || !_pinSys) {
      console.warn('[keeper-dashboard] campaign modules not loaded');
      return;
    }

    _bindButtons();
    _cs.subscribe(_onCampaignChange);

    // On page load, any saved session is stale — transport channel is always gone.
    // Mark it so the UI shows the recovery panel instead of the active dashboard.
    var saved = _cs.getState();
    if (saved.connected && saved.id) {
      _cs.markStale();
    }
    _renderDashboard(_cs.getState());
  }

  // ── Buttons ───────────────────────────────────────────────────────────────
  function _bindButtons() {
    var btnCreate     = $s('#btn-create-campaign');
    var btnJoin       = $s('#btn-join-campaign');
    var btnManage     = $s('#btn-campaign');
    var btnClose      = $s('#btn-close-campaign-modal');
    var btnClearTL    = $s('#btn-clear-timeline');
    var btnReactivate = $s('#btn-reactivate-campaign');
    var btnDiscard    = $s('#btn-discard-stale');

    if (btnCreate)     btnCreate.onclick     = _createCampaign;
    if (btnJoin)       btnJoin.onclick       = _joinCampaign;
    if (btnManage)     btnManage.onclick     = _openCampaignModal;
    if (btnClose)      btnClose.onclick      = _closeModal;
    if (btnReactivate) btnReactivate.onclick = _reactivateCampaign;
    if (btnDiscard)    btnDiscard.onclick    = function () {
      if (confirm('Descartar sessão anterior e começar do zero?')) {
        _cs.leaveCampaign();
      }
    };
    if (btnClearTL) btnClearTL.onclick = function () {
      if (_cs) _cs.clearTimeline();
      _renderTimeline([]);
    };
  }

  // ── Create Campaign ───────────────────────────────────────────────────────
  function _createCampaign() {
    var pin       = _pinSys.generate();
    var peerId    = _tp.getPeerId();
    var name      = window.prompt('Nome da Campanha:', 'Horror em Arkham') || 'Horror em Arkham';

    _cs.createCampaign(name, pin, peerId);
    _tp.init(pin, 'host');
    _tp.onEvent(_onTransportEvent);

    // Broadcast presença do host
    var hostEvent = _ontology
      ? _ontology.make('HOST_ONLINE', { campaignId: pin, pin: pin, campaignName: name })
      : { type: 'HOST_ONLINE', campaignId: pin, pin: pin, campaignName: name };
    _tp.broadcast(hostEvent);

    _renderDashboard(_cs.getState());
    _openCampaignModal();
  }

  // ── Join Campaign ─────────────────────────────────────────────────────────
  function _joinCampaign() {
    var pinEl = $s('#pin-input');
    if (!pinEl) return;
    var pin = pinEl.value.trim();
    if (!_pinSys.validate(pin)) {
      alert('PIN inválido. Digite 6 números.');
      return;
    }
    _cs.joinCampaign(pin, pin, 'player');
    _tp.init(pin, 'player');
    _tp.onEvent(_onTransportEvent);
    var joinEvent = _ontology
      ? _ontology.make('PLAYER_CONNECTED', { playerName: 'Guardião', pin: pin })
      : { type: 'PLAYER_CONNECTED', playerName: 'Guardião', pin: pin };
    _tp.broadcast(joinEvent);
    _renderDashboard(_cs.getState());
  }

  // ── Reactivate stale session ──────────────────────────────────────────────
  function _reactivateCampaign() {
    var state = _cs.getState();
    if (!state.pin) return;

    _tp.init(state.pin, state.role || 'host');
    _tp.onEvent(_onTransportEvent);
    _cs.markActive();

    // Re-announce host and request fresh status from any investigators still open
    var hostEvt = _ontology
      ? _ontology.make('HOST_ONLINE', { campaignId: state.pin, pin: state.pin, campaignName: state.name })
      : { type: 'HOST_ONLINE', campaignId: state.pin, pin: state.pin, campaignName: state.name };
    _tp.broadcast(hostEvt);

    var reqEvt = _ontology
      ? _ontology.make('REQUEST_STATUS', { pin: state.pin })
      : { type: 'REQUEST_STATUS', pin: state.pin };
    _tp.broadcast(reqEvt);

    _cs.pushTimeline({ type: 'SESSION_RECOVERED', text: 'Sessão reativada.', cls: 'ev-roll' });
    _renderDashboard(_cs.getState());
  }

  // ── Transport events ──────────────────────────────────────────────────────
  function _onTransportEvent(event) {
    if (!event || !event.type) return;

    switch (event.type) {

      case 'INVESTIGATOR_STATUS':
        _cs.upsertInvestigator(event.peerId, {
          playerName:    event.playerName    || '?',
          characterName: event.characterName || '?',
          status:        event.status        || {}
        });
        break;

      case 'PLAYER_CONNECTED':
        _cs.upsertInvestigator(event.peerId, { online: true });
        _cs.pushTimeline({
          type: 'player-connected',
          text: (event.playerName || 'Jogador') + ' entrou na campanha.',
          cls:  'ev-roll'
        });
        // Request status from the new player
        var reqEvent = _ontology
          ? _ontology.make('REQUEST_STATUS', { pin: _cs.getState().pin })
          : { type: 'REQUEST_STATUS', pin: _cs.getState().pin };
        _tp.broadcast(reqEvent);
        break;

      case 'PLAYER_DISCONNECTED':
        if (event.peerId) _cs.setInvestigatorOffline(event.peerId);
        _cs.pushTimeline({
          type: 'player-disconnected',
          text: (event.playerName || 'Jogador') + ' saiu.',
          cls:  'ev-roll'
        });
        break;

      case 'EXECUTION_TRACE':
        _handleExecutionTrace(event);
        break;
    }

    _renderDashboard(_cs.getState());
  }

  function _handleExecutionTrace(event) {
    if (!event.entry) return;
    var entry = event.entry;
    var actor = event.characterName || event.playerName || '?';
    var text  = '';
    var cls   = 'ev-roll';

    switch (entry.type) {
      case 'APPLY_DAMAGE':
        text = '<b>' + actor + '</b> sofreu ' + (entry.payload && entry.payload.amount || '?') + ' de dano.';
        cls  = 'ev-damage';
        break;
      case 'LOSE_SANITY':
        text = '<b>' + actor + '</b> perdeu ' + (entry.payload && entry.payload.amount || '?') + ' SAN.';
        cls  = 'ev-sanity';
        break;
      case 'HEAL_DAMAGE':
        text = '<b>' + actor + '</b> recuperou ' + (entry.payload && entry.payload.amount || '?') + ' PV.';
        cls  = 'ev-roll';
        break;
      case 'RECOVER_SANITY':
        text = '<b>' + actor + '</b> recuperou ' + (entry.payload && entry.payload.amount || '?') + ' SAN.';
        cls  = 'ev-sanity';
        break;
      case 'SPEND_MAGIC':
        text = '<b>' + actor + '</b> gastou ' + (entry.payload && entry.payload.amount || '?') + ' PM.';
        cls  = 'ev-magic';
        break;
      case 'ROLL_SKILL':
        text = '<b>' + actor + '</b> rolou ' + (entry.payload && entry.payload.skillName || 'perícia') +
               ': ' + (entry.payload && entry.payload.roll || '?') + '% vs ' +
               (entry.payload && entry.payload.value || '?') + '% → ' +
               (entry.payload && entry.payload.outcome || '?');
        cls  = 'ev-roll';
        break;
      case 'ATTACK_RESOLVED':
        text = '<b>' + actor + '</b> atacou com ' + (entry.payload && entry.payload.weaponName || '?') + '.';
        cls  = 'ev-combat';
        break;
      default:
        text = '<b>' + actor + '</b>: ' + entry.type.toLowerCase().replace(/_/g, ' ');
    }

    _cs.pushTimeline({ type: entry.type, text: text, cls: cls });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function _onCampaignChange(state) {
    _renderDashboard(state);
  }

  function _renderDashboard(state) {
    var setup     = $s('#campaign-setup');
    var stale     = $s('#campaign-stale');
    var dashboard = $s('#campaign-dashboard');
    var badge     = $s('#campaign-badge');
    var cbName    = $s('#cb-name');
    var cbPin     = $s('#cb-pin');
    var cbPlayers = $s('#cb-players');

    var status = state.status || (state.connected ? 'active' : 'disconnected');

    if (status === 'disconnected' || !state.connected) {
      if (setup)     setup.style.display     = '';
      if (stale)     stale.style.display     = 'none';
      if (dashboard) dashboard.style.display = 'none';
      if (badge)     badge.style.display     = 'none';
      return;
    }

    if (status === 'stale') {
      if (setup)     setup.style.display     = 'none';
      if (dashboard) dashboard.style.display = 'none';
      if (badge)     badge.style.display     = 'none';
      if (stale)     stale.style.display     = '';
      var detail = $s('#stale-detail');
      if (detail) detail.textContent = (state.name || '?') + ' · PIN ' + (state.pin || '——');
      return;
    }

    // status === 'active'
    if (setup)     setup.style.display     = 'none';
    if (stale)     stale.style.display     = 'none';
    if (dashboard) dashboard.style.display = '';
    if (badge)     badge.style.display     = '';

    if (cbName)    cbName.textContent    = state.name || '—';
    if (cbPin)     cbPin.textContent     = state.pin  || '——';

    var invs      = Object.values(state.investigators || {});
    var onlineN   = invs.filter(function (i) { return i.online; }).length;
    if (cbPlayers) cbPlayers.textContent = onlineN + ' conectado' + (onlineN !== 1 ? 's' : '');

    _renderInvestigatorCards(invs);
    _renderTimeline(state.timeline || []);
  }

  function _renderInvestigatorCards(investigators) {
    var container = $s('#investigators-cards');
    var countEl   = $s('#is-count');
    if (!container) return;

    var online = investigators.filter(function (i) { return i.online; }).length;
    if (countEl) countEl.textContent = online + ' conectado' + (online !== 1 ? 's' : '');

    if (!investigators.length) {
      container.innerHTML = '<div class="inv-card-empty">Aguardando investigadores...</div>';
      return;
    }

    container.innerHTML = investigators.map(function (inv) {
      var s       = inv.status || {};
      var hpMax   = s.hpMax  || 1;
      var sanMax  = s.sanMax || 1;
      var mpMax   = s.mpMax  || 1;
      var hpPct   = Math.max(0, Math.min(100, Math.round((s.hp  || 0) / hpMax  * 100)));
      var sanPct  = Math.max(0, Math.min(100, Math.round((s.san || 0) / sanMax * 100)));
      var mpPct   = Math.max(0, Math.min(100, Math.round((s.mp  || 0) / mpMax  * 100)));

      return '<div class="inv-card ' + (inv.online ? 'online' : 'offline') + '">' +
        '<div class="inv-card-header">' +
          '<span class="inv-card-online-dot"></span>' +
          '<span class="inv-card-name">' + _esc(inv.characterName || '?') + '</span>' +
          '<span class="inv-card-player">' + _esc(inv.playerName || '') + '</span>' +
        '</div>' +
        '<div class="inv-card-stats">' +
          '<div class="inv-stat hp"><span class="inv-stat-label">PV</span><span class="inv-stat-value">' + (s.hp != null ? s.hp : '?') + '</span></div>' +
          '<div class="inv-stat san"><span class="inv-stat-label">SAN</span><span class="inv-stat-value">' + (s.san != null ? s.san : '?') + '</span></div>' +
          '<div class="inv-stat mp"><span class="inv-stat-label">PM</span><span class="inv-stat-value">' + (s.mp != null ? s.mp : '?') + '</span></div>' +
          '<div class="inv-stat luck"><span class="inv-stat-label">SOR</span><span class="inv-stat-value">' + (s.luck != null ? s.luck : '?') + '</span></div>' +
        '</div>' +
        '<div class="inv-card-bars">' +
          '<div class="inv-bar hp"><div class="inv-bar-fill" style="width:' + hpPct + '%"></div></div>' +
          '<div class="inv-bar san"><div class="inv-bar-fill" style="width:' + sanPct + '%"></div></div>' +
          '<div class="inv-bar mp"><div class="inv-bar-fill" style="width:' + mpPct + '%"></div></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function _renderTimeline(events) {
    var list = $s('#timeline-list');
    if (!list) return;

    var recent = events.slice(-50).reverse();

    if (!recent.length) {
      list.innerHTML = '<li class="tl-empty">Sem eventos ainda.</li>';
      return;
    }

    list.innerHTML = recent.map(function (ev) {
      var time = _fmtTime(ev.ts);
      return '<li class="tl-entry ' + (ev.cls || '') + '">' +
        '<span class="tl-time">' + time + '</span>' +
        '<span class="tl-text">' + (ev.text || ev.type || '') + '</span>' +
      '</li>';
    }).join('');
  }

  // ── Campaign Modal ─────────────────────────────────────────────────────────
  function _openCampaignModal() {
    var modal = $s('#modal-campaign');
    var body  = $s('#campaign-modal-body');
    if (!modal || !body) return;

    var state = _cs.getState();

    if (!state.connected) {
      modal.style.display = 'none';
      return;
    }

    var invs = Object.values(state.investigators || {});
    var playersHtml = invs.length
      ? invs.map(function (inv) {
          return '<div class="cp-entry">' +
            '<span class="cp-dot" style="background:' + (inv.online ? 'var(--ok,#4a8a54)' : 'var(--ink-faded)') + '"></span>' +
            '<span class="cp-name">' + _esc(inv.playerName || '?') + '</span>' +
            '<span class="cp-char">' + _esc(inv.characterName || '—') + '</span>' +
          '</div>';
        }).join('')
      : '<p style="color:var(--ink-faded);font-style:italic;font-size:0.85rem;">Nenhum jogador conectado ainda.</p>';

    body.innerHTML =
      '<div class="campaign-pin-display">' +
        '<div class="campaign-pin-number">' + (state.pin || '——') + '</div>' +
        '<div class="campaign-pin-label">PIN da Campanha · compartilhe com os jogadores</div>' +
      '</div>' +
      '<div>' +
        '<label style="font-family:var(--font-mono);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--ink-faded);">Campanha</label>' +
        '<p style="font-size:1rem;color:var(--ink);margin-top:0.25rem;">' + _esc(state.name || '—') + '</p>' +
      '</div>' +
      '<div>' +
        '<label style="font-family:var(--font-mono);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--ink-faded);margin-bottom:0.4rem;display:block;">Jogadores</label>' +
        '<div class="campaign-players-list">' + playersHtml + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
        '<button id="btn-end-campaign" class="btn-danger" style="flex:1">Encerrar Campanha</button>' +
      '</div>';

    var btnEnd = body.querySelector('#btn-end-campaign');
    if (btnEnd) btnEnd.onclick = function () {
      if (!confirm('Encerrar a campanha? Isso desconecta todos os jogadores.')) return;
      var endEvent = _ontology
        ? _ontology.make('CAMPAIGN_ENDED', { pin: state.pin })
        : { type: 'CAMPAIGN_ENDED', pin: state.pin };
      _tp.broadcast(endEvent);
      _tp.close();
      _cs.leaveCampaign();
      _closeModal();
      _renderDashboard(_cs.getState());
    };

    modal.style.display = 'flex';
  }

  function _closeModal() {
    var modal = $s('#modal-campaign');
    if (modal) modal.style.display = 'none';
  }

  // ── Utils ──────────────────────────────────────────────────────────────────
  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.getHours().toString().padStart(2,'0') + ':' +
           d.getMinutes().toString().padStart(2,'0');
  }

  // ── DOMContentLoaded ───────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CoC.campaign.keeperDashboard = Object.freeze({ init: init });

})();
