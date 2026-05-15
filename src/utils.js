window.FTS = window.FTS || {};

FTS.Utils = (function () {
  function norm(value) {
    return (value || "").toString().trim();
  }

  function normalizeComparable(value) {
    return norm(value).toLowerCase();
  }

  function splitPipe(value) {
    const text = norm(value);
    if (!text) return [];
    return text.split("|").map(norm).filter(Boolean);
  }

  function splitComma(value) {
    const text = norm(value);
    if (!text) return [];
    return text.split(",").map(norm).filter(Boolean);
  }

  function coerceNumber(value) {
    const number = Number((value ?? "").toString().trim());
    return Number.isFinite(number) ? number : null;
  }

  function normalizeType(type) {
    const value = normalizeComparable(type);

    if (!value) return "Misc";
    if (value === "film" || value === "movie" || value === "movies") return "Film";
    if (value === "tv" || value === "tv show" || value === "tv shows" || value === "series") return "TV";
    if (value === "music video" || value === "music videos" || value === "mv") return "Music Video";
    if (value === "game" || value === "games" || value === "video game" || value === "video games") return "Video Game";
    if (value === "misc" || value === "other") return "Misc";

    return norm(type);
  }

  function displayType(type) {
    if (type === "Film") return "Movie";
    if (type === "TV") return "TV Show";
    return type;
  }

  function typeColor(type) {
    const colors = {
      Film: "#2563eb",
      TV: "#16a34a",
      "Music Video": "#db2777",
      Misc: "#6b7280",
      "Video Game": "#FFA500"
    };

    return colors[type] || colors.Misc;
  }

  function formatNumber(number) {
    return Number(number || 0).toLocaleString();
  }

  function plural(number, one, many) {
    return `${formatNumber(number)} ${number === 1 ? one : many}`;
  }

  function labelForCount(number, one, many) {
    return number === 1 ? one : many;
  }

  function escapeHtml(value) {
    return (value || "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeUrl(url) {
    const value = norm(url);
    if (!value) return "";

    try {
      const parsed = new URL(value);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
    } catch (err) {
      return "";
    }

    return "";
  }

  function parseVisitedDate(value) {
    const raw = norm(value);
    if (!raw) return null;

    const cleaned = raw.replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1");
    const timestamp = Date.parse(cleaned);

    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function getAccessValue(row) {
    return norm(
      row.access ||
      row.Access ||
      row.ACCESS ||
      row["access "] ||
      row["Access "] ||
      row["No Access"] ||
      row.noaccess ||
      row.NOACCESS
    );
  }

  function hasNoAccess(row) {
    return norm(row.access) !== "";
  }

  function getNationalTrustName(row) {
    return norm(
      row.NationalTrust ||
      row["National Trust"] ||
      row.nt ||
      row.NT
    );
  }

  function getNationalTrustUrl(row) {
    return norm(
      row.NTURL ||
      row["NT URL"] ||
      row.nturl ||
      row.ntUrl
    );
  }

  function normalizeRating(value) {
    const rating = normalizeComparable(value);
    const aliases = {
      red: "red",
      bad: "red",
      orange: "orange",
      average: "orange",
      green: "green",
      good: "green",
      blue: "blue",
      inspo: "blue",
      inspiration: "blue",
      "inspiration location": "blue"
    };

    return aliases[rating] || "";
  }

  function getYouTubeEmbedUrl(value) {
    const raw = norm(value);
    if (!raw) return "";

    const embedBase = "https://www.youtube-nocookie.com/embed/";

    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return `${embedBase}${raw}`;

    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "");

      if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
        const id = url.searchParams.get("v");
        if (id) return `${embedBase}${id}`;
      }

      if (host === "youtu.be") {
        const id = url.pathname.split("/").filter(Boolean)[0];
        if (id) return `${embedBase}${id}`;
      }

      if ((host === "youtube.com" || host === "youtube-nocookie.com") && url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/").filter(Boolean)[1];
        if (id) return `${embedBase}${id}`;
      }
    } catch (err) {
      return "";
    }

    return "";
  }

  return {
    norm,
    normalizeComparable,
    splitPipe,
    splitComma,
    coerceNumber,
    normalizeType,
    displayType,
    typeColor,
    formatNumber,
    plural,
    labelForCount,
    escapeHtml,
    safeUrl,
    parseVisitedDate,
    getAccessValue,
    hasNoAccess,
    getNationalTrustName,
    getNationalTrustUrl,
    normalizeRating,
    getYouTubeEmbedUrl
  };
})();
