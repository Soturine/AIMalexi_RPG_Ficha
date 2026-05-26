/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/engine/name-generator.js
   Gerador de Nomes — sorteia de window.CoCData.names
   Atribui a window.CoC.names
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  function pick(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return "";
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Gera um nome completo.
   *
   * @param {Object} opts
   * @param {"ptBR"|"en"|"random"} opts.locale   - default "ptBR"
   * @param {"1920s"|"modern"|"random"} opts.era - default "modern"
   * @param {"male"|"female"|"random"} opts.gender - default "random"
   * @returns {{ firstName: string, lastName: string, full: string, locale: string, era: string, gender: string }}
   */
  function generateName(opts = {}) {
    const pool = window.CoCData?.names;
    if (!pool) return { firstName: "—", lastName: "—", full: "—" };

    let locale = opts.locale || "ptBR";
    if (locale === "random") locale = pick(["ptBR", "en"]);

    let era = opts.era || "modern";
    if (era === "random") era = pick(["1920s", "modern"]);

    let gender = opts.gender || "random";
    if (gender === "random") gender = pick(["male", "female"]);

    const localePool = pool[locale];
    if (!localePool) return { firstName: "—", lastName: "—", full: "—" };

    const eraPool = localePool[era];
    if (!eraPool) return { firstName: "—", lastName: "—", full: "—" };

    const firstName = pick(eraPool[gender] || eraPool.male || []);
    const lastName  = pick(localePool.lastNames || []);

    return {
      firstName,
      lastName,
      full: (firstName + " " + lastName).trim(),
      locale, era, gender
    };
  }

  /**
   * Gera só sobrenome.
   */
  function generateLastName(locale = "ptBR") {
    const ln = window.CoCData?.names?.[locale]?.lastNames;
    return pick(ln);
  }

  // ─── Expor ──────────────────────────────────────────────────────────────
  window.CoC.names = {
    generateName,
    generateLastName,
    pick
  };

})();
