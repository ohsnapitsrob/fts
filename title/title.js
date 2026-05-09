(function () {
  const contentEl = document.getElementById("titleContent");

  function norm(s) {
    return (s || "").toString().trim();
  }

  function normalizeComparable(s) {
    return norm(s).toLowerCase();
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

  function displayType(type) {
    if (type === "Film") return "Movie";
    if (type === "TV") return "TV Show";
    return type;
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
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
        row = [];
        continue;
      }

      cur += c;
    }

    row.push(cur);
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows.length) return [];
    const header = rows[0].map(h => norm(h));
    const out = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(cell => norm(cell) === "")) continue;

      const obj = {};
      for (let j = 0; j < header.length; j++) {
        obj[header[j]] = (r[j] ?? "");
      }
      out.push(obj);
    }

    return out;
  }

  async function fetchSheetCSV(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${url}`);
    return res.text();
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString();
  }

  function plural(n, one, many) {
    return `${formatNumber(n)} ${n === 1 ? one : many}`;
  }

  function escapeHtml(s) {
    return (s || "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getRequestedTitle() {
    const params = new URLSearchParams(window.location.search);
    return norm(params.get("fl") || params.get("title") || params.get("q"));
  }

  function buildMapUrl(title) {
    const params = new URLSearchParams();
    params.set("fk", "Title");
    params.set("fl", title);
    return `../explore/?${params.toString()}`;
  }

  function renderNotFound(requestedTitle) {
    document.title = `Title not found | Find That Scene`;

    contentEl.innerHTML = `
      <div class="empty-card">
        <div class="kicker">Title not found</div>
        <h1>No match found</h1>
        <p class="meta">
          Could not find a title matching “${escapeHtml(requestedTitle || "unknown")}”.
        </p>
      </div>

      <div class="actions">
        <a class="btn btn-primary" href="../browse/">Browse titles</a>
        <a class="btn btn-secondary" href="../explore/">Open map</a>
      </div>
    `;
  }

  function renderTitlePage(title, rows) {
    const scenes = rows.length;

    const cities = new Set();
    const countries = new Set();
    const types = new Set();

    rows.forEach((row) => {
      if (row.city) cities.add(row.city);
      if (row.country) countries.add(row.country);
      if (row.type) types.add(row.type);
    });

    const typeLabel = Array.from(types).map(displayType).join(", ");

    document.title = `${title} | Find That Scene`;

    contentEl.innerHTML = `
      <section>
        <div class="kicker">${escapeHtml(typeLabel || "Title")}</div>
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">
          ${plural(scenes, "scene", "scenes")} found across
          ${plural(cities.size, "city", "cities")} and
          ${plural(countries.size, "country", "countries")}.
        </p>
      </section>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-value">${formatNumber(scenes)}</div>
          <div class="stat-label">Scenes</div>
        </article>

        <article class="stat-card">
          <div class="stat-value">${formatNumber(cities.size)}</div>
          <div class="stat-label">Cities</div>
        </article>

        <article class="stat-card">
          <div class="stat-value">${formatNumber(countries.size)}</div>
          <div class="stat-label">Countries</div>
        </article>
      </section>

      <div class="actions">
        <a class="btn btn-primary" href="${buildMapUrl(title)}">See scenes on the map</a>
        <a class="btn btn-secondary" href="../browse/">Browse all titles</a>
      </div>
    `;
  }

  async function loadAllRows() {
    const cfg = window.APP_CONFIG || {};
    const sheets = cfg.SHEETS || {};

    const sources = [
      ["Film", sheets.movies],
      ["TV", sheets.tv],
      ["Music Video", sheets.music_videos],
      ["Video Game", sheets.games],
      ["Misc", sheets.misc]
    ].filter(([, url]) => !!url);

    if (!sources.length) {
      throw new Error("No sheet URLs configured.");
    }

    const texts = await Promise.all(
      sources.map(([, url]) => fetchSheetCSV(url))
    );

    const rows = [];

    for (let i = 0; i < sources.length; i++) {
      const [fallbackType] = sources[i];
      const parsed = rowsToObjects(parseCSV(texts[i]));

      parsed.forEach((row) => {
        const title = norm(row.title);
        const type = normalizeType(row.type || fallbackType);
        const lat = coerceNumber(row.lat);
        const lng = coerceNumber(row.lng);

        if (!title || typeof lat !== "number" || typeof lng !== "number") return;

        rows.push({
          title,
          type,
          place: norm(row.place),
          city: norm(row.city || row.town || row.place),
          country: norm(row.country)
        });
      });
    }

    return rows;
  }

  async function init() {
    const requestedTitle = getRequestedTitle();

    if (!requestedTitle) {
      renderNotFound("");
      return;
    }

    try {
      const allRows = await loadAllRows();
      const matches = allRows.filter((row) => {
        return normalizeComparable(row.title) === normalizeComparable(requestedTitle);
      });

      if (!matches.length) {
        renderNotFound(requestedTitle);
        return;
      }

      renderTitlePage(matches[0].title, matches);
    } catch (err) {
      console.error(err);
      contentEl.innerHTML = `<div class="loading-card">Could not load this title.</div>`;
    }
  }

  init();
})();
