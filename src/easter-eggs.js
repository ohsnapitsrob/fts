window.FTS = window.FTS || {};

(function () {
  function enabled() {
    return window.FTS?.Features?.isEnabled("easterEggsEnabled") !== false;
  }

  function logQuotes() {
    console.log(
      "%c Roads? Where we're going, we don't need roads. %c- Dr. Emmett Brown, Back to the Future (1985)",
      "color: black; font-weight: bold;",
      "color: #888888;"
    );
  }

  function init() {
    if (!enabled()) return;

    logQuotes();
  }

  FTS.EasterEggs = {
    init
  };

  init();
})();
