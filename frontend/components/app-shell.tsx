"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

type NavigationItem = {
  label: string;
  href: string;
};

type NavigationSection = {
  id: string;
  label: string;
  items: NavigationItem[];
};

const primaryNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Today's Jobs", href: "/jobs" },
  { label: "Visit Centre", href: "/visit-centre" },
];

const navigationSections: NavigationSection[] = [
  {
    id: "operations",
    label: "Operations",
    items: [
      { label: "Groups & Routes", href: "/routes" },
      { label: "Treatment Records", href: "/treatments" },
      { label: "Season Planner", href: "/season-planner" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    items: [
      { label: "Customer Centre", href: "/customers" },
      { label: "Annual Programmes", href: "/programmes" },
      { label: "Enquiries & Quotes", href: "/enquiries" },
    ],
  },
  {
    id: "chemicals",
    label: "Chemical Centre",
    items: [
      { label: "Chemical Centre", href: "/chemicals" },
      { label: "Chemical Usage", href: "/chemical-usage" },
    ],
  },
  {
    id: "stock",
    label: "Stock",
    items: [
      { label: "Stock & Purchasing", href: "/stock" },
    ],
  },
  {
    id: "communications",
    label: "Communications",
    items: [
      { label: "Communications", href: "/communications" },
      { label: "Documents", href: "/documents" },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      { label: "Business Settings", href: "/settings" },
      { label: "Season Management", href: "/settings/season-management" },
      { label: "Developer Tools", href: "/settings/developer" },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const activeSectionId =
    navigationSections.find((section) =>
      section.items.some((item) => isActivePath(pathname, item.href)),
    )?.id ?? "";

  const [openSectionId, setOpenSectionId] =
    useState(activeSectionId);

  useEffect(() => {
    if (activeSectionId) {
      setOpenSectionId(activeSectionId);
    }
  }, [activeSectionId]);

  return (
    <div className="min-h-screen bg-[#f5f8f5] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 flex-col bg-[#0d5333] px-5 py-6 text-white lg:flex">
          <Link href="/" className="mb-8 block">
            <div className="text-3xl font-bold tracking-tight">
              GreenFlow
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.24em] text-green-200">
              Sharpes Lawn Care
            </div>
          </Link>

          <nav className="space-y-2">
            <div className="space-y-1">
              {primaryNavigation.map((item) => (
                <NavigationLink
                  key={item.href}
                  item={item}
                  active={isActivePath(pathname, item.href)}
                />
              ))}
            </div>

            <div className="my-4 border-t border-white/10" />

            <div className="space-y-1">
              {navigationSections.map((section) => {
                const open = openSectionId === section.id;
                const sectionActive = section.id === activeSectionId;

                return (
                  <div key={section.id} className="rounded-xl">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSectionId(open ? "" : section.id)
                      }
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                        sectionActive
                          ? "bg-white/15 text-white"
                          : "text-green-50 hover:bg-white/10"
                      }`}
                      aria-expanded={open}
                    >
                      <span>{section.label}</span>
                      <span
                        className={`text-xs transition-transform ${
                          open ? "rotate-90" : ""
                        }`}
                        aria-hidden="true"
                      >
                        ▶
                      </span>
                    </button>

                    {open && (
                      <div className="mt-1 space-y-1 border-l border-white/15 pl-3">
                        {section.items.map((item) => (
                          <NavigationLink
                            key={item.href}
                            item={item}
                            active={isActivePath(pathname, item.href)}
                            nested
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="mt-auto rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="font-semibold">Rob Sharpe</div>
            <div className="text-sm text-green-200">Owner</div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function NavigationLink({
  item,
  active,
  nested = false,
}: {
  item: NavigationItem;
  active: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`block rounded-xl text-sm transition ${
        nested ? "px-4 py-2.5" : "px-4 py-3 font-medium"
      } ${
        active
          ? "bg-white text-[#0d5333] shadow-sm"
          : nested
            ? "text-green-100 hover:bg-white/10 hover:text-white"
            : "text-green-50 hover:bg-white/10"
      }`}
    >
      {item.label}
    </Link>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/settings") {
    return pathname === "/settings";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}