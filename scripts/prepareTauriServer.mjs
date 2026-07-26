import { execFileSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const publicDir = path.join(root, "public");
const outputDir = path.join(root, "src-tauri", "resources", "next");

// The end user isn't expected to have Node installed — Tauri's Rust side
// (src-tauri/src/lib.rs) spawns a bundled `node` binary rather than
// searching the system for one. That binary must be ABI-compatible with
// the native `better-sqlite3` module traced into the standalone output
// above, which was itself built against *this* script's own Node — so we
// just download and ship that exact same version, rather than pinning a
// separate version and rebuilding native modules against it.
// ponytail: darwin only (matches this repo's actual build/ship platform).
// Add win32/linux dist URL + archive mapping here when that's needed.
async function downloadNodeRuntime() {
  const version = process.version; // e.g. "v24.9.0"
  const arch = os.arch(); // "arm64" | "x64"
  if (os.platform() !== "darwin") {
    throw new Error(
      `Bundling a Node runtime is only implemented for macOS right now (platform: ${os.platform()}).`
    );
  }

  const cacheDir = path.join(
    os.tmpdir(),
    "udaan-node-runtime-cache",
    `${version}-${arch}`
  );
  const cachedBinary = path.join(cacheDir, "node");

  if (!existsSync(cachedBinary)) {
    await mkdir(cacheDir, { recursive: true });
    const tarballName = `node-${version}-darwin-${arch}.tar.gz`;
    const url = `https://nodejs.org/dist/${version}/${tarballName}`;
    const tarballPath = path.join(cacheDir, tarballName);

    console.log(`Downloading Node runtime for bundling: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download ${url}: ${response.status} ${response.statusText}`
      );
    }
    await finished(
      Readable.fromWeb(response.body).pipe(createWriteStream(tarballPath))
    );

    execFileSync("tar", [
      "-xzf",
      tarballPath,
      "-C",
      cacheDir,
      "--strip-components=2",
      `node-${version}-darwin-${arch}/bin/node`,
    ]);
  }

  const outputBinDir = path.join(outputDir, "node-bin");
  await mkdir(outputBinDir, { recursive: true });
  const bundledBinary = path.join(outputBinDir, "node");
  await cp(cachedBinary, bundledBinary);
  await chmod(bundledBinary, 0o755);
}

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
  // execFileSync skips the shell, so on Windows it needs the literal .cmd
  // shim name — a bare "npx" only resolves via PATHEXT under a real shell.
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  execFileSync(
    npx,
    [
      "prisma",
      "db",
      "push",
      "--accept-data-loss",
      `--url=file:${templateDbPath}`,
    ],
    { cwd: root, stdio: "inherit" }
  );
  await cp(templateDbPath, path.join(outputDir, "app-template.db"));
  await rm(templateDir, { recursive: true, force: true });

  // Ships alongside app-template.db so Rust can diff an existing app.db
  // against it on every launch and apply any schema drift — see
  // src-tauri/src/lib.rs::sync_database_schema and migrate-app-db.mjs.
  await cp(
    path.join(root, "scripts", "migrate-app-db.mjs"),
    path.join(outputDir, "migrate-app-db.mjs")
  );

  await downloadNodeRuntime();

  console.log("Prepared bundled Next standalone server for Tauri:", outputDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
