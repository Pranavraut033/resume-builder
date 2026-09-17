import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "unused-imports": unusedImports,
      import: importPlugin,
    },
    ignores: ["tests/**", "src/__tests__/**"],
    rules: {
      // Import management
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      // Disabled until all TODOs are resolved
      // "no-warning-comments": [
      //   "warn",
      //   { terms: ["todo", "fixme"], location: "anywhere" },
      // ],

      // TypeScript specific
      "@typescript-eslint/no-explicit-any": "error",
      // Disabled in favor of unused-imports/no-unused-vars
      "@typescript-eslint/no-unused-vars": "off",

      // React/Next.js best practices
      "react/no-unescaped-entities": "off",
      // "react-hooks/exhaustive-deps": "warn",

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  {
    // Server = database only (CLAUDE.md hard rule 1): a Server Action or
    // route handler must never import client-only modules — keyStorage,
    // any LLM/provider code, Zustand stores, or the Tauri SDK. This is the
    // regression guard for the class of bug that broke the email tracker:
    // those modules fail differently outside a browser (some throw, some
    // silently return null), so without this the breakage is invisible
    // until you actually run the server path.
    files: ["src/actions/**/*.{ts,tsx}", "src/app/api/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/keyStorage",
              message: "Server = database only. keyStorage is client-only.",
            },
            {
              name: "@/lib/email/gmailClient",
              message: "Server = database only. gmailClient is client-only.",
            },
          ],
          patterns: [
            {
              group: ["@/lib/llm/*", "@/lib/llm"],
              message: "LLM calls are client-only (CLAUDE.md hard rule 1).",
              allowTypeImports: true,
            },
            {
              group: ["@/store/*", "@/store"],
              message: "Zustand stores don't hydrate server-side.",
              allowTypeImports: true,
            },
            {
              group: ["@tauri-apps/*"],
              message: "Tauri APIs are client/webview-only.",
            },
          ],
        },
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
    "**/dist/**",
    "dist-mcp/**",
    "node_modules/**",
    ".vscode/**",
    "prisma/migrations/**",
    "landing/**",
    "packages/**",
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
