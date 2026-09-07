"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";

const TOUR_STEPS = [
  {
    title: "Find your way around",
    body: "Use the sidebar to move between your dashboard, records, timeline, and tools.",
    selectors: "[data-tour=\"menu\"], [data-tour=\"navigation\"]",
  },
  {
    title: "Your document library",
    body: "Every uploaded report lives here, ready to search, review, or remove.",
    selectors: "[data-tour=\"documents\"]",
  },
  {
    title: "Add a new record",
    body: "Upload a lab report, scan, prescription, or other health document from here.",
    selectors: "[data-tour=\"upload\"]",
  },
  {
    title: "Follow the timeline",
    body: "See important dates and events from your records in one chronological view.",
    selectors: "[data-tour=\"timeline\"]",
  },
  {
    title: "Ask with context",
    body: "Ask questions about documents you have uploaded and review the source context.",
    selectors: "[data-tour=\"ask\"]",
  },
  {
    title: "Your account is always close",
    body: "Use your profile area to see your account or sign out when you are finished.",
    selectors: "[data-tour=\"account\"]",
  },
] as const;

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function getVisibleTarget(selectors: string): TargetRect | null {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selectors));
  const element = elements.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top - 7,
    left: rect.left - 7,
    width: rect.width + 14,
    height: rect.height + 14,
  };
}

export default function AppTour({
  userKey,
  onOpenMenu,
}: {
  userKey: string;
  onOpenMenu: () => void;
}) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<TargetRect | null>(null);
  const storageKey = `medcare.tour.completed:${userKey}`;
  const current = TOUR_STEPS[step];

  useEffect(() => {
    const openTour = window.setTimeout(() => {
      if (!window.localStorage.getItem(storageKey)) setOpen(true);
    }, 0);
    return () => window.clearTimeout(openTour);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;

    const updateTarget = () => setTarget(getVisibleTarget(current.selectors));
    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [current.selectors, open]);

  function finish() {
    window.localStorage.setItem(storageKey, "true");
    setOpen(false);
  }

  function next() {
    if (step === 0 && window.innerWidth < 1024) onOpenMenu();
    if (step === TOUR_STEPS.length - 1) {
      finish();
    } else {
      setStep((value) => value + 1);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="absolute inset-0 bg-[#101a36]/65 backdrop-blur-[2px]" />
      {target ? (
        <div
          className="pointer-events-none fixed z-[61] rounded-2xl border-2 border-[#75ead2] shadow-[0_0_0_9999px_rgba(16,26,54,0.56),0_0_24px_rgba(117,234,210,0.45)] transition-all duration-300"
          style={{ top: target.top, left: target.left, width: target.width, height: target.height }}
        />
      ) : null}

      <section className="absolute left-4 right-4 top-5 max-w-md rounded-[1.75rem] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(11,35,50,0.28)] sm:left-1/2 sm:right-auto sm:w-[28rem] sm:-translate-x-1/2 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf0ff] text-[#6366f1]"><Sparkles className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6366f1]">Step {step + 1} of {TOUR_STEPS.length}</p>
              <div className="mt-3 flex gap-1.5" aria-hidden="true">
                {TOUR_STEPS.map((item, index) => <span key={item.title} className={`h-1.5 rounded-full transition-all ${index === step ? "w-8 bg-[#7167f5]" : "w-2.5 bg-[#dfe5ef]"}`} />)}
              </div>
            </div>
          </div>
          <button type="button" onClick={finish} aria-label="Close tutorial" className="rounded-full p-1.5 text-[#8fa0b4] transition hover:bg-[#f0f3f7] hover:text-[#40516a]"><X className="h-6 w-6" /></button>
        </div>

        <h2 id="tour-title" className="mt-6 text-2xl font-extrabold tracking-[-0.04em] text-[#17233e]">{current.title}</h2>
        <p className="mt-3 text-base leading-7 text-[#687992]">{current.body}</p>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#dbe3ff] bg-[#f0f3ff] px-4 py-3.5 text-sm font-bold text-[#4f46e5]"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#7167f5]" />{step === 0 ? "Use the highlighted navigation to continue" : "This is where you can find it"}</div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
          <button type="button" onClick={next} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#123f3a] px-4 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#0d322f]">{step === TOUR_STEPS.length - 1 ? "Finish tutorial" : "Next step"}{step === TOUR_STEPS.length - 1 ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</button>
          <button type="button" onClick={finish} className="flex-1 rounded-2xl border border-[#dbe3ed] px-4 py-3.5 text-sm font-bold text-[#687992] transition hover:bg-[#f7f9fb] hover:text-[#17233e]">Skip tutorial</button>
        </div>
      </section>
    </div>
  );
}
