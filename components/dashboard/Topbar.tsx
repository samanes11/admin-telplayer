"use client";

import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui";
import { Bell, Search } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { data: session } = useSession();
  const name = session?.user?.name || "Admin";

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-30">
      {/* Title */}
      <div className="flex-1">
        <h1 className="text-base font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notification dot */}
        <div className="relative">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <Bell size={16} />
          </button>
        </div>

        {/* User */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-800">
          <Avatar name={name} size="sm" />
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-white leading-none">{name}</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
