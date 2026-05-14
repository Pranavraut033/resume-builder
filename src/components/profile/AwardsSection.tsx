import { PageSection, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Award } from "@/types/resume";

interface AwardsSectionProps {
  awards: Award[];
  onChange: (awards: Award[]) => void;
}

export function AwardsSection({ awards, onChange }: AwardsSectionProps) {
  const add = () => {
    onChange([
      ...awards,
      { title: "", issuer: "", date: "", description: null },
    ]);
  };

  const update = (index: number, award: Award) => {
    const updated = [...awards];
    updated[index] = award;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(awards.filter((_, i) => i !== index));
  };

  return (
    <PageSection title="Awards & Honors (Optional)">
      <SurfacePanel>
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={add}>
            + Add Award
          </Button>
        </div>
        {awards.length === 0 ? (
          <p className="text-agent-on-surface-variant text-sm">
            No awards added yet.
          </p>
        ) : (
          <div className="space-y-6">
            {awards.map((award, index) => (
              <div
                key={index}
                className="border-agent-outline-variant space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Award {index + 1}</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
                <FormField
                  label="Award Title"
                  value={award.title}
                  onChange={(v) => update(index, { ...award, title: v })}
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField
                    label="Issuer"
                    value={award.issuer}
                    onChange={(v) => update(index, { ...award, issuer: v })}
                  />
                  <FormField
                    label="Date"
                    value={award.date}
                    onChange={(v) => update(index, { ...award, date: v })}
                  />
                </div>
                <FormField
                  label="Description"
                  type="textarea"
                  value={award.description || ""}
                  onChange={(v) => update(index, { ...award, description: v })}
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}
      </SurfacePanel>
    </PageSection>
  );
}
