"use client";

import { usePathname } from "next/navigation";
import { Loader2, LogOut, Menu } from "lucide-react";
import { useState } from "react";
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
  const [loggingOut, setLoggingOut] = useState(false);
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

  async function handleLogoutClick() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-4 z-30 mx-4 flex h-16 items-center gap-3 rounded-2xl border border-white/90 bg-white/90 px-4 shadow-[0_10px_28px_rgba(31,65,55,0.08)] backdrop-blur sm:mx-6 sm:px-6 lg:mx-8 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        data-tour="menu"
        aria-label="Open navigation"
        className="interactive-lift rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2.5" data-tour="account">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dff7ef] text-sm font-extrabold text-[#087c72]">
            {initials}
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogoutClick}
          disabled={loggingOut}
          className="interactive-lift flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-[#9ed8ce] hover:bg-[#f1faf7] hover:text-[#087c72] disabled:opacity-60"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          <span className="hidden sm:inline">{loggingOut ? "Signing out..." : "Log out"}</span>
        </button>
      </div>
    </header>
  );
}
