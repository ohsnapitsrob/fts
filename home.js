(function () {
  const statsEl = document.getElementById("homeStats");
  const railsEl = document.getElementById("railsRoot");

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
      for (let j = 0; j < header.length; j++) obj[header[j]] = (r[j] ?? "");
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

  function posterHtml(title, poster) {
    const src = safeUrl(poster);

    return `
      <a class="poster-link" href="${titleUrl(title)}" aria-label="${escapeHtml(title)}">
        <div class="poster-card">
          ${
            src
              ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(title)}" loading="lazy" draggable="false">`
              : `<div class="poster-fallback">${escapeHtml(title)}</div>`
          }
        </div>
      </a>
    `;
  }

  function railHtml(title, items) {
    const withPosters = items.filter((item) => safeUrl(item.poster));
    if (!withPosters.length) return "";

    return `
      <section class="rail">
        <h2 class="rail-title">${escapeHtml(title)}</h2>
        <div class="poster-row">
          ${withPosters.map((item) => posterHtml(item.title, item.poster)).join("")}
        </div>
      </section>
    `;
  }

  function makeRailsDraggable() {
    document.querySelectorAll(".poster-row").forEach((rail) => {
      let isPointerDown = false;
      let hasDragged = false;
      let startX = 0;
      let startY = 0;
      let startScrollLeft = 0;
      let activePointerId = null;

      rail.addEventListener("pointerdown", (e) => {
        if (e.button !== undefined && e.button !== 0) return;

        isPointerDown = true;
        hasDragged = false;
        activePointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        startScrollLeft = rail.scrollLeft;

        rail.classList.add("is-dragging");
        rail.dataset.dragging = "false";

        try {
          rail.setPointerCapture(e.pointerId);
        } catch (err) {}
      });

      rail.addEventListener("pointermove", (e) => {
        if (!isPointerDown || e.pointerId !== activePointerId) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) {
          hasDragged = true;
          rail.dataset.dragging = "true";
          e.preventDefault();
          rail.scrollLeft = startScrollLeft - dx;
        }
      });

      function endDrag(e) {
        if (!isPointerDown || e.pointerId !== activePointerId) return;

        isPointerDown = false;
        activePointerId = null;
        rail.classList.remove("is-dragging");

        try {
          rail.releasePointerCapture(e.pointerId);
        } catch (err) {}

        if (hasDragged) {
          rail.dataset.justDragged = "true";
          window.setTimeout(() => {
            delete rail.dataset.justDragged;
            rail.dataset.dragging = "false";
          }, 180);
        } else {
          delete rail.dataset.justDragged;
          rail.dataset.dragging = "false";
        }
      }

      rail.addEventListener("pointerup", endDrag);
      rail.addEventListener("pointercancel", endDrag);
      rail.addEventListener("lostpointercapture", (e) => {
        if (!isPointerDown) return;
        endDrag(e);
      });

      rail.addEventListener(
        "click",
        (e) => {
          if (rail.dataset.justDragged === "true") {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true
      );
    });
  }

  function renderStats({ scenes, titles, cities, countries }) {
    statsEl.innerHTML = `
      <article class="stat-card">
        <div class="stat-value">${formatNumber(scenes)}</div>
        <div class="stat-label">Scenes</div>
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
    const metaByTitle = new Map();

    metadataRows.forEach((meta) => {
      metaByTitle.set(normalizeComparable(meta.title), meta);
    });

    const grouped = new Map();

    rows.forEach((row) => {
      const key = normalizeComparable(row.title);

      if (!grouped.has(key)) {
        const meta = metaByTitle.get(key) || {};
        grouped.set(key, {
          title: row.title,
          type: row.type,
          series: row.series,
          count: 0,
          latestVisitedTs: null,
          poster: meta.poster || "",
          metadata: meta
        });
      }

      const entry = grouped.get(key);
      entry.count += 1;

      if (!entry.poster) {
        const meta = metaByTitle.get(key);
        if (meta && meta.poster) entry.poster = meta.poster;
      }

      if (!entry.series && row.series) entry.series = row.series;

      if (Number.isFinite(row.visitedTs)) {
        if (!Number.isFinite(entry.latestVisitedTs) || row.visitedTs > entry.latestVisitedTs) {
          entry.latestVisitedTs = row.visitedTs;
        }
      }
    });

    return Array.from(grouped.values());
  }

  function buildRails(rows, metadataRows) {
    const entries = buildTitleEntries(rows, metadataRows);
    const hasPoster = (entry) => safeUrl(entry.poster);

    const latestScenes = [...entries]
      .filter(hasPoster)
      .filter((entry) => Number.isFinite(entry.latestVisitedTs))
      .sort((a, b) => b.latestVisitedTs - a.latestVisitedTs)
      .slice(0, 6);

    const topScenes = [...entries]
      .filter(hasPoster)
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
      .slice(0, 10);

    const seriesRail = (seriesName) => {
      return [...entries]
        .filter(hasPoster)
        .filter((entry) => normalizeComparable(entry.series) === normalizeComparable(seriesName))
        .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
        .slice(0, 12);
    };

    const typeRail = (typeName) => {
      return shuffle(
        entries
          .filter(hasPoster)
          .filter((entry) => normalizeType(entry.type) === typeName)
      ).slice(0, 12);
    };

    return [
      ["Latest scenes found", latestScenes],
      ["Top 10 most scenes", topScenes],
      ["James Bond", seriesRail("James Bond")],
      ["Harry Potter", seriesRail("Harry Potter")],
      ["A selection of Movies", typeRail("Film")],
      ["A selection of TV Shows", typeRail("TV")],
      ["Music Videos", typeRail("Music Video")],
      ["A selection of Games", typeRail("Video Game")]
    ];
  }

  function renderRails(rows, metadataRows) {
    const rails = buildRails(rows, metadataRows);
    const html = rails.map(([title, items]) => railHtml(title, items)).filter(Boolean).join("");

    railsEl.innerHTML = html || `<div class="loading-card">No poster rails to show yet.</div>`;
    makeRailsDraggable();
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

  async function loadSceneRows() {
    const cfg = window.APP_CONFIG || {};
    const sheets = cfg.SHEETS || {};

    const sources = [
      ["Film", sheets.movies],
      ["TV", sheets.tv],
      ["Music Video", sheets.music_videos],
      ["Video Game", sheets.games],
      ["Misc", sheets.misc]
    ].filter(([, url]) => !!url);

    const texts = await Promise.all(sources.map(([, url]) => fetchSheetCSV(url)));

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
          series: norm(row.series),
          place: norm(row.place),
          city: norm(row.city || row.town || row.place),
          country: norm(row.country),
          visitedTs: parseVisitedDate(row["date-formatted"] || row["raw-date"] || row["visited"] || row["visit-date"])
        });
      });
    }

    return rows;
  }

  async function init() {
    try {
      const [sceneRows, metadataRows] = await Promise.all([
        loadSceneRows(),
        loadTitleMetadata()
      ]);

      const titles = new Set();
      const cities = new Set();
      const countries = new Set();

      sceneRows.forEach((row) => {
        if (row.title) titles.add(row.title);
        if (row.city) cities.add(row.city);
        if (row.country) countries.add(row.country);
      });

      renderRails(sceneRows, metadataRows);
      renderStats({
        scenes: sceneRows.length,
        titles: titles.size,
        cities: cities.size,
        countries: countries.size
      });
    } catch (err) {
      console.error(err);
      railsEl.innerHTML = `<div class="loading-card">Could not load rails.</div>`;
      statsEl.innerHTML = `<div class="loading-card">Could not load stats.</div>`;
    }
  }

  init();
})();
