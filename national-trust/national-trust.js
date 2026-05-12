(function () {
  const contentEl = document.getElementById("ntContent");

  const NT_ICON_URL = "https://images.pixieset.com/063553411/79737b7a99cf1e6442ac14468460ebc1-xxlarge.png";


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
    if (x === "tv" || x === "tv show" || x === "series" || x === "tv shows") return "TV";
    if (x === "music video" || x === "music videos" || x === "mv") return "Music Video";
    if (x === "game" || x === "games" || x === "video game" || x === "video games") return "Video Game";
    if (x === "misc" || x === "other") return "Misc";

    return norm(t);
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

  function noAccessDotHtml(row) {
    if (!hasNoAccess(row)) return "";
    return `<span class="scene-noaccess-dot" aria-label="No public access"></span>`;
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
    if (hasNoAccess(row)) return "";
    return row.monthShort || row.dateFormatted || row.rawDate || "";
  }

/*  function propertyName(row) {
    return norm(
      row.NationalTrust ||
      row["National Trust"] ||
      row.nt ||
      row.NT ||
      row.place
    );
  }*/
  function propertyName(row) {
  return norm(
    row.NationalTrust ||
    row["National Trust"]
  );
}

  function ntUrl(row) {
    return norm(
      row.NTURL ||
      row["NT URL"] ||
      row.nturl ||
      row.ntUrl
    );
  }

  function ntBadgeHtml(row) {
    if (!propertyName(row)) return "";
    if (!safeUrl(NT_ICON_URL)) return "";

    return `
      <img
        class="scene-nt-badge"
        src="${escapeHtml(NT_ICON_URL)}"
        alt="National Trust"
        loading="lazy"
      >
    `;
  }

  function ntButtonHtml(row) {
    const url = safeUrl(row.NTURL);
    if (!url) return "";
    if (!safeUrl(NT_ICON_URL)) return "";

    return `
      <a
        class="btn scene-nt-btn"
        href="${escapeHtml(url)}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View National Trust page"
      >
        <img src="${escapeHtml(NT_ICON_URL)}" alt="">
      </a>
    `;
  }

  function locationDiscoverButton(group) {
  const firstWithUrl = group.rows.find(
    (row) => safeUrl(row.NTURL)
  );

  if (!firstWithUrl) return "";

  return `
    <a
      class="location-discover-btn"
      href="${escapeHtml(firstWithUrl.NTURL)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      Discover more about this location
    </a>
  `;
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

  function sceneCardHtml(row) {
    const img = sceneImage(row);
    const location = sceneLocation(row);
    const date = sceneDate(row);
    const noAccessClass = hasNoAccess(row) ? " scene-card-noaccess" : "";

    return `
      <article class="scene-card${noAccessClass}">
        <div class="scene-thumb">
          ${noAccessDotHtml(row)}
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

  function sortScenes(rows) {
    return [...rows].sort((a, b) => {
      const aNoAccess = hasNoAccess(a);
      const bNoAccess = hasNoAccess(b);

      if (aNoAccess && !bNoAccess) return 1;
      if (!aNoAccess && bNoAccess) return -1;

      const aHas = Number.isFinite(a.visitedTs);
      const bHas = Number.isFinite(b.visitedTs);

      if (aHas && bHas && b.visitedTs !== a.visitedTs) {
        return b.visitedTs - a.visitedTs;
      }

      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;

      const aTitle = normalizeComparable(a.title);
      const bTitle = normalizeComparable(b.title);
      return aTitle.localeCompare(bTitle);
    });
  }

  function previewOrder(rows) {
    const sorted = sortScenes(rows);
    const byTitle = new Map();

    sorted.forEach((row) => {
      const key = normalizeComparable(row.title);
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key).push(row);
    });

    const ordered = [];
    let added = true;

    while (added) {
      added = false;

      byTitle.forEach((items) => {
        const next = items.shift();
        if (next) {
          ordered.push(next);
          added = true;
        }
      });
    }

    return ordered;
  }

 function countText(sceneCount, productionCount) {
  const sceneLabel = sceneCount === 1 ? "scene" : "scenes";
  const titleLabel = productionCount === 1 ? "title" : "titles";

  return `${sceneCount.toLocaleString()} ${sceneLabel} from ${productionCount.toLocaleString()} ${titleLabel}`;
}

function locationSectionHtml(group, index) {
  const allScenes = sortScenes(group.rows);
const preview = previewOrder(group.rows).slice(0, 3);
  const hasMore = allScenes.length > preview.length;

  return `
    <section class="nt-location" data-location-index="${index}">
      <div class="nt-location-head">
        <h2 class="nt-location-title">
          ${escapeHtml(group.name)}
        </h2>

       <div class="nt-location-meta">
  ${escapeHtml(
    countText(
      group.rows.length,
      group.productionCount
    )
  )}
</div>

${locationDiscoverButton(group)}
      </div>

      <div
        class="scene-grid nt-scene-grid"
        data-scene-grid="${index}"
      >
        ${preview.map(sceneCardHtml).join("")}
      </div>

      ${
        hasMore
          ? `
            <button
              class="btn btn-secondary nt-show-all"
              type="button"
              data-show-all="${index}"
            >
              Show all scenes
            </button>
          `
          : ""
      }
    </section>
  `;
}
  
/*  function groupLocations(rows) {
    const groups = new Map();

    rows.forEach((row) => {
      const name = propertyName(row);
      if (!name) return;

      const key = normalizeComparable(name);

      if (!groups.has(key)) {
        groups.set(key, {
          name,
          rows: [],
          productionTitles: new Set()
        });
      }

      const group = groups.get(key);
      group.rows.push(row);

      if (row.title) group.productionTitles.add(normalizeComparable(row.title));
    });

    return [...groups.values()]
      .map((group) => ({
        ...group,
        rows: sortScenes(group.rows),
        productionCount: group.productionTitles.size
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }*/
function groupLocations(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const name = propertyName(row);

    // ONLY include rows with a National Trust value
    if (!name) return;

    const key = normalizeComparable(name);

    if (!groups.has(key)) {
      groups.set(key, {
        name,
        rows: [],
        productionTitles: new Set()
      });
    }

    const group = groups.get(key);

    group.rows.push(row);

    if (row.title) {
      group.productionTitles.add(
        normalizeComparable(row.title)
      );
    }
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      rows: sortScenes(group.rows),
      productionCount: group.productionTitles.size
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base"
      })
    );
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
        const ntName = propertyName(row);

        if (!title || typeof lat !== "number" || typeof lng !== "number") return;
        if (!ntName) return;

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
          access: getAccessValue(row),
          NationalTrust: ntName,
          NTURL: ntUrl(row),
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

function attachShowAllHandlers(groups) {
  contentEl.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-show-all]");
    if (!btn) return;

    const index = Number(btn.getAttribute("data-show-all"));
    const group = groups[index];

    if (!group) return;

    const section = btn.closest(".nt-location");
    const grid = section?.querySelector(`[data-scene-grid="${index}"]`);

    if (!grid) return;

    grid.innerHTML = sortScenes(group.rows)
      .map(sceneCardHtml)
      .join("");

    btn.remove();
  });
}

  async function init() {
    try {
      const rows = await loadAllRows();
      const groups = groupLocations(rows);

      if (!groups.length) {
        contentEl.innerHTML = `
          <div class="empty-card">
            No National Trust scenes found yet.
          </div>
        `;
        return;
      }

      contentEl.innerHTML = groups
        .map((group, index) => locationSectionHtml(group, index))
        .join("");

    //  attachShowAllHandlers();
      attachShowAllHandlers(groups);
      
    } catch (err) {
      console.error(err);

      contentEl.innerHTML = `
        <div class="loading-card">
          Could not load National Trust locations.
        </div>
      `;
    }
  }

  init();
})();
