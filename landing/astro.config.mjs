// @ts-check
import { existsSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Custom domain (landing/public/CNAME) serves from "/"; without it GitHub
// Pages serves this project at github.io/resume-builder, so base must match.
const hasCustomDomain = existsSync(new URL("./public/CNAME", import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: "static",
  site: hasCustomDomain
    ? "https://udaan.pranavraut.dev"
    : "https://pranavraut033.github.io",
  base: hasCustomDomain ? "/" : "/resume-builder",
  vite: {
    plugins: [tailwindcss()],
  },
});
