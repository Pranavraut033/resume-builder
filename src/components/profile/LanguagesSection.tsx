import { PageSection, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Language } from "@/types/resume";

interface LanguagesSectionProps {
  languages: Language[];
  onChange: (languages: Language[]) => void;
}

export function LanguagesSection({
  languages,
  onChange,
}: LanguagesSectionProps) {
  const add = () => {
    onChange([...languages, { name: "", proficiency: "" }]);
  };

  const update = (index: number, lang: Language) => {
    const updated = [...languages];
    updated[index] = lang;
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(languages.filter((_, i) => i !== index));
  };

  return (
    <PageSection title="Languages (Optional)">
      <SurfacePanel>
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={add}>
            + Add Language
          </Button>
        </div>
        {languages.length === 0 ? (
          <p className="text-agent-on-surface-variant text-sm">
            No languages added yet.
          </p>
        ) : (
          <div className="space-y-4">
            {languages.map((lang, index) => (
              <div
                key={index}
                className="border-agent-outline-variant space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Language {index + 1}</h4>
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
                    label="Language"
                    value={lang.name}
                    onChange={(v) => update(index, { ...lang, name: v })}
                    placeholder="English"
                  />
                  <FormField
                    label="Proficiency"
                    value={lang.proficiency}
                    onChange={(v) => update(index, { ...lang, proficiency: v })}
                    placeholder="Native, Fluent, Professional, etc."
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
