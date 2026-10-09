 "use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const features = [
  {
    icon: "↗",
    title: "High response rate",
    text: "Build forms people actually want to fill out with a beautiful design and conversational flow.",
  },
  {
    icon: "◈",
    title: "Deeper insights",
    text: "Get rich answers with video and audio responses, plus extra context from AI-generated follow-up questions.",
  },
  {
    icon: "▥",
    title: "Advanced analytics",
    text: "Turn both qualitative and quantitative data into useful insights for your team.",
  },
];

const logos = ["Calendly", "Miro", "L’OCCITANE", "WeTransfer", "slack"];

const menus = {
  Platform: [
    { label: "Form builder", description: "Create and edit conversational forms", href: "#form-builder" },
    { label: "Public forms", description: "Share a one-question-at-a-time experience", href: "#intelligent-forms" },
    { label: "Responses & analytics", description: "Review submissions and question summaries", href: "/login?callbackUrl=%2Fworkspace" },
  ],
  Solutions: [
    { label: "Intelligent Forms", description: "Build forms from your ideas", href: "#intelligent-forms" },
    { label: "Growth Flow", description: "Turn responses into follow-up actions", href: "#growth-flow" },
    { label: "Research Flow", description: "Run focused, AI-moderated research", href: "#research-flow" },
  ],
  Resources: [
    { label: "Customer stories", description: "See how teams use forms to learn and grow", href: "#customer-stories" },
    { label: "Integrations", description: "Connect your workflow with popular tools", href: "#integrations" },
    { label: "Get started", description: "Sign in and create your first form", href: "/login" },
  ],
} as const;

type MenuName = keyof typeof menus;

