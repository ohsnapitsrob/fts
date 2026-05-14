(function () {
  const LOGO_URL = "https://images.pixieset.com/063553411/cfaf06b0cd6b6cf0468956939122a80b-xxlarge.PNG";

  window.FTS = window.FTS || {};

  function getRootPath() {
    if (document.body.dataset.navRoot) return document.body.dataset.navRoot;

    const path = window.location.pathname.replace(/\/+$/, "");

    if (
      path.endsWith("/browse") ||
      path.endsWith("/explore") ||
      path.endsWith("/title") ||
      path.endsWith("/stats") ||
      path.endsWith("/national-trust")
    ) {
      return "../";
    }

    return "./";
  }

  function isExploreView() {
    return window.location.pathname.replace(/\/+$/, "").endsWith("/explore");
  }

  function logoEnabled() {
    return window.FTS?.Features?.isEnabled("headerLogoEnabled") !== false;
  }

  function addStyle() {
    if (document.getElementById("fts-app-header-style")) return;

    const style = document.createElement("style");
    style.id = "fts-app-header-style";
    style.textContent = `
      .fts-app-header {
        width: 100%;
        max-height: 72px;
        padding: 12px 16px;
        background: #ffffff;
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr) 48px;
        align-items: center;
        position: relative;
        z-index: 3200;
        flex: 0 0 auto;
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

      .fts-header-search-btn {
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

      .fts-header-search-btn svg {
        width: 21px;
        height: 21px;
        fill: currentColor;
      }

      .fts-header-spacer {
        width: 44px;
        height: 44px;
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

  function render() {
    if (document.querySelector(".fts-app-header")) return;

    const explore = isExploreView();
    const header = document.createElement("header");
    header.className = "fts-app-header";

    const logoMarkup = logoEnabled()
      ? `
        <a class="fts-app-header-link" href="${getRootPath()}" aria-label="Find That Scene home">
          <img class="fts-app-header-logo" src="${LOGO_URL}" alt="Find That Scene">
        </a>
      `
      : `<span></span>`;

    header.innerHTML = `
      <button class="fts-header-search-btn" type="button" aria-label="${explore ? "Search map" : "Search titles"}">${iconSearch()}</button>
      ${logoMarkup}
      <span class="fts-header-spacer" aria-hidden="true"></span>
    `;

    document.body.prepend(header);

    const searchButton = header.querySelector(".fts-header-search-btn");

    if (explore) {
      window.FTS?.AppHeaderMapSearch?.init?.(searchButton);
    } else {
      window.FTS?.AppHeaderTitleSearch?.init?.();
    }

    searchButton?.addEventListener("click", () => {
      window.FTSHeaderSearch?.open();
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
