# Quick Style Guide — Agents & Copilot (Tailwind-first)

Purpose: Minimal rules for consistent agent UIs — Tailwind-only, spacing-first, accessible, modern SaaS feel.

## Blocky/Lego Builder Theme

- Use blocky, modular UI elements that visually connect like Lego blocks.
- Prefer square/rectangular shapes with clear separation (`rounded-block`, `rounded-block-lg`).
- Use builder tokens: `bg-blocky-100`, `text-blocky-900`, `shadow-block`, `font-blocky`.
- Connect blocks with spacing (`gap-block`, `space-y-block`), and use visible seams (`border-blocky-500`).
- Buttons, cards, and sections should look like draggable, connectable blocks.

## Principles

- Tailwind-only utilities; prefer semantic tokens (`bg-blocky-100`, `text-blocky-900`).
- Spacing-first: use `gap-block`, `p-block`, `space-y-block` for layout.
- Use `rounded-block`, `rounded-block-lg`, and `shadow-block` for blocky feel.
- Accessibility: visible focus (`ring-blocky-500 ring-offset-2`), keyboard operability, and good contrast.

## Theme Tokens (add to tailwind.config.js)

```js
// colors: blocky-100, blocky-500, blocky-900
// borderRadius: block, block-lg
// boxShadow: block
// fontFamily: blocky
```

## Examples

- Block Button: `inline-flex gap-block px-block py-block rounded-block bg-blocky-500 text-blocky-900 shadow-block font-blocky`
- Block Card: `p-block bg-blocky-100 rounded-block-lg shadow-block border border-blocky-500 font-blocky`
- Connectable Section: `flex gap-block space-y-block rounded-block bg-blocky-100 border-blocky-500`

Reference: Lego Digital Designer, builder UIs, and Tailwind v4 theme variable docs.

Keep this short: if patterns repeat, add small documented components under `src/components/ui/` and update this guide.
