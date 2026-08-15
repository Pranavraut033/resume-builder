# UI Components Guide

This guide documents the reusable design system components extracted from the Settings page. All components are exported from `src/components/ui/` and follow consistent design patterns built on a custom color-token system (`--color-agent-*`), defined in Tailwind v4's `@theme` block in `src/styles/global.css`. The token names (surface, on-surface, primary-container, and so on) borrow Material Design 3's naming conventions, but this is not the MD3 library — there are no `md-sys` tokens or MD3 dependency in the codebase.

This guide is a **partial catalog**: it documents 10 of the 27 components in `src/components/ui/` (the ones most used on the Settings page). For the full list, see the `export` statements in `src/components/ui/index.ts`, or read a component's source directly. For conventions on building new components in this directory, see [`../src/components/ui/README.md`](../src/components/ui/README.md).

## Component Catalog

### PageHeader

Top-level page heading component for all main routes. Combines title, optional description, badge/metadata, and action slots.

**Props:**

- `title` _(string)_ — Main heading text
- `description` _(string, optional)_ — Subtitle or tagline
- `badge` _(ReactNode, optional)_ — Element rendered inline with the title (e.g., `<Badge />`)
- `actions` _(ReactNode, optional)_ — Right-aligned action buttons or controls
- `className` _(string, optional)_ — Additional Tailwind classes

**Example:**

```tsx
import { PageHeader, Badge } from "@/components/ui";

export function MyPage() {
  return (
    <PageHeader
      title="Settings"
      description="Configure your application."
      badge={
        <Badge icon={<LockIcon size={11} />}>Stored Locally & Encrypted</Badge>
      }
      actions={<Button onClick={handleSave}>Save</Button>}
    />
  );
}
```

**Design Notes:**

- Title is always bold, 2xl size.
- Description uses `text-agent-on-surface-variant` for subtle contrast.
- Badge renders inline with the title for emphasis.
- Actions align to the right and shrink to avoid wrapping.

---

### PageSection

Semantic section wrapper with a consistent heading style. Pairs well with `SurfacePanel` for layout organization.

**Props:**

- `title` _(string)_ — Section heading
- `icon` _(ReactNode, optional)_ — Icon rendered before the title (colored with `text-agent-primary`)
- `children` _(ReactNode)_ — Section content
- `className` _(string, optional)_ — Additional Tailwind classes

**Example:**

```tsx
import { PageSection, SurfacePanel } from "@/components/ui";

export function MyPage() {
  return (
    <PageSection title="Security" icon={<ShieldIcon />}>
      <SurfacePanel>
        <p>Secure by design...</p>
      </SurfacePanel>
    </PageSection>
  );
}
```

### SurfacePanel

Rounded container with `bg-agent-surface-low` background. Use inside `PageSection` for grouped content areas.

**Props:**

- `children` _(ReactNode)_ — Panel content
- `stack` _(boolean, optional)_ — If `true`, applies `space-y-5` for vertical spacing between children
- `className` _(string, optional)_ — Additional Tailwind classes

**Example:**

```tsx
<PageSection title="Preferences">
  <SurfacePanel stack>
    <SettingsRow label="Theme" control={<SegmentedControl ... />} />
    <SettingsRow label="Telemetry" control={<Toggle ... />} />
    <SettingsRow label="Version" control={<Button>Check Updates</Button>} />
  </SurfacePanel>
</PageSection>
```

**Design Notes:**

- Provides subtle visual grouping with soft background.
- Use `stack` when children are independent rows; omit for custom layouts.

---

### Badge

Inline pill badge for status, labels, and metadata. Supports five color variants.

**Props:**

- `children` _(ReactNode)_ — Badge text
- `variant` _(enum, default: `"default"`)_ — One of: `"default"`, `"success"`, `"warning"`, `"error"`, `"info"`
- `icon` _(ReactNode, optional)_ — Icon rendered before text
- `className` _(string, optional)_ — Additional Tailwind classes

**Variants:**

- `default` — Gray surface-low background
- `success` — Green secondary-container
- `warning` — Yellow (tailored for light/dark modes)
- `error` — Red error-container
- `info` — Blue primary-container

**Example:**

```tsx
import { Badge } from "@/components/ui";

// Status badges
<Badge variant="success">Connected</Badge>
<Badge variant="error">Disconnected</Badge>

// With icon
<Badge icon={<CheckIcon size={11} />}>Encrypted</Badge>

// Feature badges
<Badge variant="info">Premium</Badge>
```

**Design Notes:**

- Always rounded-full for pill shape.
- Use for quick visual identification of state or category.
- Icons are center-aligned and shrink to prevent layout shift.

---

### Alert

Dismissible inline banner for feedback messages (errors, warnings, success, info).

**Props:**

