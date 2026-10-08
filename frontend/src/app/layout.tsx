import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "@/styles/globals.css";
import { ToastProvider } from "@/hooks/useToast";

// Inter = TWK Lausanne analog (body/sans). Loads with --font-sans CSS var consumed by tailwind config.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

// Fraunces = Tobias analog (display/serif headlines). Loads with --font-serif.
// Tobias is a humanist serif with moderate contrast; Fraunces opsz 144 @ 400 weight very close.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Typeform Clone — Build beautiful conversational forms",
  description: "Build beautiful conversational forms with Typeform Clone",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} font-sans`}
    >
      <body className="min-h-screen antialiased text-[rgb(var(--tf-text))] bg-[rgb(var(--tf-canvas))]">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
