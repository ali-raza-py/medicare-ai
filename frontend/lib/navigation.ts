import {
  ArrowLeftRight,
  Building2,
  CalendarClock,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: "/dashboard" | "/documents" | "/upload" | "/timeline" | "/ask" | "/compare" | "/settings" | "/hospital" | "/permissions";
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hospital", label: "Hospital Portal", icon: Building2 },
  { href: "/permissions", label: "Hospital Access", icon: ShieldCheck },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/ask", label: "Ask MediCare AI", icon: Sparkles },
  { href: "/compare", label: "Compare Reports", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings },
];
