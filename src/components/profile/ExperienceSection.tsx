import { PageSection, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Experience } from "@/types/resume";

interface ExperienceSectionProps {
  experience: Experience[];
  onChange: (experience: Experience[]) => void;
}

export function ExperienceSection({
  experience,
  onChange,
}: ExperienceSectionProps) {
  const add = () => {
    onChange([
      ...experience,
      {
        company: "",
        role: "",
        startDate: "",
        endDate: "",
        description: "",
        achievements: [],
      },
    ]);
  };

  const update = (index: number, exp: Experience) => {
    const updated = [...experience];
    updated[index] = exp;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(experience.filter((_, i) => i !== index));
  };

  return (
    <PageSection title="Work Experience">
      <SurfacePanel>
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={add}>
            + Add Experience
          </Button>
        </div>
        {experience.length === 0 ? (
          <p className="text-agent-on-surface-variant text-sm">
            No experience added yet. Click &quot;Add Experience&quot; to get
            started.
          </p>
        ) : (
          <div className="space-y-6">
            {experience.map((exp, index) => (
              <div
                key={index}
                className="border-agent-outline-variant space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Experience {index + 1}</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField
                    label="Company"
                    value={exp.company}
                    onChange={(v) => update(index, { ...exp, company: v })}
                  />
                  <FormField
                    label="Role"
                    value={exp.role}
                    onChange={(v) => update(index, { ...exp, role: v })}
                  />
                  <FormField
                    label="Start Date"
                    value={exp.startDate}
                    onChange={(v) => update(index, { ...exp, startDate: v })}
                    placeholder="Jan 2020"
                  />
                  <FormField
                    label="End Date"
                    value={exp.endDate || ""}
                    onChange={(v) => update(index, { ...exp, endDate: v })}
                    placeholder="Present or Dec 2022"
                  />
                </div>
                <FormField
                  label="Description"
                  type="textarea"
                  value={exp.description}
                  onChange={(v) => update(index, { ...exp, description: v })}
                  rows={3}
                />
                <FormField
                  label="Achievements"
                  type="textarea"
                  value={exp.achievements.join("\n")}
                  onChange={(v) =>
                    update(index, {
                      ...exp,
                      achievements: v.split("\n").filter(Boolean),
                    })
                  }
                  rows={3}
                  helpText="One achievement per line"
                />
              </div>
            ))}
          </div>
        )}
      </SurfacePanel>
    </PageSection>
  );
}
