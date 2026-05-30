/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/store.js
   Store reativo — fonte única de verdade do personagem ativo.

   Padrão: reducer puro + signal interno (createSignal).
   M1: slice "character" com as 7 actions SACRED + SET_CHARACTER.
   M3+: slices adicionais conforme o Strangler Pattern avança.

   dispatch(action)  → reduz estado, notifica via signal
   getState()        → retorna estado atual (objeto vivo, não congelado)
   subscribe(fn)     → fn(newState, prevState); retorna cancelamento

   Depende de: js/core/signals.js (carregado antes)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  // HP mínimo antes de morte (CoC 7e p.112)
  const PV_MIN = -2;

  function deepClone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  // ─── Reducer puro ─────────────────────────────────────────────────────────
  function reducer(state, action) {
    const c = state.character;

    switch (action.type) {

      // Carrega ou troca personagem completo
      case "SET_CHARACTER":
        return Object.assign({}, state, {
          character: action.payload ? deepClone(action.payload) : null
        });

      // Atualiza apenas o id após primeira gravação no storage
      case "SET_CHARACTER_ID": {
        if (!c) return state;
        return Object.assign({}, state, {
          character: Object.assign({}, c, { id: action.payload })
        });
      }

      // ── PV ────────────────────────────────────────────────────────────────
      case "APPLY_DAMAGE": {
        if (!c || !c.derived || !c.derived.PV) return state;
        const nc = deepClone(c);
        const cur = nc.derived.PV.current != null ? nc.derived.PV.current : nc.derived.PV.value;
        nc.derived.PV.current = Math.max(PV_MIN, Math.min(nc.derived.PV.value, cur - action.payload.amount));
        return Object.assign({}, state, { character: nc });
      }

      case "HEAL_DAMAGE": {
        if (!c || !c.derived || !c.derived.PV) return state;
        const nc = deepClone(c);
        const cur = nc.derived.PV.current != null ? nc.derived.PV.current : nc.derived.PV.value;
        nc.derived.PV.current = Math.max(PV_MIN, Math.min(nc.derived.PV.value, cur + action.payload.amount));
        return Object.assign({}, state, { character: nc });
      }

      // ── SAN ───────────────────────────────────────────────────────────────
      case "LOSE_SANITY": {
        if (!c || !c.derived || !c.derived.SAN) return state;
        const nc = deepClone(c);
        const cur = nc.derived.SAN.current != null ? nc.derived.SAN.current : nc.derived.SAN.value;
        nc.derived.SAN.current = Math.max(0, Math.min(nc.derived.SAN.max, cur - action.payload.amount));
        // Rastreia perdas do dia para teste de Loucura Temporária (>4 SAN de uma vez)
        if (action.payload.amount > 4) {
          nc.status = nc.status || {};
          nc.status.sanLossesToday = (nc.status.sanLossesToday || 0) + action.payload.amount;
        }
        return Object.assign({}, state, { character: nc });
      }

      case "RECOVER_SANITY": {
        if (!c || !c.derived || !c.derived.SAN) return state;
        const nc = deepClone(c);
        const cur = nc.derived.SAN.current != null ? nc.derived.SAN.current : nc.derived.SAN.value;
        nc.derived.SAN.current = Math.max(0, Math.min(nc.derived.SAN.max, cur + action.payload.amount));
        return Object.assign({}, state, { character: nc });
      }

      // ── PM ────────────────────────────────────────────────────────────────
      case "SPEND_MAGIC": {
        if (!c || !c.derived || !c.derived.PM) return state;
        const nc = deepClone(c);
        const cur = nc.derived.PM.current != null ? nc.derived.PM.current : nc.derived.PM.value;
        nc.derived.PM.current = Math.max(0, Math.min(nc.derived.PM.value, cur - action.payload.amount));
        return Object.assign({}, state, { character: nc });
      }

      case "RESTORE_MAGIC": {
        if (!c || !c.derived || !c.derived.PM) return state;
        const nc = deepClone(c);
        const cur = nc.derived.PM.current != null ? nc.derived.PM.current : nc.derived.PM.value;
        nc.derived.PM.current = Math.max(0, Math.min(nc.derived.PM.value, cur + action.payload.amount));
        return Object.assign({}, state, { character: nc });
      }

      // ── Sorte ─────────────────────────────────────────────────────────────
      case "SPEND_LUCK": {
        if (!c || !c.attributes || !c.attributes.Sorte) return state;
        const nc = deepClone(c);
        nc.attributes.Sorte.value = Math.max(0, Number(nc.attributes.Sorte.value) - action.payload.amount);
        return Object.assign({}, state, { character: nc });
      }

      default:
        return state;
    }
  }

  // ─── Signal interno ───────────────────────────────────────────────────────
  const _signal = window.CoC.createSignal({ character: null });

  function dispatch(action) {
    const prev = _signal.get();
    const next = reducer(prev, action);
    _signal.set(next);
  }

  function getState() {
    return _signal.get();
  }

  /**
   * subscribe(fn) → fn(newState, prevState); retorna cancelamento.
   * Internamente usa o signal, que já garante notificação só quando houve mudança.
   */
  function subscribe(fn) {
    let prev = _signal.get();
    return _signal.subscribe(function (next) {
      fn(next, prev);
      prev = next;
    });
  }

  window.CoC.store = Object.freeze({ dispatch, getState, subscribe });

})();
