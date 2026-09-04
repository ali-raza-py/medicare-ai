/**
 * Shared date formatting helpers (used by both the Dashboard server page and
 * its client-side document stats component).
 */

export function formatShortDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatDocDate(isoDate: string | null): string {
  if (!isoDate) return "Unknown date";
  return formatShortDate(isoDate);
}

export function isThisMonth(isoDate: string | null): boolean {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}