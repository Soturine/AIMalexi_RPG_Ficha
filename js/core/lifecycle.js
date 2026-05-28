/* ═══════════════════════════════════════════════════════════════════════════
   AIMalexi RPG · js/core/lifecycle.js
   Render lifecycle & cleanup primitives (M0.8) — DONO EXPLÍCITO do teardown.

   Por quê (antes do Store): a migração DOM imperativo → reatividade morre de
   memory leaks se não houver uma convenção clara de quem desmonta, limpa
   subscriptions, revoga ObjectURLs e remove listeners. Estas primitivas dão
   esse dono: um SCOPE coleta cleanups e os dispõe de uma vez, idempotente.

   Framework-agnóstico e forward-compatible:
   - bindSignal() usa Preact Signals (effect) quando window.CoC.signals estiver
     plugado (M1); até lá degrada para subscribe()/leitura única.
   - createObjectURL()/cleanupObjectURLs() generalizam o anti-leak do media-picker.

   M0.8: módulo completo, porém NÃO plugado ainda (como o resto de js/core).
   No M1+ as views passam a criar um scope por componente e dispô-lo no teardown.

   Atribui a window.CoC.lifecycle.
   ═══════════════════════════════════════════════════════════════════════════ */

window.CoC = window.CoC || {};

(function () {

  // Rede de segurança global: toda ObjectURL criada via createObjectURL entra
  // aqui também; revogadas em pagehide (aba fechando/suspendendo).
  const allUrls = new Set();

  /**
   * Cria um escopo de ciclo de vida (tipicamente 1 por componente/render).
   * @param {string} [name]
   * @returns {{name:string, disposed:boolean}}
   */
  function createScope(name) {
    return { name: name || "scope", _cleanups: new Set(), _urls: new Set(), disposed: false };
  }

  /**
   * Registra um teardown no escopo. Retorna um "deregister" (remove sem rodar).
   * Se o escopo já foi disposto, roda o fn na hora (e não registra).
   * @param {object} scope
   * @param {Function} fn
   * @returns {Function} deregister
   */
  function registerCleanup(scope, fn) {
    if (!scope || typeof fn !== "function") return function () {};
    if (scope.disposed) { try { fn(); } catch (e) {} return function () {}; }
    scope._cleanups.add(fn);
    return function () { scope._cleanups.delete(fn); };
  }

  /**
   * Cria uma ObjectURL atrelada ao escopo (revogada no disposeComponent).
   * Também entra na rede de segurança global (pagehide).
   * @param {object} scope
   * @param {Blob} blob
   * @returns {string} objectURL
   */
  function createObjectURL(scope, blob) {
    const url = URL.createObjectURL(blob);
    allUrls.add(url);
    if (scope) scope._urls.add(url);
    return url;
  }

  /** Revoga (agora) todas as ObjectURLs deste escopo. */
  function cleanupObjectURLs(scope) {
    if (!scope) return;
    for (const u of scope._urls) {
      try { URL.revokeObjectURL(u); } catch (e) {}
      allUrls.delete(u);
    }
    scope._urls.clear();
  }

  /**
   * Assina uma fonte reativa e registra o teardown no escopo.
   * - Com signals plugados (M1): `source` é uma função que LÊ signals; roda em
   *   effect e re-executa quando mudam.
   * - Com observable: `source.subscribe(cb)` → registra o unsubscribe.
   * - Sem nada disso: roda `cb(source())` uma vez (não-reativo); teardown no-op.
   * @returns {Function} dispose
   */
  function bindSignal(scope, source, cb) {
    let dispose = null;
    const S = window.CoC.signals;
    if (S && typeof S.effect === "function" && typeof source === "function") {
      dispose = S.effect(function () { const v = source(); if (cb) cb(v); });
    } else if (source && typeof source.subscribe === "function") {
      dispose = source.subscribe(cb);
    } else if (typeof source === "function") {
      if (cb) cb(source());
      dispose = function () {};
    }
    if (typeof dispose === "function") registerCleanup(scope, dispose);
    return dispose || function () {};
  }

  /**
   * Dispõe o escopo: revoga ObjectURLs e roda todos os cleanups (idempotente).
   * Um cleanup que lança não impede os demais.
   */
  function disposeComponent(scope) {
    if (!scope || scope.disposed) return;
    scope.disposed = true;
    cleanupObjectURLs(scope);
    for (const fn of scope._cleanups) { try { fn(); } catch (e) {} }
    scope._cleanups.clear();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", function () {
      for (const u of allUrls) { try { URL.revokeObjectURL(u); } catch (e) {} }
      allUrls.clear();
    });
  }

  window.CoC.lifecycle = {
    createScope,
    registerCleanup,
    createObjectURL,
    cleanupObjectURLs,
    bindSignal,
    disposeComponent
  };

})();
