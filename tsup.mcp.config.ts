import { defineConfig } from "tsup";

// Separate from any future app-wide tsup config (there isn't one today —
// the Next.js app itself builds via `next build`) because this is the only
// part of the repo that needs to be bundled as a plain Node entry point.
// `src/mcp/**` uses the same `@/*` -> `./src/*` alias as the rest of the
// app (root tsconfig.json), which esbuild does NOT resolve on its own —
// tsup's `tsconfig` option wires esbuild's tsconfig-paths handling for it.
export default defineConfig({
  entry: {
    stdio: "src/mcp/stdio.ts",
    http: "src/mcp/http.ts",
  },
  outDir: "dist-mcp",
  // CJS (not ESM) specifically so the output lands as plain `.js` without
  // needing a `dist-mcp/package.json` with `"type": "module"` to tell Node
  // how to interpret it — the root package.json has no top-level `"type"`,
  // so a bare `.js` here defaults to CommonJS interpretation already.
  format: "cjs",
  platform: "node",
  target: "node22",
  tsconfig: "./tsconfig.json",
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  // better-sqlite3 ships a native .node binding — bundling it breaks the
  // require(); keep it (and the two DB submodule packages, which have their
  // own native/optional deps) external and let Node resolve them from
  // node_modules at runtime instead.
  external: [
    "better-sqlite3",
    "@prisma/client",
    "@prisma/adapter-better-sqlite3",
    "@pranavraut033/llm-core",
    "@pranavraut033/ats-checker",
  ],
});
