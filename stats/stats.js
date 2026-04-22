(function () {
  const loadingEl = document.getElementById("statsLoading");
  const gridEl = document.getElementById("statsGrid");

  function norm(s) {
    return (s || "").toString().trim();
  }

  function splitPipe(s) {
    const t = norm(s);
    if (!t) return [];
    return t.split("|").map(x => norm(x)).filter(Boolean);
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
    if (type === "Film") return "Movies";
    if (type === "TV") return "TV";
    if (type === "Music Video") return "Music Videos";
    if (type === "Video Game") return "Video Games";
    return "Misc";
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

  function parseVisitedDate(value) {
    const raw = norm(value);
    if (!raw) return null;

    const cleaned = raw.replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1");
    const ts = Date.parse(cleaned);
    if (!Number.isFinite(ts)) return null;

    const d = new Date(ts);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString();
  }

  function formatDate(d) {
    if (!(d instanceof Date)) return "—";
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function formatMonthKey(key) {
    const [year, month] = key.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });
  }

  function monthKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function yearKey(d) {
    return String(d.getFullYear());
  }

  function postProcessRow(row, fallbackType) {
    const title = norm(row.title);
    const type = normalizeType(row.type || fallbackType);
    const lat = coerceNumber(row.lat);
    const lng = coerceNumber(row.lng);

    if (!title || typeof lat !== "number" || typeof lng !== "number") return null;

    const visited = parseVisitedDate(row["date-formatted"] || row["raw-date"] || row["visited"] || row["visit-date"]);

    return {
      id: norm(row.id),
      title,
      type,
      place: norm(row.place),
      country: norm(row.country),
      collections: splitPipe(row.collections),
      visited
    };
  }

  function titleTypeKey(title, type) {
    return `${title}|||${type}`;
  }

  function card(kicker, value, sub = "", extraClass = "") {
    const div = document.createElement("div");
    div.className = `stat-card ${extraClass}`.trim();
    div.innerHTML = `
      <div class="stat-kicker">${kicker}</div>
      <div class="stat-value">${value}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ""}
    `;
    return div;
  }

  function listCard(title, rows, extraClass = "") {
    const div = document.createElement("div");
    div.className = `stat-card ${extraClass}`.trim();

    const rowsHtml = rows.map((row) => `
      <div class="stat-list-row">
        <div class="stat-list-label">${row.label}</div>
        <div class="stat-list-value">${row.value}</div>
      </div>
    `).join("");

    div.innerHTML = `
      <div class="stat-kicker">${title}</div>
      <div class="stat-list">${rowsHtml}</div>
    `;
    return div;
  }

  async function loadAll() {
    const cfg = window.APP_CONFIG || {};
    const sheets = cfg.SHEETS || {};

    const sources = [
      ["Film", sheets.movies],
      ["TV", sheets.tv],
      ["Music Video", sheets.music_videos],
      ["Video Game", sheets.games],
      ["Misc", sheets.misc]
    ].filter(([, url]) => !!url);

    if (!sources.length) throw new Error("No sheet URLs configured.");

    const texts = await Promise.all(
      sources.map(([, url]) => fetchSheetCSV(url))
    );

    const rows = [];
    for (let i = 0; i < sources.length; i++) {
      const [fallbackType] = sources[i];
      const parsed = rowsToObjects(parseCSV(texts[i]));
      parsed.forEach((r) => {
        const loc = postProcessRow(r, fallbackType);
        if (loc) rows.push(loc);
      });
    }

    return rows;
  }

  function buildStats(rows) {
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();

    const totalScenes = rows.length;

    const countriesAll = new Set();
    const countriesThisMonth = new Set();
    const countriesThisYear = new Set();

    const titleTypeMap = new Map(); // unique title+type
    const titleMap = new Map();     // grouped by title only
    const typeTitleSets = new Map();

    const scenesByDay = new Map();
    const scenesByMonth = new Map();
    const scenesByYear = new Map();

    let scenesThisMonth = 0;
    let scenesThisYear = 0;

    rows.forEach((row) => {
      if (row.country) countriesAll.add(row.country);

      const ttKey = titleTypeKey(row.title, row.type);
      titleTypeMap.set(ttKey, { title: row.title, type: row.type });

      if (!titleMap.has(row.title)) {
        titleMap.set(row.title, {
          title: row.title,
          count: 0,
          types: new Set()
        });
      }
      const titleEntry = titleMap.get(row.title);
      titleEntry.count += 1;
      titleEntry.types.add(row.type);

      if (!typeTitleSets.has(row.type)) typeTitleSets.set(row.type, new Set());
      typeTitleSets.get(row.type).add(row.title);

      if (row.visited instanceof Date) {
        const d = row.visited;

        const dayKey = d.toISOString().slice(0, 10);
        const month = monthKey(d);
        const year = yearKey(d);

        scenesByDay.set(dayKey, (scenesByDay.get(dayKey) || 0) + 1);
        scenesByMonth.set(month, (scenesByMonth.get(month) || 0) + 1);
        scenesByYear.set(year, (scenesByYear.get(year) || 0) + 1);

        if (d.getFullYear() === nowYear) {
          scenesThisYear += 1;
          if (row.country) countriesThisYear.add(row.country);
        }

        if (d.getFullYear() === nowYear && d.getMonth() === nowMonth) {
          scenesThisMonth += 1;
          if (row.country) countriesThisMonth.add(row.country);
        }
      }
    });

    const titleEntries = Array.from(titleMap.values());

    const mostScenesEntry = [...titleEntries]
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))[0] || null;

    const leastScenesEntry = [...titleEntries]
      .sort((a, b) => a.count - b.count || a.title.localeCompare(b.title))[0] || null;

    const totalTitles = titleEntries.length;

    const mostScenesDay = [...scenesByDay.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || null;

    const mostScenesMonth = [...scenesByMonth.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || null;

    const avgScenesPerMonth = scenesByMonth.size
      ? totalScenes / scenesByMonth.size
      : 0;

    const avgScenesPerYear = scenesByYear.size
      ? totalScenes / scenesByYear.size
      : 0;

    return {
      totalScenes,
      totalCountries: countriesAll.size,
      countriesThisMonth: countriesThisMonth.size,
      countriesThisYear: countriesThisYear.size,
      scenesThisMonth,
      scenesThisYear,
      totalTitles,

      movieTitleCount: (typeTitleSets.get("Film") || new Set()).size,
      tvTitleCount: (typeTitleSets.get("TV") || new Set()).size,
      musicVideoTitleCount: (typeTitleSets.get("Music Video") || new Set()).size,
      videoGameTitleCount: (typeTitleSets.get("Video Game") || new Set()).size,
      miscTitleCount: (typeTitleSets.get("Misc") || new Set()).size,

      mostScenesEntry,
      leastScenesEntry,
      mostScenesDay,
      mostScenesMonth,
      avgScenesPerMonth,
      avgScenesPerYear,

      scenesByMonth,
      scenesByYear
    };
  }

  function render(stats) {
    loadingEl.style.display = "none";
    gridEl.style.display = "grid";
    gridEl.innerHTML = "";

    gridEl.appendChild(card(
      "Total scenes visited",
      formatNumber(stats.totalScenes)
    ));

    gridEl.appendChild(card(
      "Total titles",
      formatNumber(stats.totalTitles)
    ));

    gridEl.appendChild(card(
      "Total countries visited",
      formatNumber(stats.totalCountries)
    ));

    gridEl.appendChild(card(
      "Scenes visited this month",
      formatNumber(stats.scenesThisMonth)
    ));

    gridEl.appendChild(card(
      "Scenes visited this year",
      formatNumber(stats.scenesThisYear)
    ));

    gridEl.appendChild(card(
      "Countries visited this month",
      formatNumber(stats.countriesThisMonth)
    ));

    gridEl.appendChild(card(
      "Countries visited this year",
      formatNumber(stats.countriesThisYear)
    ));

    gridEl.appendChild(card(
      "Average scenes per month",
      stats.avgScenesPerMonth.toFixed(1)
    ));

    gridEl.appendChild(card(
      "Average scenes per year",
      stats.avgScenesPerYear.toFixed(1)
    ));

    gridEl.appendChild(card(
      "Most scenes",
      stats.mostScenesEntry ? escapeHtml(stats.mostScenesEntry.title) : "—",
      stats.mostScenesEntry ? `${formatNumber(stats.mostScenesEntry.count)} scenes` : "",
      "wide"
    ));

    gridEl.appendChild(card(
      "Least scenes",
      stats.leastScenesEntry ? escapeHtml(stats.leastScenesEntry.title) : "—",
      stats.leastScenesEntry ? `${formatNumber(stats.leastScenesEntry.count)} scene${stats.leastScenesEntry.count === 1 ? "" : "s"}` : "",
      "wide"
    ));

    gridEl.appendChild(card(
      "Most scenes found in a day",
      stats.mostScenesDay ? formatNumber(stats.mostScenesDay[1]) : "—",
      stats.mostScenesDay ? formatDate(new Date(stats.mostScenesDay[0])) : "",
      "wide"
    ));

    gridEl.appendChild(card(
      "Most scenes found in a month",
      stats.mostScenesMonth ? formatNumber(stats.mostScenesMonth[1]) : "—",
      stats.mostScenesMonth ? formatMonthKey(stats.mostScenesMonth[0]) : "",
      "wide"
    ));

    gridEl.appendChild(listCard("Title counts by type", [
      { label: "Movies", value: formatNumber(stats.movieTitleCount) },
      { label: "TV", value: formatNumber(stats.tvTitleCount) },
      { label: "Music Videos", value: formatNumber(stats.musicVideoTitleCount) },
      { label: "Video Games", value: formatNumber(stats.videoGameTitleCount) },
      { label: "Misc", value: formatNumber(stats.miscTitleCount) }
    ], "wide"));

    const monthRows = [...stats.scenesByMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([key, count]) => ({
        label: formatMonthKey(key),
        value: `${formatNumber(count)} scenes`
      }));

    gridEl.appendChild(listCard(
      "Recent months",
      monthRows.length ? monthRows : [{ label: "No dated visits yet", value: "—" }],
      "wide"
    ));

    const yearRows = [...stats.scenesByYear.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => ({
        label: key,
        value: `${formatNumber(count)} scenes`
      }));

    gridEl.appendChild(listCard(
      "By year",
      yearRows.length ? yearRows : [{ label: "No dated visits yet", value: "—" }],
      "wide"
    ));

    gridEl.appendChild(card(
      "Geek note",
      "Yes, this page is milking the data.",
      "And honestly it should."
    ));
  }

  async function init() {
    try {
      const rows = await loadAll();
      const stats = buildStats(rows);
      render(stats);
    } catch (err) {
      console.error(err);
      loadingEl.textContent = "Could not load stats.";
    }
  }

  init();
})();
