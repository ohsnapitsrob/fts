window.FTS = window.FTS || {};

FTS.FeatureToggles = {
  headerLogoEnabled: true,
  iosInstallPromptEnabled: true
};

FTS.Features = (function () {
  function isEnabled(key) {
    const toggles = window.FTS?.FeatureToggles || {};

    if (!Object.prototype.hasOwnProperty.call(toggles, key)) {
      return true;
    }

    return toggles[key] === true;
  }

  return {
    isEnabled
  };
})();
