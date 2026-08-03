import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Today's Jobs", href: "/jobs" },
  { label: "Customers", href: "/customers" },
  { label: "Groups & Routes", href: "/routes" },
  { label: "Season Planner", href: "/season-planner" },
  { label: "Chemical Centre", href: "/chemicals" },
  { label: "Stock & Purchasing", href: "/stock" },
  { label: "Communications", href: "/communications" },
  { label: "Documents", href: "/documents" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f8f5] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 flex-col bg-[#0d5333] px-5 py-6 text-white lg:flex">
          <Link href="/" className="mb-8 block">
            <div className="text-3xl font-bold tracking-tight">GreenFlow</div>
            <div className="mt-1 text-xs uppercase tracking-[0.24em] text-green-200">
              Sharpes Lawn Care
            </div>
          </Link>

          <nav className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-green-50 transition hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
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