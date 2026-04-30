"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "./ui/Icon";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "grid" as const },
  { href: "/job/new", label: "Builder", icon: "edit" as const },
  { href: "/profile", label: "Profile", icon: "user" as const },
  { href: "/analytics/tokens", label: "Analytics", icon: "barChart" as const },
  { href: "/settings", label: "Settings", icon: "settings" as const },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-screen w-60 shrink-0 flex-col"
      style={{ background: "var(--color-agent-inverse-surface)" }}
    >
      {/* Logo */}
      <div className="flex flex-col gap-0.5 px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--color-agent-primary), var(--color-agent-primary-container))",
            }}
          >
            <Icon name="fileText" size={16} className="text-white" />
          </div>
          <span
            className="text-base font-bold tracking-tight"
            style={{ color: "var(--color-agent-inverse-on-surface)" }}
          >
            Curator AI
          </span>
        </div>
        <span
          className="pl-10 text-[10px] font-medium tracking-widest uppercase"
          style={{ color: "var(--color-agent-outline)" }}
        >
          Local-First Engine
        </span>
      </div>

      {/* New Resume CTA */}
      <div className="px-4 pb-4">
        <Link
          href="/job/new"
          className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg, var(--color-agent-primary), var(--color-agent-primary-container))",
            color: "var(--color-agent-on-primary)",
          }}
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
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
              style={
                isActive
                  ? {
                      background: "var(--color-agent-primary-fixed-dim)",
                      color: "var(--color-agent-on-primary-fixed)",
                    }
                  : {
                      color: "var(--color-agent-inverse-on-surface)",
                    }
              }
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="mt-auto border-t px-4 pt-4 pb-5"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
            style={{
              background: "var(--color-agent-primary-fixed-dim)",
              color: "var(--color-agent-on-primary-fixed)",
            }}
          >
            A
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: "var(--color-agent-inverse-on-surface)" }}
            >
              Local User
            </p>
            <p
              className="text-[11px]"
              style={{ color: "var(--color-agent-outline)" }}
            >
              Local Plan
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
