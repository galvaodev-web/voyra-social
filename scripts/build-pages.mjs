import { mkdir, rename, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const moves = [
  ["app/api", ".next-pages-disabled/api"],
  ["app/recap", ".next-pages-disabled/recap"],
  ["app/auth/callback/route.ts", ".next-pages-disabled/auth-callback-route.ts"],
];

async function moveIfExists(from, to) {
  if (!existsSync(from)) return false;
  await mkdir(path.dirname(to), { recursive: true });
  await rename(from, to);
  return true;
}

async function restore(doneMoves) {
  for (const [from, to] of doneMoves.toReversed()) {
    if (existsSync(to)) await rename(to, from);
  }
}

function runBuild() {
  return new Promise((resolve, reject) => {
    const env = Object.fromEntries(
      Object.entries({
        ...process.env,
        NEXT_PUBLIC_DEPLOY_TARGET: "github-pages",
      }).filter((entry) => entry[1] !== undefined),
    );
    const child = spawn(process.execPath, [
      path.join("node_modules", "next", "dist", "bin", "next"),
      "build",
    ], {
      stdio: "inherit",
      env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`next build exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

const doneMoves = [];

try {
  await rm(".next", { recursive: true, force: true });
  for (const [from, to] of moves) {
    if (await moveIfExists(from, to)) doneMoves.push([from, to]);
  }
  await runBuild();
} finally {
  await restore(doneMoves);
}
