import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/** Public-site footer with real navigation links to public trust routes. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-slate-900">{SITE_NAME}</p>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
          {SITE_NAME} organizes and explains your records. It does not provide
          medical advice, diagnosis, or treatment.
        </p>
        <nav
          aria-label="Footer"
          className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-slate-600 transition-colors hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
