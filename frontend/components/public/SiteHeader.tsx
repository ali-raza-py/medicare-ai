import Link from "next/link";
import { ArrowUpRight, ChevronDown, HeartPulse } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

/**
 * Public-site header with real navigation links (used on the landing page
 * and the public trust pages). Authenticated app navigation is unchanged.
 */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-10">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between rounded-full border border-white bg-white/90 px-5 shadow-[0_10px_32px_rgba(28,61,56,0.08)] backdrop-blur-xl sm:px-8"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label={`${SITE_NAME} home`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b9b8e] text-white shadow-[0_6px_14px_rgba(11,155,142,0.22)]">
            <HeartPulse className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-[-0.04em] text-[#101a36]">
            {SITE_NAME}
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-semibold text-[#40516a] lg:flex">
          <Link href="/#features" className="transition-colors hover:text-[#0b9b8e]">
            Features
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-[#0b9b8e]">
            How it works
          </Link>
          <Link
            href="/about"
            className="transition-colors hover:text-[#0b9b8e]"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="transition-colors hover:text-[#0b9b8e]"
          >
            Contact
          </Link>
          <button type="button" className="inline-flex items-center gap-1 transition-colors hover:text-[#0b9b8e]">
            Portals <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm font-bold">
          <Link
            href="/login"
            className="hidden text-[#40516a] transition-colors hover:text-[#0b9b8e] sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center gap-2 rounded-full bg-[#073f3c] px-5 py-3 text-white shadow-[0_7px_18px_rgba(7,63,60,0.18)] transition hover:bg-[#0b5a54]"
          >
            Start free <ArrowUpRight className="h-4 w-4 text-[#5ce0c9]" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
