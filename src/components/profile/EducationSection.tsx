import { DateRangeField } from "@/components/form";
import { PageSection, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { isValidDateRange } from "@/lib/date";
import { Education } from "@/types/resume";

interface EducationSectionProps {
  education: Education[];
  onChange: (education: Education[]) => void;
}

export function EducationSection({
  education,
  onChange,
}: EducationSectionProps) {
  const add = () => {
    onChange([
      ...education,
      {
        institution: "",
        degree: "",
        field: "",
        startDate: "",
        endDate: null,
        gpa: null,
      },
    ]);
  };

  const update = (index: number, edu: Education) => {
    const updated = [...education];
    updated[index] = edu;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(education.filter((_, i) => i !== index));
  };

  return (
    <PageSection title="Education">
      <SurfacePanel>
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={add}>
            + Add Education
          </Button>
        </div>
        {education.length === 0 ? (
          <p className="text-agent-on-surface-variant text-sm">
            No education added yet. Click &quot;Add Education&quot; to get
            started.
          </p>
        ) : (
          <div className="space-y-6">
            {education.map((edu, index) => (
              <div
                key={index}
                className="border-agent-outline-variant space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Education {index + 1}</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
                <FormField
                  label="Institution"
                  value={edu.institution}
                  onChange={(v) => update(index, { ...edu, institution: v })}
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField
                    label="Degree"
                    value={edu.degree}
                    onChange={(v) => update(index, { ...edu, degree: v })}
                    placeholder="Bachelor of Science"
                  />
                  <FormField
                    label="Field of Study"
                    value={edu.field}
                    onChange={(v) => update(index, { ...edu, field: v })}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DateRangeField
                    label="Dates"
                    startDate={edu.startDate}
                    endDate={edu.endDate || ""}
                    onStartDateChange={(v) =>
                      update(index, { ...edu, startDate: v })
                    }
                    onEndDateChange={(v) =>
                      update(index, { ...edu, endDate: v })
                    }
                    error={
                      isValidDateRange(edu.startDate, edu.endDate)
                        ? undefined
                        : "End date must be after start date"
                    }
                  />
                  <FormField
                    label="GPA"
                    value={edu.gpa || ""}
                    onChange={(v) => update(index, { ...edu, gpa: v })}
                    placeholder="3.8/4.0"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfacePanel>
    </PageSection>
  );
}
