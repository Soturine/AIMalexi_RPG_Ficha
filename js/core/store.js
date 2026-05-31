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

  function _uuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
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

      // ── Perícias ──────────────────────────────────────────────────────────
      case "SET_SKILL": {
        if (!c) return state;
        const { name, value } = action.payload;
        if (!name) return state;
        const nc = deepClone(c);
        nc.skills = nc.skills || {};
        nc.skills[name] = Object.assign({}, nc.skills[name] || {}, {
          value: Math.max(0, Math.min(99, Number(value) || 0))
        });
        return Object.assign({}, state, { character: nc });
      }

      case "TOGGLE_OCCUPATION_SKILL": {
        if (!c) return state;
        const { skillName } = action.payload;
        if (!skillName) return state;
        const nc = deepClone(c);
        nc.occupationSkills = Array.isArray(nc.occupationSkills) ? nc.occupationSkills.slice() : [];
        const idx = nc.occupationSkills.indexOf(skillName);
        if (idx >= 0) nc.occupationSkills.splice(idx, 1);
        else nc.occupationSkills.push(skillName);
        return Object.assign({}, state, { character: nc });
      }

      case "ADD_CUSTOM_SKILL": {
        if (!c) return state;
        const { skillName, value: skillValue, isOccupation } = action.payload;
        if (!skillName) return state;
        const nc = deepClone(c);
        nc.skills = nc.skills || {};
        nc.skills[skillName] = Object.assign({}, nc.skills[skillName] || {}, {
          value: Math.max(0, Math.min(99, Number(skillValue) || 0))
        });
        if (isOccupation) {
          nc.occupationSkills = Array.isArray(nc.occupationSkills) ? nc.occupationSkills.slice() : [];
          if (!nc.occupationSkills.includes(skillName)) nc.occupationSkills.push(skillName);
        }
        return Object.assign({}, state, { character: nc });
      }

      // ── Inventário (M4.1) ─────────────────────────────────────────────────
      // INVARIANTE: inventory[] e weapons[] são domínios distintos sem sync.
      // weapons[] = recursos mecânicos. inventory[] = posses narrativas.
      // Duplicação de nomes é aceitável e intencional — ver actions.js.
      case "ADD_INVENTORY_ITEM": {
        if (!c) return state;
        const nc = deepClone(c);
        nc.inventory = Array.isArray(nc.inventory) ? nc.inventory : [];
        const item = Object.assign({}, action.payload.item);
        if (!item.id) item.id = _uuid();
        nc.inventory.push(item);
        return Object.assign({}, state, { character: nc });
      }

      case "UPDATE_INVENTORY_ITEM": {
        if (!c || !Array.isArray(c.inventory)) return state;
        const nc = deepClone(c);
        nc.inventory = nc.inventory.map(it =>
          it.id === action.payload.item.id ? Object.assign({}, it, action.payload.item) : it
        );
        return Object.assign({}, state, { character: nc });
      }

      case "REMOVE_INVENTORY_ITEM": {
        if (!c || !Array.isArray(c.inventory)) return state;
        const nc = deepClone(c);
        nc.inventory = nc.inventory.filter(it => it.id !== action.payload.id);
        return Object.assign({}, state, { character: nc });
      }

      default:
        return state;
    }
  }

  // ─── Clock de alta resolução (fallback para Node.js em testes) ──────────
  function now() {
    return (typeof performance !== "undefined" && performance.now)
      ? performance.now()
      : Date.now();
  }

  // ─── Signal interno + métricas ────────────────────────────────────────────
  const _signal  = window.CoC.createSignal({ character: null });
  const _metrics = { dispatches: 0, effective: 0, noop: 0, totalDurationMs: 0 };

  function dispatch(action) {
    const t0   = now();
    const prev = _signal.get();
    const next = reducer(prev, action);
    const changed    = next !== prev;
    const durationMs = now() - t0;

    _metrics.dispatches++;
    if (changed) {
      _metrics.effective++;
      _signal.set(next);
    } else {
      _metrics.noop++;
    }
    _metrics.totalDurationMs += durationMs;

    // Publica no Bus para observabilidade — event-log e trace subscrevem aqui
    const bus = window.CoC.bus;
    if (bus) bus.publish("store:dispatch", { action, changed, durationMs });
  }

  function getState() {
    return _signal.get();
  }

  function getMetrics() {
    const avg = _metrics.dispatches > 0
      ? _metrics.totalDurationMs / _metrics.dispatches
      : 0;
    return Object.assign({}, _metrics, { avgDurationMs: Math.round(avg * 100) / 100 });
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

  window.CoC.store = Object.freeze({ dispatch, getState, getMetrics, subscribe });

})();
