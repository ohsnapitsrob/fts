(function () {
  const statsEl = document.getElementById("homeStats");

  function norm(s) {
    return (s || "").toString().trim();
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

  function render({ scenes, titles, cities, countries }) {
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${formatNumber(scenes)}</div>
        <div class="stat-label">Scenes</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatNumber(titles)}</div>
        <div class="stat-label">Titles</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatNumber(cities)}</div>
        <div class="stat-label">Cities</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatNumber(countries)}</div>
        <div class="stat-label">Countries</div>
      </div>
    `;
  }

  async function loadStats() {
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

    const titles = new Set();
    const cities = new Set();
    const countries = new Set();
    let scenes = 0;

    for (let i = 0; i < sources.length; i++) {
      const [fallbackType] = sources[i];
      const rows = rowsToObjects(parseCSV(texts[i]));

      rows.forEach((row) => {
        const title = norm(row.title);
        const type = normalizeType(row.type || fallbackType);
        const lat = coerceNumber(row.lat);
        const lng = coerceNumber(row.lng);

        if (!title || typeof lat !== "number" || typeof lng !== "number") return;

        scenes += 1;
        titles.add(title);

        const city = norm(row.city || row.town || row.place);
        if (city) cities.add(city);

        const country = norm(row.country);
        if (country) countries.add(country);

        // keep type normalized for future home-page stat expansion
        void type;
      });
    }

    render({
      scenes,
      titles: titles.size,
      cities: cities.size,
      countries: countries.size
    });
  }

  loadStats().catch((err) => {
    console.error(err);
    statsEl.innerHTML = `<div class="loading">Could not load stats.</div>`;
  });
})();
