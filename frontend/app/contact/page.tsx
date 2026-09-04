import type { Metadata } from "next";
import PublicShell from "@/components/public/PublicShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "How to reach the MediCare AI project team — currently via the project's GitHub repository.",
  alternates: { canonical: "/contact" },
};

const REPO_URL = "https://github.com/ali-raza-py/medicare-ai";
const ISSUES_URL = `${REPO_URL}/issues`;

export default function ContactPage() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        Contact
      </h1>

      <div className="mt-6 space-y-5 leading-relaxed text-slate-600">
        <p>
          {SITE_NAME} does not currently offer a public support email address
          or phone number, so we won&apos;t pretend it does. The project is
          developed openly, and the best way to reach the team right now is
          through the project&apos;s GitHub repository.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Report a problem or ask a question
        </h2>
        <p>
          Open an issue in the GitHub repository and describe what happened:
        </p>
        <p>
          <a
            href={ISSUES_URL}
            className="font-medium text-teal-700 hover:text-teal-800 hover:underline"
          >
            {ISSUES_URL}
          </a>
        </p>
        <p>
          Please <strong className="text-slate-900">never include personal
          medical information</strong> or your password in a public issue.
          Describe the problem in general terms only.
        </p>

        <h2 className="pt-2 text-xl font-semibold text-slate-900">
          Security or privacy concerns
        </h2>
        <p>
          If you believe you have found a security or privacy problem, please
          open a GitHub issue and ask for a private follow-up channel before
          sharing details publicly.
        </p>
      </div>
    </PublicShell>
  );
}
