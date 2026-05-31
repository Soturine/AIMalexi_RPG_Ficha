/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/transport.js
   Camada de transporte de eventos de campanha.

   INTERFACE DO TRANSPORT (contrato para BroadcastChannel e Supabase):
   ─────────────────────────────────────────────────────────────────────
   init(campaignId, role)
     Abre canal para a campanha. Reseta _handlers (callers devem re-registrar).
     _peerId persiste entre calls — muda apenas em novo page load.

   broadcast(event)
     Adiciona envelope { peerId, campaignId, ts } ao evento e envia.
     Soft-valida contra campaign-ontology antes de enviar (warn, nunca bloqueia).

   onEvent(handler)
     Registra receptor. Deduplica — mesmo handler não é registrado duas vezes.

   offEvent(handler) / close()
     Remove handler / fecha canal e limpa estado.

   getPeerId() → string UUID
     Identidade deste peer (usada como sourceClientId nos eventos).

   ECHO SUPPRESSION:
   ─────────────────────────────────────────────────────────────────────
   Linha 43: if (e.data.peerId === _peerId) return
   BroadcastChannel não retransmite para o emissor, mas o check existe porque
   Supabase Realtime retransmite. O guard é idêntico para ambos — nenhuma
   mudança necessária no adapter de Sprint 17.

   SEQ NUMBER POLICY:
   ─────────────────────────────────────────────────────────────────────
   _seqNo é mantido em player-sync.js (não aqui). Reseta a 0 em cada page
   load. _peerId também muda a cada page load, então eventId = peerId:seqNo
   é globalmente único — sem colisão entre sessões.

   LATE JOINER PROTOCOL:
   ─────────────────────────────────────────────────────────────────────
   Quando PLAYER_CONNECTED chega, Keeper envia REQUEST_STATUS.
   Investigador responde com INVESTIGATOR_STATUS (snapshot completo).
   Não há replay de eventos — snapshot é suficiente para CoC.
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
    _handlers   = [];   // new channel → callers must re-register; prevents duplicate handlers
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
    // Soft-validate against ontology when available — warns but never blocks.
    var ontology = window.CoC.campaign && window.CoC.campaign.ontology;
    if (ontology && event && event.type) {
      var result = ontology.validate(event.type, event);
      if (!result.ok) {
        console.warn('[transport] broadcast validation:', result.errors.join('; '), event);
      }
    }
    var envelope = Object.assign({}, event, {
      peerId:     _peerId,
      campaignId: _campaignId,
      ts:         Date.now()
    });
    try { _channel.postMessage(envelope); } catch (e) {}
  }

  function onEvent(handler) {
    if (typeof handler === 'function' && _handlers.indexOf(handler) === -1) {
      _handlers.push(handler);
    }
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
