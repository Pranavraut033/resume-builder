import { PageSection, SurfacePanel } from "@/components/ui";
import { FormField } from "@/components/ui/FormField";

interface SummarySectionProps {
  summary: string;
  onChange: (summary: string) => void;
  hideTitle?: boolean;
}

export function SummarySection({
  summary,
  onChange,
  hideTitle,
}: SummarySectionProps) {
  return (
    <PageSection title="Professional Summary" hideTitle={hideTitle}>
      <SurfacePanel>
        <FormField
          type="textarea"
          value={summary}
          onChange={onChange}
          rows={5}
          placeholder="Write a brief summary of your professional background and career goals..."
        />
      </SurfacePanel>
    </PageSection>
  );
}
