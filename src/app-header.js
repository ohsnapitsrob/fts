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

  function isExploreView() {
    return window.location.pathname.replace(/\/+$/, "").endsWith("/explore");
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

      .fts-header-search-btn svg {
        width: 21px;
        height: 21px;
        fill: currentColor;
      }

      .fts-header-spacer {
        width: 44px;
        height: 44px;
      }

      .fts-title-search-modal {
        position: fixed;
        inset: 0;
        z-index: 99000;
        display: none;
        background: rgba(17, 24, 39, 0.42);
        padding: 84px 16px 16px;
      }

      .fts-title-search-modal.open {
        display: block;
      }

      .fts-title-search-panel {
        width: min(680px, 100%);
        margin: 0 auto;
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
        overflow: hidden;
      }

      .fts-title-search-head {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
      }

      .fts-title-search-input {
        flex: 1;
        min-width: 0;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        padding: 12px 14px;
        font-size: 16px;
      }

      .fts-title-search-close {
        width: 42px;
        height: 42px;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        background: #ffffff;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
      }

      .fts-title-search-results {
        max-height: min(62vh, 520px);
        overflow: auto;
        padding: 8px;
      }

      .fts-title-search-result {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        border-radius: 16px;
        color: inherit;
        text-decoration: none;
      }

      .fts-title-search-result:hover,
      .fts-title-search-result:focus-visible {
        background: #f5f7f7;
      }

      .fts-title-search-result-title {
        font-weight: 800;
      }

      .fts-title-search-result-meta {
        margin-top: 3px;
        color: #6b7280;
        font-size: 12px;
      }

      .fts-title-search-empty {
        padding: 22px 14px;
        color: #6b7280;
        font-size: 14px;
      }
    `;

    document.head.appendChild(style);
  }

  function iconSearch() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4a6.5 6.5 0 0 1 5.16 10.45l4.45 4.44-1.42 1.42-4.44-4.45A6.5 6.5 0 1 1 10.5 4zm0 2a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9z"></path></svg>`;
  }

  function escapeHtml(value) {
    return (value || "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function norm(value) {
    return (value || "").toString().trim();
  }

  function normaliseType(value) {
    const type = norm(value).toLowerCase();
    if (type === "film" || type === "movie" || type === "movies") return "Movie";
    if (type === "tv" || type === "tv show" || type === "tv shows" || type === "series") return "TV Show";
    if (type === "music video" || type === "music videos" || type === "mv") return "Music Video";
    if (type === "game" || type === "games" || type === "video game" || type === "video games") return "Video Game";
    return norm(value) || "Title";
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const character = text[i];
      const next = text[i + 1];

      if (character === '"' && inQuotes && next === '"') {
        current += '"';
        i++;
        continue;
      }

      if (character === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (character === "," && !inQuotes) {
        row.push(current);
        current = "";
        continue;
      }

      if ((character === "\n" || character === "\r") && !inQuotes) {
        if (character === "\r" && next === "\n") i++;
        row.push(current);
        current = "";
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
        row = [];
        continue;
      }

      current += character;
    }

    row.push(current);
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows.length) return [];
    const header = rows[0].map(norm);

    return rows.slice(1).filter((row) => row.some((cell) => norm(cell))).map((row) => {
      const object = {};
      header.forEach((key, index) => {
        object[key] = row[index] || "";
      });
      return object;
    });
  }

  async function loadTitleIndex() {
    const config = window.APP_CONFIG || {};
    const metadataUrl = config.TITLE_METADATA_CSV;

    if (metadataUrl) {
      try {
        const response = await fetch(metadataUrl, { cache: "no-store" });
        const rows = rowsToObjects(parseCSV(await response.text()));
        const titles = rows.map((row) => ({
          title: norm(row.title),
          type: normaliseType(row.type)
        })).filter((row) => row.title);

        if (titles.length) return titles;
      } catch (err) {
        console.warn("Could not load title metadata for search", err);
      }
    }

    const sheets = config.SHEETS || {};
    const sources = [
      ["Movie", sheets.movies],
      ["TV Show", sheets.tv],
      ["Music Video", sheets.music_videos],
      ["Video Game", sheets.games],
      ["Title", sheets.misc]
    ].filter(([, url]) => Boolean(url));

    const map = new Map();

    await Promise.all(sources.map(async ([fallbackType, url]) => {
      const response = await fetch(url, { cache: "no-store" });
      const rows = rowsToObjects(parseCSV(await response.text()));

      rows.forEach((row) => {
        const title = norm(row.title);
        if (!title) return;
        const key = title.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            title,
            type: normaliseType(row.type || fallbackType)
          });
        }
      });
    }));

    return Array.from(map.values());
  }

  function titleUrl(title) {
    const params = new URLSearchParams();
    params.set("fl", title);
    return `${getRootPath()}title/?${params.toString()}`;
  }

  function renderResults(results, query) {
    const resultsEl = document.querySelector(".fts-title-search-results");
    if (!resultsEl) return;

    if (!query) {
      resultsEl.innerHTML = `<div class="fts-title-search-empty">Start typing to search titles.</div>`;
      return;
    }

    if (!results.length) {
      resultsEl.innerHTML = `<div class="fts-title-search-empty">No matching titles.</div>`;
      return;
    }

    resultsEl.innerHTML = results.slice(0, 30).map((item) => `
      <a class="fts-title-search-result" href="${titleUrl(item.title)}">
        <span>
          <span class="fts-title-search-result-title">${escapeHtml(item.title)}</span>
          <span class="fts-title-search-result-meta">${escapeHtml(item.type)}</span>
        </span>
        <span aria-hidden="true">›</span>
      </a>
    `).join("");
  }

  function createSearchModal() {
    if (document.querySelector(".fts-title-search-modal")) return;

    const modal = document.createElement("div");
    modal.className = "fts-title-search-modal";
    modal.innerHTML = `
      <div class="fts-title-search-panel" role="dialog" aria-modal="true" aria-label="Search titles">
        <div class="fts-title-search-head">
          <input class="fts-title-search-input" type="search" placeholder="Search titles…" autocomplete="off">
          <button class="fts-title-search-close" type="button" aria-label="Close title search">×</button>
        </div>
        <div class="fts-title-search-results"></div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector(".fts-title-search-input");
    const close = modal.querySelector(".fts-title-search-close");
    let index = [];
    let loaded = false;

    async function ensureLoaded() {
      if (loaded) return;
      loaded = true;
      index = await loadTitleIndex();
    }

    function closeModal() {
      modal.classList.remove("open");
      input.value = "";
      renderResults([], "");
    }

    input.addEventListener("input", () => {
      const query = norm(input.value).toLowerCase();
      const results = index.filter((item) => {
        return item.title.toLowerCase().includes(query) || item.type.toLowerCase().includes(query);
      }).sort((a, b) => a.title.localeCompare(b.title));

      renderResults(results, query);
    });

    close.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    window.FTSHeaderSearch = {
      async open() {
        modal.classList.add("open");
        renderResults([], "");
        await ensureLoaded();
        input.focus();
      }
    };
  }

  function render() {
    if (document.querySelector(".fts-app-header")) return;

    const showSearch = !isExploreView();
    const header = document.createElement("header");
    header.className = "fts-app-header";
    header.innerHTML = `
      ${
        showSearch
          ? `<button class="fts-header-search-btn" type="button" aria-label="Search titles">${iconSearch()}</button>`
          : `<span class="fts-header-spacer" aria-hidden="true"></span>`
      }
      <a class="fts-app-header-link" href="${getRootPath()}" aria-label="Find That Scene home">
        <img class="fts-app-header-logo" src="${LOGO_URL}" alt="Find That Scene">
      </a>
      <span class="fts-header-spacer" aria-hidden="true"></span>
    `;

    document.body.prepend(header);

    if (showSearch) {
      createSearchModal();
      header.querySelector(".fts-header-search-btn")?.addEventListener("click", () => {
        window.FTSHeaderSearch?.open();
      });
    }
  }

  addStyle();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
