(async function () {
  const config = window.APP_CONFIG || {};
  const container = document.getElementById("metadataContent");

  function normalise(value) {
    return (value || "").toString().trim();
  }

  function slugTitle(title) {
    const params = new URLSearchParams();
    params.set("fl", title);
    return `../title/?${params.toString()}`;
  }

  function splitList(value) {
    return normalise(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const character = text[i];
      const next = text[i + 1];

      if (character === '"' && inQuotes && next === '"') {
        current += '"';
        i++;
        continue;
      }

      if (character === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (character === "," && !inQuotes) {
        row.push(current);
        current = "";
        continue;
      }

      if ((character === "\n" || character === "\r") && !inQuotes) {
        if (character === "\r" && next === "\n") i++;
        row.push(current);
        current = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
        continue;
      }

      current += character;
    }

    row.push(current);
    if (row.length > 1 || row[0] !== "") rows.push(row);

    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows.length) return [];

    const headers = rows[0].map(normalise);

    return rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });
  }

  async function loadMetadata() {
    const response = await fetch(config.TITLE_METADATA_CSV, {
      cache: "no-store"
    });

    const csv = await response.text();
    return rowsToObjects(parseCSV(csv));
  }

  function buildMap(rows, column) {
    const map = new Map();

    rows.forEach((row) => {
      const title = normalise(row.title);
      if (!title) return;

      splitList(row[column]).forEach((entry) => {
        if (!map.has(entry)) {
          map.set(entry, []);
        }

        map.get(entry).push(title);
      });
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
  }

  function renderSection(title, items) {
    return `
      <section class="meta-section">
        <h2>${title}</h2>
        <div class="meta-group-grid">
          ${items.map(([name, titles]) => `
            <article class="meta-group">
              <h3 class="meta-group-title">${name}</h3>
              <div class="meta-links">
                ${titles
                  .sort((a, b) => a.localeCompare(b))
                  .map((title) => `
                    <a class="meta-link" href="${slugTitle(title)}">${title}</a>
                  `)
                  .join("")}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  try {
    const rows = await loadMetadata();

    const stars = buildMap(rows, "stars");
    const directors = buildMap(rows, "directors");
    const genres = buildMap(rows, "genre");
    const ratings = buildMap(rows, "uk rating");

    container.innerHTML = [
      renderSection("Stars", stars),
      renderSection("Directors", directors),
      renderSection("Genres", genres),
      renderSection("UK Ratings", ratings)
    ].join("");
  } catch (error) {
    console.error(error);

    container.innerHTML = `
      <section class="meta-section">
        <h2>Could not load metadata</h2>
        <p>Please try again later.</p>
      </section>
    `;
  }
})();