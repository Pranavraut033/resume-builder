import { execFileSync, spawn } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const publicDir = path.join(root, "public");
const outputDir = path.join(root, "src-tauri", "resources", "next");
const distMcpDir = path.join(root, "dist-mcp");
const mcpOutputDir = path.join(outputDir, "mcp");

// tsup (tsup.mcp.config.ts) leaves some dependencies as plain `require(...)`
// calls rather than inlining them, and those in turn `require()` their OWN
// dependencies at runtime — transitively, arbitrarily deep. Two prior
// versions of this function guessed at that set (a hardcoded list, then a
// package.json-"dependencies" walk) and both shipped a build that crashed
// with a real Cannot-find-module error, because both guess from metadata
// instead of asking Node what it actually resolves. Walking package.json by
// name is specifically unsound here: npm nests a different version of a
// package (e.g. ajv) inside a dependency's own node_modules when a version
// conflict requires it (@modelcontextprotocol/sdk needs ajv@8, this repo's
// hoisted root ajv is an unrelated v6 with a different dependency set) — a
// name-only lookup silently reads the WRONG package.json and misses real
// transitive deps like fast-uri.
//
// So: actually run the two built entry points with a require-patching
// preload (same technique @vercel/nft/pkg/nexe use), record every absolute
// path Node resolves outside our own dist-mcp output, then copy exactly
// those package directories — preserving whatever nested-vs-hoisted
// structure npm actually laid out on disk, which is what makes Node's own
// module resolution find the right version at runtime instead of a
// same-named-but-wrong-version one three levels up.
const TRACE_PRELOAD = `
const Module = require("node:module");
const fs = require("node:fs");
const resolved = new Set();
const original = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  const result = original.call(this, request, ...rest);
  if (typeof result === "string" && result.includes("node_modules")) {
    resolved.add(result);
  }
  return result;
};
function flush() {
  try {
    fs.writeFileSync(process.env.__TRACE_OUTPUT__, JSON.stringify([...resolved]));
  } catch {}
}
process.on("exit", flush);
process.on("SIGTERM", () => {
  flush();
  process.exit(0);
});
`;

// Loading src/mcp/http.ts's built output runs its top-level main() (opens
// the DB, starts listening) as a side effect of require()ing it — that's
// the whole point of the trace (it has to actually load the real require
// graph), but it means this needs a scratch DB/port, and a deliberate kill
// once the (synchronous, require-time) graph has settled rather than a
// signal that the process would otherwise never send on its own.
async function traceRuntimeDependencies(entryFiles, traceDir) {
  const preloadPath = path.join(traceDir, "trace-preload.cjs");
  await writeFile(preloadPath, TRACE_PRELOAD);

  const resolvedPaths = new Set();

  for (const [index, entryFile] of entryFiles.entries()) {
    const outputPath = path.join(traceDir, `resolved-${index}.json`);
    const child = spawn(
      process.execPath,
      ["--require", preloadPath, entryFile],
      {
        cwd: distMcpDir,
        env: {
          ...process.env,
          DATABASE_URL: `file:${path.join(traceDir, "trace.db")}`,
          PORT: String(39500 + index),
          __TRACE_OUTPUT__: outputPath,
        },
        stdio: "ignore",
      }
    );

    // Give the (synchronous) require graph time to fully resolve before
    // killing — this is trace-time settle, not a health check; http.js
    // never exits on its own once its server is listening, but stdio.js
    // DOES (stdin is /dev/null here, so its transport sees immediate EOF
    // and exits cleanly well before this timeout) — `exit` only fires once
    // and isn't replayed, so attaching the listener after an early exit
    // already happened would hang this await forever. Check first.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }

    if (existsSync(outputPath)) {
      for (const p of JSON.parse(await readFile(outputPath, "utf8"))) {
        resolvedPaths.add(p);
      }
    }
  }

  return resolvedPaths;
}

