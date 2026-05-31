/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/transport.js
   Camada de transporte de eventos de campanha.

   Implementação atual: BroadcastChannel (funciona entre abas do mesmo navegador).
   Slot para Supabase Realtime: substitua _supabaseInit() e _supabaseSend().

   Arquitetura:
   - broadcast(event): envia para todos os peers
   - onEvent(handler): registra receptor de eventos
   - close(): encerra canal
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {

  var _channel    = null;
  var _handlers   = [];
  var _campaignId = null;
  var _peerId     = null;

  function _uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    var arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(function(b, i) {
      var h = b.toString(16).padStart(2, '0');
      return (i === 4 || i === 6 || i === 8 || i === 10) ? '-' + h : h;
    }).join('');
  }

  function init(campaignId, role) {
    _campaignId = campaignId;
    _peerId     = _peerId || _uuid();
    _close();

    if ('BroadcastChannel' in window) {
      _channel = new BroadcastChannel('coc-campaign-' + campaignId);
      _channel.onmessage = function (e) {
        if (!e.data || e.data.peerId === _peerId) return;
        _handlers.forEach(function (h) {
          try { h(e.data); } catch (err) { console.error('[transport] handler error', err); }
        });
      };
    } else {
      console.warn('[transport] BroadcastChannel unavailable — local-only mode');
    }
  }

  function broadcast(event) {
    if (!_channel) return;
    var envelope = Object.assign({}, event, {
      peerId:     _peerId,
      campaignId: _campaignId,
      ts:         Date.now()
    });
    try { _channel.postMessage(envelope); } catch (e) {}
  }

  function onEvent(handler) {
    if (typeof handler === 'function') _handlers.push(handler);
  }

  function offEvent(handler) {
    _handlers = _handlers.filter(function (h) { return h !== handler; });
  }

  function getPeerId() { return _peerId; }

  function _close() {
    if (_channel) { try { _channel.close(); } catch (e) {} _channel = null; }
  }

  function close() {
    _close();
    _handlers = [];
    _campaignId = null;
  }

  /* ── Slot Supabase (M5) ────────────────────────────────────────────────
     Para ativar multiplayer remoto:
     1. Crie um projeto em supabase.com
     2. Configure as variáveis no painel do projeto
     3. Substitua _close/_channel pelo Supabase Realtime channel
  ──────────────────────────────────────────────────────────────────────── */

  window.CoC.campaign.transport = Object.freeze({
    init: init,
    broadcast: broadcast,
    onEvent: onEvent,
    offEvent: offEvent,
    getPeerId: getPeerId,
    close: close
  });

})();
