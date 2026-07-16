/* GENERATED from scripts/modules/dialogs.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 centralized dialog dismissal policy.
   Backdrop clicks follow each dialog's declared policy and never bypass the top layer. */

const dialogsEscapePolicyApi =
  typeof importedEscapePolicyApi !== "undefined" ? importedEscapePolicyApi : window.WormholesEscape;
(function () {
  let installed = false;

  function isOpenModal(modal) {
    return !!modal?.classList?.contains?.("modal-backdrop") && modal.classList.contains("open");
  }

  function topOpenModal() {
    const topLayer = dialogsEscapePolicyApi?.topLayer?.();
    if (isOpenModal(topLayer)) return topLayer;

    const open = Array.from(document.querySelectorAll?.(".modal-backdrop.open") || []);
    return open[open.length - 1] || null;
  }

  function policyFor(modal, trigger = "backdrop") {
    if (!modal) return "none";
    if (trigger === "escape")
      return String(modal.dataset?.escapeDismiss || "none").trim() || "none";

    const backdropPolicy = String(modal.dataset?.backdropDismiss || "none").trim() || "none";
    if (backdropPolicy === "same") {
      return String(modal.dataset?.escapeDismiss || "none").trim() || "none";
    }
    return backdropPolicy;
  }

  function activatePolicy(modal, trigger = "backdrop") {
    const policy = policyFor(modal, trigger);
    if (!policy || policy === "none") return false;

    const control = document.getElementById?.(policy);
    if (!control || control.disabled || control.getAttribute?.("aria-disabled") === "true")
      return false;
    control.click?.();
    return true;
  }

  function handleBackdropClick(event) {
    const modal = event?.target;
    if (!isOpenModal(modal) || event.currentTarget !== document) return false;
    if (event.target !== modal) return false;

    const top = topOpenModal();
    if (top && top !== modal) return false;

    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    activatePolicy(modal, "backdrop");
    return true;
  }

  function install() {
    if (installed) return;
    installed = true;
    document.addEventListener?.("click", handleBackdropClick, true);
  }

  window.WormholesDialogs = Object.freeze({
    install,
    isOpenModal,
    topOpenModal,
    policyFor,
    activatePolicy,
    handleBackdropClick,
  });

  install();
})();
