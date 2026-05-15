(function () {
  const PRIVACY_STORAGE_KEY = "fts-privacy-settings";
  const statsEl = document.getElementById("homeStats");
  const railsEl = document.getElementById("railsRoot");

  function featureEnabled(key) {
    return window.FTS?.Features?.isEnabled(key) !== false;
  }

  function privacyConsentFeatureEnabled() {
    return window.FTS?.Features?.isEnabled("privacyConsentEnabled") !== false;
  }

  function savedPrivacyChoiceExists() {
    try {
      return Boolean(window.localStorage.getItem(PRIVACY_STORAGE_KEY));
    } catch (err) {
      return false;
    }
  }

  function privacyChoiceRequired() {
    if (!privacyConsentFeatureEnabled()) return false;
    if (window.FTS?.Privacy?.enabled?.() === false) return false;

    return true;
  }

  function privacyChoiceAnswered() {
    if (!privacyChoiceRequired()) return true;
    if (savedPrivacyChoiceExists()) return true;

    return window.FTS?.Privacy?.getSettings?.().hasAnswered === true;
  }

  function waitForPrivacyChoice(callback) {
    if (privacyChoiceAnswered()) {
      callback();
      return;
    }

    railsEl.innerHTML = `
      <div class="loading-card">
        Choose your privacy settings to load the homepage.
      </div>
    `;

    window.addEventListener("fts:privacy-updated", callback, { once: true });
  }

  function norm(s) {
    return (s || "").toString().trim();
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

  function normalizeComparable(s) {
    return norm(s).toLowerCase();
  }

  function hasNoAccess(row) {
    return norm(row.access) !== "";
  }

  function normalizeType(t) {
    const x = norm(t).toLowerCase();

    if (!x) return "Misc";
    if (x === "film" || x === "movie" || x === "movies") return "Film";
    if (x === "tv" || x === "tv show" || x === "tv shows" || x === "series") return "TV";
    if (x === "music video" || x === "music videos" || x === "mv") return "Music Video";
    if (x === "game" || x === "games" || x === "video game" || x === "video games") return "Video Game";
    if (x === "misc" || x === "other") return "Misc";

    return norm(t);
  }

  function coerceNumber(x) {
    const n = Number((x ?? "").toString().trim());
    return Number.isFinite(n) ? n : null;
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }

      if (c === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (c === "," && !inQuotes) {
        row.push(cur);
        cur = "";
        continue;
      }

      if ((c === "\n" || c === "\r") && !inQuotes) {
        if (c === "\r" && next === "\n") i++;

        row.push(cur);
        cur = "";

        if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
          rows.push(row);
        }

        row = [];
        continue;
      }

      cur += c;
    }

    row.push(cur);

    if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
      rows.push(row);
    }

    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows.length) return [];

    const header = rows[0].map((h) => norm(h));
    const out = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];

      if (!r || r.every((cell) => norm(cell) === "")) continue;

      const obj = {};

      for (let j = 0; j < header.length; j++) {
        obj[header[j]] = r[j] ?? "";
      }

      out.push(obj);
    }

    return out;
  }

  async function fetchSheetCSV(url) {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Failed to fetch CSV: ${url}`);
    }

    return res.text();
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString();
  }

  function escapeHtml(s) {
    return (s || "")
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeUrl(url) {
    const value = norm(url);

    if (!value) return "";

    try {
      const parsed = new URL(value);

      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch (err) {}

    return "";
  }

  function titleUrl(title) {
    const params = new URLSearchParams();
    params.set("fl", title);
    return `./title/?${params.toString()}`;
  }

  function parseVisitedDate(value) {
    const raw = norm(value);

    if (!raw) return null;

    const cleaned = raw.replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1");
    const ts = Date.parse(cleaned);

    return Number.isFinite(ts) ? ts : null;
  }

  function shuffle(items) {
    const copy = [...items];

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  }

  function getVisibleRows(rows) {
    return window.FTS?.Visibility?.getVisibleScenes?.(rows) || rows;
  }

  function posterHtml(title, imageUrl, variant = "poster") {
    const src = safeUrl(imageUrl);
    const isThumbnail = variant === "thumbnail";

    return `
      <a class="poster-link ${isThumbnail ? "thumbnail-link" : ""}" href="${titleUrl(title)}" aria-label="${escapeHtml(title)}">
        <div class="poster-card ${isThumbnail ? "thumbnail-card" : ""}">
          ${
            src
              ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" draggable="false">`
              : `<div class="poster-fallback">${escapeHtml(title)}</div>`
          }
        </div>
      </a>
    `;
  }

  function railHtml(title, items, options = {}) {
    const variant = options.variant || "poster";
    const imageField = variant === "thumbnail" ? "thumbnail" : "poster";
    const link = options.link || "";
    const linkLabel = options.linkLabel || "View more";

    const withImages = items.filter((item) => safeUrl(item[imageField]));

    if (!withImages.length) return "";

    return `...`;
  }

  function makeRailsDraggable() {}

  function renderStats({ scenes, titles, cities, countries }) {
    statsEl.innerHTML = `
      <article class="stat-card">
        <div class="stat-value">${formatNumber(scenes)}</div>
        <div class="stat-label">Scenes visited</div>
      </article>

      <article class="stat-card">
        <div class="stat-value">${formatNumber(titles)}</div>
        <div class="stat-label">Titles</div>
      </article>

      <article class="stat-card">
        <div class="stat-value">${formatNumber(cities)}</div>
        <div class="stat-label">Cities</div>
      </article>

      <article class="stat-card">
        <div class="stat-value">${formatNumber(countries)}</div>
        <div class="stat-label">Countries</div>
      </article>
    `;
  }

  function buildTitleEntries(rows, metadataRows) {
    const visibleRows = getVisibleRows(rows);
    const metaByTitle = new Map();

    metadataRows.forEach((meta) => {
      metaByTitle.set(normalizeComparable(meta.title), meta);
    });

    const grouped = new Map();

    visibleRows.forEach((row) => {
      const key = normalizeComparable(row.title);
      const meta = metaByTitle.get(key) || {};

      if (!grouped.has(key)) {
        grouped.set(key, {
          title: row.title,
          type: row.type || meta.type,
          series: row.series,
          count: 0,
          accessibleCount: 0,
          latestVisitedTs: null,
          latestAccessibleVisitedTs: null,
          railOrder: Number.isFinite(meta.railOrder) ? meta.railOrder : row.railOrder,
          poster: meta.poster || "",
          thumbnail: meta.thumbnail || row.thumbnail || "",
          nt: norm(meta.nt)
        });
      }

      const entry = grouped.get(key);
      entry.count += 1;
      entry.accessibleCount += 1;

      if (!entry.series && row.series) {
        entry.series = row.series;
      }

      if (Number.isFinite(row.visitedTs) && (!Number.isFinite(entry.latestVisitedTs) || row.visitedTs > entry.latestVisitedTs)) {
        entry.latestVisitedTs = row.visitedTs;
      }

      if (Number.isFinite(row.visitedTs) && (!Number.isFinite(entry.latestAccessibleVisitedTs) || row.visitedTs > entry.latestAccessibleVisitedTs)) {
        entry.latestAccessibleVisitedTs = row.visitedTs;
      }
    });

    return Array.from(grouped.values());
  }

  async function init() {
    try {
      const [sceneRows] = await Promise.all([
        loadSceneRows(),
        loadTitleMetadata()
      ]);

      const visibleRows = getVisibleRows(sceneRows);

      const titles = new Set();
      const cities = new Set();
      const countries = new Set();

      visibleRows.forEach((row) => {
        if (row.title) titles.add(row.title);
        if (row.city) cities.add(row.city);
        if (row.country) countries.add(row.country);
      });

      renderStats({
        scenes: visibleRows.length,
        titles: titles.size,
        cities: cities.size,
        countries: countries.size
      });
    } catch (err) {
      console.error(err);
    }
  }

  waitForPrivacyChoice(init);
})();