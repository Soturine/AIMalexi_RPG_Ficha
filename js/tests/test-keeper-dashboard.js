/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/tests/test-keeper-dashboard.js
   Fase D — trava a matemática PURA dos KPIs do dashboard do Guardião
   (total/online/vivos/SAN média/PV médio/SAN crítica). A renderização DOM é
   validada no navegador.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  group("Keeper Dashboard — KPIs (puro)");

  var K = window.CoC.keeperOverview.computeInvestigatorKpis;

  var invs = {
    p1: { characterName: 'A', online: true,  status: { hp: 10, hpMax: 12, san: 60, sanMax: 80, mp: 5 } },
    p2: { characterName: 'B', online: false, status: { hp: 0,  hpMax: 11, san: 10, sanMax: 70, mp: 3 } },
    p3: { characterName: 'C', online: true,  status: { hp: 8,  hpMax: 9,  san: 5,  sanMax: 60, mp: 2 } }
  };
  var k = K(invs);
  assertEq(k.total,  3, "total = 3");
  assertEq(k.online, 2, "online = 2");
  assertEq(k.alive,  2, "vivos = 2 (hp > 0)");
  assertEq(k.sanAvg, 25, "SAN média = round((60+10+5)/3) = 25");
  assertEq(k.hpAvg,  6,  "PV médio = round((10+0+8)/3) = 6");
  // crítica: san>0 e san <= 20% do sanMax → p2 (10<=14) e p3 (5<=12); p1 (60<=16) não.
  assertEq(k.critical.length, 2, "2 investigadores em SAN crítica");

  var e = K({});
  assertEq(e.total,  0, "vazio: total 0");
  assertEq(e.online, 0, "vazio: online 0");
  assertEq(e.sanAvg, 0, "vazio: SAN média 0 (sem divisão por zero)");
  assertEq(e.critical.length, 0, "vazio: nenhum crítico");

  // tolerante a status ausente
  var k2 = K({ x: { online: true } });
  assertEq(k2.total, 1, "sem status: conta no total");
  assertEq(k2.alive, 0, "sem status: não vivo (hp ausente = 0)");
})();
