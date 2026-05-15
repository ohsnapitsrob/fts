(function () {
  const PRIVACY_STORAGE_KEY = "fts-privacy-settings";
  const statsEl = document.getElementById("homeStats");
  const railsEl = document.getElementById("railsRoot");

  function featureEnabled(key) {
    return window.FTS?.Features?.isEnabled(key) !== false;
  }

  function privacyConsentFeatureEnabled() {
    return window.FTS?.Features?.isEnabled("privacyConsentEnabled") !== false;
  }

  function savedPrivacyChoiceExists() {
    try {
      return Boolean(window.localStorage.getItem(PRIVACY_STORAGE_KEY));
    } catch (err) {
      return false;
    }
  }

  function privacyChoiceRequired() {
    if (!privacyConsentFeatureEnabled()) return false;
    if (window.FTS?.Privacy?.enabled?.() === false) return false;

    return true;
  }

  function privacyChoiceAnswered() {
    if (!privacyChoiceRequired()) return true;
    if (savedPrivacyChoiceExists()) return true;

    return window.FTS?.Privacy?.getSettings?.().hasAnswered === true;
  }

  function waitForPrivacyChoice(callback) {
    if (privacyChoiceAnswered()) {
      callback();
      return;
    }

    railsEl.innerHTML = `
      <div class="loading-card">
        Choose your privacy settings to load the homepage.
      </div>
    `;

    window.addEventListener("fts:privacy-updated", callback, { once: true });
  }

  function norm(s) {
    return (s || "").toString().trim();
  }

  function normalizeComparable(s) {
    return norm(s).toLowerCase();
  }

  function getVisibleRows(rows) {
    return window.FTS?.Visibility?.getVisibleScenes?.(rows) || rows;
  }

  function buildTitleEntries(rows, metadataRows) {
    const visibleRows = getVisibleRows(rows);
    const metaByTitle = new Map();

    metadataRows.forEach((meta) => {
      metaByTitle.set(normalizeComparable(meta.title), meta);
    });

    const grouped = new Map();

    visibleRows.forEach((row) => {
      const key = normalizeComparable(row.title);
      const meta = metaByTitle.get(key) || {};

      if (!grouped.has(key)) {
        grouped.set(key, {
          title: row.title,
          type: row.type || meta.type,
          series: row.series,
          count: 0,
          accessibleCount: 0,
          poster: meta.poster || "",
          thumbnail: meta.thumbnail || row.thumbnail || "",
          nt: norm(meta.nt)
        });
      }

      const entry = grouped.get(key);
      entry.count += 1;
      entry.accessibleCount += 1;

      if (!entry.series && row.series) {
        entry.series = row.series;
      }
    });

    return Array
      .from(grouped.values())
      .filter((entry) => entry.accessibleCount > 0);
  }

  async function init() {
    try {
      const [sceneRows, metadataRows] = await Promise.all([
        loadSceneRows(),
        loadTitleMetadata()
      ]);

      const visibleRows = getVisibleRows(sceneRows);
      const titleEntries = buildTitleEntries(sceneRows, metadataRows);

      const titles = new Set();
      const cities = new Set();
      const countries = new Set();

      visibleRows.forEach((row) => {
        if (row.title) titles.add(row.title);
        if (row.city) cities.add(row.city);
        if (row.country) countries.add(row.country);
      });

      const curatedRails = titleEntries.filter((entry) => entry.accessibleCount > 0);

      window.FTS_HOME_VISIBLE_TITLES = curatedRails;

      renderStats({
        scenes: visibleRows.length,
        titles: titles.size,
        cities: cities.size,
        countries: countries.size
      });
    } catch (err) {
      console.error(err);
    }
  }

  waitForPrivacyChoice(init);
})();