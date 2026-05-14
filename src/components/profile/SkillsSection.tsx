import { PageSection, SurfacePanel } from "@/components/ui";
import { FormField } from "@/components/ui/FormField";

interface SkillsSectionProps {
  skills: string[];
  onChange: (skills: string[]) => void;
}

export function SkillsSection({ skills, onChange }: SkillsSectionProps) {
  return (
    <PageSection title="Skills">
      <SurfacePanel>
        <FormField
          type="textarea"
          value={skills.join(", ")}
          onChange={(v) =>
            onChange(
              v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          rows={3}
          placeholder="JavaScript, TypeScript, React, Node.js, Python, etc."
          helpText="Comma-separated list of skills"
        />
      </SurfacePanel>
    </PageSection>
  );
}
