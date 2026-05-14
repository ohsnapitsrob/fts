window.FTS = window.FTS || {};

FTS.AppHeaderMapSearch = (function () {
  function init(button) {
    function showButton() {
      button?.classList.remove("is-hidden");
    }

    function hideButton() {
      button?.classList.add("is-hidden");
    }

    function closeMapSearch() {
      const topbar = document.querySelector(".topbar");
      if (!topbar) return;

      topbar.classList.remove("fts-map-search-open");
      showButton();
    }

    window.FTSHeaderSearch = {
      open() {
        const topbar = document.querySelector(".topbar");
        const input = document.getElementById("search");

        if (!topbar || !input) return;

        topbar.classList.add("fts-map-search-open");
        hideButton();
        input.focus();
        input.select();
      }
    };

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMapSearch();
    });

    document.getElementById("resetFilter")?.addEventListener("click", closeMapSearch);
    document.getElementById("resultsCloseBtn")?.addEventListener("click", () => {
      const input = document.getElementById("search");
      if (!input || !input.value.trim()) closeMapSearch();
    });

    document.getElementById("search")?.addEventListener("blur", () => {
      window.setTimeout(() => {
        const input = document.getElementById("search");
        const resultsModal = document.getElementById("resultsModal");
        const hasQuery = Boolean(input?.value.trim());
        const resultsOpen = resultsModal?.classList.contains("open");

        if (!hasQuery && !resultsOpen) closeMapSearch();
      }, 150);
    });
  }

  return {
    init
  };
})();
