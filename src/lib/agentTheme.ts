/**
 * Agent Theme — "The Digital Curator"
 *
 * Design tokens derived from Stitch project 2112779950633706661.
 * Single source of truth: all values live in globals.css `@theme` as
 * `--color-agent-*`, `--font-agent-*`, `--radius-agent-*`, `--shadow-agent-*`.
 *
 * This file re-exports those CSS variable names as typed constants so
 * components can reference them via `var(--color-agent-primary)` etc.
 * without magic strings.
 *
 * Design rules:
 *  - No 1px solid borders for sectioning — use tonal background shifts.
 *  - No pure black — use `--color-agent-on-bg` (#131b2e) for text.
 *  - No <hr> dividers in lists — use spacing scale instead.
 *  - Primary CTAs: 135° gradient from `--color-agent-primary` → `--color-agent-primary-container`.
 *  - AI surfaces: glassmorphism (70% opacity + backdrop-blur-[20px]).
 */

// ---------------------------------------------------------------------------
// CSS variable name map (values defined in globals.css @theme)
// ---------------------------------------------------------------------------

export const agentVars = {
  // Surfaces
  surface: "var(--color-agent-surface)",
  surfaceBright: "var(--color-agent-surface-bright)",
  surfaceLowest: "var(--color-agent-surface-lowest)",
  surfaceLow: "var(--color-agent-surface-low)",
  surfaceContainer: "var(--color-agent-surface-container)",
  surfaceHigh: "var(--color-agent-surface-high)",
  surfaceHighest: "var(--color-agent-surface-highest)",
  surfaceDim: "var(--color-agent-surface-dim)",
  surfaceVariant: "var(--color-agent-surface-variant)",
  surfaceTint: "var(--color-agent-surface-tint)",
  // Background
  background: "var(--color-agent-bg)",
  onBackground: "var(--color-agent-on-bg)",
  // On-surface
  onSurface: "var(--color-agent-on-surface)",
  onSurfaceVariant: "var(--color-agent-on-surface-variant)",
  // Primary
  primary: "var(--color-agent-primary)",
  primaryContainer: "var(--color-agent-primary-container)",
  primaryFixed: "var(--color-agent-primary-fixed)",
  primaryFixedDim: "var(--color-agent-primary-fixed-dim)",
  onPrimary: "var(--color-agent-on-primary)",
  onPrimaryContainer: "var(--color-agent-on-primary-container)",
  onPrimaryFixed: "var(--color-agent-on-primary-fixed)",
  onPrimaryFixedVariant: "var(--color-agent-on-primary-fixed-variant)",
  // Secondary
  secondary: "var(--color-agent-secondary)",
  secondaryContainer: "var(--color-agent-secondary-container)",
  secondaryFixed: "var(--color-agent-secondary-fixed)",
  secondaryFixedDim: "var(--color-agent-secondary-fixed-dim)",
  onSecondary: "var(--color-agent-on-secondary)",
  onSecondaryContainer: "var(--color-agent-on-secondary-container)",
  onSecondaryFixed: "var(--color-agent-on-secondary-fixed)",
  onSecondaryFixedVariant: "var(--color-agent-on-secondary-fixed-variant)",
  // Tertiary
  tertiary: "var(--color-agent-tertiary)",
  tertiaryContainer: "var(--color-agent-tertiary-container)",
  tertiaryFixed: "var(--color-agent-tertiary-fixed)",
  tertiaryFixedDim: "var(--color-agent-tertiary-fixed-dim)",
  onTertiary: "var(--color-agent-on-tertiary)",
  onTertiaryContainer: "var(--color-agent-on-tertiary-container)",
  onTertiaryFixed: "var(--color-agent-on-tertiary-fixed)",
  onTertiaryFixedVariant: "var(--color-agent-on-tertiary-fixed-variant)",
  // Outline
  outline: "var(--color-agent-outline)",
  outlineVariant: "var(--color-agent-outline-variant)",
  // Inverse
  inverseSurface: "var(--color-agent-inverse-surface)",
  inverseOnSurface: "var(--color-agent-inverse-on-surface)",
  inversePrimary: "var(--color-agent-inverse-primary)",
  // Error
  error: "var(--color-agent-error)",
  errorContainer: "var(--color-agent-error-container)",
  onError: "var(--color-agent-on-error)",
  onErrorContainer: "var(--color-agent-on-error-container)",
  // Typography
  fontDisplay: "var(--font-agent-display)",
  fontBody: "var(--font-agent-body)",
  fontLabel: "var(--font-agent-label)",
  // Radius
  radius: "var(--radius-agent)",
  radiusSm: "var(--radius-agent-sm)",
  radiusMd: "var(--radius-agent-md)",
  radiusLg: "var(--radius-agent-lg)",
  radiusXl: "var(--radius-agent-xl)",
  radiusFull: "var(--radius-agent-full)",
  // Shadows
  shadowFloat: "var(--shadow-agent-float)",
  shadowModal: "var(--shadow-agent-modal)",
  shadowCard: "var(--shadow-agent-card)",
} as const;

export type AgentVarKey = keyof typeof agentVars;

// ---------------------------------------------------------------------------
// Tailwind utility class helpers
// Use these with cn() / clsx to apply agent theme classes.
// All classes map to tokens registered in globals.css @theme.
// ---------------------------------------------------------------------------

