import { PageSection, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Volunteer } from "@/types/resume";

interface VolunteerSectionProps {
  volunteer: Volunteer[];
  onChange: (volunteer: Volunteer[]) => void;
}

export function VolunteerSection({
  volunteer,
  onChange,
}: VolunteerSectionProps) {
  const add = () => {
    onChange([
      ...volunteer,
      {
        organization: "",
        role: "",
        startDate: "",
        endDate: null,
        description: "",
      },
    ]);
  };

  const update = (index: number, vol: Volunteer) => {
    const updated = [...volunteer];
    updated[index] = vol;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(volunteer.filter((_, i) => i !== index));
  };

  return (
    <PageSection title="Volunteer Work (Optional)">
      <SurfacePanel>
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={add}>
            + Add Volunteer Work
          </Button>
        </div>
        {volunteer.length === 0 ? (
          <p className="text-agent-on-surface-variant text-sm">
            No volunteer work added yet.
          </p>
        ) : (
          <div className="space-y-6">
            {volunteer.map((vol, index) => (
              <div
                key={index}
                className="border-agent-outline-variant space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Volunteer {index + 1}</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
                <FormField
                  label="Organization"
                  value={vol.organization}
                  onChange={(v) => update(index, { ...vol, organization: v })}
                />
                <FormField
                  label="Role"
                  value={vol.role}
                  onChange={(v) => update(index, { ...vol, role: v })}
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField
                    label="Start Date"
                    value={vol.startDate}
                    onChange={(v) => update(index, { ...vol, startDate: v })}
                  />
                  <FormField
                    label="End Date"
                    value={vol.endDate || ""}
                    onChange={(v) => update(index, { ...vol, endDate: v })}
                  />
                </div>
                <FormField
                  label="Description"
                  type="textarea"
                  value={vol.description}
                  onChange={(v) => update(index, { ...vol, description: v })}
                  rows={3}
                />
              </div>
            ))}
          </div>
        )}
      </SurfacePanel>
    </PageSection>
  );
}
