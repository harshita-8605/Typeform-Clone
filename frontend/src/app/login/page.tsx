"use client";

import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("/workspace");

  useEffect(() => {
    const requestedCallback = new URLSearchParams(window.location.search).get(
      "callbackUrl"
    );
    if (requestedCallback?.startsWith("/")) setCallbackUrl(requestedCallback);
    void getSession().then((session) => {
      if (session) router.replace("/workspace");
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setError("");
    const result = await signIn("google", {
      callbackUrl,
      redirect: false,
    });
    if (result?.error) {
      setError("Google sign-in is not available yet. Check the OAuth configuration.");
      setIsSigningIn(false);
      return;
    }
    if (result?.url) router.push(result.url);
  };

  return (
    <main className="min-h-screen bg-[#281d29] px-6 text-[#f9f7f3]">
      <header className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between">
        <Link href="/" className="text-[24px] font-semibold tracking-[-.065em]">
          typeform
        </Link>
        <Link href="/" className="text-sm text-[#d6cfd7] hover:text-white">
          Back to home
        </Link>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-76px)] max-w-[440px] items-center justify-center pb-16">
        <div className="w-full rounded-[24px] bg-[#f8f5f0] p-8 text-[#2a1f2b] shadow-2xl sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#281d29] text-xl font-semibold text-white">
              T
            </div>
            <h1 className="mt-6 font-serif text-4xl tracking-[-.04em]">
              Welcome back
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#6e626e]">
              Sign in to create forms, collect responses, and turn feedback into action.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#d7d0d5] bg-white text-sm font-semibold transition hover:border-[#281d29] disabled:cursor-wait disabled:opacity-60"
          >
            <GoogleIcon />
            {isSigningIn ? "Connecting to Google..." : "Continue with Google"}
          </button>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-[#fbe9e8] px-4 py-3 text-center text-xs text-[#a53d38]">
              {error}
            </p>
          )}

          <p className="mt-8 text-center text-xs leading-5 text-[#8a7d88]">
            By continuing, you agree to use this workspace for creating and managing your forms.
          </p>
        </div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.51 5.51 0 0 1-2.39 3.61v3h3.87c2.27-2.09 3.56-5.17 3.56-8.64Z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3A7.17 7.17 0 0 1 12 19.35a7.19 7.19 0 0 1-6.76-4.97H1.24v3.1A12 12 0 0 0 12 24Z"/>
      <path fill="#FBBC05" d="M5.24 14.38A7.2 7.2 0 0 1 4.86 12c0-.83.14-1.64.38-2.38v-3.1H1.24A12 12 0 0 0 0 12c0 1.93.46 3.75 1.24 5.48l4-3.1Z"/>
      <path fill="#EA4335" d="M12 4.77a6.5 6.5 0 0 1 4.59 1.8l3.44-3.44A12 12 0 0 0 1.24 6.52l4 3.1A7.19 7.19 0 0 1 12 4.77Z"/>
    </svg>
  );
}
