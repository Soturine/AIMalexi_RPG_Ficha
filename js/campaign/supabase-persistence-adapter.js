/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/supabase-persistence-adapter.js
   Fase M (live) — Adapter Supabase do contrato de campaign-persistence.js.

   Traduz o contrato { insertEvent, fetchEventsSince, upsertSnapshot,
   fetchSnapshots } para chamadas supabase-js, e expõe auth anônimo + RPCs
   create_campaign / join_campaign (ver supabase/schema.sql). O SDK real é
   vendado em js/vendor/supabase.js (window.supabase) na ativação live.

   NÃO liga o Supabase sozinho — só é usado quando window.CoC.config.useSupabase.

   Expõe: window.CoC.campaign.supabaseAdapter
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC          = window.CoC          || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {
  'use strict';

  // Cria o cliente supabase-js. config: { supabaseUrl, supabaseKey }. sdk default = window.supabase.
  function createClient(config, sdk) {
    sdk = sdk || (typeof window !== 'undefined' ? window.supabase : null);
    if (!sdk || typeof sdk.createClient !== 'function') {
      throw new Error('Supabase SDK ausente — vendar o build ESM em js/vendor/supabase.js.');
    }
    return sdk.createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 10 } }
    });
  }

  // Garante sessão anônima (RLS depende de auth.uid()). Habilitar "Anonymous sign-ins" no painel.
  function ensureSession(sb) {
    return Promise.resolve(sb.auth.getSession()).then(function (res) {
      var session = res && res.data && res.data.session;
      if (session) return session;
      return Promise.resolve(sb.auth.signInAnonymously()).then(function (r) {
        if (r && r.error) throw r.error;
        return r && r.data && r.data.session;
      });
    });
  }

  function createCampaign(sb, name, pin) {
    return Promise.resolve(sb.rpc('create_campaign', { p_name: name, p_pin: pin }))
      .then(function (r) { if (r && r.error) throw r.error; return r ? r.data : null; });
  }

  function joinCampaign(sb, pin) {
    return Promise.resolve(sb.rpc('join_campaign', { p_pin: pin }))
      .then(function (r) { if (r && r.error) throw r.error; return r ? r.data : null; });
  }

  // Violação de UNIQUE(campaign_id, peer_id, peer_seq) → idempotência (já persistido).
  function _isUnique(err) {
    return !!(err && (err.code === '23505' || /duplicate key|unique constraint/i.test(err.message || '')));
  }

  // Implementa o contrato de client consumido por campaign-persistence.create({ client }).
  function createPersistenceClient(sb) {
    return {
      insertEvent: function (row) {
        return Promise.resolve(sb.from('campaign_events').insert(row)).then(function (r) {
          if (r && r.error) {
            if (_isUnique(r.error)) { var e = new Error('duplicate'); e.duplicate = true; throw e; }
            throw r.error;
          }
          return r ? r.data : null;
        });
      },
      fetchEventsSince: function (campaignId, afterId) {
        return Promise.resolve(
          sb.from('campaign_events').select('*')
            .eq('campaign_id', campaignId).gt('id', afterId || 0)
            .order('id', { ascending: true })
        ).then(function (r) { if (r && r.error) throw r.error; return (r && r.data) || []; });
      },
      upsertSnapshot: function (snap) {
        return Promise.resolve(
          sb.from('investigator_snapshots').upsert(snap, { onConflict: 'campaign_id,peer_id' })
        ).then(function (r) { if (r && r.error) throw r.error; return r ? r.data : null; });
      },
      fetchSnapshots: function (campaignId) {
        return Promise.resolve(
          sb.from('investigator_snapshots').select('*').eq('campaign_id', campaignId)
        ).then(function (r) { if (r && r.error) throw r.error; return (r && r.data) || []; });
      }
    };
  }

  window.CoC.campaign.supabaseAdapter = Object.freeze({
    createClient: createClient,
    ensureSession: ensureSession,
    createCampaign: createCampaign,
    joinCampaign: joinCampaign,
    createPersistenceClient: createPersistenceClient
  });
})();
