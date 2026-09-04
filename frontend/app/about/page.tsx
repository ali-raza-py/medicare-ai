import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/public/PublicShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "What MediCare AI is, what it does with your medical records, and what it does not do.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        About {SITE_NAME}
      </h1>

      <div className="mt-6 space-y-5 leading-relaxed text-slate-600">
        <p>
          {SITE_NAME} is a web application that helps you organize your medical
          records and review the information in them with evidence-grounded AI
          assistance. Instead of digging through folders of lab reports,
          imaging results, and prescriptions, you keep them in one personal,
          searchable workspace.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          What MediCare AI does
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-slate-900">Document library</strong> —
            upload medical documents such as lab reports, imaging results, and
            prescriptions.
          </li>
          <li>
            <strong className="text-slate-900">Health timeline</strong> —
            relevant information from your records is organized into a
            chronological timeline you can browse and search.
          </li>
          <li>
            <strong className="text-slate-900">Ask AI</strong> — ask questions
            about the records you have already uploaded and get answers with
            references back to the source information.
          </li>
          <li>
            <strong className="text-slate-900">Compare reports</strong> — see
            what changed between two reports, with the supporting evidence
            shown for each change.
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          What MediCare AI does not do
        </h2>
        <p>
          {SITE_NAME} organizes and explains your records. It does not provide
          medical advice, diagnosis, or treatment, and it is not a replacement
          for a qualified healthcare professional. Always consult a healthcare
          professional about anything that affects your health.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Your records belong to your account
        </h2>
        <p>
          Documents you upload are associated with your authenticated user
          account. Your account is protected by sign-in, and your records are
          not publicly accessible through the website. See our{" "}
          <Link
            href="/privacy"
            className="font-medium text-teal-700 hover:text-teal-800 hover:underline"
          >
            Privacy overview
          </Link>{" "}
          for details.
        </p>
      </div>
    </PublicShell>
  );
}
