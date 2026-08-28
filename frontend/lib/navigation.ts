import {
  ArrowLeftRight,
  CalendarClock,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: "/dashboard" | "/documents" | "/upload" | "/timeline" | "/ask" | "/compare" | "/settings";
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/ask", label: "Ask MedCare AI", icon: Sparkles },
  { href: "/compare", label: "Compare Reports", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings },
];
