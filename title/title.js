(function () {
  const {
    norm,
    normalizeComparable,
    escapeHtml,
    safeUrl,
    getYouTubeEmbedUrl,
    formatNumber,
    plural,
    labelForCount,
    displayType
  } = FTS.Utils;

  const {
    loadAll,
    loadTitleMetadata,
    titleMetadataMap,
    sortScenes,
    buildTitleMapUrl
  } = FTS.Locations;

  const contentEl = document.getElementById("titleContent");

  function getRequestedTitle() {
    const params = new URLSearchParams(window.location.search);
    return norm(params.get("fl") || params.get("title") || params.get("q"));
  }

  function metadataHasContent(metadata) {
    if (!metadata) return false;

    return Boolean(
      norm(metadata.description) ||
      norm(metadata.imdb) ||
      norm(metadata.justwatch) ||
      norm(metadata.poster) ||
      norm(metadata.trailer)
    );
  }

  function titleSummaryHtml(metadata) {
    if (!metadataHasContent(metadata)) return "";

    const poster = safeUrl(metadata.poster);
    const imdb = safeUrl(metadata.imdb);
    const justwatch = safeUrl(metadata.justwatch);

    const trailer = window.FTS?.Privacy?.mediaAllowed?.()
      ? getYouTubeEmbedUrl(metadata.trailer)
      : "";

    const hasTopRow = poster || norm(metadata.description) || imdb || justwatch;

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
                  ${metadata.description ? `<p class="title-description">${escapeHtml(metadata.description)}</p>` : ""}

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
                <iframe
                  class="title-trailer"
                  src="${escapeHtml(trailer)}"
                  title="Trailer"
                  allowfullscreen
                  loading="lazy"
                  referrerpolicy="strict-origin-when-cross-origin">
                </iframe>
              </div>
            `
            : ""
        }
      </section>
    `;
  }

  function renderNotFound(requestedTitle) {
    document.title = "Title not found | Find That Scene";

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
    const sortedRows = sortScenes(rows);
    const sceneCount = sortedRows.length;

    const cities = new Set();
    const countries = new Set();
    const types = new Set();

    sortedRows.forEach((row) => {
      if (row.type) types.add(row.type);
      if (row.city) cities.add(row.city);
      if (row.country) countries.add(row.country);
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
          ${plural(sceneCount, "scene", "scenes")} found across
          ${plural(cityCount, "city", "cities")} and
          ${plural(countryCount, "country", "countries")}.
        </p>
      </section>

      ${titleSummaryHtml(metadata)}

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-value">${formatNumber(sceneCount)}</div>
          <div class="stat-label">${labelForCount(sceneCount, "Scene", "Scenes")}</div>
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
        <a class="btn btn-primary" href="${buildTitleMapUrl(title)}">See scenes on the map</a>
        <a class="btn btn-secondary" href="../browse/">Browse all titles</a>
      </div>

      <section class="scene-section">
        <div class="scene-section-head">
          <h2 class="scene-section-title">${labelForCount(sceneCount, "Scene", "Scenes")}</h2>
          <p class="scene-section-copy">Newest visited first. Scenes with no public access are shown at the end.</p>
        </div>

        <div class="scene-grid">
          ${sortedRows.map(FTS.SceneCard.render).join("")}
        </div>
      </section>
    `;
  }

  async function init() {
    const requestedTitle = getRequestedTitle();

    if (!requestedTitle) {
      renderNotFound("");
      return;
    }

    try {
      const [rows, metadataRows] = await Promise.all([
        loadAll(),
        loadTitleMetadata()
      ]);

      const matches = rows.filter((row) => {
        return normalizeComparable(row.title) === normalizeComparable(requestedTitle);
      });

      if (!matches.length) {
        renderNotFound(requestedTitle);
        return;
      }

      const metadata = titleMetadataMap(metadataRows)
        .get(normalizeComparable(matches[0].title));

      renderTitlePage(matches[0].title, matches, metadata);
    } catch (err) {
      console.error(err);
      contentEl.innerHTML = `<div class="loading-card">Could not load this title.</div>`;
    }
  }

  init();
})();
