/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/render-pipeline.js
   Pipeline de renderização reativa — Sprint 6

   Responsabilidade: subscrever store:dispatch e re-renderizar APENAS as views
   afetadas por cada action type. Substitui subscriptions manuais espalhadas
   em investigator.js boot() e elimina renderAll() dos caminhos de carga.

   Padrão:
   1. Views registram sua função render via pipeline.register(name, fn)
   2. pipeline.init(bus, getState) instala o único subscriber store:dispatch
   3. RENDER_MAP define quais views respondem a cada action
   4. renderForAction() executa renders em try-catch independentes (um erro não
      impede que as demais views renderizem)

   Não usa batching (setTimeout) — renders são síncronos para preservar a ordem
   flash → render já estabelecida em vitals.js e evitar timing issues em boot.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC      = window.CoC      || {};
window.CoC.core = window.CoC.core || {};

(function () {

  // ── Mapa canônico: action type → views afetadas ────────────────────────────
  // 'ALL' = renderiza todas as views registradas (carga completa do personagem)
  // []    = sem render visual (ação só de meta, ex.: SET_CHARACTER_ID)
  var RENDER_MAP = Object.freeze({

    // SET_CHARACTER: 'ALL' é tratado pelo init() com guarda de character nulo.
    // O cascade interno do store.js garante que RECALC_DERIVED já rodou antes
    // do bus event, então todas as views veem os derivados atualizados.
    SET_CHARACTER: 'ALL',

    // Derivados (atributos primários mudaram → PV/PM/SAN/MOV/DB/Build mudam)
    RECALC_DERIVED:   ['vitals', 'attributes'],

    // Vitais — só o tracker de PV/SAN/PM muda (vitals.js faz flash separado)
    APPLY_DAMAGE:     ['vitals'],
    HEAL_DAMAGE:      ['vitals'],
    LOSE_SANITY:      ['vitals'],
    RECOVER_SANITY:   ['vitals'],
    SPEND_MAGIC:      ['vitals'],
    RESTORE_MAGIC:    ['vitals'],

    // Sorte — sidebar de atributos + barra de vitais
    SPEND_LUCK:       ['attributes', 'vitals'],

    // Perícias
    SET_SKILL:               ['skills'],
    TOGGLE_OCCUPATION_SKILL: ['skills'],
    ADD_CUSTOM_SKILL:        ['skills'],
    ROLL_SKILL:              ['skills'],

    // Atributo editado diretamente
    SET_ATTRIBUTE:    ['attributes', 'vitals', 'skills'],

    // Identidade (nome/ocupação → skills/finances dependem de ocupação)
    SET_IDENTITY:     ['identity', 'skills', 'finances'],
    SET_IMAGE:        ['identity'],

    // Combate / armas
    ADD_WEAPON:       ['combat'],
    UPDATE_WEAPON:    ['combat'],
    REMOVE_WEAPON:    ['combat'],
    ATTACK_RESOLVED:  ['combat'],

    // Inventário
    ADD_INVENTORY_ITEM:    ['inventory'],
    UPDATE_INVENTORY_ITEM: ['inventory'],
    REMOVE_INVENTORY_ITEM: ['inventory'],

    // Journal
    ADD_JOURNAL_ENTRY:    ['journal'],
    UPDATE_JOURNAL_ENTRY: ['journal'],
    REMOVE_JOURNAL_ENTRY: ['journal'],

    // Magias
    ADD_SPELL:    ['spells'],
    UPDATE_SPELL: ['spells'],
    REMOVE_SPELL: ['spells'],

    // Grimórios
    ADD_TOME:    ['tomes'],
    UPDATE_TOME: ['tomes'],
    REMOVE_TOME: ['tomes'],

    // Meta — nenhuma mudança visual
    SET_CHARACTER_ID: [],
  });

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
