import Link from "next/link";

const productCards = [
  { eyebrow: "ASK", title: "Intelligent Forms", text: "Build forms that adapt to every respondent and then analyze your data for rich insights.", active: true },
  { eyebrow: "ACT", title: "Growth Flow", text: "Convert and keep customers with automated AI segmentation and follow-ups." },
  { eyebrow: "LEARN", title: "Research Flow", text: "Make confident business decisions fast with AI-moderated research." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#281d29] text-[#f9f7f3]">
      <header className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="text-[24px] font-semibold tracking-[-.065em]">typeform</Link>
        <nav className="hidden items-center gap-8 text-[14px] font-medium text-[#eee9ee] lg:flex">
          <button type="button">Platform</button><button type="button">Solutions</button><button type="button">Resources</button><button type="button">Pricing</button>
        </nav>
        <div className="flex items-center gap-4 text-[14px] font-medium">
          <Link href="/workspace" className="hidden text-[#eee9ee] sm:inline">Log in</Link>
          <Link href="/workspace" className="rounded-full bg-[#f5f2ee] px-5 py-2.5 text-[#2a1f2b] transition-transform hover:-translate-y-px">Get started</Link>
        </div>
      </header>

      <section className="mx-auto max-w-[1220px] px-6 pt-12 text-center sm:pt-20">
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[.16em] text-[#bcaac1]">AI forms &amp; automation</p>
        <h1 className="mx-auto max-w-[760px] font-serif text-[48px] leading-[.94] tracking-[-.055em] sm:text-[72px] lg:text-[88px]">Your favorite forms.<br />Now with AI automation.</h1>
        <p className="mx-auto mt-7 max-w-[610px] text-[16px] leading-[1.5] text-[#d6cfd7] sm:text-[18px]">Combine AI forms and automated workflows to drive revenue growth. Run in-depth research and manage the entire customer lifecycle. All in Typeform.</p>
        <Link href="/workspace" className="mt-8 inline-flex rounded-full bg-[#f7f4ef] px-6 py-3 text-[15px] font-semibold text-[#2a1f2b] transition-transform hover:-translate-y-px">Get started—it&apos;s free</Link>
      </section>

      <section className="relative mx-auto mt-12 max-w-[1080px] px-6 pb-14 sm:mt-16">
        <div className="grid gap-3 md:grid-cols-3">
          {productCards.map((card) => (
            <article key={card.title} className={`rounded-[14px] border p-4 text-left backdrop-blur-sm ${card.active ? "border-[#b894c2] bg-[#403044]" : "border-[#513e55] bg-[#342738]"}`}>
              <p className="text-[10px] font-semibold tracking-[.12em] text-[#c9b4cd]">{card.eyebrow}</p>
              <div className="mt-5 flex items-center gap-2 text-[16px] font-semibold">{card.title}{card.title !== "Intelligent Forms" && <span className="rounded-full bg-[#b774e7] px-1.5 py-0.5 text-[9px] text-[#281d29]">New</span>}</div>
              <p className="mt-2 min-h-[42px] text-[12px] leading-[1.4] text-[#d2c8d3]">{card.text}</p>
              <div className={`mt-5 h-px ${card.active ? "bg-[#d986f3]" : "bg-[#77617b]"}`} />
            </article>
          ))}
        </div>
        <div className="relative mt-4 h-[320px] overflow-hidden rounded-[14px] border border-[#624d65] bg-[radial-gradient(circle_at_66%_35%,rgba(239,180,120,.55),transparent_22%),radial-gradient(circle_at_22%_54%,rgba(128,80,55,.76),transparent_30%),linear-gradient(125deg,#52392f_0%,#bc9367_39%,#6c4f37_72%,#342430_100%)] sm:h-[470px]">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(32,22,33,.2),transparent_45%,rgba(32,22,33,.15))]" />
          <div className="absolute left-[13%] top-[14%] h-[72%] w-[23%] rounded-full bg-[#2c2225]/60 blur-[2px]" />
          <div className="absolute right-[16%] top-[5%] h-[90%] w-[24%] rotate-[12deg] rounded-[48%] bg-[#2f2524]/55 blur-[1px]" />
          <div className="absolute left-1/2 top-1/2 w-[205px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] bg-[#a8aa3d] p-4 text-left text-[#202019] shadow-2xl sm:w-[248px] sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[.12em]">Quiz</p><p className="mt-5 text-[18px] font-semibold leading-[1.05] sm:text-[22px]">Thank you for signing up for an adventure.</p><div className="mt-8 flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f5e8] text-[15px]">▶</div>
          </div>
        </div>
      </section>
    </main>
  );
}
