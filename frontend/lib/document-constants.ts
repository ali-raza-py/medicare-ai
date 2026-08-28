import {
  FileText,
  FlaskConical,
  ScanLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DemoDocument } from "./demo-data";

export const KIND_ICONS: Record<DemoDocument["kind"], LucideIcon> = {
  lab: FlaskConical,
  imaging: ScanLine,
  report: FileText,
};

export const FLAG_STYLES: Record<DemoDocument["flag"], string> = {
  normal: "bg-emerald-50 text-emerald-700",
  attention: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

export const FLAG_LABELS: Record<DemoDocument["flag"], string> = {
  normal: "Normal",
  attention: "Attention",
  high: "Follow up",
};

export const KIND_LABELS: Record<DemoDocument["kind"], string> = {
  lab: "Lab",
  imaging: "Imaging",
  report: "Report",
};
