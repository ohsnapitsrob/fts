window.App = window.App || {};

App.State = (function () {
  let currentFilter = null;
  let hideNoAccess = false;

  function getSavedHideNoAccessSetting() {
    if (window.FTS?.AppSettings?.getSettings) {
      return window.FTS.AppSettings.getSettings().hideNoAccessScenes === true;
    }

    try {
      const raw = localStorage.getItem("fts-app-settings");
      if (!raw) return false;

      return JSON.parse(raw).hideNoAccessScenes === true;
    } catch (err) {
      return false;
    }
  }

  function init() {
    hideNoAccess = getSavedHideNoAccessSetting();

    window.addEventListener("fts:app-settings-updated", (event) => {
      if (!event.detail) return;
      setHideNoAccess(event.detail.hideNoAccessScenes === true);
    });
  }

  function getFilter() {
    return currentFilter;
  }

  function setFilter(filter) {
    currentFilter = filter || null;
    App.UI.setFilterUI(currentFilter);
  }

  function clearFilter() {
    setFilter(null);
  }

  function getHideNoAccess() {
    return hideNoAccess;
  }

  function setHideNoAccess(value) {
    hideNoAccess = !!value;

    if (App.Map && typeof App.Map.refreshNoAccessFilter === "function") {
      App.Map.refreshNoAccessFilter();
    }
  }

  function hasNoAccess(loc) {
    return !!(loc && (loc.access || "").toString().trim());
  }

  function filterNoAccessMarkers(markers) {
    if (!hideNoAccess) return markers || [];

    return (markers || []).filter((marker) => {
      return !hasNoAccess(marker?.__loc);
    });
  }

  return {
    init,
    getFilter,
    setFilter,
    clearFilter,
    getHideNoAccess,
    setHideNoAccess,
    hasNoAccess,
    filterNoAccessMarkers
  };
})();
