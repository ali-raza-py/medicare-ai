import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/public/PublicShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Plain-language terms for using the MediCare AI application.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Terms of use
      </h1>

      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        These are plain-language terms for using {SITE_NAME}. They are not a
        formally reviewed legal document.
      </p>

      <div className="mt-6 space-y-5 leading-relaxed text-slate-600">
        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Using the service
        </h2>
        <p>
          {SITE_NAME} is provided as a tool to help you organize and review
          your own medical records. Create an account with accurate details,
          keep your password confidential, and use the service only for lawful
          purposes.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Uploading records
        </h2>
        <p>
          Only upload documents you have the right to upload — such as your own
          medical records or records you are authorized to manage. Do not upload
          other people&apos;s personal information without their permission.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Not medical advice
        </h2>
        <p>
          {SITE_NAME} organizes and explains your records. It does not provide
          medical advice, diagnosis, or treatment, and it is not a replacement
          for a qualified healthcare professional. Always consult a healthcare
          professional about anything that affects your health.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          No warranty
        </h2>
        <p>
          The service is provided &quot;as is.&quot; Features may change or be
          discontinued, and AI-generated summaries and answers can contain
          mistakes. Verify important information against the underlying
          documents before relying on it.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Questions
        </h2>
        <p>
          See the{" "}
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
