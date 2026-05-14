(function () {
  const LOGO_URL = "https://images.pixieset.com/063553411/cfaf06b0cd6b6cf0468956939122a80b-xxlarge.PNG";

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
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 3200;
        flex: 0 0 auto;
      }

      .fts-app-header-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent;
      }

      .fts-app-header-logo {
        display: block;
        max-height: 48px;
        width: auto;
        object-fit: contain;
      }
    `;

    document.head.appendChild(style);
  }

  function render() {
    if (document.querySelector(".fts-app-header")) return;

    const header = document.createElement("header");
    header.className = "fts-app-header";
    header.innerHTML = `
      <a class="fts-app-header-link" href="${getRootPath()}" aria-label="Find That Scene home">
        <img class="fts-app-header-logo" src="${LOGO_URL}" alt="Find That Scene">
      </a>
    `;

    document.body.prepend(header);
  }

  addStyle();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
