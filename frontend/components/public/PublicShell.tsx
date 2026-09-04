import SiteHeader from "@/components/public/SiteHeader";
import SiteFooter from "@/components/public/SiteFooter";

/**
 * Shared chrome for public pages: skip link, header with real navigation
 * links, a labeled <main> landmark, and a footer with trust-route links.
 */
export default function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <SiteHeader />

      <main id="main-content" className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">{children}</div>
      </main>

      <SiteFooter />
    </>
  );
}
