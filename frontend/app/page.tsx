import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Clock,
  FileText,
  Sparkles,
  Upload,
} from "lucide-react";
import SiteHeader from "@/components/public/SiteHeader";
import SiteFooter from "@/components/public/SiteFooter";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/* ------------------------------------------------------------------ */
/*  Structured data (JSON-LD) + FAQ content                            */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    question: "What is MediCare AI?",
    answer:
      "MediCare AI is a web application that helps you organize your medical records in one place. You upload documents such as lab reports, imaging results, and prescriptions, and MediCare AI organizes them into a searchable, evidence-grounded timeline.",
  },
  {
    question: "How does MediCare AI help organize medical records?",
    answer:
      "When you upload a document, MediCare AI organizes it in your personal library and places relevant information, such as results or visits, on your health timeline. That makes it easier to find past records and see how your medical history fits together.",
  },
  {
    question: "How does AI assistance work in MediCare AI?",
    answer:
      "You can ask questions about the records you have already uploaded, and MediCare AI answers with references back to the source information in those records. You can also compare two reports to see what changed between them, with the evidence shown alongside each change.",
  },
  {
    question: "Can MediCare AI replace a healthcare professional?",
    answer:
      "No. MediCare AI is an informational tool that organizes and explains the records you upload. It does not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional about your health.",
  },
  {
    question: "Who can see my records in MediCare AI?",
    answer:
      "Your records belong to your account. Documents you upload are associated with your authenticated user account and are not publicly accessible through the website.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description:
        "MediCare AI helps you organize medical records and review the information in them with evidence-grounded AI assistance.",
    },
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
    },
    {
      "@type": "WebPage",
      name: `${SITE_NAME} — Organize and Understand Medical Records`,
      url: `${SITE_URL}/`,
      description:
        "MediCare AI helps you organize medical records and review the information in them with evidence-grounded AI assistance.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: Upload,
    title: "Upload your documents",
    description:
      "Add lab reports, imaging results, and prescriptions to your personal document library.",
  },
  {
    icon: Clock,
    title: "Build your health timeline",
    description:
      "Relevant information from your records is organized into one chronological timeline you can search.",
  },
  {
    icon: Sparkles,
    title: "Ask questions about your records",
    description:
      "Get answers grounded in the documents you have uploaded, with references back to the source.",
  },
  {
    icon: ArrowLeftRight,
    title: "Compare reports",
    description:
      "See what changed between two reports, with the supporting evidence shown for each change.",
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <SiteHeader />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {SITE_NAME}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
              MediCare AI is a health record workspace that helps you organize
              medical records — lab reports, imaging, prescriptions — and review
              the information inside them with evidence-grounded AI assistance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Learn more
              </Link>
            </div>
          </div>
        </section>

        {/* What is MediCare AI? */}
        <section
          aria-labelledby="what-is-heading"
          className="mx-auto max-w-5xl px-4 py-14 sm:px-6"
        >
          <h2
            id="what-is-heading"
            className="text-2xl font-semibold tracking-tight text-slate-900"
          >
            What is MediCare AI?
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600">
            MediCare AI is a web application for people who want their medical
            paperwork in one organized place. You create an account, upload the
            medical documents you already have, and MediCare AI organizes them
            into a personal library and a chronological health timeline. When
            you have a question about something in your records, you can ask
            MediCare AI and get an answer grounded in those records — with the
            source information referenced so you can check it yourself.
          </p>
        </section>

        {/* How does it organize records? */}
        <section
          aria-labelledby="organize-heading"
          className="border-y border-slate-200 bg-slate-50"
        >
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2
              id="organize-heading"
              className="text-2xl font-semibold tracking-tight text-slate-900"
            >
              How does MediCare AI organize medical records?
            </h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-slate-600">
              Every document you upload is stored in your personal library and
              summarized onto your timeline, so past results, visits, and
              prescriptions stay findable instead of scattered across files and
              folders.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100/60 text-teal-700">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Not a doctor */}
        <section
          aria-labelledby="not-a-doctor-heading"
          className="mx-auto max-w-5xl px-4 py-14 sm:px-6"
        >
          <h2
            id="not-a-doctor-heading"
            className="text-2xl font-semibold tracking-tight text-slate-900"
          >
            Is MediCare AI a replacement for a healthcare professional?
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600">
            No. MediCare AI organizes and explains the records you upload. It
            does not provide medical advice, diagnosis, or treatment, and it
            does not make decisions about your care. Use it to keep your
            documents organized and to understand what they contain — then talk
            to a qualified healthcare professional about anything that affects
            your health.
          </p>
          <div className="mt-6 flex gap-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-5">
            <FileText
              className="h-6 w-6 shrink-0 text-teal-700"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-teal-800">
              MediCare AI organizes and explains your records. It does not
              provide medical advice, diagnosis, or treatment.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section
          aria-labelledby="faq-heading"
          className="border-t border-slate-200 bg-slate-50"
        >
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2
              id="faq-heading"
              className="text-2xl font-semibold tracking-tight text-slate-900"
            >
              Frequently asked questions
            </h2>
            <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-6">
              {FAQS.map((faq) => (
                <div key={faq.question} className="py-5">
                  <h3 className="font-medium text-slate-900">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>


      </main>

      <SiteFooter />
    </>
  );
}


