(function () {
  const statsRoot = document.getElementById("statsGrid");

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

  function hasNoAccess(row) {
    return !!norm(row.access);
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

  function statCard(label, value) {
    return `
      <article class="stat-card">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
      </article>
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
        rows.push({
          title: norm(row.title),
          type: normalizeType(row.type || fallbackType),
          city: norm(row.city || row.place),
          country: norm(row.country),
          access: getAccessValue(row)
        });
      });
    }

    return rows;
  }

  function buildStats(rows) {
    const accessibleRows = rows.filter((r) => !hasNoAccess(r));
    const noAccessRows = rows.filter((r) => hasNoAccess(r));

    const titles = new Set();
    const cities = new Set();
    const countries = new Set();

    accessibleRows.forEach((row) => {
      if (row.title) titles.add(row.title);
      if (row.city) cities.add(row.city);
      if (row.country) countries.add(row.country);
    });

    return [
      statCard("Scenes visited", formatNumber(accessibleRows.length)),
      statCard("Scenes with no access", formatNumber(noAccessRows.length)),
      statCard("Titles", formatNumber(titles.size)),
      statCard("Cities", formatNumber(cities.size)),
      statCard("Countries", formatNumber(countries.size))
    ];
  }

  async function init() {
    try {
      const rows = await loadRows();
      const stats = buildStats(rows);

      statsRoot.innerHTML = stats.join("");
    } catch (err) {
      console.error(err);

      statsRoot.innerHTML = `
        <div class="loading-card">
          Could not load stats.
        </div>
      `;
    }
  }

  init();
})();
