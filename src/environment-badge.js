(function () {
  const config = window.APP_CONFIG || {};

  function currentScriptBase() {
    const script = document.currentScript;
    if (!script || !script.src) return "";

    return script.src.slice(0, script.src.lastIndexOf("/") + 1);
  }

  function loadBottomNav() {
    if (document.querySelector('script[data-fts-bottom-nav="true"]')) return;

    const script = document.createElement("script");
    script.src = `${currentScriptBase()}bottom-nav.js`;
    script.defer = true;
    script.dataset.ftsBottomNav = "true";

    document.body.appendChild(script);
  }

  function showEnvironmentBadge() {
    if (config.ENVIRONMENT !== "staging") return;

    const label = config.ENVIRONMENT_LABEL || "STAGING";

    const badge = document.createElement("div");
    badge.className = "fts-env-badge";
    badge.textContent = label;

    const style = document.createElement("style");
    style.textContent = `
      .fts-env-badge {
        position: fixed;
        right: 12px;
        bottom: 12px;
        z-index: 99999;
        padding: 8px 10px;
        border-radius: 999px;
        background: rgba(17, 24, 39, 0.88);
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        pointer-events: none;
        user-select: none;
      }

      @media (max-width: 640px) {
        .fts-env-badge {
          font-size: 10px;
          padding: 7px 9px;
          bottom: calc(92px + env(safe-area-inset-bottom));
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(badge);
  }

  showEnvironmentBadge();
  loadBottomNav();
})();
