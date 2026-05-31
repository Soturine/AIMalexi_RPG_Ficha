/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/supabase-transport.js
   Sprint 17 — SupabaseRealtimeTransport (Model A: Realtime-only, sem persistência)

   Implementa a mesma interface de transport.js.
   Ativado quando window.CoC.config.useSupabase === true.

   PRÉ-REQUISITOS:
   ─────────────────────────────────────────────────────────────────────
   1. Projeto Supabase criado (supabase.com — plano Free é suficiente)
   2. SDK v2 em js/vendor/supabase.js (baixar de:
        https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js
      e commitar localmente — offline-first proíbe CDN em runtime)
   3. js/config.js preenchido com url + key e useSupabase: true
   4. No Supabase Dashboard → Realtime → ativar "Broadcast" para o projeto

   PROTOCOLO (Model A — Realtime Broadcast sem tabela de eventos):
   ─────────────────────────────────────────────────────────────────────
   - Cada campanha usa um canal: 'coc-campaign:{pin}'
   - Eventos broadcast com event name 'coc_event'
   - Late joiner recebe snapshot via REQUEST_STATUS → INVESTIGATOR_STATUS
   - Sem persistência — sem tabela campaign_events (adicionável em Sprint 18)

   PROBLEMAS DISTRIBUÍDOS TRATADOS:
   ─────────────────────────────────────────────────────────────────────
   - Echo:        { self: false } no config do canal (Supabase não retransmite)
                  + guard peerId === _peerId como segunda linha de defesa
   - Duplicação:  _seen Set por eventId (at-least-once delivery do Supabase)
   - Reordenação: aceita e processa na ordem de chegada (adequado para CoC —
                  eventos independentes, sem transação distribuída)
   - Reconexão:   Supabase SDK faz auto-reconnect; o evento 'SUBSCRIBED' é
                  reemitido, permitindo re-broadcast de HOST_ONLINE
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {

  var _channel    = null;   // Supabase RealtimeChannel
  var _client     = null;   // Supabase SupabaseClient (cached)
  var _handlers   = [];
  var _campaignId = null;
  var _peerId     = null;
  var _seen       = null;   // Set<eventId> — dedup em memória

  function _uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    var arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(function (b, i) {
      var h = b.toString(16).padStart(2, '0');
      return (i === 4 || i === 6 || i === 8 || i === 10) ? '-' + h : h;
    }).join('');
  }

  // ── Client factory ────────────────────────────────────────────────────────
  function _getClient() {
    if (_client) return _client;

    var cfg = window.CoC && window.CoC.config;
    if (!cfg || !cfg.useSupabase || !cfg.supabaseUrl || !cfg.supabaseKey) {
      return null;
    }

    var sdk = window.supabase;
    if (!sdk || typeof sdk.createClient !== 'function') {
      console.error(
        '[supabase-transport] SDK não carregado. ' +
        'Baixe https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js ' +
        'e salve em js/vendor/supabase.js'
      );
      return null;
    }

    _client = sdk.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    return _client;
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

    _channel = client
      .channel('coc-campaign:' + campaignId, {
        config: {
          broadcast: { self: false, ack: false }
          // self: false — Supabase não retransmite para o emissor
          // ack: false  — fire-and-forget (menor latência)
        }
      })
      .on('broadcast', { event: 'coc_event' }, function (payload) {
        _onMessage(payload.payload);
      })
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          console.log('[supabase-transport] conectado: campanha', campaignId, '· role', role);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[supabase-transport] erro no canal da campanha', campaignId);
        } else if (status === 'TIMED_OUT') {
          console.warn('[supabase-transport] timeout — Supabase tentará reconectar');
        }
      });
  }

  // ── broadcast ────────────────────────────────────────────────────────────
  function broadcast(event) {
    if (!_channel) return;

    // Soft-valida contra ontologia
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

    _channel.send({
      type:    'broadcast',
      event:   'coc_event',
      payload: envelope
    }).then(function (res) {
      if (res === 'error') {
        console.warn('[supabase-transport] falha ao enviar evento', event.type);
      }
    }).catch(function (err) {
      console.warn('[supabase-transport] broadcast error', err);
    });
  }

  // ── _onMessage (interno) ─────────────────────────────────────────────────
  function _onMessage(data) {
    if (!data) return;

    // Segunda linha de defesa contra eco (self:false já trata no SDK)
    if (data.peerId === _peerId) return;

    // Deduplicação at-least-once por eventId
    if (data.eventId) {
      if (_seen.has(data.eventId)) return;
      _seen.add(data.eventId);
      if (_seen.size > 2000) _seen = new Set(); // evita crescimento ilimitado
    }

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
      try { _channel.unsubscribe(); } catch (e) {}
      _channel = null;
    }
  }

  function close() {
    _close();
    _handlers   = [];
    _campaignId = null;
    _seen       = null;
  }

  window.CoC.campaign.supabaseTransport = Object.freeze({
    init:      init,
    broadcast: broadcast,
    onEvent:   onEvent,
    offEvent:  offEvent,
    getPeerId: getPeerId,
    close:     close,
  });

  // ── Selector ──────────────────────────────────────────────────────────────
  // Se useSupabase: true, este transport substitui o BroadcastChannel.
  // Carregado após transport.js — a última atribuição vence.
  if (window.CoC.config && window.CoC.config.useSupabase) {
    window.CoC.campaign.transport = window.CoC.campaign.supabaseTransport;
    console.info('[supabase-transport] ativo — modo remoto (Supabase Realtime)');
  }

})();
