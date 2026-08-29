"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import Logo from "@/components/Logo";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-teal-600 font-medium text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className={`h-4.5 w-4.5 ${active ? "text-white" : "text-slate-400"}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <Logo size="sm" />
        <div>
          <p className="text-sm font-semibold text-slate-900">MediCare AI</p>
          <p className="text-xs text-slate-500">Health record workspace</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <NavLinks onNavigate={onNavigate} />
      </div>

      <div className="border-t border-slate-200 p-4">
        <p className="text-xs leading-relaxed text-slate-500">
          MediCare AI organizes and explains your records. It does not provide
          medical advice, diagnosis, or treatment.
        </p>
      </div>
    </div>
  );
}

export default function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  // Close the mobile drawer after a navigation.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-64 lg:flex-col border-r border-slate-200 bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent onNavigate={onClose} />
        </div>
      </div>
    </>
  );
}
