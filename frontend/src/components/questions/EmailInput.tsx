"use client";

import { cn } from "@/lib/utils";

export interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  variant?: "full" | "compact";
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
}

export function EmailInput({
  value,
  onChange,
  error,
  variant = "full",
  autoFocus,
  disabled,
  required,
}: EmailInputProps) {
  const sizeClasses =
    variant === "full"
      ? "px-5 py-4 text-[18px] rounded-2xl"
      : "px-3 py-2 text-[14px] rounded-lg";

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="you@example.com"
          autoFocus={autoFocus}
          disabled={disabled}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            "input-base",
            sizeClasses,
            error &&
              "border-[rgb(var(--error))] focus:border-[rgb(var(--error))] focus:ring-[rgb(var(--error))]/20",
            error && "animate-[wiggle_0.4s_ease-in-out_1]"
          )}
        />
        {required && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[rgb(var(--error))] text-lg pointer-events-none">
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
