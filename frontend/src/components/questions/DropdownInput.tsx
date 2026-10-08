"use client";

import { cn } from "@/lib/utils";
import type { QuestionOption } from "@/lib/types";

export interface DropdownInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  variant?: "full" | "compact";
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
  options?: QuestionOption[];
}

export function DropdownInput({
  value,
  onChange,
  error,
  variant = "full",
  autoFocus,
  disabled,
  required,
  options = [],
}: DropdownInputProps) {
  const sizeClasses =
    variant === "full"
      ? "px-5 py-4 text-[18px] rounded-2xl pr-14"
      : "px-3 py-2 text-[14px] rounded-lg pr-10";

  return (
    <div className="w-full">
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          className={cn(
            "input-base appearance-none bg-white cursor-pointer",
            sizeClasses,
            error &&
              "border-[rgb(var(--error))] focus:border-[rgb(var(--error))] focus:ring-[rgb(var(--error))]/20",
            error && "animate-[wiggle_0.4s_ease-in-out_1]"
          )}
        >
          <option value="" disabled>
            Choose an option
          </option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.label}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[rgb(var(--text-secondary))]",
            variant === "full" ? "w-5 h-5" : "w-4 h-4"
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {required && !value && (
          <span
            className={cn(
              "absolute text-[rgb(var(--error))] text-lg pointer-events-none",
              variant === "full" ? "right-12" : "right-8",
              "top-1/2 -translate-y-1/2"
            )}
          >
            *
          </span>
        )}
      </div>
      {error && (
        <p className="mt-2 text-[13px] text-[rgb(var(--error))] font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
