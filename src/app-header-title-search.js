window.FTS = window.FTS || {};

FTS.AppHeaderTitleSearch = (function () {
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

  function normalizeComparable(value) {
    return norm(value).toLowerCase();
  }

  function getAccessValue(row) {
    return norm(
      row.access ||
      row.Access ||
      row.ACCESS ||
      row["access "] ||
      row["Access "] ||
      row["No Access"] ||
      row.noaccess ||
      row.NOACCESS
    );
  }

  function hideNoAccessEnabled() {
    if (window.FTS?.AppSettings?.getSettings) {
      return window.FTS.AppSettings.getSettings().hideNoAccessScenes === true;
    }

    try {
      return JSON.parse(localStorage.getItem("fts-app-settings") || "{}").hideNoAccessScenes === true;
    } catch (err) {
      return false;
    }
  }

  function sceneIsVisible(row) {
    if (!hideNoAccessEnabled()) return true;

    const helper = window.FTS?.Visibility;
    if (helper?.shouldHideScene) return !helper.shouldHideScene(row);

    return getAccessValue(row) === "";
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

  function getRootPath() {
    return window.FTS?.AppHeader?.getRootPath?.() || "./";
  }

  function titleUrl(title) {
    const params = new URLSearchParams();
    params.set("fl", title);
    return `${getRootPath()}title/?${params.toString()}`;
  }

  function configuredSources() {
    const config = window.APP_CONFIG || {};
    const sheets = config.SHEETS || {};

    return [
      ["Movie", sheets.movies],
      ["TV Show", sheets.tv],
      ["Music Video", sheets.music_videos],
      ["Video Game", sheets.games],
      ["Title", sheets.misc]
    ].filter(([, url]) => Boolean(url));
  }

  async function loadSceneTitleIndex() {
    const map = new Map();

    await Promise.all(configuredSources().map(async ([fallbackType, url]) => {
      const response = await fetch(url, { cache: "no-store" });
      const rows = rowsToObjects(parseCSV(await response.text()));

      rows.forEach((row) => {
        if (!sceneIsVisible(row)) return;

        const title = norm(row.title);
        if (!title) return;

        const key = normalizeComparable(title);
        if (!map.has(key)) {
          map.set(key, {
            title,
            type: normaliseType(row.type || fallbackType)
          });
        }
      });
    }));

    return map;
  }

  async function loadMetadataTitleIndex(visibleTitleMap) {
    const config = window.APP_CONFIG || {};
    const metadataUrl = config.TITLE_METADATA_CSV;

    if (!metadataUrl) return [];

    const response = await fetch(metadataUrl, { cache: "no-store" });
    const rows = rowsToObjects(parseCSV(await response.text()));

    return rows.map((row) => {
      const title = norm(row.title);
      const key = normalizeComparable(title);
      const sceneTitle = visibleTitleMap.get(key);

      return {
        title,
        type: normaliseType(row.type || sceneTitle?.type)
      };
    }).filter((row) => {
      if (!row.title) return false;
      if (!configuredSources().length) return true;
      return visibleTitleMap.has(normalizeComparable(row.title));
    });
  }

  async function loadTitleIndex() {
    const visibleTitleMap = await loadSceneTitleIndex();

    try {
      const metadataTitles = await loadMetadataTitleIndex(visibleTitleMap);
      if (metadataTitles.length) return metadataTitles;
    } catch (err) {
      console.warn("Could not load title metadata for search", err);
    }

    return Array.from(visibleTitleMap.values());
  }

  function addStyle() {
    if (document.getElementById("fts-title-search-style")) return;

    const style = document.createElement("style");
    style.id = "fts-title-search-style";
    style.textContent = `
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

  function init() {
    if (document.querySelector(".fts-title-search-modal")) return;

    addStyle();

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

    window.addEventListener("fts:app-settings-updated", () => {
      loaded = false;
      index = [];
      if (modal.classList.contains("open")) {
        ensureLoaded().then(() => {
          input.dispatchEvent(new Event("input"));
        });
      }
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

  return {
    init
  };
})();
