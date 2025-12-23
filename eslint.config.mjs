import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-warning-comments": [
        "warn",
        { terms: ["todo", "fixme"], location: "anywhere" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores:
    "src-tauri/**",
    "drizzle/meta/_journal.json",
    "drizzle/0000_*.sql",
    "dist/**",
  ]),
]);

export default eslintConfig;
