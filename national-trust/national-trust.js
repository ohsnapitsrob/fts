(function () {
  const {
    escapeHtml,
    normalizeComparable,
    safeUrl,
    labelForCount
  } = FTS.Utils;

  const {
    loadAll,
    sortScenes
  } = FTS.Locations;

  const contentEl = document.getElementById("ntContent");

  function previewOrder(rows) {
    const sorted = sortScenes(rows);
    const byTitle = new Map();

    sorted.forEach((row) => {
      const key = normalizeComparable(row.title);

      if (!byTitle.has(key)) {
        byTitle.set(key, []);
      }

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
    return `${sceneCount.toLocaleString()} ${labelForCount(sceneCount, "scene", "scenes")} from ${productionCount.toLocaleString()} ${labelForCount(productionCount, "title", "titles")}`;
  }

  function locationDiscoverButton(group) {
    const firstWithUrl = group.rows.find((row) => safeUrl(row.NTURL));

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
            ${escapeHtml(countText(group.rows.length, group.productionCount))}
          </div>

          ${locationDiscoverButton(group)}
        </div>

        <div
          class="scene-grid nt-scene-grid"
          data-scene-grid="${index}"
        >
          ${preview.map(FTS.SceneCard.render).join("")}
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

  function groupLocations(rows) {
    const groups = new Map();

    rows.forEach((row) => {
      if (!row.NationalTrust) return;

      const key = normalizeComparable(row.NationalTrust);

      if (!groups.has(key)) {
        groups.set(key, {
          name: row.NationalTrust,
          rows: [],
          productionTitles: new Set()
        });
      }

      const group = groups.get(key);

      group.rows.push(row);

      if (row.title) {
        group.productionTitles.add(normalizeComparable(row.title));
      }
    });

    return [...groups.values()]
      .map((group) => ({
        ...group,
        rows: sortScenes(group.rows),
        productionCount: group.productionTitles.size
      }))
      .sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, {
          sensitivity: "base"
        });
      });
  }

  function attachShowAllHandlers(groups) {
    contentEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-show-all]");

      if (!button) return;

      const index = Number(button.getAttribute("data-show-all"));
      const group = groups[index];

      if (!group) return;

      const section = button.closest(".nt-location");
      const grid = section?.querySelector(`[data-scene-grid="${index}"]`);

      if (!grid) return;

      grid.innerHTML = sortScenes(group.rows)
        .map(FTS.SceneCard.render)
        .join("");

      button.remove();
    });
  }

  async function init() {
    try {
      const rows = await loadAll({ nationalTrustOnly: true });
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
