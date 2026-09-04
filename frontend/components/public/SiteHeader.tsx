import Link from "next/link";
import Logo from "@/components/Logo";
import { SITE_NAME } from "@/lib/site";

/**
 * Public-site header with real navigation links (used on the landing page
 * and the public trust pages). Authenticated app navigation is unchanged.
 */
export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6"
      >
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label={`${SITE_NAME} home`}
        >
          <Logo size="sm" />
          <span className="text-base font-semibold text-slate-900">
            {SITE_NAME}
          </span>
        </Link>

        <div className="flex items-center gap-4 text-sm sm:gap-6">
          <Link
            href="/about"
            className="text-slate-600 transition-colors hover:text-slate-900"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-slate-600 transition-colors hover:text-slate-900"
          >
            Contact
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-teal-600 px-3.5 py-2 font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}
