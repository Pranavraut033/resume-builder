"use client";

import { useState } from "react";

import { createProfile } from "@/actions/profile";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the new profile's id after successful creation */
  onCreated: (id: number) => void;
}

export function CreateProfileModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProfileModalProps) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();

  const handleCreate = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { id } = await createProfile(trimmed);
      onCreated(id);
      setLabel("");
      onClose();
    } catch {
      pushToast({
        title: "Failed to create profile",
        description: "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setLabel("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Profile"
      primaryAction={handleCreate}
      primaryActionLabel={saving ? "Creating…" : "Create Profile"}
      size="sm"
    >
      <div className="space-y-4 px-6 pb-6">
        <p className="text-agent-on-surface-variant text-sm">
          Give this profile a label so you can identify it quickly — e.g.&nbsp;
          <em>"Senior Engineer"</em> or <em>"Career Changer"</em>.
        </p>
        <div className="space-y-1.5">
          <label
            htmlFor="profile-label"
            className="text-agent-on-surface block text-sm font-medium"
          >
            Profile Label
          </label>
          <input
            id="profile-label"
            type="text"
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="e.g. Senior Engineer"
            maxLength={80}
            className="border-agent-outline-variant bg-agent-surface-low text-agent-on-surface placeholder:text-agent-outline focus:border-agent-primary focus:ring-agent-primary w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-1 focus:outline-none"
          />
        </div>
      </div>
    </Modal>
  );
}