// Symlinked packages (this repo's two `file:packages/...` submodule deps,
// e.g. @pranavraut033/llm-core) are the one case the require-trace above
// structurally can't see: Node resolves a symlinked module to its REAL
// filesystem path (packages/llm-core/..., not node_modules/@pranavraut033/
// llm-core/...) before Module._resolveFilename ever returns it, so the
// trace's own "does this path contain node_modules" filter excludes it —
// there's no node_modules segment left in the resolved path to find. Detect
// these by name (from the same simple require() scan used everywhere else
// in this file) and symlink-ness (lstat), not by walking package.json.
function directRequireSpecifierPackageNames(code) {
  const names = new Set();
  for (const match of code.matchAll(/require\(["']([^"'./][^"']*)["']\)/g)) {
    const specifier = match[1];
    const segments = specifier.split("/");
    names.add(
      specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0]
    );
  }
  return names;
}

// Given an absolute resolved file path, return its package's path relative
// to the node_modules directory that contains it — preserving any nested
// "node_modules/pkg/node_modules/pkg2" structure exactly as npm laid it out,
// e.g. "@modelcontextprotocol/sdk/node_modules/ajv" (not flattened to just
// "ajv", which is what caused the version-conflict bug this replaces).
function packageRelativePathFor(resolvedFile) {
  const marker = `${path.sep}node_modules${path.sep}`;
  const firstIndex = resolvedFile.indexOf(marker);
  if (firstIndex === -1) return null;

  const afterFirst = resolvedFile
    .slice(firstIndex + marker.length)
    .split(path.sep);
  const segments = [];
  let i = 0;
  while (i < afterFirst.length) {
    if (afterFirst[i].startsWith("@")) {
      segments.push(afterFirst[i], afterFirst[i + 1]);
      i += 2;
    } else {
      segments.push(afterFirst[i]);
      i += 1;
    }
    if (afterFirst[i] === "node_modules") {
      segments.push(afterFirst[i]);
      i += 1;
      continue;
    }
    break;
  }
  return segments.join("/");
}

// The end user isn't expected to have Node installed — Tauri's Rust side
// (src-tauri/src/lib.rs) spawns a bundled `node` binary rather than
// searching the system for one. That binary must be ABI-compatible with
// the native `better-sqlite3` module traced into the standalone output
// above, which was itself built against *this* script's own Node — so we
// just download and ship that exact same version, rather than pinning a
// separate version and rebuilding native modules against it.
// Node.js dist naming differs just enough per platform to need a small map:
// darwin/linux ship a .tar.gz with the binary at "<dir>/bin/node"; Windows
// ships a .zip with "node.exe" directly at the archive root (no bin/). Arch
// strings ("arm64"/"x64") are the same across all three, so os.arch() needs
// no translation. GitHub's windows-latest runner's bundled `tar` is bsdtar,
// which reads .zip too, so this stays a single `tar` invocation either way.
// Windows itself resolves an extension-less child-process path by trying
// "<name>.exe" (see src-tauri/src/lib.rs's node_bin path, which is not
// platform-branched) — untested on an actual Windows runner as of writing.
const NODE_DIST_PLATFORM = { darwin: "darwin", linux: "linux", win32: "win" };

async function downloadNodeRuntime() {
  const version = process.version; // e.g. "v24.9.0"
  const arch = os.arch(); // "arm64" | "x64"
  const platform = os.platform();
  const distPlatform = NODE_DIST_PLATFORM[platform];
  if (!distPlatform) {
    throw new Error(`Bundling a Node runtime isn't implemented for platform: ${platform}.`);
  }
  const isWindows = platform === "win32";
  const binaryName = isWindows ? "node.exe" : "node";
  const archiveExt = isWindows ? "zip" : "tar.gz";
  const archiveDirName = `node-${version}-${distPlatform}-${arch}`;
  const archiveMemberPath = isWindows
    ? `${archiveDirName}/node.exe`
    : `${archiveDirName}/bin/node`;

  const cacheDir = path.join(
    os.tmpdir(),
    "udaan-node-runtime-cache",
    `${version}-${arch}`
  );
  const cachedBinary = path.join(cacheDir, binaryName);

  if (!existsSync(cachedBinary)) {
    await mkdir(cacheDir, { recursive: true });
    const tarballName = `${archiveDirName}.${archiveExt}`;
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
      isWindows ? "-xf" : "-xzf",
      tarballPath,
      "-C",
      cacheDir,
      `--strip-components=${isWindows ? 1 : 2}`,
      archiveMemberPath,
    ]);
  }

  const outputBinDir = path.join(outputDir, "node-bin");
  await mkdir(outputBinDir, { recursive: true });
  const bundledBinary = path.join(outputBinDir, binaryName);
  await cp(cachedBinary, bundledBinary);
  await chmod(bundledBinary, 0o755);
}

/**
 * Bundles `src/mcp/{stdio,http}.ts` (built by `npm run build:mcp` into
 * `dist-mcp/`) into `resources/next/mcp/`, next to the already-bundled Next
 * server, so `src-tauri/src/mcp_server.rs::spawn_mcp_server` can reuse that
 * same bundled Node binary rather than shipping a second Node runtime — see
 * that file's own doc comments for the dev-vs-release DATABASE_URL split.
 */
