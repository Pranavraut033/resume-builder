"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "./ui/Icon";

export default function Nav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/profile", label: "Profile" },
    { href: "/job/new", label: "New Job" },
    { href: "/analytics/tokens", label: "Analytics" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2">
            <div className="rounded-lg bg-linear-to-br from-blue-50 to-white p-1">
              <Icon name="fileText" className="text-blue-600" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Resume Builder
            </span>
          </div>
        </div>

        <div className="flex flex-1 justify-center">
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`focus:ring-primary-300 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${isActive ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200" : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/job/new"
            className="bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
          >
            <Icon name="plus" className="text-white" />
            <span>New</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
