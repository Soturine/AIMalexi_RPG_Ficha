/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/campaign/pin-system.js
   Geração e validação de PINs de 6 dígitos para campanha
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};
window.CoC.campaign = window.CoC.campaign || {};

(function () {

  function generate() {
    var arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    var n = (arr[0] % 900000) + 100000;
    return String(n);
  }

  function validate(pin) {
    return typeof pin === 'string' && /^\d{6}$/.test(pin.trim());
  }

  window.CoC.campaign.pin = Object.freeze({ generate: generate, validate: validate });

})();
