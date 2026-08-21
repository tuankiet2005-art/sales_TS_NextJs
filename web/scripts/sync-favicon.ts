/**
 * Apply the newest dropped brand image, commit generated icons, and push.
 * Source: public/brand/favicon-drop/
 */
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { applyFavicon, findDroppedSource } from "./apply-favicon";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(webRoot, "..");

function run(cmd: string, cwd = repoRoot) {
  return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function runQuiet(cmd: string, cwd = repoRoot) {
  try {
    return run(cmd, cwd);
  } catch {
    return "";
  }
}

function ensureFeatureBranch() {
  const branch = run("git branch --show-current");
  const defaultBranch =
    runQuiet("git rev-parse --abbrev-ref origin/HEAD").replace(/^origin\//, "") || "main";
  if (branch === defaultBranch || branch === "main" || branch === "master") {
    const next = "chore/update-favicon";
    runQuiet(`git checkout -b ${next}`);
    return next;
  }
  return branch;
}

async function main() {
  const source = findDroppedSource();
  if (!source) {
    console.log(JSON.stringify({ ok: false, reason: "no-source" }));
    return;
  }

  const result = await applyFavicon(source);
  const iconRel = "web/src/app/icon.png";
  const appleRel = "web/src/app/apple-icon.png";

  run(`git add ${iconRel} ${appleRel}`);
  runQuiet("git add -u web/src/app/favicon.ico");

  const staged = runQuiet("git diff --cached --name-only");
  if (!staged) {
    console.log(JSON.stringify({ ok: true, pushed: false, reason: "no-git-changes", ...result }));
    return;
  }

  const branch = ensureFeatureBranch();
  run(
    `git commit -m "$(cat <<'EOF'
chore(web): update OnRoad favicon from brand drop folder

EOF
)"`,
  );
  run(`git push -u origin ${branch}`);

  console.log(
    JSON.stringify({
      ok: true,
      pushed: true,
      branch,
      source: result.source,
      icon: result.iconPath,
      appleIcon: result.applePath,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
