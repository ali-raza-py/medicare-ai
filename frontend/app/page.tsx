import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Clock,
  FileText,
  ShieldCheck,
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

      <main id="main-content" className="flex-1 overflow-hidden bg-[#f5f9f7] text-[#101a36]">
        <section className="relative">
          <div className="pointer-events-none absolute left-[4%] top-20 h-56 w-56 rounded-full bg-[#d7f2ea] blur-3xl" />
          <div className="pointer-events-none absolute right-[-6rem] top-32 h-96 w-96 rounded-full bg-[#d9f0e8] blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:pb-28 lg:pt-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#9ee9dc] bg-white/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#087c72] shadow-sm">
                <Sparkles className="h-4 w-4" />
                Your records, made clearer
              </div>
              <h1 className="mt-7 max-w-2xl text-5xl font-extrabold leading-[0.98] tracking-[-0.065em] text-[#101a36] sm:text-6xl lg:text-[4.7rem]">
                Your health story,
                <span className="block text-[#0b9b8e]">in one clear place.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#526477]">
                Upload your medical records, find the important details faster, and walk into every appointment with a better view of your history.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#073f3c] px-6 py-4 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(7,63,60,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b5a54]"
                >
                  Start organizing free <ArrowRight className="h-4 w-4 text-[#5ce0c9]" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#dce5e9] bg-white px-6 py-4 text-sm font-extrabold text-[#40516a] transition hover:border-[#9ed8ce] hover:text-[#087c72]"
                >
                  See how it works
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-3 text-xs font-semibold text-[#718292]">
                <ShieldCheck className="h-5 w-5 text-[#0b9b8e]" />
                Your account keeps your documents private
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -left-7 top-10 hidden h-28 w-28 rounded-full border-[18px] border-[#c5eee4] sm:block" />
              <div className="absolute -bottom-8 -right-6 h-32 w-32 rounded-full border-[22px] border-[#d9f2e8]" />
              <div className="relative rounded-[2rem] border border-white bg-white p-4 shadow-[0_28px_70px_rgba(34,75,67,0.15)] sm:p-6">
                <div className="flex items-center justify-between border-b border-[#eaf0ee] pb-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e0f7f0] text-[#0b9b8e]"><FileText className="h-5 w-5" /></span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a8a98]">MediCare workspace</p>
                      <p className="mt-1 text-sm font-bold text-[#172743]">Good morning, your records are ready.</p>
                    </div>
                  </div>
                  <span className="hidden rounded-full bg-[#edfbf5] px-3 py-1.5 text-xs font-bold text-[#07856e] sm:inline">Private</span>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl bg-[#f4f8fb] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#768797]">Recent document</p>
                      <span className="h-2 w-2 rounded-full bg-[#0b9b8e]" />
                    </div>
                    <div className="mt-5 flex items-start gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0b9b8e] shadow-sm"><FileText className="h-5 w-5" /></span>
                      <div>
                        <p className="text-sm font-extrabold text-[#172743]">Complete blood count</p>
                        <p className="mt-1 text-xs text-[#7b8a98]">Lab report · Added today</p>
                      </div>
                    </div>
                    <div className="mt-6 rounded-xl border border-[#dcebe5] bg-white p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#627383]"><span>Processing status</span><span className="text-[#0b9b8e]">Ready to review</span></div>
                      <div className="mt-3 h-2 rounded-full bg-[#dcefe9]"><div className="h-2 w-full rounded-full bg-[#0b9b8e]" /></div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-rows-2">
                    <div className="rounded-2xl bg-[#e7faf2] p-5"><Clock className="h-5 w-5 text-[#0b9b8e]" /><p className="mt-5 text-3xl font-extrabold tracking-tight text-[#172743]">12</p><p className="mt-1 text-xs font-bold text-[#438274]">documents organized</p></div>
                    <div className="rounded-2xl bg-[#eef4ff] p-5"><Sparkles className="h-5 w-5 text-[#5979bd]" /><p className="mt-5 text-3xl font-extrabold tracking-tight text-[#172743]">3</p><p className="mt-1 text-xs font-bold text-[#61769f]">timeline events</p></div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#e4ece9] bg-white p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e2f8f0] text-[#0b9b8e]"><Check className="h-4 w-4" /></span><p className="text-xs font-semibold leading-5 text-[#5d7080]">Everything you upload stays connected to your personal health timeline.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-[#dceae5] bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0b9b8e]">Everything in context</p>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.05em] text-[#101a36] sm:text-5xl">Less searching. More understanding.</h2>
              <p className="mt-5 text-lg leading-8 text-[#627383]">MediCare AI turns scattered health paperwork into a workspace you can actually use.</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="group rounded-3xl border border-[#e1ece8] bg-[#f7fbf9] p-6 transition hover:-translate-y-1 hover:border-[#9ed8ce] hover:bg-white hover:shadow-[0_16px_32px_rgba(28,76,67,0.08)]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dff7ef] text-[#0b9b8e] transition group-hover:bg-[#0b9b8e] group-hover:text-white"><feature.icon className="h-5 w-5" /></span>
                  <h3 className="mt-7 text-lg font-extrabold tracking-[-0.02em] text-[#172743]">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#6c7d8b]">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-[#eaf6f1]">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:py-24">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0b9b8e]">A simple rhythm</p>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.05em] text-[#101a36] sm:text-5xl">Your next appointment starts before you arrive.</h2>
              <p className="mt-5 text-lg leading-8 text-[#627383]">Build a reliable picture of your health history in three calm steps.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[{ number: "01", title: "Bring it together", text: "Upload reports, scans, and prescriptions to your private library." }, { number: "02", title: "See the thread", text: "Follow important details across a chronological health timeline." }, { number: "03", title: "Ask with context", text: "Explore your own records with source-grounded questions." }].map((step) => (
                <div key={step.number} className="rounded-3xl bg-white p-6 shadow-[0_10px_26px_rgba(28,76,67,0.06)]"><span className="text-sm font-extrabold text-[#0b9b8e]">{step.number}</span><h3 className="mt-12 text-lg font-extrabold text-[#172743]">{step.title}</h3><p className="mt-3 text-sm leading-6 text-[#6c7d8b]">{step.text}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="trust-heading" className="bg-[#073f3c] text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-20">
            <div className="max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#80e6d0]">Built for clarity, not diagnosis</p><h2 id="trust-heading" className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Understand your records. Keep the decisions with your care team.</h2><p className="mt-4 text-sm leading-7 text-[#c3e1da]">MediCare AI organizes and explains the records you upload. It does not provide medical advice, diagnosis, or treatment.</p></div>
            <Link href="/about" className="inline-flex shrink-0 items-center gap-2 text-sm font-extrabold text-[#8debd7] hover:text-white">Read our approach <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="bg-white">
          <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="text-center"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0b9b8e]">Questions, answered</p><h2 id="faq-heading" className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-[#101a36]">A better place to begin.</h2></div>
            <div className="mt-12 divide-y divide-[#e1ece8] border-y border-[#e1ece8]">
              {FAQS.map((faq) => <details key={faq.question} className="group py-5"><summary className="cursor-pointer list-none pr-8 text-base font-extrabold text-[#172743] marker:content-none group-open:text-[#0b9b8e]">{faq.question}</summary><p className="mt-3 max-w-3xl text-sm leading-7 text-[#6c7d8b]">{faq.answer}</p></details>)}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}


