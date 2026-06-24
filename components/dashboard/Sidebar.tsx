"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, BarChart3, LucideBoxes } from "lucide-react";

const nav = [
  {
    href: "/dashboard",
    label: "Overview",
    shortLabel: "Home",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/users",
    label: "Users",
    shortLabel: "Users",
    icon: Users,
  },
  {
    href: "/dashboard/default-channels",
    label: "Tools",
    shortLabel: "Tools",
    icon: LucideBoxes,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    shortLabel: "Stats",
    icon: BarChart3,
  },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-sm sm:w-auto sm:px-0">
      <div className="flex items-center justify-between gap-0 rounded-full border border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl px-1 py-1.5 shadow-2xl shadow-black/50">
        {nav.map(({ href, label, shortLabel, icon: Icon }) => {
          const active =
            path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-2 sm:px-5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-all duration-200",
                active
                  ? "bg-red-500/15 text-red-400"
                  : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Icon size={17} />
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:block">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