- `children` _(ReactNode)_ — Alert message content
- `variant` _(enum, default: `"info"`)_ — One of: `"error"`, `"warning"`, `"success"`, `"info"`
- `onDismiss` _(function, optional)_ — Callback when dismiss button is clicked. If omitted, no dismiss button shown.
- `className` _(string, optional)_ — Additional Tailwind classes

**Example:**

```tsx
import { Alert } from "@/components/ui";

const [error, setError] = useState<string | null>(null);

return (
  <>
    {error && (
      <Alert variant="error" onDismiss={() => setError(null)}>
        Error loading models: {error}
      </Alert>
    )}

    <Alert variant="success">Settings saved successfully!</Alert>
  </>
);
```

**Design Notes:**

- Alert has `role="alert"` for accessibility.
- Dismiss button is always aligned right with minimal styling.
- Use at the top of a section or page for visibility.
- Variants match Badge colors for consistency.

---

### Toggle

Accessible on/off switch with `role="switch"` and ARIA attributes.

**Props:**

- `checked` _(boolean)_ — Current on/off state
- `onChange` _(function)_ — Callback `(checked: boolean) => void`
- `label` _(string, optional)_ — Accessible label (used for `aria-label`)
- `disabled` _(boolean, optional)_ — If `true`, switch is disabled
- `className` _(string, optional)_ — Additional Tailwind classes

**Example:**

```tsx
import { Toggle } from "@/components/ui";

const [telemetry, setTelemetry] = useState(false);

return (
  <Toggle
    checked={telemetry}
    onChange={setTelemetry}
    label="Anonymous Telemetry"
  />
);
```

**Design Notes:**

- Height: 6 (1.5rem), Width: 11 (2.75rem).
- Thumb (inner circle) moves 22px when checked.
- Focus ring is 2px with `ring-offset-2`.
- Background: `bg-agent-primary` when checked, `bg-agent-surface-highest` when unchecked.

---

### SegmentedControl

Generic tabbed control for selecting one value from a set of options. Fully type-safe with TypeScript.

**Props:**

- `options` _(SegmentOption<T>[])_ — Array of `{ value: T, label: string, icon?: ReactNode }`
- `value` _(T)_ — Currently selected value
- `onChange` _(function)_ — Callback `(value: T) => void`
- `ariaLabel` _(string, optional)_ — Accessible group label
- `className` _(string, optional)_ — Additional Tailwind classes

**Generic Type:**

- `T` — Literal string type of option values

**Example:**

```tsx
import { SegmentedControl } from "@/components/ui";

type Theme = "light" | "dark" | "system";
const [theme, setTheme] = useState<Theme>("light");

return (
  <SegmentedControl<Theme>
    ariaLabel="Interface Theme"
    value={theme}
    onChange={setTheme}
    options={[
      {
        value: "light",
        label: "Light",
        icon: <SunIcon size={13} />,
      },
      {
        value: "dark",
        label: "Dark",
        icon: <MoonIcon size={13} />,
      },
      {
        value: "system",
        label: "System",
        icon: <MonitorIcon size={13} />,
      },
    ]}
  />
);
```

**Design Notes:**

- Renders as a compact inline group with `bg-agent-surface-container` background.
- Active option has `bg-agent-surface-lowest` with subtle shadow.
- Inactive options are transparent with `text-agent-on-surface-variant`.
- Icons and labels are aligned left within each button.
- Padding: px-3 py-1.5 per button for compact appearance.

---

### SettingsRow

Horizontal layout for a settings row: label + description (left), control (right).

**Props:**

- `label` _(string)_ — Row title
- `description` _(string, optional)_ — Subtitle or explanation
- `control` _(ReactNode)_ — Interactive element (button, toggle, select, etc.)
- `className` _(string, optional)_ — Additional Tailwind classes

**Example:**

```tsx
import { SettingsRow, Toggle, SegmentedControl } from "@/components/ui";

return (
  <>
    <SettingsRow
      label="Anonymous Telemetry"
      description="Help improve AI parsing accuracy (Opt-in)"
      control={
        <Toggle checked={telemetry} onChange={setTelemetry} />
      }
    />

    <SettingsRow
      label="Interface Theme"
      description="Switch between Light and Dark mode"
      control={
        <SegmentedControl value={theme} onChange={setTheme} options={[...]} />
      }
    />
  </>
);
```

**Design Notes:**

- Flex layout: label (flex-grow) on left, control (shrink-0) on right.
- Description is `text-xs` gray with reduced visual weight.
- Ensures controls don't wrap on narrower viewports via `min-w-0` on label side.

---

## Supporting Components

### Card

Enhanced with new variants and padding option.

**Props:**

- `children` _(ReactNode)_ — Card content
- `padding` _(enum, default: `"md"`)_ — One of: `"sm"`, `"md"`, `"lg"`, `"none"`
- `shadow` _(boolean, default: `true`)_ — If `true`, applies card shadow
- `variant` _(enum, default: `"surface"`)_ — One of: `"surface"`, `"container"`, `"surface-low"`
- `className` _(string, optional)_ — Additional Tailwind classes

