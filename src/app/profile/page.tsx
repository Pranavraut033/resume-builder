"use client";

import { useState, useEffect } from "react";
import { ResumeJSON } from "@/types/resume";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { createLogger } from "@/lib/logger";
import { getProfile, saveProfile } from "@/actions/profile";

const logger = createLogger("ProfilePage");

export default function ProfilePage() {
  const [profile, setProfile] = useState<ResumeJSON>({
    header: { name: "", email: "" },
    summary: "",
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (error) {
        logger.error("Error loading profile", { error });
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile(profile);
      alert("Profile saved!");
    } catch (error) {
      logger.error("Error saving profile", { error });
      alert("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Base Profile</h1>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <Card className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name"
              value={profile.header.name}
              onChange={(v) =>
                setProfile({
                  ...profile,
                  header: { ...profile.header, name: v },
                })
              }
              placeholder="Full name"
            />

            <FormField
              label="Email"
              type="email"
              value={profile.header.email}
              onChange={(v) =>
                setProfile({
                  ...profile,
                  header: { ...profile.header, email: v },
                })
              }
              placeholder="you@example.com"
            />
          </div>

          <FormField
            label="Summary"
            type="textarea"
            value={profile.summary}
            onChange={(v) => setProfile({ ...profile, summary: v })}
            rows={5}
          />

          <FormField
            label="Skills"
            type="textarea"
            value={profile.skills.join(", ")}
            onChange={(v) =>
              setProfile({
                ...profile,
                skills: v.split(",").map((s) => s.trim()),
              })
            }
            rows={3}
            placeholder="Comma-separated skills"
          />

          <div className="flex items-center justify-end">
            <Button
              variant="secondary"
              className="mr-2"
              onClick={() =>
                setProfile({
                  header: { name: "", email: "" },
                  summary: "",
                  experience: [],
                  projects: [],
                  skills: [],
                  education: [],
                  certifications: [],
                })
              }
            >
              Reset
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
