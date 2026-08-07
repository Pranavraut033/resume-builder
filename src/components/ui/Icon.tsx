/* eslint-disable react-hooks/static-components */

/**
 * Icon Component - Scalable icon system using lucide-react
 *
 * This component uses a normalized naming convention (camelCase) that maps to
 * lucide-react icons. It supports both predefined icon aliases and flexible
 * naming via kebab-to-camelCase conversion.
 *
 * Usage:
 *   <Icon name="chevronDown" />
 *   <Icon name="checkCircle" />
 *   <Icon name="trash2" />
 *
 * The system automatically resolves icon names even if they don't have explicit
 * aliases defined, making it highly scalable.
 */

"use client";

import * as LucideIcons from "lucide-react";

/**
 * Normalized icon name aliases
 * Maps user-friendly names to lucide-react icon names
 * camelCase format for consistency
 */
const ICON_ALIASES: Record<string, string> = {
  // Common shortcuts (user-friendly)
  gripVertical: "GripVertical",
  plus: "Plus",
  edit: "Edit2",
  pencil: "Pencil",
  trash: "Trash2",
  download: "Download",
  fileText: "FileText",
  cloud: "Cloud",
  save: "Save",
  close: "X",
  x: "X",
  chevronDown: "ChevronDown",
  check: "Check",
  checkCircle: "CheckCircle",
  eye: "Eye",
  eyeOff: "EyeOff",
  eyeSlash: "EyeOff", // alias
  sparkles: "Sparkles",
  alert: "AlertTriangle",
  info: "Info",
  grid: "LayoutGrid",
  list: "Rows3",
  search: "Search",
  spinner: "Loader2",
  loader: "Loader2",
  loading: "Loader2",
  user: "User",
  settings: "Settings",
  link: "Link",
  barChart: "BarChart2",
  bell: "Bell",
  bookmark: "Bookmark",
};

/**
 * Convert camelCase to PascalCase for lucide-react lookup
 * Examples: "checkCircle" -> "CheckCircle", "user" -> "User"
 */
function camelCaseToPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Resolve icon name to actual lucide-react component
 * Tries in order: aliases -> PascalCase conversion -> fallback to Plus
 */
function resolveIcon(
  name: string
): React.ComponentType<Record<string, unknown>> {
  // Check aliases first
  const aliasedName = ICON_ALIASES[name];
  if (aliasedName) {
    const icon = (LucideIcons as Record<string, unknown>)[aliasedName];
    if (icon) return icon as React.ComponentType<Record<string, unknown>>;
  }

  // Try direct PascalCase conversion
  const pascalName = camelCaseToPascalCase(name);
  const icon = (LucideIcons as Record<string, unknown>)[pascalName];
  if (icon) return icon as React.ComponentType<Record<string, unknown>>;

  // Fallback to Plus icon with warning in dev
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `Icon "${name}" not found in lucide-react, using Plus as fallback`
    );
  }
  return (LucideIcons as Record<string, unknown>).Plus as React.ComponentType<
    Record<string, unknown>
  >;
}

interface IconProps {
  /** Icon name in camelCase format */
  name: string;
  /** Icon size in pixels (default: 16) */
  size?: number | string;
  /** Additional CSS classes */
  className?: string;
  /** Icon color (optional) */
  color?: string;
  /** Stroke width (optional) */
  strokeWidth?: number;
}

/**
 * Icon Component
 * Renders lucide-react icons with automatic name resolution
 */
function Icon({
  name,
  size = 16,
  className = "",
  color,
  strokeWidth,
}: IconProps) {
  const ResolvedIcon = resolveIcon(name);

  return (
    <ResolvedIcon
      size={size}
      className={className}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
}

export { Icon };

export type IconName = React.ComponentProps<typeof Icon>["name"];

// Export commonly used icons for direct import if needed
export {
  Plus,
  Trash2,
  Download,
  FileText,
  Cloud,
  Save,
  X,
  ChevronDown,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  Edit2,
  Pencil,
  Loader2,
  LayoutGrid,
  Rows3,
} from "lucide-react";