async function bundleMcpServer() {
  // Always rebuild - dist-mcp existing from a previous run doesn't mean it's
  // current, and a stale bundle would silently ship without the latest
  // src/mcp changes.
  console.log("Running `npm run build:mcp`...");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  // .cmd shims aren't real executables — Windows needs cmd.exe to run them,
  // or execFileSync throws EINVAL instead of spawning anything.
  execFileSync(npm, ["run", "build:mcp"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  await mkdir(mcpOutputDir, { recursive: true });
  const entryFiles = ["stdio.js", "http.js"];
  for (const file of [...entryFiles, "stdio.js.map", "http.js.map"]) {
    const src = path.join(distMcpDir, file);
    if (existsSync(src)) {
      await cp(src, path.join(mcpOutputDir, file));
    }
  }

  // Bundled alongside stdio.js/http.js so `mcp_server.rs::export_cowork_plugin`
  // can package it into a downloadable plugin without any new tauri.conf.json
  // resources entry — it rides along inside the already-bundled mcp/ dir.
  const skillSrc = path.join(root, "skills", "resume-mcp", "SKILL.md");
  if (existsSync(skillSrc)) {
    const skillOutDir = path.join(mcpOutputDir, "skills", "resume-mcp");
    await mkdir(skillOutDir, { recursive: true });
    await cp(skillSrc, path.join(skillOutDir, "SKILL.md"));
  }

  const traceDir = await mkdtemp(path.join(os.tmpdir(), "mcp-trace-"));
  let resolvedPaths;
  try {
    resolvedPaths = await traceRuntimeDependencies(entryFiles, traceDir);
  } finally {
    await rm(traceDir, { recursive: true, force: true });
  }

  const outputNodeModules = path.join(outputDir, "node_modules");
  const packageRelativePaths = new Set();
  for (const resolvedFile of resolvedPaths) {
    // Only our own dist-mcp output resolves outside node_modules entirely
    // (its own directory) — everything real gets a relative path here.
    const rel = packageRelativePathFor(resolvedFile);
    if (rel) packageRelativePaths.add(rel);
  }

  for (const relPath of packageRelativePaths) {
    const dest = path.join(outputNodeModules, relPath);
    if (existsSync(dest)) continue;

    // Recover the real source directory by re-finding the same relative
    // path under a real node_modules on disk — every resolved path traced
    // above already came from somewhere with that exact structure, so any
    // resolved file whose path ends in `/node_modules/${relPath}/...`
    // points at the right source; take the first match.
    const marker = `${path.sep}node_modules${path.sep}${relPath}${path.sep}`;
    const exampleFile = [...resolvedPaths].find((p) => p.includes(marker));
    if (!exampleFile) continue; // relPath was itself a package root with no traced file under it — shouldn't happen
    const src = exampleFile.slice(
      0,
      exampleFile.indexOf(marker) + marker.length - 1
    );
    if (!existsSync(src)) continue;

    await mkdir(path.dirname(dest), { recursive: true });
    // dereference: some transitively-discovered packages can themselves be
    // symlinks too (not just the two submodules handled below) — copy real
    // contents so the bundled output stays self-contained either way.
    await cp(src, dest, { recursive: true, dereference: true });
  }

  // Symlinked direct dependencies (see directRequireSpecifierPackageNames's
  // doc comment) — the trace above can't see these at all.
  const directNames = new Set();
  for (const file of entryFiles) {
    const src = path.join(distMcpDir, file);
    if (!existsSync(src)) continue;
    for (const name of directRequireSpecifierPackageNames(
      await readFile(src, "utf8")
    )) {
      directNames.add(name);
    }
  }
  for (const name of directNames) {
    const dest = path.join(outputNodeModules, name);
    if (existsSync(dest)) continue;

    const src = path.join(root, "node_modules", name);
    let stats;
    try {
      stats = await lstat(src);
    } catch {
      continue;
    }
    if (!stats.isSymbolicLink()) continue; // real node_modules entries are the trace's job

    await mkdir(path.dirname(dest), { recursive: true });
    await cp(src, dest, { recursive: true, dereference: true });
  }
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
  // And .cmd shims aren't real executables — Windows needs cmd.exe to run
  // them, or execFileSync throws EINVAL instead of spawning anything.
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
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" }
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
  await bundleMcpServer();

  console.log("Prepared bundled Next standalone server for Tauri:", outputDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
