# Quick Style Guide — Agents & Copilot (Tailwind-first)

Purpose: Minimal rules for consistent agent UIs — Tailwind-only, spacing-first, accessible, modern SaaS feel.

Principles:
- Tailwind-only utilities; prefer semantic tokens (`bg-primary/10`, `text-muted`).
- Spacing-first: use `gap`, `p-*`, `space-y-*` for layout.
- Use `rounded-lg` / `rounded-xl`, subtle shadows (`shadow-sm` / custom `shadow-subtle`), and soft gradients sparingly.
- Accessibility: visible focus (`ring-2 ring-offset-2`), keyboard operability, and good contrast.

Quick tokens (suggested): add to `tailwind.config.js` as needed:
```js
// extend colors: primary, muted; borderRadius: lg/xl; boxShadow: subtle
```

Examples:
- Button: `inline-flex gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white shadow`
- Card: `p-6 bg-white rounded-xl shadow-subtle`

Reference: Vercel Dashboard for spacing, minimal controls, and restrained accents.

Keep this short: if patterns repeat, add small documented components under `src/components/ui/` and update this guide.