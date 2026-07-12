"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  updateProfile,
  deleteProfile,
  getAllProfiles,
} from "@/actions/profile";
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
import { useProfileSelection } from "@/hooks/useProfileSelection";
import { createLogger } from "@/lib/logger";
import { ResumeJSON } from "@/types/resume";

const logger = createLogger("ProfilePage");

export default function ProfilePage() {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { selectedProfileId, setSelectedProfileId, clearProfileSelection } =
    useProfileSelection();

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: getAllProfiles,
  });

  // Auto-select first profile when none is selected
  useEffect(() => {
    if (selectedProfileId === null && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId, setSelectedProfileId]);

  const { data, refetch, isLoading } = useProfileQuery(selectedProfileId);

  const emptyProfile: ResumeJSON = {
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
    sectionLayout: null,
  };

  const [profile, setProfile] = useState<ResumeJSON>(data ?? emptyProfile);

  // Sync local state when profile data changes (profile switch or initial load)
  useEffect(() => {
    if (data) setProfile(data);
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedProfileId) {
        await updateProfile(selectedProfileId, profile);
      }
      await refetch();
      queryClient.invalidateQueries({
        queryKey: ["profile", selectedProfileId ?? "default"],
      });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });

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

  const handleDelete = async () => {
    if (!selectedProfileId) return;
    setDeleting(true);
    try {
      const result = await deleteProfile(selectedProfileId);
      if (!result.success) {
        pushToast({
          title: result.error ?? "Cannot delete profile",
          variant: "error",
        });
        return;
      }
      clearProfileSelection();
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      pushToast({ title: "Profile deleted", variant: "success" });
    } catch (error) {
      logger.error("Error deleting profile", { error });
      pushToast({ title: "Delete failed", variant: "error" });
    } finally {
      setDeleting(false);
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

  if (isLoading && !data) {
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

      {/* Profile info bar - read-only */}
      <SurfacePanel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-agent-on-surface-variant text-xs tracking-wide uppercase">
              Current Profile
            </p>
            <p className="text-agent-on-surface text-lg font-medium">
              {data?.label || "Unnamed Profile"}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleDelete}
            disabled={deleting || profiles.length <= 1}
          >
            {deleting ? "Deleting…" : "Delete Profile"}
          </Button>
        </div>
      </SurfacePanel>

      {isLoading && !data ? (
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
