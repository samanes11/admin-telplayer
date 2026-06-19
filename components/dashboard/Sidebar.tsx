"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Radio, BarChart3 } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/default-channels", label: "Channels", icon: Radio },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 w-full px-3 sm:w-auto sm:px-0">
      <div className="flex items-center justify-between sm:justify-center gap-0.5 sm:gap-1 rounded-full border border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl px-1.5 sm:px-2 py-1.5 sm:py-2 shadow-2xl shadow-black/50 max-w-md mx-auto sm:mx-0">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 sm:flex-none flex-col items-center gap-0.5 sm:gap-1 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-[11px] font-medium transition-all duration-200",
                active
                  ? "bg-red-500/15 text-red-400"
                  : "text-zinc-500 hover:text-zinc-200"
              )}
            >
              <Icon size={17} className="sm:w-[18px] sm:h-[18px]" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}