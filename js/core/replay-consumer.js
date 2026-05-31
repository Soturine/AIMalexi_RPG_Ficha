/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/replay-consumer.js
   Replay Consumer — Sprint 17

   Reconstrói estado de domínio a partir de:
     initialState  — snapshot do personagem no início da sessão (SET_CHARACTER)
     trace         — executionTrace da sessão (actions + efeitos com payloads)

   API pública:
     replaySession(initialState, trace) → state
       Aplica cada evento do trace (ação primária + efeitos armazenados) via
       store.dispatch(). Retorna estado final sem re-avaliar a state-machine
       (determinístico: usa efeitos do trace, não re-computados em runtime).

     sanitize(state) → objeto comparável
       Remove campos derivados, temporais e visuais. Retorna apenas estado
       de domínio relevante para comparação: vitais, recursos, status, mythos.

   Precondição: trace deve ter sido gerado com executor.js que emite
     effects como action objects completos (não só type strings).

   Dependências: js/core/store.js (carregado antes)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC      = window.CoC      || {};
window.CoC.core = window.CoC.core || {};

(function () {

  function replaySession(initialState, trace) {
    var store = window.CoC.store;

    // Aplica estado inicial sem passar pelo executor (lifecycle, não domínio)
    store.dispatch({ type: 'SET_CHARACTER', payload: initialState.character });

    // Aplica cada evento e seus efeitos via reducer direto (sem re-avaliação SM)
    for (var i = 0; i < trace.length; i++) {
      var ev = trace[i];
      store.dispatch({ type: ev.type, payload: ev.payload });

      var effs = ev.effects || [];
      for (var j = 0; j < effs.length; j++) {
        var eff = effs[j];
        if (eff && eff.type) {
          store.dispatch({ type: eff.type, payload: eff.payload });
        }
      }
    }

    return store.getState();
  }

  function sanitize(state) {
    var c = state && state.character;
    if (!c) return null;
    var d   = c.derived    || {};
    var a   = c.attributes || {};
    var st  = c.status     || {};

    return {
      pvCurrent:      d.PV  && d.PV.current,
      sanCurrent:     d.SAN && d.SAN.current,
      sanMax:         d.SAN && d.SAN.max,
      pmCurrent:      d.PM  && d.PM.current,
      luck:           a.Sorte && a.Sorte.value,
      mitos:          d.Mitos && d.Mitos.value,
      majorWound:     !!st.majorWound,
      unconscious:    !!st.unconscious,
      dying:          !!st.dying,
      dead:           !!st.dead,
      tempInsane:     !!st.tempInsane,
      indefInsane:    !!st.indefInsane,
      sanLossesToday: st.sanLossesToday || 0,
    };
  }

  window.CoC.core.replayConsumer = Object.freeze({ replaySession: replaySession, sanitize: sanitize });

})();
