"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function TypeformLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#262626] text-white">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 7h10v3.2H13.5v9.6h-3v-9.6H7V7z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[18px] font-semibold text-[#242424] tracking-[-.04em]">
        typeform
      </span>
    </div>
  );
}

export function TopNav({
  breadcrumb,
  rightSlot,
}: {
  breadcrumb?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isWorkspace = pathname === "/workspace";

  return (
    <header className="h-14 shrink-0 border-b border-[#e8e8e6] bg-white flex items-center px-4 md:px-6 gap-4">
      <Link href="/workspace" className="shrink-0">
        <TypeformLogo />
      </Link>

      <div className="h-6 w-px bg-[rgb(var(--tf-border))] shrink-0" />

      <div className="flex items-center gap-2 min-w-0">
        {breadcrumb ?? (
          <Link
            href="/workspace"
            className={cn(
            "inline-flex items-center gap-1.5 text-[13px] rounded-md px-3 py-1.5 transition-colors",
            isWorkspace
                ? "font-semibold text-[#242424] bg-[#efefed]"
                : "font-medium text-[#686864] hover:text-[#242424] hover:bg-[#f4f4f2]"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            My Workspace
          </Link>
        )}
      </div>

      <div className="flex-1" />

      {rightSlot}

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#777] hover:bg-[#f4f4f2] hover:text-[#242424]"
          aria-label="Help"
          title="Help"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#777] hover:bg-[#f4f4f2] hover:text-[#242424]"
          aria-label="Notifications"
          title="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        <button
          type="button"
          className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e7d4c6] text-[#493225] text-[12px] font-semibold"
          aria-label="Profile"
          title="H — Profile"
        >
          H
        </button>
      </div>
    </header>
  );
}
