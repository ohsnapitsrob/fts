(function () {
  const content = window.FTS?.SiteContent;

  if (!content) return;

  function ensureStyles() {
    if (document.getElementById("fts-disclaimer-style")) return;

    const style = document.createElement("style");
    style.id = "fts-disclaimer-style";

    style.textContent = `
      .fts-site-disclaimer {
        display: block;
        width: 100%;
        max-width: 100%;
        margin: 34px auto 0;
        color: #5f5f5f !important;
        font-size: 8px !important;
        line-height: 12px !important;
        font-weight: 400 !important;
        letter-spacing: normal !important;
        text-align: left !important;
        opacity: 0.95;
      }

      .fts-site-disclaimer p {
        display: block;
        margin: 0 0 10px !important;
        padding: 0 !important;
        color: inherit !important;
        font-size: inherit !important;
        line-height: inherit !important;
        font-weight: inherit !important;
        letter-spacing: inherit !important;
        text-align: inherit !important;
      }

      .fts-site-disclaimer p:last-child {
        margin-bottom: 0 !important;
      }

      .fts-site-disclaimer a {
        color: #5f5f5f !important;
        text-decoration: none !important;
        font-size: inherit !important;
        line-height: inherit !important;
      }
    `;

    document.head.appendChild(style);
  }

  function render() {
    if (document.querySelector(".fts-site-disclaimer")) return;

    const target = document.querySelector("[data-site-disclaimer]");
    if (!target) return;

    const footer = document.createElement("section");
    footer.className = "fts-site-disclaimer";

    const paragraphs = [
      ...(content.disclaimer || []),
      `${content.contactCopy || ""} <a href="mailto:${content.contactEmail}">${content.contactEmail}</a>.`
    ];

    footer.innerHTML = paragraphs
      .filter(Boolean)
      .map((text) => `<p>${text}</p>`)
      .join("");

    target.appendChild(footer);
  }

  ensureStyles();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
