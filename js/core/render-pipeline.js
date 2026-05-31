/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/render-pipeline.js
   Pipeline de renderização reativa — Sprint 6/7

   RENDER_MAP derivado de event-ontology.js (fonte única de verdade).
   Não mantém mapa próprio — lê window.CoC.core.eventOntology.RENDER_MAP.

   Depende de: js/core/event-ontology.js (carregado antes)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC      = window.CoC      || {};
window.CoC.core = window.CoC.core || {};

(function () {

  // RENDER_MAP derivado da ontologia — action type → views afetadas.
  // 'ALL' = renderiza todas as views (SET_CHARACTER via pipeline.init).
  // []    = sem render (ação de meta).
  var RENDER_MAP = (window.CoC.core.eventOntology || {}).RENDER_MAP || {};

  // ── Registro de views ──────────────────────────────────────────────────────
  var _registry = Object.create(null); // name → fn()

  function register(name, fn) {
    if (typeof fn !== 'function') {
      console.error('[pipeline] register("' + name + '"): fn deve ser function');
      return;
    }
    _registry[name] = fn;
  }

  // ── Execução de renders ────────────────────────────────────────────────────

  function renderView(name) {
    var fn = _registry[name];
    if (!fn) return;
    try { fn(); } catch (e) {
      console.error('[pipeline] erro ao renderizar "' + name + '":', e);
    }
  }

  function renderAll() {
    Object.keys(_registry).forEach(renderView);
  }

  function renderForAction(type) {
    var targets = RENDER_MAP[type];
    if (targets === 'ALL') { renderAll(); return; }
    if (!targets || targets.length === 0) return;
    for (var i = 0; i < targets.length; i++) renderView(targets[i]);
  }

  // ── Inicialização — instala subscriber único de store:dispatch ─────────────
  //
  // getState  : retorna o estado atual do store (detecta character nulo).
  // dispatch  : função de dispatch do store — usada para garantir RECALC_DERIVED
  //             antes do renderAll() de um SET_CHARACTER, sem colocar essa lógica
  //             no próprio reducer (que quebraria testes que definem derived diretamente).
  function init(bus, getState, dispatch) {
    bus.subscribe('store:dispatch', function (event) {
      if (!event || !event.action || !event.changed) return;

      var type = event.action.type;

      // SET_CHARACTER com character=null: clearUI() já foi chamado; nada a render.
      if (type === 'SET_CHARACTER' && getState && !getState().character) return;

      // Para carga de personagem (SET_CHARACTER), garante que os derivados
      // (PV/PM/SAN/MOV/DB) sejam recalculados ANTES de renderAll().
      // O dispatch de RECALC_DERIVED dispara seu próprio bus event, que o pipeline
      // trata (renderiza ['vitals','attributes']); depois renderAll() cobre o resto.
      if (type === 'SET_CHARACTER' && typeof dispatch === 'function') {
        dispatch({ type: 'RECALC_DERIVED' });
      }

      renderForAction(type);
    });
  }

  window.CoC.core.renderPipeline = Object.freeze({
    register:        register,
    renderView:      renderView,
    renderAll:       renderAll,
    renderForAction: renderForAction,
    init:            init,
    RENDER_MAP:      RENDER_MAP,
  });

})();
