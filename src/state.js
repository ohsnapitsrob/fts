window.App = window.App || {};

App.State = (function () {
  let currentFilter = null;
  let hideNoAccess = false;

  function init() {
    const toggle = document.getElementById("hideNoAccessToggle");

    if (toggle) {
      toggle.checked = hideNoAccess;

      toggle.addEventListener("change", () => {
        setHideNoAccess(toggle.checked);
      });
    }
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

    const toggle = document.getElementById("hideNoAccessToggle");
    if (toggle) toggle.checked = hideNoAccess;

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
