"use client";

import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  deleteProfile,
  getAllProfiles,
  ProfileSummary,
} from "@/actions/profile";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { clearProfileSelection } from "@/hooks/useProfileSelection";
import { cn } from "@/lib/cn";
import { createLogger } from "@/lib/logger";

import { Icon } from "./ui/Icon";

const logger = createLogger("ProfileSelector");

interface ProfileSelectorProps {
  selectedProfileId: number | null;
  onSelect: (profile: ProfileSummary) => void;
  onCreateNew: () => void;
  /** Compact mode: used in the Nav sidebar (vertical layout) */
  compact?: boolean;
}

export function ProfileSelector({
  selectedProfileId,
  onSelect,
  onCreateNew,
  compact = false,
}: ProfileSelectorProps) {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<ProfileSummary | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: getAllProfiles,
  });

  const selected = profiles.find((p) => p.id === selectedProfileId);
  const displayLabel = selected?.label ?? "Select Profile";
  const initials = (selected?.name ?? displayLabel)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const canDelete = profiles.length > 1;

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    try {
      const result = await deleteProfile(pendingDelete.id);
      if (!result.success) {
        pushToast({
          title: result.error ?? "Cannot delete profile",
          variant: "error",
        });
        return;
      }
      if (pendingDelete.id === selectedProfileId) {
        clearProfileSelection();
      }
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      pushToast({ title: "Profile deleted", variant: "success" });
    } catch (error) {
      logger.error("Error deleting profile", { error });
      pushToast({ title: "Delete failed", variant: "error" });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  return (
    <>
      <Menu as="div" className="relative w-full">
        {({ close }) => (
          <>
            <MenuButton
              className={cn(
                "flex w-full items-center gap-3 rounded-xl transition-colors",
                compact
                  ? "hover:bg-agent-surface-lowest px-3 py-2"
                  : "border-agent-outline-variant bg-agent-surface hover:bg-agent-surface-low border px-3 py-2.5"
              )}
            >
              {/* Avatar */}
              <div className="bg-agent-primary-fixed-dim text-agent-on-primary-fixed flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {initials || "?"}
              </div>

              <div className="min-w-0 flex-1 text-left">
                <p className="text-agent-inverse-on-surface truncate text-sm font-semibold">
                  {displayLabel}
                </p>
                {selected && (
                  <p className="text-agent-outline truncate text-[11px]">
                    {selected.name || selected.email}
                  </p>
                )}
              </div>
              <Icon
                name="chevronDown"
                size={14}
                className="text-agent-outline shrink-0"
              />
            </MenuButton>

            <MenuItems
              anchor="bottom start"
              className="border-agent-outline-variant bg-agent-surface z-50 mt-1 min-w-52 origin-top-left rounded-xl border shadow-(--shadow-agent-modal) focus:outline-none"
            >
              {profiles.length > 0 && (
                <div className="border-agent-outline-variant border-b py-1">
                  {profiles.map((profile) => (
                    <div key={profile.id} className="group flex items-center">
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={() => onSelect(profile)}
                            className={cn(
                              "flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left text-sm",
                              active
                                ? "bg-agent-surface-low text-agent-on-surface"
                                : "text-agent-on-surface-variant"
                            )}
                          >
                            <span className="flex-1 truncate font-medium">
                              {profile.label}
                            </span>
                            {profile.id === selectedProfileId && (
                              <Icon
                                name="check"
                                size={14}
                                className="text-agent-primary shrink-0"
                              />
                            )}
                          </button>
                        )}
                      </MenuItem>
                      <button
                        type="button"
                        aria-label={`Delete ${profile.label}`}
                        disabled={!canDelete || deletingId === profile.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          close();
                          setPendingDelete(profile);
                        }}
                        className={cn(
                          "text-agent-outline hover:text-agent-error mr-2 shrink-0 rounded-lg p-1.5 transition-colors",
                          "disabled:pointer-events-none disabled:opacity-0"
                        )}
                      >
                        {deletingId === profile.id ? (
                          <Icon
                            name="spinner"
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <Icon name="trash" size={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="py-1">
                <MenuItem>
                  {({ active }) => (
                    <button
                      onClick={onCreateNew}
                      className={cn(
                        "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm",
                        active
                          ? "bg-agent-surface-low text-agent-primary"
                          : "text-agent-primary"
                      )}
                    >
                      <Icon name="plus" size={14} />
                      Add Profile
                    </button>
                  )}
                </MenuItem>
              </div>
            </MenuItems>
          </>
        )}
      </Menu>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete profile"
        message={`Delete profile "${pendingDelete?.label ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
