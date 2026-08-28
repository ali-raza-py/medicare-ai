import { HeartPulse } from "lucide-react";

export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span
      className={`flex ${box} items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm`}
      aria-hidden="true"
    >
      <HeartPulse className={icon} />
    </span>
  );
}
