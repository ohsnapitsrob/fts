(function () {
  const CONFIG = window.APP_CONFIG || {};
  const LOGO_URL = CONFIG.SITE_LOGO_URL || "";
  const SITE_NAME = CONFIG.SITE_NAME || "Find That Scene";

  window.FTS = window.FTS || {};

  function getPath() {
    return window.location.pathname.replace(/\/+$/, "");
  }

  function getRootPath() {
    if (document.body.dataset.navRoot) return document.body.dataset.navRoot;

    const path = getPath();

    if (
      path.endsWith("/browse") ||
      path.endsWith("/explore") ||
      path.endsWith("/title") ||
      path.endsWith("/stats") ||
      path.endsWith("/national-trust") ||
      path.endsWith("/privacy")
    ) {
      return "../";
    }

    return "./";
  }

  function isExploreView() {
    return getPath().endsWith("/explore");
  }

  function isPrivacyView() {
    return getPath().endsWith("/privacy");
  }

  function logoEnabled() {
    return window.FTS?.Features?.isEnabled("headerLogoEnabled") !== false;
  }

  function addStyle() {
    if (document.getElementById("fts-app-header-style")) return;

    const style = document.createElement("style");
    style.id = "fts-app-header-style";
    style.textContent = `
      body.fts-has-app-header:not(:has(#map)) {
        padding-top: 72px;
      }

      body.fts-has-app-header:has(#map) {
        padding-top: 0;
      }

      .fts-app-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        min-height: 72px;
        max-height: 72px;
        padding: 12px 16px;
        background: #ffffff;
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr) 48px;
        align-items: center;
        z-index: 3200;
        box-shadow: 0 1px 0 rgba(229, 231, 235, 0.9);
      }

      .fts-app-header-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        justify-self: center;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent;
      }

      .fts-app-header-logo {
        display: block;
        max-height: 48px;
        width: auto;
        object-fit: contain;
      }

      .fts-header-search-btn,
      .fts-header-settings-btn {
        width: 44px;
        height: 44px;
        border: 0;
        border-radius: 14px;
        background: #f5f7f7;
        color: #111827;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .fts-header-search-btn.is-hidden {
        visibility: hidden;
        pointer-events: none;
      }

      .fts-header-search-btn svg,
      .fts-header-settings-btn svg {
        width: 21px;
        height: 21px;
        fill: currentColor;
      }

      body:has(#map) .topbar {
        margin-top: 72px;
      }

      body:has(#map) .topbar-inner {
        display: none;
      }

      body:has(#map) .topbar.fts-map-search-open .topbar-inner {
        display: flex;
      }

      body:has(#map) .topbar.fts-map-search-open {
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
      }
    `;

    document.head.appendChild(style);
  }

  function iconSearch() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4a6.5 6.5 0 0 1 5.16 10.45l4.45 4.44-1.42 1.42-4.44-4.45A6.5 6.5 0 1 1 10.5 4zm0 2a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9z"></path></svg>`;
  }

  function iconSettings() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.41 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.22 1.12-.53 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"></path></svg>`;
  }

  function render() {
    if (document.querySelector(".fts-app-header")) return;

    const explore = isExploreView();
    const privacy = isPrivacyView();

    const header = document.createElement("header");
    header.className = "fts-app-header";

    const logoMarkup = logoEnabled() && LOGO_URL
      ? `
        <a class="fts-app-header-link" href="${getRootPath()}" aria-label="${SITE_NAME} home">
          <img class="fts-app-header-logo" src="${LOGO_URL}" alt="${SITE_NAME}">
        </a>
      `
      : `<span></span>`;

    header.innerHTML = `
      <button class="fts-header-search-btn ${privacy ? "is-hidden" : ""}" type="button" aria-label="${explore ? "Search map" : "Search titles"}">${iconSearch()}</button>
      ${logoMarkup}
      <button class="fts-header-settings-btn" type="button" aria-label="Settings">${iconSettings()}</button>
    `;

    document.body.classList.add("fts-has-app-header");
    document.body.prepend(header);

    const searchButton = header.querySelector(".fts-header-search-btn");
    const settingsButton = header.querySelector(".fts-header-settings-btn");

    if (!privacy) {
      if (explore) {
        window.FTS?.AppHeaderMapSearch?.init?.(searchButton);
      } else {
        window.FTS?.AppHeaderTitleSearch?.init?.();
      }

      searchButton?.addEventListener("click", () => {
        window.FTSHeaderSearch?.open();
      });
    }

    settingsButton?.addEventListener("click", () => {
      if (window.FTS?.AppSettings?.open) {
        window.FTS.AppSettings.open();
        return;
      }

      window.FTS?.Privacy?.openSettings?.();
    });
  }

  FTS.AppHeader = {
    getRootPath
  };

  addStyle();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
