"use client";

import { cn } from "@/lib/utils";
import { useEffect } from "react";

export interface YesNoInputProps {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  error?: string;
  variant?: "full" | "compact";
  autoFocus?: boolean;
  disabled?: boolean;
}

export function YesNoInput({
  value,
  onChange,
  error,
  variant = "full",
  autoFocus,
  disabled,
}: YesNoInputProps) {
  useEffect(() => {
    if (!autoFocus) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
      }
      if (disabled) return;
      if (e.key === "1") onChange(true);
      else if (e.key === "2") onChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [autoFocus, onChange, disabled]);

  const btnSize =
    variant === "full"
      ? "py-5 text-[20px] font-semibold rounded-2xl"
      : "py-3 text-[14px] font-medium rounded-xl";

  const baseBtn = cn(
    btnSize,
    "flex-1 border transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--brand))]/30",
    disabled && "opacity-50 cursor-not-allowed"
  );

  const yesSelected = value === true;
  const noSelected = value === false;

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex w-full",
          variant === "full" ? "gap-4" : "gap-3",
          error && "animate-[wiggle_0.4s_ease-in-out_1]"
        )}
      >
        <button
          type="button"
          onClick={() => !disabled && onChange(true)}
          autoFocus={autoFocus}
          disabled={disabled}
          className={cn(
            baseBtn,
            yesSelected
              ? "bg-[rgb(var(--brand))] text-white border-[rgb(var(--brand))]"
              : "bg-white text-[rgb(var(--text-primary))] border-gray-200 hover:border-[rgb(var(--brand))]"
          )}
        >
          <span className="flex items-center justify-center gap-2">
            {yesSelected && (
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            Yes
            {variant === "full" && (
              <span
                className={cn(
                  "ml-1 text-xs font-normal px-1.5 py-0.5 rounded border",
                  yesSelected
                    ? "border-white/30 text-white/80"
                    : "border-gray-200 text-[rgb(var(--text-secondary))]"
                )}
              >
                1
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => !disabled && onChange(false)}
          disabled={disabled}
          className={cn(
            baseBtn,
            noSelected
              ? "bg-[rgb(var(--brand))] text-white border-[rgb(var(--brand))]"
              : "bg-white text-[rgb(var(--text-primary))] border-gray-200 hover:border-[rgb(var(--brand))]"
          )}
        >
          <span className="flex items-center justify-center gap-2">
            {noSelected && (
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            No
            {variant === "full" && (
              <span
                className={cn(
                  "ml-1 text-xs font-normal px-1.5 py-0.5 rounded border",
                  noSelected
                    ? "border-white/30 text-white/80"
                    : "border-gray-200 text-[rgb(var(--text-secondary))]"
                )}
              >
                2
              </span>
            )}
          </span>
        </button>
      </div>
      {error && (
        <p className="mt-3 text-[13px] text-[rgb(var(--error))] font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
