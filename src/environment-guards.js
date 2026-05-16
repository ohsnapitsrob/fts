window.FTS = window.FTS || {};

(function () {
  function environment() {
    return window.RUNTIME_CONFIG?.environment || "live";
  }

  function currentPath() {
    return window.location.pathname.replace(/\/+$/, "/");
  }

  function blocked() {
    const rules = window.FTS?.EnvironmentRules || {};
    const env = environment();
    const path = currentPath();

    if (
      env === "live" &&
      (rules.blockedOnLive || []).includes(path)
    ) {
      return true;
    }

    if (
      env === "staging" &&
      (rules.blockedOnStaging || []).includes(path)
    ) {
      return true;
    }

    return false;
  }

  function redirectTo404() {
    window.location.replace("/404.html");
  }

  function init() {
    if (blocked()) {
      redirectTo404();
    }
  }

  FTS.EnvironmentGuards = {
    init,
    blocked
  };
})();
