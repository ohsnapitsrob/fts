window.FTS = window.FTS || {};

FTS.Visibility = (function () {
  function getSettings() {
    if (window.FTS?.AppSettings?.getSettings) {
      return window.FTS.AppSettings.getSettings();
    }

    try {
      return JSON.parse(localStorage.getItem("fts-app-settings") || "{}");
    } catch (err) {
      return {};
    }
  }

  function normaliseAccess(value) {
    return (value || "")
      .toString()
      .trim()
      .toUpperCase();
  }

  function shouldHideScene(scene) {
    const settings = getSettings();

    if (settings.hideNoAccessScenes !== true) {
      return false;
    }

    const access = normaliseAccess(
      scene?.Access ||
      scene?.access ||
      scene?.ACCESS
    );

    return access === "NOACCESS";
  }

  function getVisibleScenes(scenes) {
    return (scenes || []).filter((scene) => !shouldHideScene(scene));
  }

  function hasVisibleScenes(scenes) {
    return getVisibleScenes(scenes).length > 0;
  }

  return {
    shouldHideScene,
    getVisibleScenes,
    hasVisibleScenes
  };
})();
