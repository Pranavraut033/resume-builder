"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  updateProfile,
  deleteProfile,
  getAllProfiles,
} from "@/actions/profile";
import { ContactInfoSection } from "@/components/profile/ContactInfoSection";
import { ImportJsonModal } from "@/components/profile/ImportJsonModal";
import { ImportResumeModal } from "@/components/profile/ImportResumeModal";
import { ListSection } from "@/components/profile/ListSection";
import { SECTION_CONFIGS } from "@/components/profile/sectionConfigs";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { SummarySection } from "@/components/profile/SummarySection";
import { UnsavedChangesGuard } from "@/components/profile/UnsavedChangesGuard";
import { ProfileActionButtons } from "@/components/ProfileActionButtons";
import {
  AccordionSection,
  FallbackState,
  PageHeader,
  SurfacePanel,
} from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import { areJsonValuesEqual } from "@/lib";
import { downloadFile } from "@/lib/download";
import { createLogger } from "@/lib/logger";
import { generateResumeTXT } from "@/lib/txtExport";
import { ResumeJSON } from "@/types/resume";

const logger = createLogger("ProfilePage");

export default function ProfilePage() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const [openSectionId, setOpenSectionId] = useState("contact");
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
      workAuthorization: null,
      nationality: null,
      dateOfBirth: null,
      photoDataUrl: null,
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
    hobbies: [],
    sectionLayout: null,
  };

  const [profile, setProfile] = useState<ResumeJSON>(data ?? emptyProfile);

  // Sync local state when profile data changes (profile switch or initial load)
  useEffect(() => {
    if (data) setProfile(data);
  }, [data]);

  const baseline = data ?? emptyProfile;
  const isDirty = !areJsonValuesEqual(baseline, profile);
  const saveStatus = saving ? "saving" : saveError ? "error" : "idle";

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
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
      setSaveError(true);
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

  const handleReset = () => {
    setProfile(data ?? emptyProfile);
  };

  const handleImport = (imported: ResumeJSON) => {
    setProfile(imported);
  };

  const handleExportJSON = () => {
    try {
      const jsonString = JSON.stringify(profile, null, 2);
      downloadFile(
        `profile-${new Date().toISOString().split("T")[0]}.json`,
        jsonString,
        "text/plain"
      );
    } catch (error) {
      logger.error("Error exporting profile", { error });
      pushToast({
        title: "Export failed",
        description: "Error exporting profile.",
        variant: "error",
      });
    }
  };

  const handleExportTXT = () => {
    try {
      const txtString = generateResumeTXT(profile);
      downloadFile(
        `profile-${new Date().toISOString().split("T")[0]}.txt`,
        txtString,
        "text/plain"
      );
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
            onExportTXT={handleExportTXT}
            onSave={handleSave}
            saveStatus={saveStatus}
            isDirty={isDirty}
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
          <div className="space-y-3">
            <AccordionSection
              title="Contact Information"
              isOpen={openSectionId === "contact"}
              onToggle={() =>
                setOpenSectionId(openSectionId === "contact" ? "" : "contact")
              }
              dirty={!areJsonValuesEqual(baseline.header, profile.header)}
            >
              <ContactInfoSection
                hideTitle
                header={profile.header}
                onChange={(header) => setProfile({ ...profile, header })}
              />
            </AccordionSection>

            <AccordionSection
              title="Professional Summary"
              isOpen={openSectionId === "summary"}
              onToggle={() =>
                setOpenSectionId(openSectionId === "summary" ? "" : "summary")
              }
              dirty={!areJsonValuesEqual(baseline.summary, profile.summary)}
            >
              <SummarySection
                hideTitle
                summary={profile.summary}
                onChange={(summary) => setProfile({ ...profile, summary })}
              />
            </AccordionSection>

            <AccordionSection
              title="Skills"
              isOpen={openSectionId === "skills"}
              onToggle={() =>
                setOpenSectionId(openSectionId === "skills" ? "" : "skills")
              }
              dirty={!areJsonValuesEqual(baseline.skills, profile.skills)}
            >
              <SkillsSection
                hideTitle
                skills={profile.skills}
                onChange={(skills) => setProfile({ ...profile, skills })}
              />
            </AccordionSection>

            {SECTION_CONFIGS.map((config) => (
              <AccordionSection
                key={config.key}
                title={config.title}
                isOpen={openSectionId === config.key}
                onToggle={() =>
                  setOpenSectionId(
                    openSectionId === config.key ? "" : config.key
                  )
                }
                dirty={
                  !areJsonValuesEqual(
                    baseline[config.key] as never,
                    profile[config.key] as never
                  )
                }
              >
                <ListSection
                  hideTitle
                  title={config.title}
                  addLabel={config.addLabel}
                  emptyText={config.emptyText}
                  itemNoun={config.itemNoun}
                  blank={config.blank}
                  fields={config.fields}
                  items={(profile[config.key] as unknown[]) ?? []}
                  onChange={(items) =>
                    setProfile({ ...profile, [config.key]: items })
                  }
                />
              </AccordionSection>
            ))}
          </div>

          {/* Save Actions */}
          {isDirty && (
            <SurfacePanel>
              <div className="flex items-center justify-end gap-3">
                <Button variant="secondary" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </SurfacePanel>
          )}
        </>
      )}

      <UnsavedChangesGuard isDirty={isDirty} />

      <ImportResumeModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      <ImportJsonModal
        isOpen={showImportJsonModal}
        onClose={() => setShowImportJsonModal(false)}
        onImport={handleImport}
      />
    </div>
  );
}
