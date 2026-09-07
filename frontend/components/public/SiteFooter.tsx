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
    <footer className="border-t border-[#dceae5] bg-[#f3f8f5]">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-lg font-extrabold tracking-[-0.04em] text-[#101a36]">{SITE_NAME}</p>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#6b7b8b]">
          {SITE_NAME} organizes and explains your records. It does not provide
          medical advice, diagnosis, or treatment.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[#526477] transition-colors hover:text-[#0b9b8e]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
