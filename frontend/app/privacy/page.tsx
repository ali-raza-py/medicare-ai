import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/public/PublicShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "A plain-language overview of what MediCare AI stores and how your medical records are handled.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Privacy overview
      </h1>

      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        This is a plain-language overview of how {SITE_NAME} handles your
        information. It is not a formally reviewed legal document.
      </p>

      <div className="mt-6 space-y-5 leading-relaxed text-slate-600">
        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          What we store
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-slate-900">Account information</strong> —
            your email address and a password, handled through Supabase
            authentication when you create an account.
          </li>
          <li>
            <strong className="text-slate-900">Your records</strong> — the
            medical documents you upload and the structured information derived
            from them (such as timeline entries), stored in association with
            your account so the application can organize and display them.
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          How your information is used
        </h2>
        <p>
          Your account information and uploaded records are used to provide the
          application&apos;s features: your document library, your health
          timeline, AI answers about your records, and report comparisons. Your
          records are tied to your authenticated account and are not publicly
          accessible through the website.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Sharing
        </h2>
        <p>
          {SITE_NAME} does not sell your information. The application relies on
          third-party infrastructure — Supabase for authentication and storage,
          and the application&apos;s own backend API — to operate. Those
          services process data as needed to provide the functionality you use.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Sign-in sessions
        </h2>
        <p>
          {SITE_NAME} uses session cookies to keep you signed in. These cookies
          are required for the application to recognize your account and are
          not used to track you across other websites.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Your choices
        </h2>
        <p>
          You can delete the documents you have uploaded from within the
          application. If you have questions about your account or data, see
          the{" "}
          <Link
            href="/contact"
            className="font-medium text-teal-700 hover:text-teal-800 hover:underline"
          >
            Contact page
          </Link>{" "}
          for how to reach the team.
        </p>
      </div>
    </PublicShell>
  );
}
