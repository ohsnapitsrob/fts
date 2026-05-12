(function () {
  const rootEl = document.getElementById("statsGrid");

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

  function parseVisitedDate(value) {
    const raw = norm(value);

    if (!raw) return null;

    const cleaned = raw.replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1");
    const ts = Date.parse(cleaned);

    return Number.isFinite(ts) ? ts : null;
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString();
  }

  function monthKey(ts) {
    const d = new Date(ts);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  function yearKey(ts) {
    return String(new Date(ts).getUTCFullYear());
  }

  function prettyMonth(key) {
    const [year, month] = key.split("-");
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

    return d.toLocaleString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    });
  }

  function percentChange(current, previous) {
    if (!previous && current) return 100;
    if (!previous) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  function changeLabel(change) {
    if (change > 0) return `↑ ${change}%`;
    if (change < 0) return `↓ ${Math.abs(change)}%`;
    return "—";
  }

  function statCard({ label, value, copy, change, hero = false }) {
    return `
      <article class="stat-card ${hero ? "hero-card" : ""}">
        <div class="stat-top">
          <div class="stat-label">${label}</div>
          <div class="stat-change">${changeLabel(change)}</div>
        </div>

        <div class="stat-value">${value}</div>

        <div class="stat-copy">${copy}</div>
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
        const title = norm(row.title);
        const type = normalizeType(row.type || fallbackType);

        const lat = coerceNumber(row.lat);
        const lng = coerceNumber(row.lng);

        if (!title || typeof lat !== "number" || typeof lng !== "number") {
          return;
        }

        rows.push({
          title,
          type,
          country: norm(row.country),
          city: norm(row.city || row.place),
          access: norm(row.access),
          visitedTs: parseVisitedDate(
            row["date-formatted"] ||
              row["raw-date"] ||
              row["visited"] ||
              row["visit-date"]
          )
        });
      });
    }

    return rows;
  }

  function buildStats(rows) {
    const accessibleRows = rows.filter((row) => !hasNoAccess(row));
    const noAccessRows = rows.filter((row) => hasNoAccess(row));

    const titles = new Set();
    const countries = new Set();
    const cities = new Set();

    accessibleRows.forEach((row) => {
      if (row.title) titles.add(row.title);
      if (row.country) countries.add(row.country);
      if (row.city) cities.add(row.city);
    });

    const byType = new Map();

    accessibleRows.forEach((row) => {
      byType.set(row.type, (byType.get(row.type) || 0) + 1);
    });

    const byMonth = new Map();
    const byYear = new Map();

    accessibleRows.forEach((row) => {
      if (!Number.isFinite(row.visitedTs)) return;

      const m = monthKey(row.visitedTs);
      const y = yearKey(row.visitedTs);

      byMonth.set(m, (byMonth.get(m) || 0) + 1);
      byYear.set(y, (byYear.get(y) || 0) + 1);
    });

    const orderedMonths = [...byMonth.entries()].sort((a, b) => {
      return a[0].localeCompare(b[0]);
    });

    const latestMonth = orderedMonths.at(-1);
    const previousMonth = orderedMonths.at(-2);

    const latestMonthCount = latestMonth?.[1] || 0;
    const previousMonthCount = previousMonth?.[1] || 0;

    const monthChange = percentChange(
      latestMonthCount,
      previousMonthCount
    );

    const bestMonth = [...byMonth.entries()]
      .sort((a, b) => b[1] - a[1])[0];

    const bestYear = [...byYear.entries()]
      .sort((a, b) => b[1] - a[1])[0];

    const now = new Date();

    const currentMonthRows = accessibleRows.filter((row) => {
      if (!Number.isFinite(row.visitedTs)) return false;

      const d = new Date(row.visitedTs);

      return (
        d.getUTCFullYear() === now.getUTCFullYear() &&
        d.getUTCMonth() === now.getUTCMonth()
      );
    });

    const currentYearRows = accessibleRows.filter((row) => {
      if (!Number.isFinite(row.visitedTs)) return false;

      const d = new Date(row.visitedTs);

      return d.getUTCFullYear() === now.getUTCFullYear();
    });

    return [
      {
        label: "Scenes visited",
        value: formatNumber(accessibleRows.length),
        copy: "Accessible scenes currently documented.",
        change: monthChange,
        hero: true
      },

      {
        label: "Scenes with no access",
        value: formatNumber(noAccessRows.length),
        copy: "Locations not publicly accessible.",
        change: 0
      },

      {
        label: "Titles",
        value: formatNumber(titles.size),
        copy: "Unique titles currently in the project.",
        change: 0
      },

      {
        label: "Cities",
        value: formatNumber(cities.size),
        copy: "Different cities visited so far.",
        change: 0
      },

      {
        label: "Countries",
        value: formatNumber(countries.size),
        copy: "Countries represented in the project.",
        change: 0
      },

      {
        label: "Scenes this month",
        value: formatNumber(currentMonthRows.length),
        copy: "Scenes visited during the current month.",
        change: monthChange
      },

      {
        label: "Scenes this year",
        value: formatNumber(currentYearRows.length),
        copy: "Scenes visited during the current year.",
        change: 0
      },

      {
        label: "Movie scenes",
        value: formatNumber(byType.get("Film") || 0),
        copy: "Scenes connected to films and movies.",
        change: 0
      },

      {
        label: "TV scenes",
        value: formatNumber(byType.get("TV") || 0),
        copy: "Scenes connected to television.",
        change: 0
      },

      {
        label: "Music video scenes",
        value: formatNumber(byType.get("Music Video") || 0),
        copy: "Scenes connected to music videos.",
        change: 0
      },

      {
        label: "Game scenes",
        value: formatNumber(byType.get("Video Game") || 0),
        copy: "Scenes connected to games.",
        change: 0
      },

      {
        label: "Best month",
        value: bestMonth ? formatNumber(bestMonth[1]) : "0",
        copy: bestMonth
          ? `${prettyMonth(bestMonth[0])} had the most scenes visited.`
          : "No monthly data yet.",
        change: 0
      },

      {
        label: "Best year",
        value: bestYear ? formatNumber(bestYear[1]) : "0",
        copy: bestYear
          ? `${bestYear[0]} currently holds the record.`
          : "No yearly data yet.",
        change: 0
      }
    ];
  }

  function render(cards) {
    rootEl.innerHTML = cards.map(statCard).join("");
  }

  async function init() {
    try {
      const rows = await loadRows();
      const stats = buildStats(rows);

      render(stats);
    } catch (err) {
      console.error(err);

      rootEl.innerHTML = `
        <div class="loading-card">
          Could not load stats.
        </div>
      `;
    }
  }

  init();
})();
