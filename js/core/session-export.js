/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/session-export.js
   Session Export / Import — Sprint 18

   Serializa o estado de domínio completo de uma sessão para JSON portátil:
     { version, createdAt, system, character, trace, summary }

   summary é derivado do trace em export-time — não precisa ser armazenado
   separadamente durante a sessão.

   API pública:
     exportSession()           → baixa JSON no browser
     buildSessionData()        → retorna objeto (para teste / pré-visualização)
     importSession(jsonString) → restaura initialState + despacha SET_CHARACTER
                                 (trace fica disponível para replay; não re-executa)

   Dependências: js/core/store.js, js/core/event-log.js (carregados antes)
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC      = window.CoC      || {};
window.CoC.core = window.CoC.core || {};

(function () {

  var SESSION_VERSION = 1;
  var SYSTEM_ID       = 'AIMalexi RPG Ficha';

  function _buildSummary(trace) {
    var summary = {
      rolls:          0,
      pushes:         0,
      attacksTotal:   0,
      attacksHit:     0,
      hpLost:         0,
      hpHealed:       0,
      sanLost:        0,
      sanRecovered:   0,
      luckSpent:      0,
      mpSpent:        0,
      mythosGained:   0,
    };

    for (var i = 0; i < trace.length; i++) {
      var ev = trace[i];
      var p  = ev.payload || {};
      switch (ev.type) {
        case 'ROLL_SKILL':
        case 'ROLL_ATTRIBUTE':  summary.rolls++;             break;
        case 'PUSH_ROLL':       summary.rolls++; summary.pushes++; break;
        case 'ATTACK_RESOLVED': summary.attacksTotal++;
                                if (p.hit) summary.attacksHit++; break;
        case 'APPLY_DAMAGE':    summary.hpLost      += (p.amount || 0); break;
        case 'HEAL_DAMAGE':     summary.hpHealed    += (p.amount || 0); break;
        case 'LOSE_SANITY':     summary.sanLost     += (p.amount || 0); break;
        case 'RECOVER_SANITY':  summary.sanRecovered+= (p.amount || 0); break;
        case 'SPEND_LUCK':      summary.luckSpent   += (p.amount || 0); break;
        case 'SPEND_MAGIC':     summary.mpSpent     += (p.amount || 0); break;
        case 'ADD_MYTHOS':      if ((p.delta || 0) > 0) summary.mythosGained += p.delta; break;
      }
    }

    return summary;
  }

  function buildSessionData() {
    var store = window.CoC.store;
    var state = store ? store.getState() : null;
    if (!state || !state.character) return null;

    var trace = window.CoC.executionTrace
      ? window.CoC.executionTrace.getTrace()
      : [];

    return {
      version:   SESSION_VERSION,
      createdAt: new Date().toISOString(),
      system:    SYSTEM_ID,
      character: JSON.parse(JSON.stringify(state.character)),
      trace:     trace,
      summary:   _buildSummary(trace),
    };
  }

  function exportSession() {
    var data = buildSessionData();
    if (!data) {
      var ui = window.CoC.ui;
      if (ui && ui.toast) ui.toast('Nenhum personagem ativo para exportar sessão.', { type: 'warn' });
      return false;
    }

    var name = (data.character.investigator && data.character.investigator.name) || 'sessao';
    var slug = name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    var date = new Date().toISOString().slice(0, 10);
    var filename = slug + '-sessao-' + date + '.json';

    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    var ui = window.CoC.ui;
    if (ui && ui.toast) {
      ui.toast(
        '✓ Sessão exportada (' + data.trace.length + ' eventos · ' +
        data.summary.rolls + ' rolagens · SAN perdida: ' + data.summary.sanLost + ')',
        { type: 'success', duration: 5000 }
      );
    }
    return true;
  }

  function importSession(jsonString) {
    var data;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      return { ok: false, error: 'JSON inválido: ' + e.message };
    }

    if (!data || data.system !== SYSTEM_ID) {
      return { ok: false, error: 'Arquivo não é uma sessão AIMalexi RPG Ficha.' };
    }
    if (typeof data.version !== 'number' || data.version > SESSION_VERSION) {
      return { ok: false, error: 'Versão de sessão incompatível (' + data.version + ').' };
    }
    if (!data.character) {
      return { ok: false, error: 'Sessão sem dados de personagem.' };
    }

    var store = window.CoC.store;
    if (store) {
      store.dispatch({ type: 'SET_CHARACTER', payload: data.character });
    }

    return {
      ok:        true,
      character: data.character,
      trace:     data.trace || [],
      summary:   data.summary || {},
      version:   data.version,
    };
  }

  window.CoC.core.sessionExport = Object.freeze({
    buildSessionData: buildSessionData,
    exportSession:    exportSession,
    importSession:    importSession,
  });

})();
