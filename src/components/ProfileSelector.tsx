"use client";

import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";

import { getAllProfiles, ProfileSummary } from "@/actions/profile";
import { cn } from "@/lib/cn";

import { Icon } from "./ui/Icon";

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

  return (
    <Menu as="div" className="relative w-full">
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
              <MenuItem key={profile.id}>
                {({ active }) => (
                  <button
                    onClick={() => onSelect(profile)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm",
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
    </Menu>
  );
}