export const agentCx = {
  // Backgrounds
  bgSurface: "bg-agent-surface",
  bgSurfaceLow: "bg-agent-surface-low",
  bgSurfaceLowest: "bg-agent-surface-lowest",
  bgSurfaceHigh: "bg-agent-surface-high",
  bgSurfaceHighest: "bg-agent-surface-highest",
  bgSurfaceDim: "bg-agent-surface-dim",
  bgPrimary: "bg-agent-primary",
  bgSecondaryContainer: "bg-agent-secondary-container",
  bgErrorContainer: "bg-agent-error-container",
  bgSurfaceContainer: "bg-agent-surface-container",
  // Text
  textOnBg: "text-agent-on-bg",
  textOnSurface: "text-agent-on-surface",
  textOnSurfaceVariant: "text-agent-on-surface-variant",
  textPrimary: "text-agent-primary",
  textOnPrimary: "text-agent-on-primary",
  textOnError: "text-agent-on-error-container",
  // Borders
  borderOutline: "border-agent-outline",
  borderOutlineVariant: "border-agent-outline-variant",
  // Radius
  rounded: "rounded-[var(--radius-agent)]",
  roundedFull: "rounded-[var(--radius-agent-full)]",
  roundedMd: "rounded-[var(--radius-agent-md)]",
  // Shadows
  shadowFloat: "shadow-[var(--shadow-agent-float)]",
  shadowModal: "shadow-[var(--shadow-agent-modal)]",
  shadowCard: "shadow-[var(--shadow-agent-card)]",
  // Typography
  fontDisplay: "font-[var(--font-agent-display)]",
  fontBody: "font-[var(--font-agent-body)]",
  // Glassmorphism AI surface
  aiGlass:
    "bg-[color-mix(in_srgb,var(--color-agent-surface-highest)_70%,transparent)] backdrop-blur-[20px]",
  // Primary CTA gradient
  gradientPrimary:
    "bg-[linear-gradient(135deg,var(--color-agent-primary),var(--color-agent-primary-container))]",
} as const;

// ---------------------------------------------------------------------------
// Typography scale (JS-only, for inline styles or non-Tailwind contexts)
// ---------------------------------------------------------------------------

export const typographyScale = {
  displayLg: {
    fontFamily: agentVars.fontDisplay,
    fontSize: "3.5rem",
    lineHeight: "1.1",
    letterSpacing: "-0.02em",
    fontWeight: 700,
  },
  displayMd: {
    fontFamily: agentVars.fontDisplay,
    fontSize: "2.8rem",
    lineHeight: "1.15",
    letterSpacing: "-0.02em",
    fontWeight: 700,
  },
  displaySm: {
    fontFamily: agentVars.fontDisplay,
    fontSize: "2.25rem",
    lineHeight: "1.2",
    letterSpacing: "-0.015em",
    fontWeight: 600,
  },
  headlineLg: {
    fontFamily: agentVars.fontDisplay,
    fontSize: "1.875rem",
    lineHeight: "1.25",
    letterSpacing: "-0.01em",
    fontWeight: 600,
  },
  headlineMd: {
    fontFamily: agentVars.fontDisplay,
    fontSize: "1.5rem",
    lineHeight: "1.3",
    letterSpacing: "-0.01em",
    fontWeight: 600,
  },
  headlineSm: {
    fontFamily: agentVars.fontDisplay,
    fontSize: "1.25rem",
    lineHeight: "1.35",
    letterSpacing: "-0.005em",
    fontWeight: 600,
  },
  titleLg: {
    fontFamily: agentVars.fontBody,
    fontSize: "1.125rem",
    lineHeight: "1.4",
    letterSpacing: "0",
    fontWeight: 500,
  },
  titleMd: {
    fontFamily: agentVars.fontBody,
    fontSize: "1rem",
    lineHeight: "1.5",
    letterSpacing: "0.0025em",
    fontWeight: 500,
  },
  titleSm: {
    fontFamily: agentVars.fontBody,
    fontSize: "0.875rem",
    lineHeight: "1.5",
    letterSpacing: "0.005em",
    fontWeight: 500,
  },
  bodyLg: {
    fontFamily: agentVars.fontBody,
    fontSize: "1rem",
    lineHeight: "1.6",
    letterSpacing: "0",
    fontWeight: 400,
  },
  bodyMd: {
    fontFamily: agentVars.fontBody,
    fontSize: "0.875rem",
    lineHeight: "1.6",
    letterSpacing: "0.0025em",
    fontWeight: 400,
  },
  bodySm: {
    fontFamily: agentVars.fontBody,
    fontSize: "0.75rem",
    lineHeight: "1.5",
    letterSpacing: "0.004em",
    fontWeight: 400,
  },
  labelLg: {
    fontFamily: agentVars.fontLabel,
    fontSize: "0.875rem",
    lineHeight: "1.4",
    letterSpacing: "0.006em",
    fontWeight: 500,
  },
  labelMd: {
    fontFamily: agentVars.fontLabel,
    fontSize: "0.75rem",
    lineHeight: "1.4",
    letterSpacing: "0.005em",
    fontWeight: 500,
  },
  labelSm: {
    fontFamily: agentVars.fontLabel,
    fontSize: "0.6875rem",
    lineHeight: "1.4",
    letterSpacing: "0.005em",
    fontWeight: 500,
  },
} as const;

export default agentVars;
