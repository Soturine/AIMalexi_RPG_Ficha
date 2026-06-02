/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/combat.js
   View de Combate — extração do investigator.js (Strangler Pattern M3).

   Responsabilidades:
   - Renderizar lista de armas do personagem ativo
   - Inicializar delegação de eventos (ONE-TIME, no boot)
   - Abrir modal editar/nova arma → dispatch ADD_WEAPON / UPDATE_WEAPON
   - Rolar ataque → classifyRoll, rollDamage, log via rolls.registerRoll
   - dispatch ATTACK_RESOLVED (decrementa ammo em armas de fogo)

   Depende de:
   - window.CoC.store   (getState, dispatch, subscribe)
   - window.CoC.dice    (rollD100, classifyRoll, meetsDifficulty, rollDamage)
   - window.CoCData     (findSkill)
   - window.CoC.views.rolls  (registerRoll)
   - window.CoC.ui      (modal, confirm, escapeHtml, el, $, $$)

   NÃO tem estado interno — lê sempre de store.getState().
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC        = window.CoC        || {};
window.CoC.views  = window.CoC.views  || {};

(function () {

  // Referências lazy — preenchidas em init()
  var _store     = null;
  var _executor  = null;
  var _dice      = null;
  var _rollMods  = { bp: null, difficulty: 'regular' };

  // ── Helpers de DOM (shadowing dos aliases locais de investigator.js) ───────
  function $s(sel)  { return document.querySelector(sel); }

  // ── Skill resolution ──────────────────────────────────────────────────────
  // AVISO: lógica duplicada de rolls.js / investigator.js#getSkillValue.
  // Manter em sincronia até o Strangler unificar skills em store.
  function _getSkillValue(c, name) {
    var direct = Number(c && c.skills && c.skills[name] && c.skills[name].value);
    if (!isNaN(direct) && direct > 0) return direct;
    var def = window.CoCData && (
      window.CoCData.findSkill(name) ||
      window.CoCData.findSkill(name.replace(/\s*\(.+\)$/, ''))
    );
    if (!def) return 0;
    var attrs = {};
    var rawAttrs = (c && c.attributes) || {};
    Object.keys(rawAttrs).forEach(function(k) { attrs[k] = rawAttrs[k].value; });
    if (def.baseFormula === 'DES/2') return Math.floor((attrs.DES || 0) / 2);
    if (def.baseFormula === 'EDU')   return attrs.EDU || 0;
    return Number(def.base) || 0;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    var list = $s('#weapons-list');
    if (!list) return;
    list.innerHTML = '';
    var c = _store ? _store.getState().character : null;
    if (!c) return;
    var weapons = Array.isArray(c.weapons) ? c.weapons : [];

    if (weapons.length === 0) {
      list.innerHTML = '<p class="dim center" style="grid-column: 1/-1;">Sem armas. Clique em <b>+ Arma</b> para adicionar.</p>';
      return;
    }

    var ui = window.CoC.ui || {};
    var escHtml = ui.escapeHtml || function(s) { return String(s).replace(/[&<>"']/g, function(c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); };
    var mkEl    = ui.el || function(tag, attrs) { var e = document.createElement(tag); Object.keys(attrs||{}).forEach(function(k){ e.setAttribute(k, attrs[k]); }); return e; };

    weapons.forEach(function(w) {
      if (!w || typeof w !== 'object') return;
      var skillVal = _getSkillValue(c, w.skill);
      var card = mkEl('div', { class: 'weapon-card' + (w.magical ? ' magical' : ''), 'data-weapon-id': w.id || '' });
      card.innerHTML = (
        '<div class="weapon-header">' +
          '<span class="weapon-icon">' + escHtml(w.icon || '⚔️') + '</span>' +
          '<span class="weapon-name">' + escHtml(w.name || '') + '</span>' +
        '</div>' +
        '<div class="weapon-info">' +
          '<b>Perícia:</b> ' + escHtml(w.skill || '—') + ' (' + skillVal + '%)<br>' +
          '<b>Dano:</b> ' + escHtml(w.damage || '—') + (w.range ? ' · <b>Alc:</b> ' + escHtml(w.range) : '') + '<br>' +
          (w.ammo != null ? '<b>Munição:</b> ' + escHtml(String(w.ammo)) + (w.shots ? ' (×' + w.shots + '/rd)' : '') + '<br>' : '') +
        '</div>' +
        (w.note ? '<div class="weapon-note">' + escHtml(w.note) + '</div>' : '') +
        '<div class="weapon-actions no-print">' +
          '<button data-weapon-attack="' + escHtml(w.id || '') + '" class="btn-primary" title="Rolar ataque + dano">🎯 Atacar</button>' +
          '<button data-weapon-edit="'   + escHtml(w.id || '') + '" class="btn-ghost btn-icon" title="Editar">✎</button>' +
          '<button data-weapon-del="'    + escHtml(w.id || '') + '" class="btn-danger btn-icon" title="Remover">🗑️</button>' +
        '</div>'
      );
      list.appendChild(card);
    });
  }

  // ── Edit modal ─────────────────────────────────────────────────────────────
  function _editWeapon(weapon) {
    var ui    = window.CoC.ui || {};
    var mkEl  = ui.el || function(tag, a) { var e = document.createElement(tag); Object.keys(a||{}).forEach(function(k){ e.setAttribute(k, a[k]); }); return e; };
    var modal = ui.modal;
    if (!modal) { console.warn('[combat] modal not available'); return; }
    var escHtml = ui.escapeHtml || function(s) { return String(s).replace(/[&<>"']/g, function(c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); };
    var w = weapon || {};
    var isNew = !w.id;

    // Montar opções do dropdown de perícias
    var c2 = _store ? _store.getState().character : null;
    var skillOptions = '';
    if (window.CoCData && window.CoCData.skills) {
      // Perícias de combate primeiro
      var combat = window.CoCData.skills.filter(function(s) { return s.category === 'combat'; });
      var others = window.CoCData.skills.filter(function(s) { return s.category !== 'combat'; });
      var makeOpts = function(list) {
        return list.map(function(s) {
          var val = c2 && c2.skills && c2.skills[s.name] ? Number(c2.skills[s.name].value) || 0 : (Number(s.base) || 0);
          var sel = (w.skill === s.name) ? ' selected' : '';
          return '<option value="' + escHtml(s.name) + '"' + sel + '>' + escHtml(s.name) + ' (' + val + '%)</option>';
        }).join('');
      };
      skillOptions = '<option value="">— Escolha a perícia —</option>' +
        '<optgroup label="⚔️ Combate">' + makeOpts(combat) + '</optgroup>' +
        '<optgroup label="Outras">' + makeOpts(others) + '</optgroup>';
      // Perícia atual não no catálogo (customizada)
      if (w.skill && !window.CoCData.findSkill(w.skill)) {
        skillOptions += '<option value="' + escHtml(w.skill) + '" selected>' + escHtml(w.skill) + '</option>';
      }
    }

    var formBody = mkEl('div', { class: 'background-grid' });
    formBody.innerHTML = (
      '<div><label>Nome</label><input id="w-name" value="' + escHtml(w.name || '') + '" /></div>' +
      '<div><label>Ícone (emoji)</label><input id="w-icon" value="' + escHtml(w.icon || '') + '" placeholder="🔫" /></div>' +
      '<div><label>Perícia</label><select id="w-skill">' + skillOptions + '</select></div>' +
      '<div><label>Dano</label><input id="w-damage" value="' + escHtml(w.damage || '') + '" placeholder="1D8+DB" /></div>' +
      '<div><label>Alcance</label><input id="w-range" value="' + escHtml(w.range || '') + '" placeholder="Toque, 15m, DES m" /></div>' +
      '<div><label>Munição</label><input id="w-ammo" type="number" value="' + (w.ammo != null ? w.ammo : '') + '" /></div>' +
      '<div><label>Tiros/rodada</label><input id="w-shots" type="number" value="' + (w.shots != null ? w.shots : '') + '" /></div>' +
      '<div class="full-width"><label>Nota</label><textarea id="w-note">' + escHtml(w.note || '') + '</textarea></div>' +
      '<div class="full-width">' +
        '<label><input type="checkbox" id="w-impale"   ' + (w.impale   ? 'checked' : '') + ' /> Empala em Sucesso Extremo</label>' +
        '<label style="margin-left: 1rem;"><input type="checkbox" id="w-magical" ' + (w.magical ? 'checked' : '') + ' /> Item Mágico</label>' +
      '</div>'
    );

    modal({
      title: isNew ? 'Nova Arma' : 'Editar Arma',
      body: formBody,
      actions: [
        { label: 'Cancelar' },
        { label: 'Salvar', primary: true, onClick: function() {
          var $s2 = function(id) { return document.getElementById(id); };
          var updated = {
            name:   ($s2('w-name').value || '').trim() || 'Sem nome',
            icon:   ($s2('w-icon').value || '').trim(),
            skill:  ($s2('w-skill').value || '').trim(),
            damage: ($s2('w-damage').value || '').trim(),
            range:  ($s2('w-range').value || '').trim(),
            ammo:   parseInt($s2('w-ammo').value, 10) || null,
            shots:  parseInt($s2('w-shots').value, 10) || null,
            note:   ($s2('w-note').value || '').trim(),
            impale: $s2('w-impale').checked,
            magical: $s2('w-magical').checked
          };
          if (isNew) {
            _executor.execute({ type: 'ADD_WEAPON', payload: { weapon: updated } });
          } else {
            updated.id = w.id;
            _executor.execute({ type: 'UPDATE_WEAPON', payload: { weapon: updated } });
          }
        }}
      ]
    });
  }

  // ── Attack ─────────────────────────────────────────────────────────────────
  function _attack(weaponId) {
    var c = _store ? _store.getState().character : null;
    if (!c) return;
    var weapons = Array.isArray(c.weapons) ? c.weapons : [];
    var w = null;
    for (var i = 0; i < weapons.length; i++) {
      if (weapons[i].id === weaponId) { w = weapons[i]; break; }
    }
    if (!w) return;

    var dice       = _dice || window.CoC.dice;
    var skillVal   = _getSkillValue(c, w.skill);
    var difficulty = (_rollMods && _rollMods.difficulty) || 'regular';

    var target = difficulty === 'hard'    ? Math.floor(skillVal / 2) :
                 difficulty === 'extreme' ? Math.floor(skillVal / 5) :
                                           skillVal;

    var result = dice.rollD100((_rollMods && _rollMods.bp) || null);
    var graded = dice.gradeRoll(result.value, skillVal, difficulty);
    var level  = graded.level;
    var ok     = graded.met;

    var dmgStr = '—';
    var isFired = w.ammo != null;  // arma de fogo se tiver campo ammo

    if (ok) {
      var dbVal    = (c.derived && c.derived.DB && c.derived.DB.value) || '0';
      var isImpale = (level === 'extreme' || level === 'crit') && w.impale;
      var d        = dice.rollDamage(w.damage || '0', dbVal, isImpale);
      var diceStr  = d.rolls.map(function(r) { return '(' + r.dice.join('+') + ')'; }).join('+');
      dmgStr = w.damage + ' → ' + d.total + (isImpale ? ' ⚡EMPALA' : '') + ' ' + diceStr;
    }

    var rollsView = window.CoC.views && window.CoC.views.rolls;
    if (rollsView && rollsView.registerRoll) {
      rollsView.registerRoll({
        kind: 'weapon-attack',
        skill: '⚔ ' + w.name,
        skillRaw: w.skill,
        target: target,
        targetRaw: skillVal,
        label: difficulty === 'regular'
          ? skillVal
          : skillVal + ' → ' + (difficulty === 'hard' ? 'Difícil' : 'Extremo') + ' ' + target,
        d100: result.value,
        level: level,
        dmg: ok ? dmgStr : '(miss)',
        note: [
          (_rollMods && _rollMods.bp) ? '[' + _rollMods.bp + ']' : '',
          difficulty !== 'regular' ? '[' + difficulty + ']' : ''
        ].filter(Boolean).join(' ')
      });
    }

    var damageTotal = ok && typeof d !== 'undefined' ? d.total : 0;
    _executor.execute({
      type: 'ATTACK_RESOLVED',
      payload: {
        weaponId:    weaponId,
        isFired:     isFired,
        hit:         ok,
        level:       level,
        roll:        result.value,   // resultado bruto do d100 — necessário para replay
        damage:      damageTotal,    // total de dano calculado antes do dispatch
      }
    });
  }

  // ── Public API: setRollMods ────────────────────────────────────────────────
  function setRollMods(mods) {
    _rollMods = mods || { bp: null, difficulty: 'regular' };
  }

  // ── ONE-TIME event delegation ──────────────────────────────────────────────
  function init(store) {
    _store    = store || window.CoC.store;
    _executor = window.CoC.core.executor;
    _dice     = window.CoC.dice;

    var container = $s('#weapons-list');
    if (!container) return;
    var parent = container.parentElement;
    if (!parent) return;

    // Attack / Edit / Delete — delegated to parent section (survives re-renders)
    parent.addEventListener('click', function(e) {
      var btn = e.target.closest
        ? e.target.closest('[data-weapon-attack],[data-weapon-edit],[data-weapon-del]')
        : null;
      if (!btn) return;

      var c = _store ? _store.getState().character : null;
      var weapons = (c && Array.isArray(c.weapons)) ? c.weapons : [];

      if (btn.hasAttribute('data-weapon-attack')) {
        _attack(btn.getAttribute('data-weapon-attack'));
      } else if (btn.hasAttribute('data-weapon-edit')) {
        var wid = btn.getAttribute('data-weapon-edit');
        var found = null;
        for (var i = 0; i < weapons.length; i++) {
          if (weapons[i].id === wid) { found = weapons[i]; break; }
        }
        _editWeapon(found);
      } else if (btn.hasAttribute('data-weapon-del')) {
        var wid2 = btn.getAttribute('data-weapon-del');
        var w2 = null;
        for (var j = 0; j < weapons.length; j++) {
          if (weapons[j].id === wid2) { w2 = weapons[j]; break; }
        }
        var ui = window.CoC.ui || {};
        var confirmFn = ui.confirm;
        if (confirmFn) {
          confirmFn('Remover "' + (w2 && w2.name || '') + '"?', { danger: true, title: 'Remover arma' })
            .then(function(ok) {
              if (ok) _executor.execute({ type: 'REMOVE_WEAPON', payload: { id: wid2 } });
            });
        } else {
          if (confirm('Remover arma?')) {
            _executor.execute({ type: 'REMOVE_WEAPON', payload: { id: wid2 } });
          }
        }
      }
    });

    // Add-weapon button
    var btnAdd = $s('#btn-add-weapon');
    if (btnAdd) {
      btnAdd.addEventListener('click', function() { _editWeapon(null); });
    }
  }

  window.CoC.views.combat = Object.freeze({ render: render, init: init, setRollMods: setRollMods });

})();
