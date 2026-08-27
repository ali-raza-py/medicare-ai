const navItems = [
  "Home",
  "AI Assistant",
  "Health Tools",
  "Resources",
  "About",
];

const featureCards = [
  {
    icon: "✚",
    title: "AI Health Assistant",
    text: "Understand symptoms, prepare questions, and organize healthcare information in plain language.",
  },
  {
    icon: "🧠",
    title: "Personalized Insights",
    text: "Bring together records, notes, and care questions into a clear digital health overview.",
  },
  {
    icon: "📄",
    title: "Document Intelligence",
    text: "Review uploaded reports and medical records with structured summaries and context.",
  },
];

const steps = [
  {
    number: "01",
    title: "Add your health information",
    text: "Upload scans, notes, or care summaries into a secure, thoughtfully organized workspace.",
  },
  {
    number: "02",
    title: "Medicare analyzes it",
    text: "Our AI organizes the information and highlights the most relevant details, patterns, and questions.",
  },
  {
    number: "03",
    title: "Get clear next steps",
    text: "Receive understandable insights and trusted resources that support informed decisions.",
  },
];

const whyCards = [
  {
    icon: "⚕",
    title: "AI-powered support",
    text: "Simple, intelligent guidance to help people navigate health information with more confidence.",
  },
  {
    icon: "🛡",
    title: "Private by design",
    text: "Thoughtful product experiences that prioritize safety, clarity, and user trust.",
  },
  {
    icon: "📊",
    title: "Organized overview",
    text: "Keep appointments, questions, and records in one clear healthcare view.",
  },
  {
    icon: "📚",
    title: "Trusted resources",
    text: "Accessible educational content and support designed to make healthcare information easier to understand.",
  },
];

const chartBars = [12, 18, 24, 16, 28, 20, 34, 26, 38, 32, 42, 28, 52, 38, 44, 54];

function HealthIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dcefe8] bg-[#effaf7] text-xl text-[#0d8b82] shadow-[0_8px_20px_rgba(16,154,143,0.08)]">
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#edf5f3] text-[#0f172a]">
      <header className="sticky top-0 z-50 border-b border-[#dce9e5] bg-[#edf5f3]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#13a199] to-[#0c7e97] text-lg text-white shadow-[0_12px_26px_rgba(20,159,154,0.28)]">
              ✚
            </div>
            <span className="text-[2rem] font-black tracking-[-0.08em] text-[#0d1d29]">Medicare</span>
          </div>

          <nav className="hidden items-center gap-8 text-[11px] font-bold uppercase tracking-[0.16em] text-[#23394c] md:flex">
            {navItems.map((item) => (
              <a key={item} href="#" className="transition hover:text-[#0c8a7e]">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button className="rounded-full border border-[#cfe5df] bg-[#f3faf8] px-5 py-2.5 text-sm font-semibold text-[#0d786d] shadow-[0_10px_18px_rgba(16,159,148,0.08)] transition hover:bg-[#eaf8f5]">
              Log In
            </button>
            <button className="rounded-full bg-gradient-to-r from-[#0ea69d] to-[#0d7fa1] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(17,158,146,0.25)] transition hover:brightness-110">
              Get Started
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-[1500px] overflow-hidden px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(35,182,170,0.12),transparent_58%)]" />

        <section className="relative z-10 grid items-center gap-12 pb-10 pt-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:pt-16">
          <div className="relative">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#bfe0d7] bg-[#ebf9f5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0b7d74] shadow-[0_10px_20px_rgba(10,136,126,0.05)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f7fbfa] text-[10px] text-[#0d8d7d]">✦</span>
              AI-powered healthcare platform
            </div>

            <h1 className="max-w-[760px] text-[3.2rem] font-black leading-[0.9] tracking-[-0.08em] text-[#0f172a] sm:text-[4.5rem] xl:text-[7rem]">
              Smarter healthcare,
              <span className="block text-[#0ca89b]">powered by</span>
              <span className="block">intelligent AI.</span>
            </h1>

            <p className="mt-7 max-w-[620px] text-lg leading-8 text-[#465b6d] md:text-xl">
              An intelligent healthcare platform that helps people understand their health, organize medical information, and make better-informed decisions with AI-powered support.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <button className="rounded-full bg-gradient-to-r from-[#0ca89b] to-[#0a7ea4] px-8 py-4 text-lg font-bold text-white shadow-[0_18px_35px_rgba(18,157,146,0.26)] transition hover:-translate-y-0.5 hover:brightness-110">
                Get Started Free →
              </button>
              <button className="rounded-full border border-[#cddfda] bg-[#f7faf9] px-8 py-4 text-lg font-semibold text-[#10222d] shadow-[0_10px_18px_rgba(148,163,184,0.12)] transition hover:bg-white">
                Explore Medicare
              </button>
            </div>

          </div>

          <div className="relative flex min-h-[620px] items-center justify-center">
            <div className="absolute left-0 top-16 flex h-24 w-24 items-center justify-center rounded-full border border-[#cfe8e1] bg-[#edf9f7] text-2xl text-[#0e8b80] opacity-80 shadow-[0_18px_30px_rgba(17,174,164,0.08)]">
              ✚
            </div>
            <div className="absolute right-6 top-4 flex h-28 w-28 items-center justify-center rounded-full border border-[#d7efe9] bg-[#effaf7] text-3xl text-[#0e8b80] opacity-80">
              ☰
            </div>
            <div className="absolute left-10 bottom-12 flex h-24 w-24 items-center justify-center rounded-full border border-[#d4ece3] bg-[#f5fbf9] text-2xl text-[#0e8b80] opacity-85">
              ♡
            </div>
            <div className="absolute right-8 bottom-0 flex h-20 w-20 items-center justify-center rounded-full border border-[#d5e8e1] bg-[#f3fbf8] text-2xl text-[#0e8b80] opacity-80">
              ◌
            </div>

            <div className="relative w-full max-w-[580px] rounded-[30px] border border-[#d5e8e2] bg-[#f4faf8] p-5 shadow-[0_24px_60px_rgba(144,169,158,0.12)] sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#cfe3db] bg-[#eafaf6] text-2xl text-[#0d8d7d]">
                  ❤
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dffaf4] text-xl text-[#0d8d7d] shadow-inner">
                  ↗
                </div>
              </div>

              <div className="rounded-[24px] bg-white/50 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#355566]">Health overview</div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-5xl font-black tracking-[-0.08em] text-[#0f172a]">94%</div>
                    <div className="mt-1 text-sm text-[#557081]">profile information analyzed</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#daf8f2] text-lg text-[#0d8d7d] shadow-[0_10px_18px_rgba(14,151,141,0.12)]">
                    ↗
                  </div>
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-[#dfeae7] bg-[#f6f9f8] p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#ddfaf4] text-xl text-[#136f62]">◌</div>
                    <div className="text-3xl font-black tracking-[-0.06em] text-[#0f172a]">2.4k+</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#4f6d7d]">health insights generated</div>
                  </div>
                  <div className="rounded-[20px] border border-[#dfeae7] bg-[#f6f9f8] p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#ddfaf4] text-xl text-[#136f62]">▣</div>
                    <div className="text-3xl font-black tracking-[-0.06em] text-[#0f172a]">150+</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#4f6d7d]">medical resources indexed</div>
                  </div>
                </div>

                <div className="mt-6 flex items-end gap-2">
                  {chartBars.map((height, index) => (
                    <div
                      key={`${height}-${index}`}
                      className={`w-6 rounded-t-[10px] ${
                        index % 2 === 0
                          ? "bg-[#d7dfdf]"
                          : index % 3 === 0
                            ? "bg-[#8fdac9]"
                            : "bg-[#0ea7a1]"
                      }`}
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mt-12 rounded-[32px] border border-[#d8ebe4] bg-[#f6faf9] p-6 shadow-[0_24px_60px_rgba(149,172,165,0.08)] lg:p-8">
          <div className="grid gap-5 md:grid-cols-3">
            {featureCards.map((feature) => (
              <div key={feature.title} className="rounded-[24px] border border-[#dfeae7] bg-white p-6 shadow-[0_10px_24px_rgba(105,128,120,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_32px_rgba(105,128,120,0.08)]">
                <HealthIcon>{feature.icon}</HealthIcon>
                <h3 className="mt-5 text-2xl font-black tracking-[-0.05em] text-[#0f172a]">{feature.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#536b7a]">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-10 mt-20">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#0b7d74]">How Medicare works</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.07em] text-[#0f172a] sm:text-5xl">A clearer path to better health decisions.</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="rounded-[28px] border border-[#dfeae7] bg-white p-6 shadow-[0_18px_32px_rgba(148,163,184,0.06)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#0b7d74]">{step.number}</div>
                <h3 className="mt-5 text-2xl font-black tracking-[-0.05em] text-[#0f172a]">{step.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#536b7a]">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-10 mt-20 rounded-[32px] border border-[#d9e8e3] bg-[#f4faf8] p-6 shadow-[0_24px_60px_rgba(128,157,146,0.09)] lg:p-10">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#0b7d74]">Why Medicare</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.07em] text-[#0f172a] sm:text-5xl">Healthcare clarity, made accessible.</h2>
            </div>
            <div className="max-w-md text-base leading-7 text-[#536b7a]">
              Built to help people navigate healthcare information confidently without feeling overwhelmed by complexity.
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {whyCards.map((card) => (
              <div key={card.title} className="rounded-[24px] border border-[#dfeae7] bg-white p-5 shadow-[0_12px_24px_rgba(132,148,144,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_32px_rgba(132,148,144,0.08)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edfaf6] text-xl text-[#0d8d7d]">{card.icon}</div>
                <h3 className="mt-5 text-xl font-black tracking-[-0.05em] text-[#0f172a]">{card.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#536b7a]">{card.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
