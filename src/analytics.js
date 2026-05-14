window.FTS = window.FTS || {};

FTS.Analytics = (function () {
  const config = window.APP_CONFIG || {};
  const PARAMETER_UPDATE_EVENT = "parameterUpdate";
  let parameterUpdateTimer = null;
  let lastParameterSignature = "";
  let historyWrapped = false;

  function enabled() {
    return window.FTS?.Features?.isEnabled("plausibleAnalyticsEnabled") === true;
  }

  function getParams() {
    return new URLSearchParams(window.location.search);
  }

  function getPageType() {
    const path = window.location.pathname.replace(/\/+$/, "");

    if (!path || path.endsWith("/fts") || path === "/") return "home";
    if (path.endsWith("/explore")) return "explore";
    if (path.endsWith("/browse")) return "browse";
    if (path.endsWith("/title")) return "title";
    if (path.endsWith("/stats")) return "stats";
    if (path.endsWith("/national-trust")) return "national_trust";
    if (path.endsWith("/privacy")) return "privacy";

    return "other";
  }

  function normalisePropertyName(value) {
    return (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function loadJsonStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  function getConsentMode() {
    const settings = loadJsonStorage("fts-privacy-settings");
    return settings.mediaEmbeds === true ? "media" : "essential_only";
  }

  function getAppSettings() {
    if (window.FTS?.AppSettings?.getSettings) {
      return window.FTS.AppSettings.getSettings();
    }

    return loadJsonStorage("fts-app-settings");
  }

  function addIfPresent(props, key, value) {
    if (value === undefined || value === null || value === "") return;
    props[key] = value;
  }

  function getFilterContext(params, pageType) {
    const filterValue = params.get("fl") || params.get("title") || (pageType === "title" ? params.get("q") : "");
    let filterType = params.get("fk");

    if (!filterType && pageType === "title" && filterValue) {
      filterType = "Title";
    }

    return {
      filterType,
      filterValue
    };
  }

  function hasTrackableParams() {
    const params = getParams();
    const trackableKeys = ["q", "tab", "fk", "fl", "title", "loc", "rm", "mlat", "mlng", "mz"];

    return trackableKeys.some((key) => {
      const value = params.get(key);
      return value !== null && value !== "";
    });
  }

  function buildPageviewProperties() {
    const params = getParams();
    const pageType = getPageType();
    const props = {};

    const searchQuery = params.get("q");
    const activeTab = params.get("tab");
    const { filterType, filterValue } = getFilterContext(params, pageType);
    const locationId = params.get("loc");
    const ratingMatch = params.get("rm");
    const mapLatitude = params.get("mlat");
    const mapLongitude = params.get("mlng");
    const mapZoom = params.get("mz");
    const dynamicFilterKey = normalisePropertyName(filterType);
    const appSettings = getAppSettings();

    addIfPresent(props, "page_type", pageType);
    addIfPresent(props, "route", window.location.pathname);
    addIfPresent(props, "search_query", searchQuery);
    addIfPresent(props, "active_tab", activeTab);
    addIfPresent(props, "filter_type", filterType);
    addIfPresent(props, "filter_value", filterValue);

    if (dynamicFilterKey && filterValue) {
      addIfPresent(props, dynamicFilterKey, filterValue);
    }

    addIfPresent(props, "location_id", locationId);
    addIfPresent(props, "rating_match", ratingMatch);

    if (mapLatitude && mapLongitude) {
      addIfPresent(props, "coordinates", `${mapLatitude},${mapLongitude}`);
    }

    addIfPresent(props, "map_zoom", mapZoom);
    addIfPresent(props, "consent_mode", getConsentMode());
    addIfPresent(props, "hide_no_access_scenes", appSettings.hideNoAccessScenes === true ? "true" : "false");

    return props;
  }

  function parameterSignature() {
    const params = getParams();
    const entries = Array.from(params.entries())
      .filter(([, value]) => value !== "")
      .sort(([a], [b]) => a.localeCompare(b));

    return JSON.stringify({
      path: window.location.pathname,
      params: entries
    });
  }

  function trackParameterUpdate() {
    if (!enabled()) return;
    if (!hasTrackableParams()) return;

    const signature = parameterSignature();
    if (signature === lastParameterSignature) return;

    lastParameterSignature = signature;

    window.plausible?.(PARAMETER_UPDATE_EVENT, {
      props: buildPageviewProperties()
    });
  }

  function scheduleParameterUpdate() {
    if (!enabled()) return;

    if (parameterUpdateTimer) {
      clearTimeout(parameterUpdateTimer);
    }

    parameterUpdateTimer = setTimeout(trackParameterUpdate, 350);
  }

  function wrapHistoryMethod(methodName) {
    const original = window.history[methodName];

    if (typeof original !== "function") return;

    window.history[methodName] = function () {
      const result = original.apply(this, arguments);
      scheduleParameterUpdate();
      return result;
    };
  }

  function watchParameterUpdates() {
    if (historyWrapped) return;
    historyWrapped = true;

    lastParameterSignature = parameterSignature();

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");

    window.addEventListener("popstate", scheduleParameterUpdate);
  }

  function init() {
    if (!enabled()) return;

    const scriptUrl = config.PLAUSIBLE_SCRIPT_URL;

    if (!scriptUrl) return;
    if (document.querySelector("script[data-fts-plausible]")) return;

    window.plausible = window.plausible || function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };

    window.plausible.init = window.plausible.init || function (options) {
      window.plausible.o = options || {};
    };

    window.plausible.init({
      customProperties: function (eventName) {
        if (eventName !== "pageview") {
          return {};
        }

        return buildPageviewProperties();
      }
    });

    watchParameterUpdates();

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-fts-plausible", "true");

    document.head.appendChild(script);
  }

  return {
    init,
    buildPageviewProperties,
    trackParameterUpdate
  };
})();

FTS.Analytics.init();
