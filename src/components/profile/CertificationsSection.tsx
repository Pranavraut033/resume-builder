import { PageSection, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Certification } from "@/types/resume";

interface CertificationsSectionProps {
  certifications: Certification[];
  onChange: (certifications: Certification[]) => void;
}

export function CertificationsSection({
  certifications,
  onChange,
}: CertificationsSectionProps) {
  const add = () => {
    onChange([
      ...certifications,
      { name: "", issuer: "", date: "", url: null },
    ]);
  };

  const update = (index: number, cert: Certification) => {
    const updated = [...certifications];
    updated[index] = cert;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(certifications.filter((_, i) => i !== index));
  };

  return (
    <PageSection title="Certifications">
      <SurfacePanel>
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={add}>
            + Add Certification
          </Button>
        </div>
        {certifications.length === 0 ? (
          <p className="text-agent-on-surface-variant text-sm">
            No certifications added yet.
          </p>
        ) : (
          <div className="space-y-6">
            {certifications.map((cert, index) => (
              <div
                key={index}
                className="border-agent-outline-variant space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Certification {index + 1}</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
                <FormField
                  label="Certification Name"
                  value={cert.name}
                  onChange={(v) => update(index, { ...cert, name: v })}
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField
                    label="Issuer"
                    value={cert.issuer}
                    onChange={(v) => update(index, { ...cert, issuer: v })}
                  />
                  <FormField
                    label="Date"
                    value={cert.date}
                    onChange={(v) => update(index, { ...cert, date: v })}
                    placeholder="Jan 2023"
                  />
                </div>
                <FormField
                  label="URL"
                  value={cert.url || ""}
                  onChange={(v) => update(index, { ...cert, url: v })}
                  placeholder="https://..."
                />
              </div>
            ))}
          </div>
        )}
      </SurfacePanel>
    </PageSection>
  );
}
