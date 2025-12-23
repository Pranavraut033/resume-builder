# UI Component Guidelines — Tailwind-first

This short README explains patterns used in `src/components/ui` and how to keep components consistent with the `STYLE_GUIDE.md`.

## Principles

- Components are small, composable, accept `className` and relevant props.
- Prefer Tailwind utilities for styles. If a utility combination repeats, create a component wrapper.
- Use spacing-first layout (`gap`, `space-y-*`, `p-*`, `m-*`).
- Use `rounded-lg` / `rounded-xl` and `shadow-subtle` for panels/cards.

## Example patterns

Button (primary):

```tsx
// className can be extended by the caller
const PrimaryButton = ({ children, className = "", ...props }) => (
  <button
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white shadow ${className}`}
    {...props}
  >
    {children}
  </button>
);
```

Card:

```tsx
const Card = ({ children, className = "" }) => (
  <div className={`p-6 bg-white rounded-xl shadow-subtle ${className}`}>
    {children}
  </div>
);
```

FormField:

```tsx
const FormField = ({ label, children, hint }) => (
  <label className="block">
    <div className="text-sm font-medium">{label}</div>
    <div className="mt-2">{children}</div>
    {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
  </label>
);
```

## Accessibility notes

- Add `aria-label` when an icon is used without text.
- Keep focus states visible (`focus:ring-2 focus:ring-offset-2`).

## How to add new patterns

1. Implement the smallest composable component.
2. Document use cases and recommended classes in this README.
3. Add any semantic token suggestion to `STYLE_GUIDE.md` if reused across multiple places.