**New in this release:**

- `surface-low` variant for softer, less prominent cards
- `none` padding option for custom layouts

---

### Button

Enhanced with gradient variant.

**Props:**

- `children` _(ReactNode)_ — Button text
- `variant` _(enum, default: `"primary"`)_ — One of: `"primary"`, `"secondary"`, `"danger"`, `"ghost"`, `"gradient"`, `"blocky"`
- `size` _(enum, default: `"md"`)_ — One of: `"sm"`, `"md"`, `"lg"`
- `icon` _(ReactNode, optional)_ — Icon rendered before text
- `className` _(string, optional)_ — Additional Tailwind classes
- Standard `<button>` attributes (onClick, disabled, etc.)

**New in this release:**

- `gradient` variant: diagonal gradient from primary to primary-container with smooth hover opacity transition

**Example:**

```tsx
<Button variant="gradient" size="sm" icon={<RefreshIcon />}>
  Test Connection
</Button>
```

---

## Design Principles

### Color System

All components use the `agent-*` color-token system, defined as Tailwind v4 `@theme` variables in `src/styles/global.css` (with a `dark:` override block for dark mode):

- `--color-agent-primary`, `--color-agent-on-primary`
- `--color-agent-surface`, `--color-agent-on-surface`
- `--color-agent-surface-container`, `--color-agent-surface-low`
- `--color-agent-outline`, `--color-agent-outline-variant`
- Error, secondary, and tertiary variants available

### Spacing & Sizing

- Padding: Use Tailwind multiples (`p-4`, `px-3 py-1.5`)
- Gap: Consistent `gap-2`, `gap-3`, `gap-4` for alignment
- Rounded: `rounded-full` (badges), `rounded-xl` (inputs/buttons), `rounded-2xl` (panels)

### Typography

- Headings: `font-bold` with `tracking-tight` for visual hierarchy
- Buttons: `font-medium` for emphasis
- Subtitles: `text-xs` gray for secondary information
- Descriptions: `text-sm` gray variant

### Accessibility

All interactive components include:

- Semantic ARIA roles (`role="switch"`, `role="group"`, `role="alert"`)
- `aria-checked`, `aria-pressed`, `aria-label` attributes
- Focus indicators with consistent `focus:ring-2` pattern
- Keyboard navigation support
- Color-independent visual feedback (not just color changes)

---

## Usage in Pages

### Pattern: Page with Multiple Sections

```tsx
import {
  PageHeader,
  PageSection,
  SurfacePanel,
  Badge,
  SettingsRow,
  Toggle,
  SegmentedControl,
  Alert,
  Button,
} from "@/components/ui";

export default function SettingsPage() {
  const [theme, setTheme] = useState("light");
  const [telemetry, setTelemetry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-full px-6 py-8">
      <PageHeader
        title="Settings"
        description="Configure your app."
        badge={<Badge variant="info">Encrypted</Badge>}
      />

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="space-y-8">
        <PageSection title="Appearance">
          <SurfacePanel stack>
            <SettingsRow
              label="Theme"
              description="Light, dark, or system"
              control={
                <SegmentedControl
                  value={theme}
                  onChange={setTheme}
                  options={[...]}
                />
              }
            />
          </SurfacePanel>
        </PageSection>

        <PageSection title="Privacy">
          <SurfacePanel stack>
            <SettingsRow
              label="Telemetry"
              description="Anonymous usage data"
              control={
                <Toggle checked={telemetry} onChange={setTelemetry} />
              }
            />
          </SurfacePanel>
        </PageSection>
      </div>
    </div>
  );
}
```

---

## Best Practices

1. **Always wrap sections with `PageSection`** for consistent heading styling.
2. **Use `SurfacePanel` + `stack`** for grouped settings rows.
3. **Combine `SettingsRow` with control components** (Toggle, SegmentedControl, Button) for settings.
4. **Place `Alert` near the top** of a section for immediate visibility.
5. **Use variant colors intentionally**: `success` for confirmations, `error` for failures, `warning` for cautions.
6. **Icons in badges/buttons should be 13–16px** to align with text sizing.
7. **Test with keyboard navigation** — all interactive elements must be reachable via Tab and Enter/Space.

---

## Export Reference

All components are exported from `src/components/ui/index.ts`:

```tsx
export { Alert } from "./Alert";
export { Badge } from "./Badge";
export { Button } from "./Button";
export { Card } from "./Card";
export { PageHeader } from "./PageHeader";
export { PageSection, SurfacePanel } from "./PageSection";
export { SegmentedControl } from "./SegmentedControl";
export { SettingsRow } from "./SettingsRow";
export { Toggle } from "./Toggle";
// ... other components
```

**Import pattern:**

```tsx
import {
  PageHeader,
  PageSection,
  SurfacePanel,
  Badge,
  Alert,
  Toggle,
  SegmentedControl,
  SettingsRow,
} from "@/components/ui";
```
