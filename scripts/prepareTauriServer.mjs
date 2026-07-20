import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const publicDir = path.join(root, "public");
const outputDir = path.join(root, "src-tauri", "resources", "next");

async function main() {
  if (!existsSync(standaloneDir)) {
    throw new Error(
      'Next standalone output not found. Run `next build` with output: "standalone" first.'
    );
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  // dereference: Prisma's generated client is traced in as a symlink pointing
  // back into this repo's own .next/standalone — without dereferencing, the
  // bundled output isn't self-contained and breaks the moment the source
  // .next/standalone is rebuilt or removed.
  await cp(standaloneDir, outputDir, { recursive: true, dereference: true });

  // Next expects static assets at .next/static relative to server.js.
  const outputStaticDir = path.join(outputDir, ".next", "static");
  await mkdir(path.dirname(outputStaticDir), { recursive: true });
  await cp(staticDir, outputStaticDir, { recursive: true });

  if (existsSync(publicDir)) {
    await cp(publicDir, path.join(outputDir, "public"), { recursive: true });
  }

  // Next copies the build-time .env into the standalone output, which would
  // ship build secrets (e.g. TAURI_SIGNING_PRIVATE_KEY) inside every install.
  // Runtime env (DATABASE_URL, PORT, HOSTNAME, NODE_ENV) is injected by Tauri
  // when it spawns server.js, so this file isn't needed at runtime.
  const bundledEnv = path.join(outputDir, ".env");
  if (existsSync(bundledEnv)) {
    await rm(bundledEnv);
  }

  // A fresh install's app-data dir has no `app.db` — better-sqlite3 just
  // creates an empty file with no tables (see src/lib/prisma.ts), so every
  // Server Action fails with "table does not exist" until someone runs
  // `db:push` by hand. Ship an already-migrated, empty database instead, so
  // Rust (src-tauri/src/lib.rs) can seed it on first launch.
  const templateDir = await mkdtemp(path.join(os.tmpdir(), "app-db-template-"));
  const templateDbPath = path.join(templateDir, "app-template.db");
  execFileSync(
    "npx",
    ["prisma", "db", "push", "--accept-data-loss", `--url=file:${templateDbPath}`],
    { cwd: root, stdio: "inherit" }
  );
  await cp(templateDbPath, path.join(outputDir, "app-template.db"));
  await rm(templateDir, { recursive: true, force: true });

  console.log("Prepared bundled Next standalone server for Tauri:", outputDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
