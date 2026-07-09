import {
  SanitizedCustomization,
  ThemeConfig,
  defaultThemeFromScalars,
} from "@/types/customization";

/**
 * Resolve a customization row's effective ThemeConfig. `themeJson` is null
 * for every pre-engine row — derive an equivalent theme from the legacy
 * scalar columns so old rows render identically until the user edits and a
 * real ThemeConfig gets persisted. Lazy migration: no backfill needed.
 */
export function legacyToTheme(
  customization: SanitizedCustomization
): ThemeConfig {
  if (customization.themeJson) {
    try {
      return JSON.parse(customization.themeJson) as ThemeConfig;
    } catch {
      // fall through to legacy derivation on corrupt JSON
    }
  }
  return defaultThemeFromScalars(customization);
}
