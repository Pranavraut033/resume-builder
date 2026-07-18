import type { NextConfig } from "next";
import type { Compiler } from "webpack";

/**
 * Webpack plugin (dev-only) that stamps `x_google_ignoreList` onto every
 * source map whose `sources` array contains one of the listed path fragments.
 *
 * Chrome DevTools reads this field and automatically hides the matching
 * frames from call-stack panels — the same mechanism used for node_modules.
 * See: https://developer.chrome.com/blog/x-google-ignore-list
 */
class SourceIgnoreListPlugin {
  constructor(private readonly fragments: string[]) {}

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap("SourceIgnoreListPlugin", (compilation) => {
      // Run after source maps are finalised but before assets are emitted.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wp = (compiler as any).webpack as typeof import("webpack");
      compilation.hooks.processAssets.tap(
        {
          name: "SourceIgnoreListPlugin",
          stage: wp.Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING,
        },
        () => {
          for (const name of Object.keys(compilation.assets)) {
            if (!name.endsWith(".map")) continue;

            const asset = compilation.getAsset(name);
            if (!asset) continue;

            let map: Record<string, unknown>;
            try {
              map = JSON.parse(asset.source.source().toString()) as Record<
                string,
                unknown
              >;
            } catch {
              continue;
            }

            const sources = map.sources as string[] | undefined;
            if (!sources?.length) continue;

            const ignoreList = sources.reduce<number[]>((acc, src, idx) => {
              if (this.fragments.some((f) => src.includes(f))) acc.push(idx);
              return acc;
            }, []);

            if (!ignoreList.length) continue;

            map.x_google_ignoreList = ignoreList;
            compilation.updateAsset(
              name,
              new wp.sources.RawSource(JSON.stringify(map))
            );
          }
        }
      );
    });
  }
}

// Tauri's main window loads this server directly via an external URL
// (`http://127.0.0.1:3008`) rather than through Tauri's `tauri://` asset
// protocol, so `security.csp` in tauri.conf.json is never actually injected
// into the window — Tauri only sets that header for its own protocol.
// Enforcement has to happen here instead, at the source.
const CSP = [
  "default-src 'self'",
  "connect-src 'self' http://127.0.0.1:3008 http://localhost:3008 https:",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "font-src 'self' data:",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: CSP }],
      },
    ];
  },
  // Turbopack is the default bundler in Next.js 16+.
  // An empty config here silences the "webpack config present but no turbopack config" warning.
  turbopack: {},
  // Tauri's webview loads the dev server via 127.0.0.1 rather than localhost.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Turbopack dev keeps every compiled module version in memory with no
    // eviction, so RSS climbs unbounded over a long session on a bundle
    // this size (WYSIWYG + PDF + TXT render engines). Cap it so it evicts
    // instead of growing to 8-9GB+.
    turbopackMemoryLimit: 2 * 1024 * 1024 * 1024,
  },
  typescript: {
    // `npm run type-check` already gates every push/PR via
    // `.github/workflows/ci.yml`. Next's own in-build type-check duplicates
    // that work on every CI platform and, with this project's
    // submodule-heavy type graph, runs 25-38min and OOMs even at an 8GB heap
    // in CI — so skip it here rather than chase heap size.
    ignoreBuildErrors: true,
  },
  webpack(config, { dev, isServer }) {
    // Only needed in the browser bundle during development.
    if (dev && !isServer) {
      config.plugins.push(new SourceIgnoreListPlugin(["lib/logger"]));
    }
    return config;
  },
};

export default nextConfig;
