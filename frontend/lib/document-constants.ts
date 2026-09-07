import {
  FileText,
  FlaskConical,
  ScanLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DocumentViewModel = {
  id: string;
  name: string;
  kind: "lab" | "imaging" | "report";
  date: string;
  pages: number;
  status: "processed" | "processing" | "failed";
  flag: "normal" | "attention" | "high";
};

export const KIND_ICONS: Record<DocumentViewModel["kind"], LucideIcon> = {
  lab: FlaskConical,
  imaging: ScanLine,
  report: FileText,
};

export const FLAG_STYLES: Record<DocumentViewModel["flag"], string> = {
  normal: "bg-emerald-50 text-emerald-700",
  attention: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

export const FLAG_LABELS: Record<DocumentViewModel["flag"], string> = {
  normal: "Normal",
  attention: "Attention",
  high: "Follow up",
};

export const KIND_LABELS: Record<DocumentViewModel["kind"], string> = {
  lab: "Lab",
  imaging: "Imaging",
  report: "Report",
};
