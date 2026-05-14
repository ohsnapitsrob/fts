window.FTS = window.FTS || {};

FTS.FeatureToggles = {
  headerLogoEnabled: true,
  iosInstallPromptEnabled: true,
  privacyConsentEnabled: true,
  mediaEmbedsEnabled: true,
  plausibleAnalyticsEnabled: true,
  siteDisclaimerEnabled: false,
  settingsMapSectionEnabled: true,

  homeRailsEnabled: true,
  homeRailLatestScenesEnabled: true,
  homeRailTopScenesEnabled: true,
  homeRailJamesBondEnabled: true,
  homeRailHarryPotterEnabled: true,
  homeRailMoviesEnabled: true,
  homeRailTVEnabled: true,
  homeRailMusicVideosEnabled: true,
  homeRailNationalTrustEnabled: true,
  homeRailGamesEnabled: true
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
