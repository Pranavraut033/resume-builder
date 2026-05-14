import { PageSection, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Publication } from "@/types/resume";

interface PublicationsSectionProps {
  publications: Publication[];
  onChange: (publications: Publication[]) => void;
}

export function PublicationsSection({
  publications,
  onChange,
}: PublicationsSectionProps) {
  const add = () => {
    onChange([
      ...publications,
      { title: "", authors: [], venue: "", date: "", url: null, doi: null },
    ]);
  };

  const update = (index: number, pub: Publication) => {
    const updated = [...publications];
    updated[index] = pub;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(publications.filter((_, i) => i !== index));
  };

  return (
    <PageSection title="Publications (Optional)">
      <SurfacePanel>
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={add}>
            + Add Publication
          </Button>
        </div>
        {publications.length === 0 ? (
          <p className="text-agent-on-surface-variant text-sm">
            No publications added yet.
          </p>
        ) : (
          <div className="space-y-6">
            {publications.map((pub, index) => (
              <div
                key={index}
                className="border-agent-outline-variant space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Publication {index + 1}</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
                <FormField
                  label="Title"
                  value={pub.title}
                  onChange={(v) => update(index, { ...pub, title: v })}
                />
                <FormField
                  label="Authors"
                  value={pub.authors.join(", ")}
                  onChange={(v) =>
                    update(index, {
                      ...pub,
                      authors: v
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  helpText="Comma-separated list"
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField
                    label="Venue"
                    value={pub.venue}
                    onChange={(v) => update(index, { ...pub, venue: v })}
                    placeholder="Journal/Conference name"
                  />
                  <FormField
                    label="Date"
                    value={pub.date}
                    onChange={(v) => update(index, { ...pub, date: v })}
                    placeholder="2023"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField
                    label="URL"
                    value={pub.url || ""}
                    onChange={(v) => update(index, { ...pub, url: v })}
                  />
                  <FormField
                    label="DOI"
                    value={pub.doi || ""}
                    onChange={(v) => update(index, { ...pub, doi: v })}
                    placeholder="10.1234/example"
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
