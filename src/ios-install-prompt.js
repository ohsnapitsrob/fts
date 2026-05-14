(function () {
  const STORAGE_KEY = "fts-ios-install-prompt-dismissed";
  const ELIGIBLE_NEXT_PAGE_KEY = "fts-ios-install-prompt-eligible-next-page";

  function featureEnabled() {
    return window.FTS?.Features?.isEnabled("iosInstallPromptEnabled") !== false;
  }

  function privacyAnswered() {
    if (window.FTS?.Privacy?.enabled?.() === false) return true;

    return window.FTS?.Privacy?.getSettings?.().hasAnswered === true;
  }

  function isIOSDevice() {
    const ua = window.navigator.userAgent || "";
    const platform = window.navigator.platform || "";
    const touchPoints = window.navigator.maxTouchPoints || 0;

    const isIPhoneOrIPad = /iPhone|iPad|iPod/i.test(ua);
    const isModernIPad = platform === "MacIntel" && touchPoints > 1;

    return isIPhoneOrIPad || isModernIPad;
  }

  function isStandalone() {
    return window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  }

  function wasDismissed() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch (err) {
      return false;
    }
  }

  function setDismissed() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch (err) {}
  }

  function isEligibleThisPage() {
    try {
      return window.sessionStorage.getItem(ELIGIBLE_NEXT_PAGE_KEY) === "true";
    } catch (err) {
      return false;
    }
  }

  function markEligibleForNextPage() {
    try {
      window.sessionStorage.setItem(ELIGIBLE_NEXT_PAGE_KEY, "true");
    } catch (err) {}
  }

  function consumeEligibility() {
    try {
      window.sessionStorage.removeItem(ELIGIBLE_NEXT_PAGE_KEY);
    } catch (err) {}
  }

  function shouldShow() {
    if (!featureEnabled()) return false;
    if (!isIOSDevice()) return false;
    if (isStandalone()) return false;
    if (wasDismissed()) return false;
    if (!privacyAnswered()) return false;

    if (isEligibleThisPage()) return true;

    markEligibleForNextPage();
    return false;
  }

  function addStyle() {
    if (document.getElementById("fts-ios-install-prompt-style")) return;

    const style = document.createElement("style");
    style.id = "fts-ios-install-prompt-style";
    style.textContent = `
      .fts-ios-install-overlay {
        position: fixed;
        inset: 0;
        z-index: 120000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 16px 16px calc(104px + env(safe-area-inset-bottom));
        background: rgba(15, 23, 42, 0.34);
      }

      .fts-ios-install-card {
        position: relative;
        width: min(390px, 100%);
        border-radius: 24px;
        background: #ffffff;
        box-shadow: 0 28px 80px rgba(15, 23, 42, 0.32);
        overflow: hidden;
        text-align: center;
        color: #111827;
        font-family: Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .fts-ios-install-body {
        padding: 24px 22px 22px;
      }

      .fts-ios-install-icon {
        width: 58px;
        height: 58px;
        margin: 0 auto 16px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: #f5f7f7;
        font-size: 28px;
      }

      .fts-ios-install-title {
        margin: 0 32px 10px;
        font-size: 18px;
        line-height: 1.2;
        font-weight: 850;
      }

      .fts-ios-install-copy {
        margin: 0;
        color: #5f5f5f;
        font-size: 14px;
        line-height: 1.45;
      }

      .fts-ios-install-steps {
        border-top: 1px solid #e5e7eb;
        padding: 16px 18px 18px;
        color: #111827;
        font-size: 14px;
        line-height: 1.4;
      }

      .fts-ios-share-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        margin: 0 4px;
        color: #007aff;
        vertical-align: middle;
      }

      .fts-ios-share-icon svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
      }

      .fts-ios-install-close {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #111827;
        font-size: 30px;
        line-height: 1;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      @media (min-width: 700px) {
        .fts-ios-install-overlay {
          align-items: center;
          padding: 24px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function shareIcon() {
    return `
      <span class="fts-ios-share-icon" aria-label="Share icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.4 7.7 7.7 6.3 6.3 12 0.6l5.7 5.7-1.4 1.4L13 4.4V15h-2V4.4z"></path>
          <path d="M5 10h2v10h10V10h2v10.5A1.5 1.5 0 0 1 17.5 22h-11A1.5 1.5 0 0 1 5 20.5V10z"></path>
        </svg>
      </span>
    `;
  }

  function render() {
    if (!shouldShow()) return;
    if (document.querySelector(".fts-ios-install-overlay")) return;

    consumeEligibility();
    addStyle();

    const overlay = document.createElement("div");
    overlay.className = "fts-ios-install-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Install Find That Scene");

    overlay.innerHTML = `
      <div class="fts-ios-install-card">
        <button class="fts-ios-install-close" type="button" aria-label="Dismiss install prompt">×</button>
        <div class="fts-ios-install-body">
          <div class="fts-ios-install-icon" aria-hidden="true">🎬</div>
          <h2 class="fts-ios-install-title">Install Find That Scene</h2>
          <p class="fts-ios-install-copy">Add this app to your Home Screen for quicker access and a more app-like experience.</p>
        </div>
        <div class="fts-ios-install-steps">
          Tap ${shareIcon()} then <strong>Add to Home Screen</strong>
        </div>
      </div>
    `;

    function dismiss() {
      setDismissed();
      overlay.remove();
    }

    overlay.querySelector(".fts-ios-install-close")?.addEventListener("click", dismiss);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) dismiss();
    });

    document.body.appendChild(overlay);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
