"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ProfileSummary } from "@/actions/profile";
import { useNavigationOnProfileChange } from "@/hooks/useNavigationOnProfileChange";
import { useProfileSelection } from "@/hooks/useProfileSelection";

import { CreateProfileModal } from "./CreateProfileModal";
import { ProfileSelector } from "./ProfileSelector";
import { Icon } from "./ui/Icon";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "grid" as const },
  { href: "/find-jobs", label: "Find Jobs", icon: "search" as const },
  { href: "/job/new", label: "Builder", icon: "edit" as const },
  { href: "/documents", label: "Documents", icon: "folder" as const },
  { href: "/profile", label: "Profile", icon: "user" as const },
  { href: "/analytics/tokens", label: "Analytics", icon: "barChart" as const },
  { href: "/settings", label: "Settings", icon: "settings" as const },
];

export default function Sidebar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { selectedProfileId, setSelectedProfileId } = useProfileSelection();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Redirect from job pages when profile changes
  useNavigationOnProfileChange();

  const handleSelectProfile = (profile: ProfileSummary) => {
    setSelectedProfileId(profile.id);
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  const handleProfileCreated = (id: number) => {
    setSelectedProfileId(id);
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  return (
    <aside className="bg-agent-inverse-surface flex h-screen w-60 shrink-0 flex-col">
      {/* Logo */}
      <div className="flex flex-col gap-0.5 px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="from-agent-primary to-agent-primary-container flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br">
            <Icon name="fileText" size={16} className="text-agent-on-primary" />
          </div>
          <span className="text-agent-inverse-on-surface text-base font-bold tracking-tight">
            Curator AI
          </span>
        </div>
        <span className="text-agent-outline pl-10 text-[10px] font-medium tracking-widest uppercase">
          Local-First Engine
        </span>
      </div>

      {/* New Resume CTA */}
      <div className="px-4 pb-4">
        <Link
          href="/job/new"
          className="from-agent-primary to-agent-primary-container text-agent-on-primary flex items-center justify-center gap-2 rounded-xl bg-linear-to-br py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          <Icon name="plus" size={16} />
          New Resume
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
                (isActive
                  ? "bg-agent-primary-fixed-dim text-agent-on-primary-fixed"
                  : "text-agent-inverse-on-surface hover:bg-agent-surface-lowest hover:text-agent-on-surface")
              }
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section – profile switcher */}
      <div className="border-agent-outline-variant mt-auto border-t px-3 pt-3 pb-4">
        <ProfileSelector
          selectedProfileId={selectedProfileId}
          onSelect={handleSelectProfile}
          onCreateNew={() => setShowCreateModal(true)}
          compact
        />
      </div>

      <CreateProfileModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleProfileCreated}
      />
    </aside>
  );
}
