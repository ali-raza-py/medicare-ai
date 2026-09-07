"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ClipboardPlus,
  FileHeart,
  HeartPulse,
  Pill,
  ScanLine,
  Stethoscope,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AppTour from "@/components/AppTour";
import { logout } from "@/lib/auth";
import { useSession } from "@/lib/session";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    // Only redirect after the session check has completed.
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  // Show a loading state while checking auth or when not authenticated.
  // The middleware also protects routes server-side, so this is a client-side safety net.
  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <HeartPulse className="h-8 w-8 animate-pulse text-teal-600" />
          <p className="text-sm">Loading MediCare AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f8f5]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <Activity className="medical-float absolute left-[20%] top-[13%] h-24 w-24 [--medical-rotation:-12deg] text-[#0b9b8e]/[0.055]" />
        <Stethoscope className="medical-float absolute right-[8%] top-[18%] h-28 w-28 [--medical-rotation:12deg] text-[#0b9b8e]/[0.045] [animation-delay:1.2s]" />
        <Pill className="medical-float absolute bottom-[14%] left-[16%] h-20 w-20 [--medical-rotation:45deg] text-[#0b9b8e]/[0.05] [animation-delay:2s]" />
        <ScanLine className="medical-float absolute bottom-[10%] right-[18%] h-28 w-28 [--medical-rotation:-12deg] text-[#0b9b8e]/[0.04] [animation-delay:0.6s]" />
        <ClipboardPlus className="medical-float absolute left-[48%] top-[48%] h-16 w-16 [--medical-rotation:6deg] text-[#0b9b8e]/[0.035] [animation-delay:1.7s]" />
        <FileHeart className="medical-float absolute right-[42%] bottom-[7%] h-20 w-20 [--medical-rotation:-6deg] text-[#0b9b8e]/[0.04] [animation-delay:2.6s]" />
      </div>
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />
      <div className={`relative z-10 flex min-h-screen flex-col transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${sidebarExpanded ? "lg:pl-72" : "lg:pl-32"}`}>
        <Header
          user={user}
          onMenuClick={() => setMobileOpen(true)}
          onLogout={handleLogout}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <AppTour userKey={user.email} onOpenMenu={() => setMobileOpen(true)} />
    </div>
  );
}
