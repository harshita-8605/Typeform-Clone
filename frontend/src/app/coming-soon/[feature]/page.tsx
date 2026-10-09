"use client";

import { useRouter } from "next/navigation";

export default function ComingSoonPage({
  params,
}: {
  params: { feature: string };
}) {
  const router = useRouter();
  const feature = decodeURIComponent(params.feature);

  return (
    <main className="min-h-screen bg-[#f8f8f8] px-6 py-8 text-[#403343]">
      <button type="button" onClick={() => router.back()} className="text-sm text-[#6b636c] hover:text-[#29212b]">
        ← Back to workspace
      </button>
      <section className="mx-auto flex min-h-[75vh] max-w-2xl flex-col items-center justify-center text-center">
        <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ead6fa] text-3xl">✦</div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-[#8a718f]">Coming soon</p>
        <h1 className="text-4xl font-semibold tracking-[-.04em]"> {feature} is on the way.</h1>
        <p className="mt-4 max-w-md text-base leading-7 text-[#756c76]">
          We&apos;re polishing this part of Typeform Clone. You&apos;ll be able to use it here soon.
        </p>
        <button type="button" onClick={() => router.push("/workspace")} className="mt-8 rounded-lg bg-[#403343] px-5 py-3 text-sm font-semibold text-white hover:bg-[#332735]">
          Back to workspace
        </button>
      </section>
    </main>
  );
}
