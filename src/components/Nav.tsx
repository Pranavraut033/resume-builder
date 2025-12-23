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
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2">
            <div className="p-1 rounded-lg bg-gradient-to-br from-blue-50 to-white">
              <Icon name="fileText" className="text-blue-600" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Resume Builder
            </span>
          </div>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-300 ${isActive ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-900 dark:text-blue-200" : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}
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
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            <Icon name="plus" className="text-white" />
            <span>New</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
