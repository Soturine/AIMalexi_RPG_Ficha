/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/persist-middleware.js
   Middleware de persistência automática baseado em ações do store.

   Elimina chamadas manuais a persistCurrent() espalhadas pelo orquestrador.
   Usa JSON.stringify diff para evitar saves redundantes quando a ação
   altera referência mas não conteúdo semântico.

   Uso:
     const pm = window.CoC.createPersistMiddleware({ bus, getState, saveCharacter });
     pm.init();
     // chame pm.updateBaseline() após saves manuais fora do fluxo normal
     // chame pm.dispose() ao desmontar (ex: hot-reload em dev)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  // Ações que mutam semanticamente o personagem.
  // SET_CHARACTER_ID excluído: atualiza apenas o id gerado pelo storage,
  // não dados de jogo — incluí-lo causaria loop (persistCurrent → SET_CHARACTER_ID → persist...).
  const PERSIST_ACTIONS = new Set([
    'SET_CHARACTER',
    'APPLY_DAMAGE',   'HEAL_DAMAGE',
    'LOSE_SANITY',    'RECOVER_SANITY',
    'SPEND_MAGIC',    'RESTORE_MAGIC',
    'SPEND_LUCK',
    'SET_SKILL',      'TOGGLE_OCCUPATION_SKILL', 'ADD_CUSTOM_SKILL',
    'ADD_INVENTORY_ITEM',   'UPDATE_INVENTORY_ITEM',   'REMOVE_INVENTORY_ITEM',
    'ADD_JOURNAL_ENTRY',    'UPDATE_JOURNAL_ENTRY',    'REMOVE_JOURNAL_ENTRY',
    'ADD_SPELL',      'UPDATE_SPELL',    'REMOVE_SPELL',
    'ADD_TOME',       'UPDATE_TOME',     'REMOVE_TOME',
    'ADD_WEAPON',     'UPDATE_WEAPON',   'REMOVE_WEAPON',
    'ATTACK_RESOLVED',
    'RECALC_DERIVED'   // JSON diff guard evita saves redundantes quando nada mudou
  ]);

  /**
   * @param {{ bus: object, getState: function, saveCharacter: function }} opts
   *   bus           — window.CoC.bus (pub/sub)
   *   getState      — () => { character } — retorna estado atual do store
   *   saveCharacter — (character) => void — persiste no storage
   */
  function createPersistMiddleware(opts) {
    const bus          = opts.bus;
    const getState     = opts.getState;
    const saveChar     = opts.saveCharacter;

    let _lastJSON = null;   // snapshot do último character persistido
    let _cancel   = null;   // cleanup do subscribe

    function _tryPersist() {
      const char = getState().character;
      if (!char) return;
      const snapshot = JSON.stringify(char);
      if (snapshot === _lastJSON) return;   // sem mudança semântica — skip
      _lastJSON = snapshot;
      try {
        saveChar(char);
      } catch (e) {
        console.error('[persist-middleware]', e);
      }
    }

    function init() {
      if (_cancel) _cancel();   // idempotência: re-init limpa listener anterior
      _cancel = bus.subscribe('store:dispatch', function (event) {
        if (!event.changed) return;
        if (!PERSIST_ACTIONS.has(event.action.type)) return;
        _tryPersist();
      });
    }

    // Sincroniza baseline após save manual (ex: export JSON, persistCurrent explícito)
    // para que o próximo dispatch de mudança real não seja bloqueado pelo diff stale.
    function updateBaseline() {
      const char = getState().character;
      _lastJSON = char ? JSON.stringify(char) : null;
    }

    function dispose() {
      if (_cancel) { _cancel(); _cancel = null; }
    }

    return Object.freeze({ init, updateBaseline, dispose });
  }

  window.CoC.createPersistMiddleware = createPersistMiddleware;

})();
