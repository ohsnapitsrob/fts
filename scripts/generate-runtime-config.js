const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function firstValue(...values) {
  return values.find((value) => value && value !== "undefined" && value !== "null") || "";
}

function runGit(command) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch (err) {
    return "";
  }
}

function shortCommit(value) {
  const commit = firstValue(value);
  return commit ? commit.slice(0, 7) : "local";
}

function branchFromRef(value) {
  const ref = firstValue(value);
  if (!ref) return "";
  return ref.replace(/^refs\/heads\//, "");
}

function inferBranchFromUrl(value) {
  const url = firstValue(value);
  if (!url) return "";

  try {
    const host = new URL(url).hostname;
    const firstPart = host.split(".")[0];

    if (firstPart && firstPart !== "www") {
      return firstPart;
    }
  } catch (err) {}

  return "";
}

const gitBranch = runGit("git branch --show-current") || runGit("git rev-parse --abbrev-ref HEAD");
const gitCommit = runGit("git rev-parse HEAD");

const branch = firstValue(
  process.env.CF_PAGES_BRANCH,
  process.env.CLOUDFLARE_PAGES_BRANCH,
  process.env.BRANCH_NAME,
  process.env.BRANCH,
  process.env.GITHUB_HEAD_REF,
  process.env.GITHUB_REF_NAME,
  branchFromRef(process.env.GITHUB_REF),
  gitBranch,
  inferBranchFromUrl(process.env.CF_PAGES_URL),
  "local"
);

const commit = shortCommit(
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.CLOUDFLARE_PAGES_COMMIT_SHA ||
  process.env.COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  gitCommit
);

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
console.log(`Branch source value: ${branch}`);
console.log(`Commit source value: ${commit}`);
