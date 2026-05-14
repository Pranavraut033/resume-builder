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
    ignores:['tests/**', 'src/__tests__/**'],
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
      "react-hooks/exhaustive-deps": "warn",

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
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
    "node_modules/**",
    ".vscode/**",
    "prisma/migrations/**",
  ]),
]);

export default eslintConfig;
