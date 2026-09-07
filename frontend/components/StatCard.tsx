import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-[#dfebe6] bg-white p-5 shadow-[0_10px_26px_rgba(31,65,55,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(31,65,55,0.1)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dff7ef] text-[#0b9b8e]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
