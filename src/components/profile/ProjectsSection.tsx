import { PageSection, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Project } from "@/types/resume";

interface ProjectsSectionProps {
  projects: Project[];
  onChange: (projects: Project[]) => void;
}

export function ProjectsSection({ projects, onChange }: ProjectsSectionProps) {
  const add = () => {
    onChange([
      ...projects,
      {
        name: "",
        description: "",
        technologies: [],
        url: null,
        startDate: null,
        endDate: null,
      },
    ]);
  };

  const update = (index: number, proj: Project) => {
    const updated = [...projects];
    updated[index] = proj;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
  };

  return (
    <PageSection title="Projects">
      <SurfacePanel>
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={add}>
            + Add Project
          </Button>
        </div>
        {projects.length === 0 ? (
          <p className="text-agent-on-surface-variant text-sm">
            No projects added yet. Click &quot;Add Project&quot; to get started.
          </p>
        ) : (
          <div className="space-y-6">
            {projects.map((proj, index) => (
              <div
                key={index}
                className="border-agent-outline-variant space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Project {index + 1}</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
                <FormField
                  label="Project Name"
                  value={proj.name}
                  onChange={(v) => update(index, { ...proj, name: v })}
                />
                <FormField
                  label="Description"
                  type="textarea"
                  value={proj.description}
                  onChange={(v) => update(index, { ...proj, description: v })}
                  rows={3}
                />
                <FormField
                  label="Technologies"
                  value={proj.technologies.join(", ")}
                  onChange={(v) =>
                    update(index, {
                      ...proj,
                      technologies: v
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  helpText="Comma-separated list"
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField
                    label="URL"
                    value={proj.url || ""}
                    onChange={(v) => update(index, { ...proj, url: v })}
                    placeholder="https://github.com/..."
                  />
                  <FormField
                    label="Start Date"
                    value={proj.startDate || ""}
                    onChange={(v) => update(index, { ...proj, startDate: v })}
                    placeholder="Jan 2023"
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
