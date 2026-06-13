import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
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

  // Copy the standalone server bundle (includes server.js + traced node_modules).
  await cp(standaloneDir, outputDir, { recursive: true });

  // Next expects static assets at .next/static relative to server.js.
  const outputStaticDir = path.join(outputDir, ".next", "static");
  await mkdir(path.dirname(outputStaticDir), { recursive: true });
  await cp(staticDir, outputStaticDir, { recursive: true });

  if (existsSync(publicDir)) {
    await cp(publicDir, path.join(outputDir, "public"), { recursive: true });
  }

  console.log("Prepared bundled Next standalone server for Tauri:", outputDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
