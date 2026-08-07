# Udaan — Landing Page

Standalone marketing site for [Udaan](https://github.com/Pranavraut033/resume-builder),
built with Astro + Tailwind CSS v4. Fully isolated from the main app — it has its own
`package.json` and shares no code with the Next.js/Tauri project.

## Commands

```sh
npm install       # install dependencies
npm run dev       # dev server at http://localhost:4321
npm run build     # static build to ./dist
npm run preview   # preview the production build locally
```

## Notes

- Static output only (`output: 'static'` in `astro.config.mjs`) — no SSR, no backend.
- Pages (`src/pages/`) are composed from section components in `src/components/sections/`
  (Hero, Features, Ats, CoverLetters, HowItWorks, Comparison, Faq, Stats, Mcp, FinalCta,
  etc.) — one file per landing-page section, not one monolithic page.
- `src/content/blog/` is an Astro content collection (`src/content.config.ts`) rendered at
  `/blog` and `/blog/[...slug]`; `/faq` reads `src/data/faqs.ts`.
- Design tokens live in `src/styles/global.css` (`@theme` block); they are lifted from the
  main app's `src/styles/global.css` (primary blue scale, blocky yellow `#eab308` + its
  hard-offset shadow, agent-theme dark surfaces) but redefined here, not imported across
  the boundary.
- Fonts are self-hosted via Fontsource: Instrument Serif (display), Geist Sans (body),
  Geist Mono (diff/code) — Geist matches the app's typography.
- Scroll interactions (pinned hero, word-by-word hook reveal, sticky how-it-works
  walkthrough) run off one vanilla-JS rAF handler writing `--sp`/`--dp` custom properties;
  everything is gated on `.motion-ok`, so no-JS and reduced-motion get a static page.
- `Media.astro` (`src/lib/media.ts`) resolves `name` to a real screenshot/clip under
  `public/screenshots/` at build time; real media now exists for most sections, and the
  dashed-frame placeholder only renders as a fallback when a named file is missing.
