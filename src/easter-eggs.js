window.FTS = window.FTS || {};

(function () {
  function enabled() {
    return window.FTS?.Features?.isEnabled("easterEggsEnabled") !== false;
  }

  function normalise(value) {
    return (value || "").toString().trim().toLowerCase();
  }

  function logQuotes() {
    console.log(
      "%c Roads? Where we're going, we don't need roads. %c- Dr. Emmett Brown, Back to the Future (1985)",
      "color: black; background: white; font-weight: bold;",
      "color: #888888; background: white;"
    );
  }

  function getTitleSearchNoResultsMessage(query) {
    if (!enabled()) return "";

    const normalisedQuery = normalise(query);

    if (!normalisedQuery.includes("back to the future")) return "";

    return "“I guess you guys aren't ready for that yet. But your kids are gonna love it.” — Marty McFly, Back to the Future (1985). We couldn't find any Back to the Future filming location in our database just yet.";
  }

  function init() {
    if (!enabled()) return;

    logQuotes();
  }

  FTS.EasterEggs = {
    init,
    getTitleSearchNoResultsMessage
  };

  init();
})();
