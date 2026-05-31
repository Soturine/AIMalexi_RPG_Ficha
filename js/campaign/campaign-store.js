/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/campaign-store.js
   Store local de campanha — independente do store de personagem.

   Estado:
   - id, name, pin, role ('host'|'player'|null), hostPeerId
   - investigators: { peerId → { peerId, playerName, characterName, status, online, lastSeen } }
   - timeline: [ { ts, type, actor, text, cls } ] (últimos 200 eventos)
   - connected: bool

   Persistência: sessionStorage (a campanha não sobrevive ao fechar o browser).
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {

  var TIMELINE_MAX = 200;
  var SESSION_KEY  = 'aimalexi-rpg/campaign';

  var _state = _load();
  var _subs  = [];

  function _load() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return _defaultState();
  }

  function _defaultState() {
    return {
      id: null,
      name: '',
      pin: null,
      role: null,
      hostPeerId: null,
      investigators: {},
      timeline: [],
      connected: false
    };
  }

  function _save() {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(_state)); } catch (e) {}
  }

  function _notify() {
    _subs.forEach(function (fn) { try { fn(_state); } catch (e) {} });
    _save();
  }

  function getState() { return _state; }

  function createCampaign(name, pin, hostPeerId) {
    _state = _defaultState();
    _state.id        = _uuid();
    _state.name      = name || 'Nova Campanha';
    _state.pin       = pin;
    _state.role      = 'host';
    _state.hostPeerId = hostPeerId;
    _state.connected = true;
    _notify();
  }

  function joinCampaign(campaignId, pin, role) {
    _state.id        = campaignId;
    _state.pin       = pin;
    _state.role      = role || 'player';
    _state.connected = true;
    _notify();
  }

  function leaveCampaign() {
    _state = _defaultState();
    sessionStorage.removeItem(SESSION_KEY);
    _notify();
  }

  function upsertInvestigator(peerId, data) {
    _state.investigators = Object.assign({}, _state.investigators);
    _state.investigators[peerId] = Object.assign(
      { peerId: peerId, online: true, lastSeen: Date.now() },
      _state.investigators[peerId] || {},
      data
    );
    _notify();
  }

  function setInvestigatorOffline(peerId) {
    if (!_state.investigators[peerId]) return;
    _state.investigators = Object.assign({}, _state.investigators);
    _state.investigators[peerId] = Object.assign({}, _state.investigators[peerId], { online: false });
    _notify();
  }

  function pushTimeline(entry) {
    var timeline = _state.timeline.slice(-TIMELINE_MAX + 1);
    timeline.push(Object.assign({ ts: Date.now() }, entry));
    _state = Object.assign({}, _state, { timeline: timeline });
    _notify();
  }

  function clearTimeline() {
    _state = Object.assign({}, _state, { timeline: [] });
    _notify();
  }

  function subscribe(fn) {
    _subs.push(fn);
    return function () { _subs = _subs.filter(function (s) { return s !== fn; }); };
  }

  function _uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a).map(function (b, i) {
      var h = b.toString(16).padStart(2, '0');
      return (i === 4 || i === 6 || i === 8 || i === 10) ? '-' + h : h;
    }).join('');
  }

  window.CoC.campaign.store = Object.freeze({
    getState:             getState,
    createCampaign:       createCampaign,
    joinCampaign:         joinCampaign,
    leaveCampaign:        leaveCampaign,
    upsertInvestigator:   upsertInvestigator,
    setInvestigatorOffline: setInvestigatorOffline,
    pushTimeline:         pushTimeline,
    clearTimeline:        clearTimeline,
    subscribe:            subscribe
  });

})();
