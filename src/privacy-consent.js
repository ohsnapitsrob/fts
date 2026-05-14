window.FTS = window.FTS || {};

FTS.Privacy = (function () {
  const STORAGE_KEY = "fts-privacy-settings";

  const defaults = {
    mediaEmbeds: false
  };

  function enabled() {
    return window.FTS?.Features?.isEnabled("privacyConsentEnabled") !== false;
  }

  function getRootPath() {
    return window.FTS?.AppHeader?.getRootPath?.() || "./";
  }

  function load() {
    if (!enabled()) {
      return {
        ...defaults,
        hasAnswered: false
      };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return {
          ...defaults,
          hasAnswered: false
        };
      }

      return {
        ...defaults,
        ...JSON.parse(raw),
        hasAnswered: true
      };
    } catch (err) {
      return {
        ...defaults,
        hasAnswered: false
      };
    }
  }

  function save(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {}
  }

  function clearOptionalStorage() {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith("plausible_") ||
          key.startsWith("yt-") ||
          key.startsWith("youtube")
        ) {
          localStorage.removeItem(key);
        }
      });
    } catch (err) {}

    try {
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1
          ? cookie.slice(0, eqPos).trim()
          : cookie.trim();

        if (!name) return;

        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });
    } catch (err) {}
  }

  function applySettings(settings) {
    save(settings);
    clearOptionalStorage();
    window.location.reload();
  }

  function getSettings() {
    return load();
  }

  function mediaAllowed() {
    if (!enabled()) return false;

    const settings = load();

    return settings.mediaEmbeds === true &&
      window.FTS?.Features?.isEnabled("mediaEmbedsEnabled") !== false;
  }

  function addStyles() {
    if (document.getElementById("fts-privacy-style")) return;

    const style = document.createElement("style");
    style.id = "fts-privacy-style";
    style.textContent = `
      .fts-privacy-overlay {
        position: fixed;
        inset: 0;
        z-index: 150000;
        background: rgba(15, 23, 42, 0.45);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 16px;
      }

      .fts-privacy-card {
        width: min(560px, 100%);
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
        overflow: hidden;
        color: #111827;
      }

      .fts-privacy-body {
        padding: 22px;
      }

      .fts-privacy-title {
        margin: 0 0 10px;
        font-size: 20px;
        font-weight: 850;
      }

      .fts-privacy-copy {
        margin: 0;
        color: #5f5f5f;
        line-height: 1.5;
        font-size: 14px;
      }

      .fts-privacy-link {
        display: inline-flex;
        margin-top: 12px;
        color: #111827;
        font-size: 14px;
        font-weight: 800;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .fts-privacy-section {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid #e5e7eb;
      }

      .fts-privacy-setting {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
      }

      .fts-privacy-setting-title {
        font-size: 15px;
        font-weight: 700;
      }

      .fts-privacy-setting-copy {
        margin-top: 4px;
        color: #6b7280;
        font-size: 13px;
        line-height: 1.45;
      }

      .fts-privacy-actions {
        display: flex;
        gap: 10px;
        padding: 18px 22px 22px;
      }

      .fts-privacy-btn {
        flex: 1;
        min-height: 48px;
        border-radius: 16px;
        border: 0;
        cursor: pointer;
        font-weight: 700;
        font-size: 14px;
      }

      .fts-privacy-btn-primary {
        background: #111827;
        color: #ffffff;
      }

      .fts-privacy-btn-secondary {
        background: #f3f4f6;
        color: #111827;
      }

      .fts-privacy-toggle {
        position: relative;
        width: 52px;
        height: 32px;
        border-radius: 999px;
        border: 0;
        background: #d1d5db;
        cursor: pointer;
      }

      .fts-privacy-toggle::after {
        content: "";
        position: absolute;
        top: 4px;
        left: 4px;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: #ffffff;
        transition: transform 0.2s ease;
      }

      .fts-privacy-toggle.is-active {
        background: #111827;
      }

      .fts-privacy-toggle.is-active::after {
        transform: translateX(20px);
      }
    `;

    document.head.appendChild(style);
  }

  function buildModal(isInitial = false) {
    addStyles();

    const settings = load();

    const overlay = document.createElement("div");
    overlay.className = "fts-privacy-overlay";

    overlay.innerHTML = `
      <div class="fts-privacy-card" role="dialog" aria-modal="true" aria-label="Privacy settings">
        <div class="fts-privacy-body">
          <h2 class="fts-privacy-title">Privacy settings</h2>

          <p class="fts-privacy-copy">
            Find That Scene uses privacy-friendly analytics and optional media embeds.
            You can control optional media features here at any time.
          </p>

          <a class="fts-privacy-link" href="${getRootPath()}privacy/">Read the privacy page</a>

          <div class="fts-privacy-section">
            <div class="fts-privacy-setting">
              <div>
                <div class="fts-privacy-setting-title">Media embeds</div>
                <div class="fts-privacy-setting-copy">
                  Allows YouTube trailers and future embedded media content.
                </div>
              </div>

              <button class="fts-privacy-toggle ${settings.mediaEmbeds ? "is-active" : ""}" type="button" aria-label="Toggle media embeds"></button>
            </div>
          </div>
        </div>

        <div class="fts-privacy-actions">
          ${isInitial ? `
            <button class="fts-privacy-btn fts-privacy-btn-secondary" data-action="reject" type="button">
              Continue without media
            </button>
          ` : ""}

          <button class="fts-privacy-btn fts-privacy-btn-primary" data-action="save" type="button">
            ${isInitial ? "Save preferences" : "Done"}
          </button>
        </div>
      </div>
    `;

    let mediaEmbeds = settings.mediaEmbeds;

    const toggle = overlay.querySelector(".fts-privacy-toggle");

    function syncToggle() {
      toggle.classList.toggle("is-active", mediaEmbeds);
    }

    toggle.addEventListener("click", () => {
      mediaEmbeds = !mediaEmbeds;
      syncToggle();
    });

    overlay.querySelector('[data-action="reject"]')?.addEventListener("click", () => {
      mediaEmbeds = false;

      applySettings({
        mediaEmbeds
      });
    });

    overlay.querySelector('[data-action="save"]')?.addEventListener("click", () => {
      applySettings({
        mediaEmbeds
      });
    });

    return overlay;
  }

  function openSettings() {
    if (!enabled()) return;

    document.body.appendChild(buildModal(false));
  }

  function maybeShowInitialPrompt() {
    if (!enabled()) return;

    const settings = load();

    if (settings.hasAnswered) return;

    document.body.appendChild(buildModal(true));
  }

  return {
    enabled,
    getSettings,
    mediaAllowed,
    openSettings,
    maybeShowInitialPrompt
  };
})();
