/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/supabase-transport.js
   Sprint 17 — SupabaseRealtimeTransport

   Implementa a mesma interface de transport.js com Supabase Realtime.
   Para ativar: troque window.CoC.campaign.transport por este módulo
   (ou use uma factory em transport.js que escolhe a implementação).

   PRÉ-REQUISITOS:
   ─────────────────────────────────────────────────────────────────────
   1. Projeto Supabase criado (supabase.com)
   2. SDK carregado em js/vendor/supabase.js
   3. Variáveis de ambiente expostas em js/config.js:
        window.CoC.config.supabaseUrl  = "https://<project>.supabase.co"
        window.CoC.config.supabaseKey  = "<anon-public-key>"
   4. Tabela `campaign_events` criada (schema abaixo)

   SCHEMA SQL (execute no Supabase SQL Editor):
   ─────────────────────────────────────────────────────────────────────
   CREATE TABLE campaign_events (
     id          BIGSERIAL PRIMARY KEY,
     event_id    TEXT NOT NULL UNIQUE,        -- peerId:seqNo — deduplicação
     campaign_id TEXT NOT NULL,
     peer_id     TEXT NOT NULL,
     type        TEXT NOT NULL,
     payload     JSONB NOT NULL DEFAULT '{}',
     ts          BIGINT NOT NULL,
     created_at  TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX ON campaign_events (campaign_id, ts);
   ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
   -- Política: qualquer pessoa com anon key pode ler/inserir dentro da campanha
   CREATE POLICY "campaign read" ON campaign_events FOR SELECT USING (true);
   CREATE POLICY "campaign insert" ON campaign_events FOR INSERT WITH CHECK (true);

   PROTOCOLO DE SINCRONIZAÇÃO:
   ─────────────────────────────────────────────────────────────────────
   - Mensagens enviadas via Realtime Broadcast (sem persistência) para latência
     mínima. A tabela campaign_events é opcional (para replay / histórico).
   - Late joiner recebe INVESTIGATOR_STATUS snapshot via REQUEST_STATUS
     handshake — sem replay de eventos (decisão de design, ver transport.js).
   - Deduplicação: seen Set em memória + eventId único por sessão.
   - Echo suppression: mesma guard que BroadcastChannel (peerId === _peerId).

   PROBLEMAS DISTRIBUÍDOS A TRATAR NESTA SPRINT:
   ─────────────────────────────────────────────────────────────────────
   1. Duplicação: Supabase entrega at-least-once → usar _seen Set + eventId
   2. Reordenação: bufferizar por seqNo quando gap detectado (ou descartar)
   3. Reconexão: Supabase SDK faz auto-reconnect; re-broadcast HOST_ONLINE após
   4. Latência: sem impacto no modelo de estado (store é local, transport é sync)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {

  var _channel    = null;   // Supabase RealtimeChannel
  var _handlers   = [];
  var _campaignId = null;
  var _peerId     = null;
  var _seen       = null;   // Set<eventId> — deduplicação em memória

  function _uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    var arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(function (b, i) {
      var h = b.toString(16).padStart(2, '0');
      return (i === 4 || i === 6 || i === 8 || i === 10) ? '-' + h : h;
    }).join('');
  }

  function _getClient() {
    // TODO Sprint 17: inicializar Supabase client com config
    // var cfg = window.CoC.config || {};
    // return supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    console.error('[supabase-transport] Supabase não configurado — ver js/config.js');
    return null;
  }

  // ── init ──────────────────────────────────────────────────────────────────
  function init(campaignId, role) {
    _campaignId = campaignId;
    _peerId     = _peerId || _uuid();
    _handlers   = [];
    _seen       = new Set();
    _close();

    var client = _getClient();
    if (!client) return;

    // TODO Sprint 17: substituir pelo canal Supabase Realtime
    // _channel = client
    //   .channel('campaign:' + campaignId, { config: { broadcast: { self: false } } })
    //   .on('broadcast', { event: 'campaign_event' }, function (payload) {
    //     _onMessage(payload.payload);
    //   })
    //   .subscribe(function (status) {
    //     if (status === 'SUBSCRIBED') {
    //       console.log('[supabase-transport] conectado à campanha', campaignId);
    //     }
    //   });
  }

  // ── broadcast ────────────────────────────────────────────────────────────
  function broadcast(event) {
    if (!_channel) return;

    var ontology = window.CoC.campaign && window.CoC.campaign.ontology;
    if (ontology && event && event.type) {
      var result = ontology.validate(event.type, event);
      if (!result.ok) {
        console.warn('[supabase-transport] validation:', result.errors.join('; '), event);
      }
    }

    var envelope = Object.assign({}, event, {
      peerId:     _peerId,
      campaignId: _campaignId,
      ts:         Date.now()
    });

    // TODO Sprint 17:
    // _channel.send({ type: 'broadcast', event: 'campaign_event', payload: envelope });
  }

  // ── onMessage (internal) ─────────────────────────────────────────────────
  function _onMessage(data) {
    if (!data) return;

    // Echo suppression — Supabase retransmite para o emissor
    if (data.peerId === _peerId) return;

    // Deduplicação at-least-once
    if (data.eventId) {
      if (_seen.has(data.eventId)) return;
      _seen.add(data.eventId);
      // Limpar seen periodicamente para evitar crescimento ilimitado
      if (_seen.size > 1000) _seen = new Set();
    }

    // TODO Sprint 17: detecção de gap por seqNo
    // if (data.seqNo && _lastSeqByPeer[data.peerId] !== undefined) {
    //   var expected = _lastSeqByPeer[data.peerId] + 1;
    //   if (data.seqNo > expected) {
    //     console.warn('[supabase-transport] gap detectado para', data.peerId,
    //                  'esperado', expected, 'recebido', data.seqNo);
    //     // Política: aceitar e registrar gap (não bufferizar para CoC)
    //   }
    // }
    // _lastSeqByPeer[data.peerId] = data.seqNo;

    _handlers.forEach(function (h) {
      try { h(data); } catch (err) { console.error('[supabase-transport] handler error', err); }
    });
  }

  // ── onEvent / offEvent ────────────────────────────────────────────────────
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
    if (_channel) {
      // TODO Sprint 17: _channel.unsubscribe();
      _channel = null;
    }
  }

  function close() {
    _close();
    _handlers   = [];
    _campaignId = null;
    _seen       = null;
  }

  // Exportado mas NÃO registrado em window.CoC.campaign.transport até Sprint 17.
  // Para ativar: trocar a atribuição abaixo em transport.js ou usar uma factory.
  window.CoC.campaign.supabaseTransport = Object.freeze({
    init:      init,
    broadcast: broadcast,
    onEvent:   onEvent,
    offEvent:  offEvent,
    getPeerId: getPeerId,
    close:     close,
  });

})();
