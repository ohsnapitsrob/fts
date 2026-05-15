const fs = require("fs");
const path = require("path");

const branch = process.env.CF_PAGES_BRANCH || process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || "local";
const commit = (process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || "local").slice(0, 7);
const environment = branch === "main" ? "live" : "staging";
const builtAt = new Date().toISOString();

const content = `window.RUNTIME_CONFIG = ${JSON.stringify({
  environment,
  branch,
  commit,
  builtAt
}, null, 2)};\n`;

fs.writeFileSync(path.join(process.cwd(), "runtime-config.js"), content);
console.log(`Generated runtime-config.js for ${environment}.${commit}`);
