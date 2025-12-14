# Style Guide — Agents & Copilot (Tailwind-first)

## Purpose
This document defines visual and interaction guidelines for agent UIs (autonomous agents, Copilot-like helpers, and system surfaces interacting with users) used in this repo. The goal is consistent, accessible, and modern UI components with a strong Tailwind CSS utility-first approach.

> Quick summary: Use Tailwind exclusively for styling, prefer spacing-first layout (gap/padding/margin), use a modern SaaS aesthetic inspired by the Vercel Dashboard, and follow restrained tokens (rounded-lg / rounded-xl, subtle shadows, soft gradients).

---

## Principles (short)
- Tailwind-only: no custom CSS frameworks — prefer utility classes and small component wrappers. Avoid bespoke CSS unless strictly necessary and documented.
- Spacing-first: layout should be achieved with `gap`, `p-?`, `px-?`, `py-?`, `m-?` rather than manual positioning.
- Radii: use `rounded-lg` or `rounded-xl` exclusively for major containers and components. No other radii unless a clear reason.
- Shadows & depth: subtle shadows (e.g., `shadow-sm` / `shadow`) with light backgrounds to create a clean modern look.
- Soft gradients: use gentle gradients sparingly for accents (e.g., primary button background or hero cards) and prefer opacity masks over strong color shifts.
- Accessibility: maintain contrast, focus ring visibility (`ring-2 ring-offset-2` with accessible color), and keyboard navigation for interactive components.

---

## Tokens & Tailwind config suggestions
Add the following to `tailwind.config.js` (or use as inspiration):

```js
// tailwind.config.js (excerpt)
module.exports = {
  theme: {
    extend: {
      colors: {
        // semantic tokens — tweak to taste
        primary: {
          DEFAULT: '#0f172a', // deep base for accents
          50: '#f7fafc',
          100: '#f0f4f8',
          500: '#0ea5a8'
        },
        muted: '#6b7280'
      },
      borderRadius: {
        lg: '0.5rem',
        xl: '0.75rem'
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)'
      }
    }
  }
}
```

Notes:
- Prefer semantic names in component classes (e.g., `bg-primary/10`, `text-muted`) when appropriate; otherwise stick to Tailwind utilities.

---

## Visual Direction
- Aesthetic: modern SaaS — light backgrounds, clean white surfaces, minimal borders, and restrained use of color.
- Backgrounds: `bg-white` or subtle off-white for panels (`bg-slate-50`), use `rounded-lg`/`rounded-xl` and `shadow-subtle`.
- Buttons: primary buttons use a soft gradient or a single accent color with `px-4 py-2 rounded-lg shadow`.
- Cards: `p-6 bg-white rounded-xl shadow-subtle` with clear section separators using spacing.
- Inputs: `bg-white/90 border border-slate-200 rounded-lg px-3 py-2 focus:(ring-2 ring-primary/60)`.

Reference: Vercel Dashboard — minimal controls, generous spacing, restrained color accents.

---

## Spacing-first layout examples
- Container with horizontal controls:
  - `flex items-center gap-3 p-4 rounded-lg bg-white shadow-subtle`
- Card list:
  - `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Modal content:
  - `p-6 space-y-4` (prefer `space-y-*` for vertical rhythm)

### Example: Primary button
```html
<button class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white shadow hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-300">Save</button>
```

### Example: Panel/Card
```html
<div class="p-6 bg-white rounded-xl shadow-subtle">
  <h3 class="text-lg font-semibold">Header</h3>
  <p class="text-muted mt-2">Supporting copy</p>
</div>
```

---

## Component rules (do / don't)
- Do use `gap` for spacing between inline items.
- Do prefer `space-y-*` for stacked vertical rhythm rather than adding `mb-*` everywhere.
- Do keep components small and composable — prefer smaller building blocks (Button, Card, FormField) that accept `className` to extend styles.
- Don't inline strong custom CSS; if a complex style is required, add a commented helper under `src/components/ui` with a short description.
- Don't use arbitrary border radii or heavy drop shadows.

---

## Interaction patterns for agents and Copilot UI
- Tone: helpful, concise, non-judgmental. Use short headings and one-line supporting text for actions and recommendations.
- Notification chips: `inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm bg-primary/10 text-primary`.
- Suggestions / prompts: use cards with `space-y-2` and clearly labelled actions (`Primary` for main action, `Secondary` for dismiss or later).
- Inline feedback: in-place success/validation messages in muted color and small text under fields.

### Microcopy examples
- Success: "Saved — your profile is up to date." (small, non-modal)
- Suggestion: "Try adding skills that match this role for better tailoring." (actionable)

---

## Accessibility checklist ✅
- Visible focus states
- Sufficient contrast for primary text and buttons
- Keyboard operability for all interactive controls
- Screen reader labels for icons and complex widgets

---

## Style references
- Vercel Dashboard (visual reference for white space, simplicity, and control density)

---

## When to escalate from Tailwind-props to a CSS module
If you notice a repeated complex combination of utilities that becomes error-prone or causes duplicated logic across components, add a small documented utility component under `src/components/ui/` and keep the implementation Tailwind-first.

---

## Ownership & maintenance
- Add new patterns to this document as they are introduced.
- When a component diverges from these guidelines, document why (accessibility, cross-browser bug, or platform limitation).

---

## Implementation checklist
- [ ] Ensure all `src/components/ui/*` components follow this guide (className-based, spacing-first)
- [ ] Add code examples in `src/components/ui/README.md` to demonstrate patterns
- [ ] Add a `STYLE_GUIDE.md` reference in `agents.md`

---

If you'd like, I can also convert this into a short `src/components/ui/README.md` with small component examples and a Tailwind config snippet that can be copied to `tailwind.config.js`.