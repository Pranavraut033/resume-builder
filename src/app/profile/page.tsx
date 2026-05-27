"use client";

import { useState } from "react";

import { saveProfile } from "@/actions/profile";
import { queryClient } from "@/components/AppShell";
import { AwardsSection } from "@/components/profile/AwardsSection";
import { CertificationsSection } from "@/components/profile/CertificationsSection";
import { ContactInfoSection } from "@/components/profile/ContactInfoSection";
import { EducationSection } from "@/components/profile/EducationSection";
import { ExperienceSection } from "@/components/profile/ExperienceSection";
import { ImportJsonModal } from "@/components/profile/ImportJsonModal";
import { ImportResumeModal } from "@/components/profile/ImportResumeModal";
import { LanguagesSection } from "@/components/profile/LanguagesSection";
import { ProjectsSection } from "@/components/profile/ProjectsSection";
import { PublicationsSection } from "@/components/profile/PublicationsSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { SummarySection } from "@/components/profile/SummarySection";
import { VolunteerSection } from "@/components/profile/VolunteerSection";
import { ProfileActionButtons } from "@/components/ProfileActionButtons";
import { FallbackState, PageHeader, SurfacePanel } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { createLogger } from "@/lib/logger";
import { ResumeJSON } from "@/types/resume";

const logger = createLogger("ProfilePage");

export default function ProfilePage() {
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const { pushToast } = useToast();

  const { data, refetch, isLoading } = useProfileQuery();

  const [profile, setProfile] = useState<ResumeJSON>(
    data ??
      ({
        header: {
          name: "",
          email: "",
          phone: null,
          headline: "",
          location: null,
          linkedin: null,
          github: null,
          website: null,
        },
        summary: "",
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
        publications: [],
        languages: [],
        volunteer: [],
        awards: [],
      } satisfies ResumeJSON)
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile(profile);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      pushToast({
        title: "Profile saved",
        variant: "success",
      });
    } catch (error) {
      logger.error("Error saving profile", { error });
      pushToast({
        title: "Save failed",
        description: "Error saving profile.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImportResume = (imported: ResumeJSON) => {
    setProfile(imported);
  };

  const handleImportJSON = (imported: ResumeJSON) => {
    setProfile(imported);
  };

  const handleExportJSON = () => {
    try {
      const jsonString = JSON.stringify(profile, null, 2);
      const element = document.createElement("a");
      element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(jsonString)
      );
      element.setAttribute(
        "download",
        `profile-${new Date().toISOString().split("T")[0]}.json`
      );
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      logger.error("Error exporting profile", { error });
      pushToast({
        title: "Export failed",
        description: "Error exporting profile.",
        variant: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <FallbackState
        title="Loading profile..."
        description="Please wait while we load your profile data."
      ></FallbackState>
    );
  }

  return (
    <div className="text-agent-on-surface space-y-6 pb-12">
      <PageHeader
        title="Base Profile"
        actions={
          <ProfileActionButtons
            onImportResume={() => setShowImportModal(true)}
            onImportJSON={() => setShowImportJsonModal(true)}
            onExportJSON={handleExportJSON}
            onSave={handleSave}
            isSaving={saving}
          />
        }
      />

      {isLoading ? (
        <p className="text-agent-on-surface-variant">Loading...</p>
      ) : (
        <>
          <ContactInfoSection
            header={profile.header}
            onChange={(header) => setProfile({ ...profile, header })}
          />

          <SummarySection
            summary={profile.summary}
            onChange={(summary) => setProfile({ ...profile, summary })}
          />

          <SkillsSection
            skills={profile.skills}
            onChange={(skills) => setProfile({ ...profile, skills })}
          />

          <ExperienceSection
            experience={profile.experience}
            onChange={(experience) => setProfile({ ...profile, experience })}
          />

          <ProjectsSection
            projects={profile.projects}
            onChange={(projects) => setProfile({ ...profile, projects })}
          />

          <EducationSection
            education={profile.education}
            onChange={(education) => setProfile({ ...profile, education })}
          />

          <CertificationsSection
            certifications={profile.certifications}
            onChange={(certifications) =>
              setProfile({ ...profile, certifications })
            }
          />

          <PublicationsSection
            publications={profile.publications || []}
            onChange={(publications) =>
              setProfile({ ...profile, publications })
            }
          />

          <LanguagesSection
            languages={profile.languages || []}
            onChange={(languages) => setProfile({ ...profile, languages })}
          />

          <VolunteerSection
            volunteer={profile.volunteer || []}
            onChange={(volunteer) => setProfile({ ...profile, volunteer })}
          />

          <AwardsSection
            awards={profile.awards || []}
            onChange={(awards) => setProfile({ ...profile, awards })}
          />

          {/* Save Actions */}
          <SurfacePanel>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
              >
                Reset
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </SurfacePanel>
        </>
      )}

      <ImportResumeModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportResume}
      />

      <ImportJsonModal
        isOpen={showImportJsonModal}
        onClose={() => setShowImportJsonModal(false)}
        onImport={handleImportJSON}
      />
    </div>
  );
}