function LandingNav() {
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <header ref={navRef} className="relative z-50 mx-auto flex h-[76px] max-w-[1080px] items-center justify-between px-6">
      <Link href="/" className="text-[23px] font-semibold tracking-[-.065em]">typeform</Link>
      <nav className="hidden items-center gap-2 text-[12px] text-[#d8d0d9] md:flex">
        {(Object.keys(menus) as MenuName[]).map((name) => {
          const isOpen = openMenu === name;
          return (
            <button
              key={name}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenMenu(isOpen ? null : name)}
              className={`rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white ${isOpen ? "bg-white/10 text-white" : ""}`}
            >
              {name} <span className="ml-1 inline-block text-[11px] transition-transform">{isOpen ? "⌃" : "⌄"}</span>
            </button>
          );
        })}
        <Link href="/login" className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white">Pricing</Link>
      </nav>
      <div className="flex items-center gap-3 text-[12px]"><Link href="/login" className="hidden text-[#eee9ee] sm:inline">Log in</Link><Link href="/login"><PillButton dark>Sign up</PillButton></Link></div>

      {openMenu && (
        <div className="absolute left-6 right-6 top-[68px] overflow-hidden rounded-2xl border border-[#59465e] bg-[#2d232f]/[.98] p-5 shadow-[0_24px_70px_rgba(0,0,0,.45)] backdrop-blur-xl sm:left-1/2 sm:right-auto sm:w-[560px] sm:-translate-x-1/2">
          <div className="grid gap-2 sm:grid-cols-3">
            {menus[openMenu].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpenMenu(null)}
                className="group rounded-xl p-4 transition hover:bg-[#443248]"
              >
                <p className="text-[13px] font-semibold text-[#f5f2ef] group-hover:text-[#e1a7f2]">{item.label}</p>
                <p className="mt-2 text-[11px] leading-4 text-[#bfb1c2]">{item.description}</p>
                <span className="mt-4 block text-[11px] text-[#db9aee]">Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function PillButton({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-5 py-2.5 text-[12px] font-semibold transition-transform hover:-translate-y-0.5 ${
        dark
          ? "border-[#75677b] bg-[#f7f4ef] text-[#281d29]"
          : "border-[#443847] bg-[#2d232f] text-white"
      }`}
    >
      {children}
    </span>
  );
}

function BuilderVisual({ src = "/videos/landing-demo.mp4" }: { src?: string }) {
  return (
    <div className="relative h-[340px] overflow-hidden rounded-[18px] border border-[#765b7c] bg-[#342735] shadow-[0_20px_80px_rgba(0,0,0,.3)] sm:h-[480px]">
      <video
        className="h-full w-full object-cover"
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Typeform product demonstration"
      />
    </div>
  );
}

function ProductVisual({ kind }: { kind: "growth" | "research" }) {
  const growth = kind === "growth";
  if (growth) {
    return (
      <div className="relative h-[270px] overflow-hidden rounded-[18px] border border-[#725a78] bg-[#241c2b] shadow-[0_20px_60px_rgba(0,0,0,.25)]">
        <video
          className="h-full w-full object-cover"
          src="/videos/growth-flow-demo.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Growth Flow product demonstration"
        />
      </div>
    );
  }
  return (
    <div className="relative h-[270px] overflow-hidden rounded-[18px] border border-[#725a78] bg-[#241c2b] shadow-[0_20px_60px_rgba(0,0,0,.25)]">
      <video
        className="h-full w-full object-cover"
        src="/videos/research-flow-demo.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Research Flow product demonstration"
      />
    </div>
  );
}

function ProductSection({
  eyebrow,
  title,
  text,
  kind,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  kind: "growth" | "research";
  dark?: boolean;
}) {
  return (
    <section id={kind === "growth" ? "growth-flow" : "research-flow"} className={`${dark ? "bg-[#281d29] text-white" : "bg-[#faf9f8] text-[#2d2630]"} px-6 py-24 sm:py-32`}>
      <div className="mx-auto max-w-[960px]">
        <h2 className={`${dark ? "text-[#f5f2ef]" : "text-[#2d2630]"} mx-auto max-w-[470px] text-center font-serif text-[40px] leading-[.98] tracking-[-.05em] sm:text-[54px]`}>
          {kind === "growth" ? "When the form ends,\nthe flow begins..." : "Make every interaction count."}
        </h2>
        <div className="mt-16 grid items-center gap-12 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#b876dc]">{eyebrow}</p>
            <h3 className={`${dark ? "text-[#f5f2ef]" : "text-[#2d2630]"} mt-5 whitespace-pre-line font-serif text-[36px] leading-[.98] tracking-[-.045em] sm:text-[46px]`}>{title}</h3>
            <p className={`${dark ? "text-[#d4cbd7]" : "text-[#68606a]"} mt-5 max-w-[390px] text-[14px] leading-6`}>{text}</p>
            <div className="mt-7"><PillButton dark={!dark}>Explore {kind === "growth" ? "Growth Flow" : "Research Flow"}</PillButton></div>
          </div>
          <div className="order-1 md:order-2"><ProductVisual kind={kind} /></div>
        </div>
        <div className="mt-16 grid gap-6 border-t border-[#94769d]/30 pt-8 sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#27172e] text-[#dc9af4]">{feature.icon}</span>
              <div><h4 className={`${dark ? "text-[#f5f2ef]" : "text-[#2d2630]"} text-[13px] font-semibold`}>{feature.title}</h4><p className={`${dark ? "text-[#c8bdcb]" : "text-[#716875]"} mt-1 text-[11px] leading-4`}>{feature.text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#281d29] text-[#f9f7f3]">
      <LandingNav />

      <section className="mx-auto max-w-[1120px] px-6 pb-16 pt-14 text-center sm:pt-24">
        <p className="mb-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#cda8da]">AI forms &amp; automation</p>
        <h1 className="mx-auto max-w-[800px] whitespace-pre-line font-serif text-[52px] leading-[.91] tracking-[-.06em] text-[#f5f2ef] sm:text-[76px] lg:text-[94px]">{"Your favorite forms.\nNow with AI automation."}</h1>
        <p className="mx-auto mt-7 max-w-[570px] text-[14px] leading-5 text-[#d6cfd7]">Combine AI forms and automated workflows to drive revenue growth. Run in-depth research and manage the entire customer lifecycle. All in Typeform.</p>
        <Link href="/login" className="mt-8 inline-flex rounded-full bg-[#f7f4ef] px-6 py-3 text-[12px] font-semibold text-[#2a1f2b] transition-transform hover:-translate-y-0.5">Get started—it&apos;s free</Link>

        <div className="mx-auto mt-16 max-w-[900px]">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["ASK", "Intelligent Forms", "Build forms that adapt to every respondent."],
              ["ACT", "Growth Flow", "Automate follow-ups and keep customers close."],
              ["LEARN", "Research Flow", "Make confident decisions with AI research."],
            ].map(([eyebrow, title, copy], index) => (
              <div key={title} className={`rounded-xl border p-4 text-left ${index === 1 ? "border-[#a76abe] bg-[#3b2d40]" : "border-[#4b3a50] bg-[#302431]"}`}>
                <p className="text-[9px] font-bold tracking-widest text-[#c8afd0]">{eyebrow}</p><p className="mt-4 text-[14px] font-semibold">{title}{index > 0 && <span className="ml-2 rounded-full bg-[#b76ade] px-1.5 py-0.5 text-[8px] text-[#291c2c]">NEW</span>}</p><p className="mt-2 text-[11px] leading-4 text-[#d0c5d2]">{copy}</p><div className={`mt-5 h-0.5 w-10 ${index === 1 ? "bg-[#db83f3]" : "bg-[#785782]"}`} />
              </div>
            ))}
          </div>
          <div id="form-builder" className="mt-3"><BuilderVisual /></div>
        </div>
      </section>

      <section id="intelligent-forms" className="bg-[#faf9f8] px-6 py-24 text-[#2d2630] sm:py-32">
        <div className="mx-auto grid max-w-[960px] items-center gap-14 md:grid-cols-2">
          <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#ae63cb]">Intelligent forms</p><h2 className="mt-5 max-w-[430px] font-serif text-[45px] leading-[.95] tracking-[-.05em] text-[#2d2630] sm:text-[58px]">Build forms at the drop of a prompt</h2><p className="mt-6 max-w-[390px] text-[14px] leading-6 text-[#68606a]">With over 48 million responses collected monthly, Typeform AI builds best-in-class forms from your ideas. Brand easily, customize everything.</p><Link href="/login" className="mt-7 inline-flex rounded-full bg-[#2b222e] px-5 py-3 text-[12px] font-semibold text-white">Explore forms</Link></div>
          <BuilderVisual src="/videos/intelligent-forms-demo.mp4" />
        </div>
        <div className="mx-auto mt-16 grid max-w-[960px] gap-6 border-t border-[#ddd5dd] pt-8 sm:grid-cols-3">{features.map((feature) => <div key={feature.title} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#2a1e2c] text-[#e6b8f1]">{feature.icon}</span><div><h4 className="text-[13px] font-semibold text-[#2d2630]">{feature.title}</h4><p className="mt-1 text-[11px] leading-4 text-[#716875]">{feature.text}</p></div></div>)}</div>
      </section>

      <ProductSection eyebrow="Growth Flow" title={"Be proactive with\ncustomer data"} text="Set up automations that connect with your customers at just the right moment. Turn every response into a signal for a more personal experience." kind="growth" dark />
      <ProductSection eyebrow="Research Flow" title={"Run fast research,\nmoderated by AI"} text="Make data-backed decisions with AI-moderated research. Ask better questions, reach the right audience, and understand what people really think." kind="research" />

      <section id="customer-stories" className="bg-[#faf9f8] px-6 py-24 text-center text-[#2d2630] sm:py-32">
        <h2 className="font-serif text-[36px] tracking-[-.04em] text-[#2d2630] sm:text-[46px]">Join 150,000+ businesses driving revenue with Typeform</h2>
        <div className="mx-auto mt-10 flex max-w-[760px] flex-wrap justify-center gap-2">{logos.map((logo) => <span key={logo} className="rounded-xl bg-[#2b222e] px-6 py-4 text-[15px] font-semibold text-[#f7f4ef] shadow-sm">{logo}</span>)}</div>
        <div className="mx-auto mt-16 grid max-w-[960px] gap-3 text-left md:grid-cols-3"><article className="rounded-2xl bg-[#ead8f8] p-8 md:col-span-1"><p className="text-2xl">↗</p><p className="mt-8 font-serif text-[28px] leading-tight">Viva scaled talent acquisition and cut time to hire by 75%</p></article><article className="rounded-2xl bg-[#f0eef1] p-8"><p className="text-2xl">◉</p><p className="mt-8 font-serif text-[25px] leading-tight">SmartBug increased sales leads by 40% with one form</p></article><article className="rounded-2xl bg-[#eee9f4] p-8"><p className="text-2xl">◎</p><p className="mt-8 font-serif text-[25px] leading-tight">Double Denim drives better customer conversations</p></article></div>
        <Link href="/coming-soon/Customer%20stories" className="mt-8 inline-flex rounded-full border border-[#77707a] px-5 py-2 text-[11px] font-semibold">Read all customer stories</Link>
      </section>

      <section id="integrations" className="bg-[#faf9f8] px-6 pb-24 text-center text-[#2d2630]"><div className="mx-auto max-w-[680px] rounded-[38px] bg-white px-8 py-14 shadow-[0_8px_40px_rgba(65,43,70,.08)]"><h2 className="text-[20px] font-semibold">Integrate with your tech stack</h2><div className="mt-8 flex flex-wrap justify-center gap-2">{["HubSpot", "klaviyo", "slack", "stripe", "Webflow", "zapier", "Calendly"].map((name) => <span key={name} className="rounded-lg bg-[#faf8fb] px-4 py-3 text-[12px] font-semibold">{name}</span>)}</div><Link href="/coming-soon/Integrations" className="mt-8 inline-flex rounded-full border border-[#2b222e] bg-[#2b222e] px-5 py-2 text-[11px] font-semibold text-[#f7f4ef]">View integrations</Link></div></section>

      <footer className="bg-[#281d29] px-6 pb-10 pt-24 text-white"><div className="mx-auto max-w-[960px] text-center"><h2 className="font-serif text-[45px] leading-[.95] tracking-[-.05em] text-[#f5f2ef] sm:text-[60px]">AI forms and automation.<br />All in Typeform.</h2><Link href="/login" className="mt-8 inline-flex rounded-full bg-[#f7f4ef] px-6 py-3 text-[12px] font-semibold text-[#2a1f2b]">Get started—it&apos;s free</Link><div className="mt-24 grid grid-cols-2 gap-8 text-left text-[11px] text-[#c7bdca] sm:grid-cols-5">{[["PRODUCT", ["Forms", "Growth Flow", "Research Flow"]], ["TEMPLATES", ["Lead generation", "Surveys", "Quizzes"]], ["INTEGRATIONS", ["HubSpot", "Slack", "Zapier"]], ["RESOURCES", ["Blog", "Help center", "Customers"]], ["GET TO KNOW US", ["About", "Careers", "Contact"]]].map(([heading, items]) => <div key={heading as string}><Link href={`/coming-soon/${encodeURIComponent(heading as string)}`} className="font-semibold text-white hover:text-[#ead8f8]">{heading as string}</Link><div className="mt-4 flex flex-col items-start gap-1">{(items as string[]).map((item) => <Link key={item} href={`/coming-soon/${encodeURIComponent(item)}`} className="hover:text-white">{item}</Link>)}</div></div>)}</div></div></footer>
    </main>
  );
}
