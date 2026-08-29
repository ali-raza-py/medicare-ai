"use client";

import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import type { MedCareUser } from "@/lib/auth";

export default function Header({
  user,
  onMenuClick,
  onLogout,
}: {
  user: MedCareUser;
  onMenuClick: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const title = current?.label ?? "MediCare AI";

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-base font-semibold text-slate-900">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
            {initials}
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-900 leading-tight">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
