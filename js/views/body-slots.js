/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/views/body-slots.js
   ETAPA 5 (#11) — Sistema de slots corporais

   Slots baseados no corpo do investigador (CoC 7e não os define formalmente,
   mas são convenção de RPGs para organizar equipamentos equipados).

   Regras:
     - Cada slot suporta 1 item (exceto Acessórios: até 3).
     - Um item não pode ocupar dois slots ao mesmo tempo.
     - Equipar em slot cheio substitui o item anterior.

   Expõe: window.CoC.views.bodySlots = { init, render }
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC       = window.CoC       || {};
window.CoC.views = window.CoC.views || {};

(function () {

  const { $, el, escapeHtml, toast, modal } = window.CoC.ui;
  const cocStore    = window.CoC.store;
  const cocExecutor = window.CoC.core.executor;

  // Definição oficial dos slots corporais
  const SLOTS = [
    { id: 'cabeca',      label: 'Cabeça',       icon: '🪖', max: 1 },
    { id: 'pescoco',     label: 'Pescoço',       icon: '📿', max: 1 },
    { id: 'torso',       label: 'Torso',         icon: '🦺', max: 1 },
    { id: 'maoDireita',  label: 'Mão Direita',   icon: '⚔️',  max: 1 },
    { id: 'maoEsquerda', label: 'Mão Esquerda',  icon: '🛡️',  max: 1 },
    { id: 'maos',        label: 'Mãos',          icon: '🧤', max: 1 },
    { id: 'pernas',      label: 'Pernas / Pés',  icon: '👢', max: 1 },
    { id: 'acessorios',  label: 'Acessórios',    icon: '💍', max: 3 },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    const container = $('#body-slots-section');
    if (!container) return;

    const c = cocStore.getState().character;
    const slots = (c && c.bodySlots) || {};

    container.innerHTML = '';

    const header = el('div', {
      style: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }
    }, [
      el('h3', {
        style: { fontFamily: 'var(--font-serif)', color: 'var(--brass-bright)', margin: 0 }
      }, ['Equipamentos por Slot']),
      el('span', {
        style: { fontSize: '0.75rem', color: 'var(--ink-dim)', fontStyle: 'italic' }
      }, ['(um item por slot; Acessórios até 3)'])
    ]);
    container.appendChild(header);

    const grid = el('div', { class: 'body-slots-grid' });

    SLOTS.forEach(function(slot) {
      const equipped = slots[slot.id];
      // Normaliza: sempre array para renderização uniforme
      const items = equipped == null ? [] : (Array.isArray(equipped) ? equipped : [equipped]);

      const row = el('div', { class: 'body-slot-row' });

      // Label do slot
      const labelDiv = el('div', { class: 'body-slot-label' }, [
        el('span', { class: 'body-slot-icon' }, [slot.icon]),
        el('span', {}, [slot.label])
      ]);
      row.appendChild(labelDiv);

      // Itens equipados
      const itemsDiv = el('div', { class: 'body-slot-items' });
      if (items.length === 0) {
        itemsDiv.appendChild(el('span', { class: 'body-slot-empty' }, ['—']));
      } else {
        items.forEach(function(item, idx) {
          const chip = el('span', { class: 'body-slot-chip' }, [
            el('span', {}, [item.icon ? item.icon + ' ' : '', item.name || '?']),
            el('button', {
              class: 'body-slot-remove',
              title: 'Remover ' + (item.name || 'item'),
              'data-slot': slot.id,
              'data-idx': String(idx)
            }, ['✕'])
          ]);
          itemsDiv.appendChild(chip);
        });
      }
      row.appendChild(itemsDiv);

      // Botão equipar (só mostra se slot não cheio)
      if (items.length < slot.max) {
        const equipBtn = el('button', {
          class: 'btn-ghost btn-sm body-slot-equip',
          'data-slot': slot.id,
          title: 'Equipar item em ' + slot.label
        }, ['+ Equipar']);
        row.appendChild(equipBtn);
      }

      grid.appendChild(row);
    });

    container.appendChild(grid);

    // Delegação de eventos
    grid.addEventListener('click', function(e) {
      const removeBtn = e.target.closest('[data-slot][data-idx]');
      if (removeBtn) {
        _removeItem(removeBtn.dataset.slot, parseInt(removeBtn.dataset.idx, 10));
        return;
      }
      const equipBtn = e.target.closest('.body-slot-equip[data-slot]');
      if (equipBtn) {
        _openEquipModal(equipBtn.dataset.slot);
      }
    });
  }

  // ── Abrir modal para equipar item ─────────────────────────────────────────
  function _openEquipModal(slotId) {
    const slotDef = SLOTS.find(function(s) { return s.id === slotId; });
    if (!slotDef) return;

    const body = el('div', {});
    body.innerHTML = (
      '<div style="display:grid;gap:0.5rem;">' +
        '<div><label>Nome do item</label><input id="bs-name" placeholder="Ex: Chapéu de couro" style="width:100%" /></div>' +
        '<div><label>Ícone (emoji)</label><input id="bs-icon" placeholder="🎩" style="width:100%" /></div>' +
        '<div><label>Notas</label><textarea id="bs-notes" rows="2" style="width:100%"></textarea></div>' +
      '</div>'
    );

    modal({
      title: 'Equipar em ' + slotDef.icon + ' ' + slotDef.label,
      body,
      actions: [
        { label: 'Cancelar' },
        { label: 'Equipar', primary: true, onClick: function() {
          const name = (document.getElementById('bs-name')?.value || '').trim();
          if (!name) { toast('Informe o nome do item.', { type: 'warn' }); return; }
          const item = {
            name,
            icon: (document.getElementById('bs-icon')?.value || '').trim(),
            notes: (document.getElementById('bs-notes')?.value || '').trim()
          };
          cocExecutor.execute({
            type: 'SET_BODY_SLOT',
            payload: { slotId, item, action: 'add' }
          });
        }}
      ]
    });
  }

  // ── Remover item de slot ──────────────────────────────────────────────────
  function _removeItem(slotId, idx) {
    cocExecutor.execute({
      type: 'SET_BODY_SLOT',
      payload: { slotId, idx, action: 'remove' }
    });
  }

  function init() {}

  window.CoC.views.bodySlots = Object.freeze({ init, render });

})();
