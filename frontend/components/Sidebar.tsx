"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import Logo from "@/components/Logo";

function NavLinks({
  onNavigate,
  expanded,
}: {
  onNavigate?: () => void;
  expanded: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-2 px-3" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            data-tour={
              item.href === "/documents"
                ? "documents"
                : item.href === "/upload"
                  ? "upload"
                  : item.href === "/timeline"
                    ? "timeline"
                    : item.href === "/ask"
                      ? "ask"
                      : undefined
            }
            aria-current={active ? "page" : undefined}
            title={!expanded ? item.label : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-base font-bold transition-colors ${
              active
                ? "bg-teal-600 font-medium text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            } ${expanded ? "justify-start" : "justify-center"}`}
          >
            <Icon className={`h-5.5 w-5.5 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
            <span
              className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-out ${
                expanded ? "max-w-[12rem] translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  onNavigate,
  expanded,
}: {
  onNavigate?: () => void;
  expanded: boolean;
}) {
  return (
    <div className="flex h-full flex-col" data-tour="navigation">
      <div className={`flex h-16 items-center border-b border-slate-200 transition-[gap,padding] duration-300 ${expanded ? "gap-3 px-5" : "justify-center px-3"}`}>
        <Logo size="sm" />
        <div className={`min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-out ${expanded ? "max-w-[12rem] translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"}`}>
          <p className="text-base font-extrabold tracking-tight text-slate-900">MediCare AI</p>
          <p className="text-xs text-slate-500">Health record workspace</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <NavLinks onNavigate={onNavigate} expanded={expanded} />
      </div>

      <div className={`overflow-hidden border-t border-slate-200 transition-[padding,max-height,opacity] duration-300 ${expanded ? "max-h-32 p-4 opacity-100" : "max-h-0 p-0 opacity-0"}`}>
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
  expanded,
  onExpandedChange,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const pathname = usePathname();
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHovered = useRef(false);

  function cancelCollapse() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }

  function expandOnHover() {
    isHovered.current = true;
    cancelCollapse();
    onExpandedChange(true);
  }

  function collapseAfterDelay() {
    isHovered.current = false;
    cancelCollapse();
    collapseTimer.current = setTimeout(() => onExpandedChange(false), 700);
  }

  // Close the mobile drawer after a navigation.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onClose]);

  useEffect(() => {
    const idleCollapse = setTimeout(() => {
      if (!isHovered.current) onExpandedChange(false);
    }, 2600);
    return () => clearTimeout(idleCollapse);
  }, [onExpandedChange]);

  useEffect(() => () => cancelCollapse(), []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:fixed lg:inset-y-6 lg:left-4 lg:z-40 lg:flex lg:flex-col overflow-hidden rounded-[2rem] border border-white/90 bg-white shadow-[0_18px_45px_rgba(31,65,55,0.14)] transition-[width,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${expanded ? "lg:w-64" : "lg:w-28"}`}
        onMouseEnter={expandOnHover}
        onMouseLeave={collapseAfterDelay}
      >
        <SidebarContent expanded={expanded} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="interactive-lift absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent onNavigate={onClose} expanded />
        </div>
      </div>
    </>
  );
}
