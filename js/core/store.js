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
      case "ADD_MYTHOS": {
        if (!c || !c.derived) return state;
        const nc = deepClone(c);
        nc.derived.Mitos = nc.derived.Mitos || { label: "Mythos de Cthulhu", value: 0 };
        nc.derived.Mitos.value = Math.max(0, Math.min(99, (nc.derived.Mitos.value || 0) + (action.payload.delta || 0)));
        const _r = window.CoC && window.CoC.rules;
        if (_r) {
          const newSANMax = _r.calcSANMax(nc.derived.Mitos.value);
          nc.derived.SAN = nc.derived.SAN || {};
          nc.derived.SAN.max = newSANMax;
          if (nc.derived.SAN.current != null && nc.derived.SAN.current > newSANMax) {
            nc.derived.SAN.current = newSANMax;
          }
        }
        return Object.assign({}, state, { character: nc });
      }

      case "LOSE_SANITY": {
        if (!c || !c.derived || !c.derived.SAN) return state;
        const nc = deepClone(c);
        const cur = nc.derived.SAN.current != null ? nc.derived.SAN.current : nc.derived.SAN.value;
        nc.derived.SAN.current = Math.max(0, Math.min(nc.derived.SAN.max, cur - action.payload.amount));
        // Rastreia TODAS as perdas de SAN da sessão (threshold de loucura indefinida: ≥1/5 do SAN atual)
        nc.status = nc.status || {};
        nc.status.sanLossesToday = (nc.status.sanLossesToday || 0) + action.payload.amount;
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

      // ── Status de personagem (vitals lifecycle) ───────────────────────────
      // Efeitos despachados pelo executor após avaliação da state-machine.
      // Mutação bruta: status[key] = true/false. Decisão pertence à state-machine.
      case "ADD_STATUS": {
        if (!c) return state;
        const nc = deepClone(c);
        nc.status = nc.status || {};
        nc.status[action.payload.status] = true;
        return Object.assign({}, state, { character: nc });
      }

      case "REMOVE_STATUS": {
        if (!c) return state;
        const nc = deepClone(c);
        nc.status = nc.status || {};
        nc.status[action.payload.status] = false;
        return Object.assign({}, state, { character: nc });
      }

      // ── Rolagens de sessão (boundary_randomness — sem mutação de estado) ───
      // Resultado já calculado na view antes do dispatch; executor emite
      // executor:action → executionTrace captura o fato para observabilidade.
      case "ROLL_SKILL":
      case "ROLL_ATTRIBUTE":
      case "PUSH_ROLL":
        return state;

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

      // Marca a perícia para evolução ao fim da sessão (CoC 7e p.44)
      case "MARK_SKILL_IMPROVEMENT": {
        if (!c) return state;
        const { name: markName, marked } = action.payload;
        if (!markName) return state;
        const nc = deepClone(c);
        nc.skills = nc.skills || {};
        nc.skills[markName] = Object.assign({}, nc.skills[markName] || {}, {
          marked: !!marked
        });
        return Object.assign({}, state, { character: nc });
      }

      // Aplica o ganho de evolução de perícia após rolagem de melhoria
      case "SKILL_IMPROVED": {
        if (!c) return state;
        const { name: impName, gain } = action.payload;
        if (!impName || !gain) return state;
        const nc = deepClone(c);
        nc.skills = nc.skills || {};
        const cur = Number(nc.skills[impName]?.value) || 0;
        nc.skills[impName] = Object.assign({}, nc.skills[impName] || {}, {
          value: Math.min(99, cur + gain),
          marked: false   // limpa a marcação após evolução
        });
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

      // ── Journal (M4.2) ───────────────────────────────────────────────────
      case "ADD_JOURNAL_ENTRY": {
        if (!c) return state;
        const nc = deepClone(c);
        nc.journal = Array.isArray(nc.journal) ? nc.journal : [];
        const entry = Object.assign({}, action.payload.entry);
        if (!entry.id)        entry.id        = _uuid();
        if (!entry.createdAt) entry.createdAt  = Date.now();
        nc.journal.push(entry);
        return Object.assign({}, state, { character: nc });
      }

      case "UPDATE_JOURNAL_ENTRY": {
        if (!c || !Array.isArray(c.journal)) return state;
        const nc = deepClone(c);
        nc.journal = nc.journal.map(e =>
          e.id === action.payload.entry.id ? Object.assign({}, e, action.payload.entry) : e
        );
        return Object.assign({}, state, { character: nc });
      }

      case "REMOVE_JOURNAL_ENTRY": {
        if (!c || !Array.isArray(c.journal)) return state;
        const nc = deepClone(c);
        nc.journal = nc.journal.filter(e => e.id !== action.payload.id);
        return Object.assign({}, state, { character: nc });
      }

      // ── Magias (M4.3) ────────────────────────────────────────────────────
      case "ADD_SPELL": {
        if (!c) return state;
        const nc = deepClone(c);
        nc.spells = Array.isArray(nc.spells) ? nc.spells : [];
        const spell = Object.assign({}, action.payload.spell);
        if (!spell.id) spell.id = _uuid();
        nc.spells.push(spell);
        return Object.assign({}, state, { character: nc });
      }

      case "UPDATE_SPELL": {
        if (!c || !Array.isArray(c.spells)) return state;
        const nc = deepClone(c);
        nc.spells = nc.spells.map(s =>
          s.id === action.payload.spell.id ? Object.assign({}, s, action.payload.spell) : s
        );
        return Object.assign({}, state, { character: nc });
      }

      case "REMOVE_SPELL": {
        if (!c || !Array.isArray(c.spells)) return state;
        const nc = deepClone(c);
        nc.spells = nc.spells.filter(s => s.id !== action.payload.id);
        return Object.assign({}, state, { character: nc });
      }

      // ── Grimórios (M4.4) ─────────────────────────────────────────────────
      case "ADD_TOME": {
        if (!c) return state;
        const nc = deepClone(c);
        nc.tomes = Array.isArray(nc.tomes) ? nc.tomes : [];
        const tome = Object.assign({}, action.payload.tome);
        if (!tome.id) tome.id = _uuid();
        if (tome.studyProgress == null) tome.studyProgress = 0;
        nc.tomes.push(tome);
        return Object.assign({}, state, { character: nc });
      }

      case "UPDATE_TOME": {
        if (!c || !Array.isArray(c.tomes)) return state;
        const nc = deepClone(c);
        nc.tomes = nc.tomes.map(t =>
          t.id === action.payload.tome.id ? Object.assign({}, t, action.payload.tome) : t
        );
        return Object.assign({}, state, { character: nc });
      }

      case "REMOVE_TOME": {
        if (!c || !Array.isArray(c.tomes)) return state;
        const nc = deepClone(c);
        nc.tomes = nc.tomes.filter(t => t.id !== action.payload.id);
        return Object.assign({}, state, { character: nc });
      }

      // ── Armas (M4-Combat) ─────────────────────────────────────────────────
      // INVARIANTE: weapons[] = recursos mecânicos de combate (stats, dano, perícia).
      // inventory[] = posses narrativas. Duplicação de nomes é aceitável — ver actions.js.
      case "ADD_WEAPON": {
        if (!c) return state;
        const nc = deepClone(c);
        nc.weapons = Array.isArray(nc.weapons) ? nc.weapons : [];
        const weapon = Object.assign({}, action.payload.weapon);
        if (!weapon.id) weapon.id = _uuid();
        nc.weapons.push(weapon);
        return Object.assign({}, state, { character: nc });
      }

      case "UPDATE_WEAPON": {
        if (!c || !Array.isArray(c.weapons)) return state;
        const nc = deepClone(c);
        nc.weapons = nc.weapons.map(w =>
          w.id === action.payload.weapon.id ? Object.assign({}, w, action.payload.weapon) : w
        );
        return Object.assign({}, state, { character: nc });
      }

      case "REMOVE_WEAPON": {
        if (!c || !Array.isArray(c.weapons)) return state;
        const nc = deepClone(c);
        nc.weapons = nc.weapons.filter(w => w.id !== action.payload.id);
        return Object.assign({}, state, { character: nc });
      }

      // Ação atômica de resolução de combate: decrementa munição.
      // Dano ao alvo (BUG-04) é aplicado via APPLY_DAMAGE — semântica distinta.
      case "ATTACK_RESOLVED": {
        if (!c) return state;
        const { weaponId, isFired } = action.payload;
        if (!isFired) return state;   // melee: sem efeito no store além de log
        const nc = deepClone(c);
        const wi = Array.isArray(nc.weapons)
          ? nc.weapons.findIndex(function(w) { return w.id === weaponId; })
          : -1;
        if (wi >= 0 && nc.weapons[wi].ammo != null && nc.weapons[wi].ammo > 0) {
          nc.weapons[wi].ammo--;
        }
        return Object.assign({}, state, { character: nc });
      }

      // ── Derivados (M3.9 — elimina mutação implícita de recalcDerived) ─────────
      // Função pura: lê attributes + investigator.age + Mitos, escreve derived.
      // Preserva .current de PV/PM/SAN (não reseta em jogo); clamp se max mudou.
      case "RECALC_DERIVED": {
        if (!c || !c.attributes) return state;
        const nc   = deepClone(c);
        const a    = nc.attributes;
        const v    = function(k) { return Number(a[k] && a[k].value) || 0; };
        const age  = Number(nc.investigator && nc.investigator.age) || 25;
        const _r   = window.CoC && window.CoC.rules;
        if (!_r) return state;   // engine não carregada ainda (segurança em teste)

        nc.derived = nc.derived || {};
        nc.derived.PV    = nc.derived.PV    || { label: "Pontos de Vida" };
        nc.derived.PM    = nc.derived.PM    || { label: "Pontos de Magia" };
        nc.derived.SAN   = nc.derived.SAN   || { label: "Sanidade" };
        nc.derived.Mitos = nc.derived.Mitos || { label: "Mythos de Cthulhu", value: 0 };
        nc.derived.MOV   = nc.derived.MOV   || { label: "Movimento" };
        nc.derived.DB    = nc.derived.DB    || { label: "Bônus de Dano" };
        nc.derived.Build = nc.derived.Build || { label: "Corpo" };

        const newPV    = _r.calcHP(v("CON"), v("TAM"));
        const newPM    = _r.calcMP(v("POD"));
        const newSANMax = _r.calcSANMax(nc.derived.Mitos.value || 0);

        nc.derived.PV.value = newPV;
        if (nc.derived.PV.current == null || nc.derived.PV.current > newPV) nc.derived.PV.current = newPV;

        nc.derived.PM.value = newPM;
        if (nc.derived.PM.current == null || nc.derived.PM.current > newPM) nc.derived.PM.current = newPM;

        nc.derived.SAN.max   = newSANMax;
        nc.derived.SAN.value = v("POD");
        if (nc.derived.SAN.current == null)            nc.derived.SAN.current = v("POD");
        if (nc.derived.SAN.current > newSANMax)        nc.derived.SAN.current = newSANMax;

        nc.derived.MOV.value   = _r.calcMOV(v("FOR"), v("DES"), v("TAM"), age);
        const db = _r.calcDB(v("FOR"), v("TAM"));
        nc.derived.DB.value    = db.db;
        nc.derived.Build.value = db.build;

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
