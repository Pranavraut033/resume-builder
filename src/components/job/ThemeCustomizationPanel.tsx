import { useJobPageContext } from "@/contexts/JobPageContext";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { AVAILABLE_BACKGROUNDS, BackgroundId } from "@/lib/backgrounds/types";
import {
  TemplateType,
  COLOR_PRESETS,
  Template,
  ThemeColors,
  VALID_FONT_SIZES,
  VALID_MARGIN_SIZES,
  VALID_LETTER_SPACINGS,
} from "@/types/customization";

import { Card } from "../ui";
import DownloadButton from "./DownloadButton";
import FontSelector from "./FontSelector";
import TemplateSelector from "./TemplateSelector";

const SWATCH_WIDTH = 240;
const SWATCH_HEIGHT = 320;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Props = {
  // No props for now, but we can add callbacks or state setters if needed
};

const ThemeCustomizationPanel: React.FC<Props> = ({}) => {
  const { customization, updateCustomizationState: updateCustomization } =
    useJobPageContext();

  const colorsTuple = customization.colors.split(",") as ThemeColors;

  return (
    <div className="relative flex flex-col gap-4 p-4">
      <div className="bg-agent-surface border-agent-outline-variant sticky top-0 z-10 -mx-4 -mt-4 border-b p-4">
        <h3
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--color-agent-on-surface)" }}
        >
          Finalize &amp; Export
        </h3>
        <div className="flex flex-col gap-2">
          <DownloadButton />
        </div>
      </div>

      {/* Template selection */}
      <TemplateSelector
        selectedTemplate={customization.template as TemplateType}
        onSelectTemplate={(template: Template) =>
          updateCustomization({
            template: template.id,
            fontFamily: template.fontFamily,
          })
        }
      />

      {/* Layout settings */}
      <Card className="space-y-2">
        <h3
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--color-agent-on-surface)" }}
        >
          Layout Settings
        </h3>

        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Margins
          </p>
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: "var(--color-agent-surface-container)" }}
          >
            {VALID_MARGIN_SIZES.map((m) => (
              <button
                key={m}
                onClick={() => updateCustomization({ marginSize: m })}
                className="flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all"
                style={
                  customization.marginSize === m
                    ? {
                        background: "var(--color-agent-primary-container)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : { color: "var(--color-agent-on-surface-variant)" }
                }
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Font Size
          </p>
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: "var(--color-agent-surface-container)" }}
          >
            {VALID_FONT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => updateCustomization({ fontSize: size })}
                className="flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all"
                style={
                  customization.fontSize === size
                    ? {
                        background: "var(--color-agent-primary-container)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : { color: "var(--color-agent-on-surface-variant)" }
                }
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Line Height
          </p>
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: "var(--color-agent-surface-container)" }}
          >
            {VALID_LETTER_SPACINGS.map((spacing) => (
              <button
                key={spacing}
                onClick={() => updateCustomization({ lineHeight: spacing })}
                className="flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all"
                style={
                  customization.lineHeight === spacing
                    ? {
                        background: "var(--color-agent-primary-container)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : { color: "var(--color-agent-on-surface-variant)" }
                }
              >
                {spacing}
              </button>
            ))}
          </div>
        </div>

        {/* Color accent */}
        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Color Accent
          </p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                title={preset.name}
                onClick={() =>
                  updateCustomization({ colors: preset.colors.join(",") })
                }
                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: preset.hex,
                  borderColor:
                    customization.colors[1] === preset.colors[1]
                      ? "var(--color-agent-on-surface)"
                      : "transparent",
                }}
              />
            ))}
          </div>
        </div>

        {/* Background */}
        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Background
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                title={bg.name}
                onClick={() => updateCustomization({ background: bg.id })}
                className="relative h-10 w-14 overflow-hidden rounded-md border-2 transition-transform hover:scale-105"
                style={{
                  background: "var(--color-agent-surface-container)",
                  borderColor:
                    (customization.background as BackgroundId | undefined) ===
                    bg.id
                      ? "var(--color-agent-primary)"
                      : "var(--color-agent-outline-variant)",
                }}
              >
                <BackgroundSvg
                  background={bg.id}
                  colors={colorsTuple}
                  width={SWATCH_WIDTH}
                  height={SWATCH_HEIGHT}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Font */}
        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Font
          </p>
          <FontSelector
            value={customization.fontFamily ?? "Inter"}
            onChange={(font: string) =>
              updateCustomization({ fontFamily: font })
            }
          />
        </div>
      </Card>
    </div>
  );
};

export default ThemeCustomizationPanel;
