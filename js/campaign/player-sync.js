/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/player-sync.js
   Sincroniza o estado do investigador com a campanha via transport.

   Carregado em investigator.html.
   Escuta o store de personagem e transmite status + trace events ao Keeper.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {

  var _tp  = null;
  var _cs  = null;
  var _str = null;
  var _playerName = '';

  function $s(sel) { return document.querySelector(sel); }

  function init() {
    _tp  = window.CoC.campaign && window.CoC.campaign.transport;
    _cs  = window.CoC.campaign && window.CoC.campaign.store;
    _str = window.CoC && window.CoC.store;

    if (!_tp || !_cs || !_str) return;

    _bindPlayerUI();
    _listenStore();
    _listenTransport();
    _listenBus();

    // Restaurar sessão
    var saved = _cs.getState();
    if (saved.connected && saved.id) {
      _tp.init(saved.id, saved.role);
      _tp.onEvent(_onTransportEvent);
      _broadcastStatus();
    }
  }

  function _bindPlayerUI() {
    // Adicionar painel de campanha no investigador (se houver #toolbar)
    var toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;

    // Injetar botão de campanha na toolbar do investigador
    var btnCampaign = document.createElement('button');
    btnCampaign.id = 'btn-player-campaign';
    btnCampaign.className = 'btn-ghost';
    btnCampaign.title = 'Entrar em campanha com PIN';
    btnCampaign.textContent = '🌐 Campanha';

    // Inserir antes do spacer
    var spacer = toolbar.querySelector('.toolbar-spacer');
    if (spacer) {
      toolbar.insertBefore(btnCampaign, spacer);
    } else {
      toolbar.appendChild(btnCampaign);
    }

    btnCampaign.onclick = _openPlayerCampaignModal;

    // Painel flutuante de status (quando em campanha)
    _renderPlayerCampaignBadge();
  }

  function _openPlayerCampaignModal() {
    var state = _cs.getState();
    if (state.connected) {
      var leave = confirm('Você está na campanha "' + state.name + '" (PIN: ' + state.pin + ').\n\nSair da campanha?');
      if (leave) {
        _tp.broadcast({ type: 'PLAYER_DISCONNECTED', playerName: _playerName });
        _tp.close();
        _cs.leaveCampaign();
        _renderPlayerCampaignBadge();
      }
      return;
    }

    var pin = window.prompt('Digite o PIN da campanha (6 dígitos):');
    if (!pin) return;

    var pinSys = window.CoC.campaign && window.CoC.campaign.pin;
    if (!pinSys || !pinSys.validate(pin.trim())) {
      alert('PIN inválido.');
      return;
    }

    _playerName = window.prompt('Seu nome de jogador:', '') || 'Jogador';

    _cs.joinCampaign(pin.trim(), pin.trim(), 'player');
    _tp.init(pin.trim(), 'player');
    _tp.onEvent(_onTransportEvent);

    _broadcastStatus();
    _tp.broadcast({ type: 'PLAYER_CONNECTED', playerName: _playerName });
    _renderPlayerCampaignBadge();
  }

  function _renderPlayerCampaignBadge() {
    var existing = document.querySelector('.player-campaign-badge');
    if (existing) existing.remove();

    var state = _cs.getState();
    if (!state.connected) return;

    var badge = document.createElement('div');
    badge.className = 'player-campaign-badge';
    badge.innerHTML =
      '<span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--ink-faded);">CAMPANHA</span> ' +
      '<strong style="color:var(--brass-bright);">' + (state.name || '?') + '</strong> ' +
      '<span style="color:var(--ink-faded);">PIN: <b style="color:var(--ink);">' + state.pin + '</b></span>';
    badge.style.cssText = [
      'position:fixed', 'bottom:1rem', 'right:1rem',
      'background:var(--bg-card)', 'border:1px solid var(--brass)',
      'border-radius:var(--radius-lg)', 'padding:0.45rem 0.85rem',
      'z-index:100', 'font-size:0.82rem', 'cursor:pointer',
      'box-shadow:0 4px 18px rgba(0,0,0,0.5)'
    ].join(';');
    badge.title = 'Clique para sair da campanha';
    badge.onclick = _openPlayerCampaignModal;

    document.body.appendChild(badge);
  }

  // ── Store listener ──────────────────────────────────────────────────────────
  function _listenStore() {
    if (!_str.subscribe) return;
    _str.subscribe(function () {
      var state = _cs.getState();
      if (state.connected) _broadcastStatus();
    });
  }

  function _broadcastStatus() {
    if (!_tp || !_str) return;
    var campaignState = _cs.getState();
    if (!campaignState.connected) return;

    var charState = _str.getState();
    if (!charState || !charState.character) return;

    var c = charState.character;
    var inv = c.investigator || {};
    var der = c.derived     || {};

    _tp.broadcast({
      type:          'INVESTIGATOR_STATUS',
      playerName:    _playerName || inv.playerName || 'Jogador',
      characterName: inv.name || '?',
      status: {
        hp:     c.derived && c.derived.pvAtual != null ? c.derived.pvAtual : (c.derived && c.derived.pvMax || 0),
        hpMax:  c.derived && c.derived.pvMax   || 1,
        san:    c.derived && c.derived.sanAtual != null ? c.derived.sanAtual : (c.derived && c.derived.sanMax || 0),
        sanMax: c.derived && c.derived.sanMax   || 1,
        mp:     c.derived && c.derived.pmAtual  != null ? c.derived.pmAtual  : (c.derived && c.derived.pmMax || 0),
        mpMax:  c.derived && c.derived.pmMax    || 1,
        luck:   c.attributes && c.attributes.SOR && c.attributes.SOR.value || 0
      }
    });
  }

  // ── Transport listener ──────────────────────────────────────────────────────
  function _listenTransport() {}

  function _onTransportEvent(event) {
    if (!event) return;
    if (event.type === 'REQUEST_STATUS') {
      _broadcastStatus();
    }
    if (event.type === 'CAMPAIGN_ENDED') {
      _cs.leaveCampaign();
      _tp.close();
      _renderPlayerCampaignBadge();
      var ui = window.CoC && window.CoC.ui;
      if (ui && ui.toast) ui.toast('A campanha foi encerrada pelo Guardião.', { type: 'info', duration: 5000 });
    }
  }

  // ── Bus listener para broadcast de trace events ─────────────────────────────
  // Subscribes to executor:action published by js/core/executor.js on every
  // successful dispatch. No monkey-patching needed — executor is frozen.
  function _listenBus() {
    var bus = window.CoC && window.CoC.bus;
    if (!bus || !bus.subscribe) return;

    bus.subscribe('executor:action', function (data) {
      if (!_cs || !_tp) return;
      var cState = _cs.getState();
      if (!cState.connected) return;

      var charState  = _str ? _str.getState() : null;
      var inv        = charState && charState.character && charState.character.investigator || {};
      var ontology   = window.CoC.campaign && window.CoC.campaign.ontology;

      var event = ontology
        ? ontology.make('EXECUTION_TRACE', {
            characterName: inv.name       || '?',
            playerName:    _playerName    || inv.playerName || '?',
            entry:         { type: data.type, payload: data.payload }
          })
        : {
            type:          'EXECUTION_TRACE',
            characterName: inv.name       || '?',
            playerName:    _playerName    || inv.playerName || '?',
            entry:         { type: data.type, payload: data.payload }
          };

      _tp.broadcast(event);
      _broadcastStatus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CoC.campaign.playerSync = Object.freeze({ init: init });

})();
