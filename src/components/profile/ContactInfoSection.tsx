import { PageSection, SurfacePanel } from "@/components/ui";
import { FormField } from "@/components/ui/FormField";
import { ContactInfo } from "@/types/resume";

interface ContactInfoSectionProps {
  header: ContactInfo;
  onChange: (header: ContactInfo) => void;
}

export function ContactInfoSection({
  header,
  onChange,
}: ContactInfoSectionProps) {
  return (
    <PageSection title="Contact Information">
      <SurfacePanel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Full Name"
            value={header.name}
            onChange={(v) => onChange({ ...header, name: v })}
            placeholder="John Doe"
          />

          <FormField
            label="Email"
            type="email"
            value={header.email}
            onChange={(v) => onChange({ ...header, email: v })}
            placeholder="john@example.com"
          />

          <FormField
            label="Phone"
            value={header.phone || ""}
            onChange={(v) => onChange({ ...header, phone: v })}
            placeholder="+1 (555) 123-4567"
          />

          <FormField
            label="Location"
            value={header.location || ""}
            onChange={(v) => onChange({ ...header, location: v })}
            placeholder="San Francisco, CA"
          />

          <FormField
            label="LinkedIn"
            value={header.linkedin || ""}
            onChange={(v) => onChange({ ...header, linkedin: v })}
            placeholder="linkedin.com/in/johndoe"
          />

          <FormField
            label="GitHub"
            value={header.github || ""}
            onChange={(v) => onChange({ ...header, github: v })}
            placeholder="github.com/johndoe"
          />

          <FormField
            label="Website"
            value={header.website || ""}
            onChange={(v) => onChange({ ...header, website: v })}
            placeholder="johndoe.com"
          />

          <FormField
            label="Work Authorization"
            value={header.workAuthorization || ""}
            onChange={(v) => onChange({ ...header, workAuthorization: v })}
            placeholder="e.g. EU Blue Card, US Citizen, Requires sponsorship"
          />

          <FormField
            label="Nationality"
            value={header.nationality || ""}
            onChange={(v) => onChange({ ...header, nationality: v })}
            placeholder="e.g. German, Indian"
          />

          <FormField
            label="Date of Birth"
            value={header.dateOfBirth || ""}
            onChange={(v) => onChange({ ...header, dateOfBirth: v })}
            placeholder="e.g. 15.03.1990"
          />
        </div>
      </SurfacePanel>
    </PageSection>
  );
}
