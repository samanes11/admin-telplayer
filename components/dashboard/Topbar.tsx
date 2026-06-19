"use client";

import { useSession, signOut } from "next-auth/react";
import { Avatar } from "@/components/ui";
import { Bell, LogOut } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { data: session } = useSession();
  const name = session?.user?.name || "Admin";

  return (
    <header className="h-14 sm:h-16 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm flex items-center px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-30">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm sm:text-base font-semibold text-white truncate">{title}</h1>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-zinc-500 truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
          <Bell size={15} />
        </button>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={15} />
        </button>

        <div className="flex items-center gap-2.5 pl-1.5 sm:pl-2 sm:border-l border-zinc-800">
          <Avatar name={name} size="sm" />
          <div className="hidden md:block">
            <p className="text-xs font-medium text-white leading-none">{name}</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}