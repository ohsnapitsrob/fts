window.FTS = window.FTS || {};

FTS.Locations = (function () {
  const {
    norm,
    splitPipe,
    splitComma,
    coerceNumber,
    normalizeType,
    parseVisitedDate,
    getAccessValue,
    getNationalTrustName,
    getNationalTrustUrl,
    normalizeComparable
  } = FTS.Utils;

  function configuredSources() {
    const config = window.APP_CONFIG || {};
    const sheets = config.SHEETS || {};

    return [
      ["Film", sheets.movies],
      ["TV", sheets.tv],
      ["Music Video", sheets.music_videos],
      ["Video Game", sheets.games],
      ["Misc", sheets.misc]
    ].filter(([, url]) => Boolean(url));
  }

  function sceneLocation(row) {
    return [row.place, row.country]
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .join(", ");
  }

  function sceneImage(row) {
    return Array.isArray(row.images) && row.images.length ? row.images[0] : "";
  }

  function sceneDate(row) {
    if (FTS.Utils.hasNoAccess(row)) return "";
    return row.monthShort || row.dateFormatted || row.rawDate || "";
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

  function buildTitleUrl(title) {
    const params = new URLSearchParams();
    params.set("fl", title);
    return `../title/?${params.toString()}`;
  }

  function buildTitleMapUrl(title) {
    const params = new URLSearchParams();
    params.set("fk", "Title");
    params.set("fl", title);
    return `../explore/?${params.toString()}`;
  }

  function toLocation(row, fallbackType, options = {}) {
    const title = norm(row.title);
    const type = normalizeType(row.type || fallbackType);
    const lat = coerceNumber(row.lat);
    const lng = coerceNumber(row.lng);
    const ntName = getNationalTrustName(row);

    if (!title || typeof lat !== "number" || typeof lng !== "number") return null;
    if (options.nationalTrustOnly && !ntName) return null;

    return {
      id: norm(row.id),
      title,
      type,
      series: norm(row.series) || (type === "TV" ? title : ""),
      place: norm(row.place),
      city: norm(row.city || row.town || row.place),
      country: norm(row.country),
      description: norm(row.description),
      collections: splitPipe(row.collections),
      keywords: splitPipe(row.keywords),
      aliases: splitPipe(row.aliases),
      images: splitPipe(row.images),
      rating: splitComma(row.rating).map((value) => value.toLowerCase()),
      access: getAccessValue(row),
      exportFileName: norm(row["export-file-name"]),
      imdb: norm(row.imdb),
      justwatch: norm(row.justwatch),
      NationalTrust: ntName,
      NTURL: getNationalTrustUrl(row),
      rawDate: norm(row["raw-date"]),
      dateFormatted: norm(row["date-formatted"]),
      monthShort: norm(row["month-short"]),
      visitedTs: parseVisitedDate(row["date-formatted"] || row["raw-date"] || row.visited || row["visit-date"]),
      lat,
      lng,
      _raw: row
    };
  }

  async function loadAll(options = {}) {
    const sources = configuredSources();

    if (!sources.length) {
      throw new Error("No sheet URLs configured.");
    }

    const rowGroups = await Promise.all(
      sources.map(async ([fallbackType, url]) => {
        const rows = await FTS.CSV.fetchObjects(url);
        return rows.map((row) => toLocation(row, fallbackType, options)).filter(Boolean);
      })
    );

    return rowGroups.flat();
  }

  async function loadTitleMetadata() {
    const config = window.APP_CONFIG || {};
    const url = config.TITLE_METADATA_CSV || config.TITLE_METADATA || config.TITLES_METADATA_CSV;

    if (!url) return [];

    try {
      const rows = await FTS.CSV.fetchObjects(url);

      return rows.map((row) => ({
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

  function titleMetadataMap(rows) {
    const map = new Map();

    rows.forEach((row) => {
      if (!row.title) return;
      map.set(normalizeComparable(row.title), row);
    });

    return map;
  }

  function sortScenes(rows) {
    return [...rows].sort((a, b) => {
      const aNoAccess = FTS.Utils.hasNoAccess(a);
      const bNoAccess = FTS.Utils.hasNoAccess(b);

      if (aNoAccess && !bNoAccess) return 1;
      if (!aNoAccess && bNoAccess) return -1;

      const aHas = Number.isFinite(a.visitedTs);
      const bHas = Number.isFinite(b.visitedTs);

      if (aHas && bHas && b.visitedTs !== a.visitedTs) return b.visitedTs - a.visitedTs;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;

      const locationCompare = sceneLocation(a).localeCompare(sceneLocation(b), undefined, { sensitivity: "base" });
      if (locationCompare !== 0) return locationCompare;

      return normalizeComparable(a.title).localeCompare(normalizeComparable(b.title));
    });
  }

  return {
    configuredSources,
    toLocation,
    loadAll,
    loadTitleMetadata,
    titleMetadataMap,
    sortScenes,
    sceneLocation,
    sceneImage,
    sceneDate,
    buildSceneMapUrl,
    buildTitleUrl,
    buildTitleMapUrl
  };
})();
