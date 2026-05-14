(function () {
  const content = window.FTS?.SiteContent;

  if (!content) return;

  function ensureStyles() {
    if (document.getElementById("fts-disclaimer-style")) return;

    const style = document.createElement("style");
    style.id = "fts-disclaimer-style";

    style.textContent = `
      .fts-site-disclaimer {
        margin-top: 48px;
        padding: 20px 18px;
        border-top: 1px solid rgba(229, 231, 235, 0.9);
        color: #6b7280;
        font-size: 11px;
        line-height: 1.7;
      }

      .fts-site-disclaimer p {
        margin: 0 0 12px;
      }

      .fts-site-disclaimer p:last-child {
        margin-bottom: 0;
      }

      .fts-site-disclaimer a {
        color: inherit;
        text-decoration: none;
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
