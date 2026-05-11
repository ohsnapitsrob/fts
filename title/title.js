(function () {
  const contentEl = document.getElementById("titleContent");
  const NT_ICON_URL = "https://images.pixieset.com/063553411/d68e9f40e4986e97d60a432895e1fabd-xxlarge.png";

  function norm(s) {
    return (s || "").toString().trim();
  }

  function normalizeComparable(s) {
    return norm(s).toLowerCase();
  }

  function splitPipe(s) {
    const t = norm(s);
    if (!t) return [];
    return t.split("|").map(x => norm(x)).filter(Boolean);
  }

  function splitComma(s) {
    const t = norm(s);
    if (!t) return [];
    return t.split(",").map(x => norm(x)).filter(Boolean);
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

  function normalizeRating(value) {
    const v = norm(value).toLowerCase();

    const aliases = {
      red: "red",
      bad: "red",
      orange: "orange",
      average: "orange",
      green: "green",
      good: "green",
      blue: "blue",
      inspo: "blue",
      inspiration: "blue",
      "inspiration location": "blue"
    };

    return aliases[v] || "";
  }

  function ratingDotsHtml(row) {
    const ratings = (row.rating || [])
      .map(normalizeRating)
      .filter(Boolean)
      .filter((rating, index, arr) => arr.indexOf(rating) === index);

    if (!ratings.length) return "";

    return ratings.map((rating) => {
      return `<span class="scene-status-dot scene-status-${rating}" aria-hidden="true"></span>`;
    }).join("");
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

  function labelForCount(n, one, many) {
    return n === 1 ? one : many;
  }

  function escapeHtml(s) {
    return (s || "").toString()
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
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
    } catch (err) {
      return "";
    }

    return "";
  }

  function getYouTubeEmbedUrl(value) {
    const raw = norm(value);
    if (!raw) return "";

    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
      return `https://www.youtube.com/embed/${raw}`;
    }

    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "");

      if (host === "youtube.com" || host === "m.youtube.com") {
        const id = url.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }

      if (host === "youtu.be") {
        const id = url.pathname.split("/").filter(Boolean)[0];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }

      if (host === "youtube.com" && url.pathname.startsWith("/embed/")) {
        return raw;
      }
    } catch (err) {
      return "";
    }

    return "";
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

  function buildSceneMapUrl(row) {
    const params = new URLSearchParams();
    params.set("fk", "Title");
    params.set("fl", row.title);

    if (row.id) params.set("loc", row.id);

    if (Number.isFinite(row.lat) && Number.isFinite(row.lng)) {
      params.set("mlat", row.lat.toFixed(5));
      params.set("mlng", row.lng.toFixed(5));
      params.set("mz", "16");
    }

    return `../explore/?${params.toString()}`;
  }

  function parseVisitedDate(value) {
    const raw = norm(value);
    if (!raw) return null;

    const cleaned = raw.replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1");
    const ts = Date.parse(cleaned);
    return Number.isFinite(ts) ? ts : null;
  }

  function sceneImage(row) {
    return Array.isArray(row.images) && row.images.length ? row.images[0] : "";
  }

  function sceneLocation(row) {
    return [row.place, row.country]
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .join(", ");
  }

  function sceneDate(row) {
    return row.monthShort || row.dateFormatted || row.rawDate || "";
  }

  function ntBadgeHtml(row) {
    if (!norm(row.NationalTrust)) return "";

    return `
      <img
        class="scene-nt-badge"
        src="${NT_ICON_URL}"
        alt="National Trust"
        loading="lazy"
      >
    `;
  }

  function ntButtonHtml(row) {
    const url = safeUrl(row.NTURL);
    if (!url) return "";

    return `
      <a
        class="btn scene-nt-btn"
        href="${escapeHtml(url)}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View National Trust page"
      >
        <img src="${NT_ICON_URL}" alt="">
      </a>
    `;
  }

  function sceneCardHtml(row) {
    const img = sceneImage(row);
    const location = sceneLocation(row);
    const date = sceneDate(row);

    return `
      <article class="scene-card">
        <div class="scene-thumb">
          ${ratingDotsHtml(row)}
          ${ntBadgeHtml(row)}
          ${
            img
              ? `<img src="${escapeHtml(img)}" alt="" loading="lazy">`
              : `<div class="scene-thumb-fallback">No image</div>`
          }
        </div>

        <div class="scene-body">
          <h3 class="scene-title">${escapeHtml(row.title)}</h3>

          ${
            row.description
              ? `<p class="scene-desc">${escapeHtml(row.description)}</p>`
              : `<p class="scene-desc">No description yet.</p>`
          }

          <div class="scene-meta">
            ${
              location
                ? `<div class="scene-meta-row"><span class="scene-meta-icon">⌖</span><span>${escapeHtml(location)}</span></div>`
                : ""
            }

            ${
              date
                ? `<div class="scene-meta-row"><span class="scene-meta-icon">◷</span><span>${escapeHtml(date)}</span></div>`
                : ""
            }
          </div>

          <div class="scene-actions">
            <a class="btn btn-primary scene-view-btn" href="${buildSceneMapUrl(row)}">View</a>
            ${ntButtonHtml(row)}
          </div>
        </div>
      </article>
    `;
  }

  function sortScenesNewestFirst(rows) {
    return [...rows].sort((a, b) => {
      const aHas = Number.isFinite(a.visitedTs);
      const bHas = Number.isFinite(b.visitedTs);

      if (aHas && bHas && b.visitedTs !== a.visitedTs) {
        return b.visitedTs - a.visitedTs;
      }

      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;

      const aLocation = sceneLocation(a);
      const bLocation = sceneLocation(b);
      return aLocation.localeCompare(bLocation, undefined, { sensitivity: "base" });
    });
  }

  function metadataHasContent(meta) {
    if (!meta) return false;
    return Boolean(
      norm(meta.description) ||
      norm(meta.imdb) ||
      norm(meta.justwatch) ||
      norm(meta.poster) ||
      norm(meta.trailer)
    );
  }

  function titleSummaryHtml(meta) {
    if (!metadataHasContent(meta)) return "";

    const poster = safeUrl(meta.poster);
    const imdb = safeUrl(meta.imdb);
    const justwatch = safeUrl(meta.justwatch);
    const trailer = getYouTubeEmbedUrl(meta.trailer);

    const hasTopRow = poster || norm(meta.description) || imdb || justwatch;

    return `
      <section class="title-summary">
        ${
          hasTopRow
            ? `
              <div class="title-summary-top">
                ${
                  poster
                    ? `<div class="title-poster"><img src="${escapeHtml(poster)}" alt="" loading="lazy"></div>`
                    : `<div class="title-poster title-poster-empty" aria-hidden="true"></div>`
                }

                <div class="title-summary-body">
                  ${meta.description ? `<p class="title-description">${escapeHtml(meta.description)}</p>` : ""}

                  ${
                    imdb || justwatch
                      ? `
                        <div class="title-links">
                          ${imdb ? `<a class="btn btn-secondary" href="${escapeHtml(imdb)}" target="_blank" rel="noopener noreferrer">IMDb</a>` : ""}
                          ${justwatch ? `<a class="btn btn-secondary" href="${escapeHtml(justwatch)}" target="_blank" rel="noopener noreferrer">JustWatch</a>` : ""}
                        </div>
                      `
                      : ""
                  }
                </div>
              </div>
            `
            : ""
        }

        ${
          trailer
            ? `
              <div class="title-trailer-wrap">
                <iframe class="title-trailer" src="${escapeHtml(trailer)}" title="Trailer" allowfullscreen loading="lazy"></iframe>
              </div>
            `
            : ""
        }
      </section>
    `;
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

  function renderTitlePage(title, rows, metadata) {
    const sortedRows = sortScenesNewestFirst(rows);
    const scenes = sortedRows.length;

    const cities = new Set();
    const countries = new Set();
    const types = new Set();

    sortedRows.forEach((row) => {
      if (row.city) cities.add(row.city);
      if (row.country) countries.add(row.country);
      if (row.type) types.add(row.type);
    });

    const cityCount = cities.size;
    const countryCount = countries.size;
    const typeLabel = metadata?.type || Array.from(types).map(displayType).join(", ");

    document.title = `${title} | Find That Scene`;

    contentEl.innerHTML = `
      <section>
        <div class="kicker">${escapeHtml(typeLabel || "Title")}</div>
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">
          ${plural(scenes, "scene", "scenes")} found across
          ${plural(cityCount, "city", "cities")} and
          ${plural(countryCount, "country", "countries")}.
        </p>
      </section>

      ${titleSummaryHtml(metadata)}

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-value">${formatNumber(scenes)}</div>
          <div class="stat-label">${labelForCount(scenes, "Scene", "Scenes")}</div>
        </article>

        <article class="stat-card">
          <div class="stat-value">${formatNumber(cityCount)}</div>
          <div class="stat-label">${labelForCount(cityCount, "City", "Cities")}</div>
        </article>

        <article class="stat-card">
          <div class="stat-value">${formatNumber(countryCount)}</div>
          <div class="stat-label">${labelForCount(countryCount, "Country", "Countries")}</div>
        </article>
      </section>

      <div class="actions">
        <a class="btn btn-primary" href="${buildMapUrl(title)}">See scenes on the map</a>
        <a class="btn btn-secondary" href="../browse/">Browse all titles</a>
      </div>

      <section class="scene-section">
        <div class="scene-section-head">
          <h2 class="scene-section-title">${labelForCount(scenes, "Scene", "Scenes")}</h2>
          <p class="scene-section-copy">Newest visited first. Jump straight into a specific scene on the map.</p>
        </div>

        <div class="scene-grid">
          ${sortedRows.map(sceneCardHtml).join("")}
        </div>
      </section>
    `;
  }

  async function loadTitleMetadata() {
    const cfg = window.APP_CONFIG || {};
    const url = cfg.TITLE_METADATA_CSV || cfg.TITLE_METADATA || cfg.TITLES_METADATA_CSV;

    if (!url) return [];

    try {
      const text = await fetchSheetCSV(url);
      return rowsToObjects(parseCSV(text)).map((row) => ({
        title: norm(row.title),
        type: norm(row.type),
        description: norm(row.description),
        imdb: norm(row.imdb),
        justwatch: norm(row.justwatch),
        poster: norm(row.poster),
        trailer: norm(row.trailer)
      })).filter((row) => row.title);
    } catch (err) {
      console.warn("Could not load title metadata CSV", err);
      return [];
    }
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
          id: norm(row.id),
          title,
          type,
          place: norm(row.place),
          city: norm(row.city || row.town || row.place),
          country: norm(row.country),
          description: norm(row.description),
          images: splitPipe(row.images),
          rating: splitComma(row.rating),
          NationalTrust: norm(row.NationalTrust),
          NTURL: norm(row.NTURL),
          rawDate: norm(row["raw-date"]),
          dateFormatted: norm(row["date-formatted"]),
          monthShort: norm(row["month-short"]),
          visitedTs: parseVisitedDate(row["date-formatted"] || row["raw-date"] || row["visited"] || row["visit-date"]),
          lat,
          lng
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
      const [allRows, metadataRows] = await Promise.all([
        loadAllRows(),
        loadTitleMetadata()
      ]);

      const matches = allRows.filter((row) => {
        return normalizeComparable(row.title) === normalizeComparable(requestedTitle);
      });

      if (!matches.length) {
        renderNotFound(requestedTitle);
        return;
      }

      const metadata = metadataRows.find((row) => {
        return normalizeComparable(row.title) === normalizeComparable(matches[0].title);
      });

      renderTitlePage(matches[0].title, matches, metadata);
    } catch (err) {
      console.error(err);
      contentEl.innerHTML = `<div class="loading-card">Could not load this title.</div>`;
    }
  }

  init();
})();
