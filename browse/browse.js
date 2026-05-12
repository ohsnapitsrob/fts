(function () {
  const gridEl = document.getElementById("browseGrid");
  const searchEl = document.getElementById("browseSearch");
  const countEl = document.getElementById("browseCount");

  function norm(s) {
    return (s || "").toString().trim();
  }

  function normalizeComparable(s) {
    return norm(s).toLowerCase();
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

  function buildTitleUrl(title) {
    const params = new URLSearchParams();
    params.set("fk", "Title");
    params.set("fl", title);

    return `../title/?${params.toString()}`;
  }

  function escapeHtml(s) {
    return (s || "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString();
  }

  function plural(n, one, many) {
    return `${formatNumber(n)} ${n === 1 ? one : many}`;
  }

  function cardHtml(item) {
    return `
      <a class="browse-card" href="${buildTitleUrl(item.title)}">
        <div class="browse-card-top">
          <div class="browse-card-type">${escapeHtml(item.type)}</div>
          <div class="browse-card-count">${plural(item.scenes, "scene", "scenes")}</div>
        </div>

        <h2>${escapeHtml(item.title)}</h2>

        <div class="browse-card-meta">
          <span>${plural(item.cities, "city", "cities")}</span>
          <span>•</span>
          <span>${plural(item.countries, "country", "countries")}</span>
        </div>
      </a>
    `;
  }

  async function loadRows() {
    const cfg = window.APP_CONFIG || {};
    const sheets = cfg.SHEETS || {};

    const sources = [
      ["Film", sheets.movies],
      ["TV", sheets.tv],
      ["Music Video", sheets.music_videos],
      ["Video Game", sheets.games],
      ["Misc", sheets.misc]
    ].filter(([, url]) => !!url);

    const texts = await Promise.all(
      sources.map(([, url]) => fetchSheetCSV(url))
    );

    const rows = [];

    for (let i = 0; i < sources.length; i++) {
      const [fallbackType] = sources[i];

      const parsed = rowsToObjects(parseCSV(texts[i]));

      parsed.forEach((row) => {
        const title = norm(row.title);

        if (!title) return;

        rows.push({
          title,
          type: normalizeType(row.type || fallbackType),
          city: norm(row.city || row.place),
          country: norm(row.country)
        });
      });
    }

    return rows;
  }

  function buildBrowse(rows) {
    const grouped = new Map();

    rows.forEach((row) => {
      const key = normalizeComparable(row.title);

      if (!grouped.has(key)) {
        grouped.set(key, {
          title: row.title,
          type: row.type,
          scenes: 0,
          cities: new Set(),
          countries: new Set()
        });
      }

      const item = grouped.get(key);

      item.scenes++;

      if (row.city) item.cities.add(row.city);
      if (row.country) item.countries.add(row.country);
    });

    return [...grouped.values()]
      .map((item) => ({
        title: item.title,
        type: item.type,
        scenes: item.scenes,
        cities: item.cities.size,
        countries: item.countries.size
      }))
      .sort((a, b) => {
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: "base"
        });
      });
  }

  function render(items) {
    countEl.textContent = plural(items.length, "title", "titles");
    gridEl.innerHTML = items.map(cardHtml).join("");
  }

  async function init() {
    try {
      const rows = await loadRows();
      const allItems = buildBrowse(rows);

      render(allItems);

      searchEl.addEventListener("input", () => {
        const q = normalizeComparable(searchEl.value);

        if (!q) {
          render(allItems);
          return;
        }

        const filtered = allItems.filter((item) => {
          return (
            normalizeComparable(item.title).includes(q) ||
            normalizeComparable(item.type).includes(q)
          );
        });

        render(filtered);
      });
    } catch (err) {
      console.error(err);

      gridEl.innerHTML = `
        <div class="empty-state">
          Could not load titles.
        </div>
      `;
    }
  }

  init();
})();
