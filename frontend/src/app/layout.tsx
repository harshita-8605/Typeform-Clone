import type { Metadata } from "next";
import "@/styles/globals.css";
import { ToastProvider } from "@/hooks/useToast";

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
      className="font-sans"
    >
      <body className="min-h-screen antialiased text-[rgb(var(--tf-text))] bg-[rgb(var(--tf-canvas))]">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
