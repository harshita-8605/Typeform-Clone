"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export interface LongTextInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  variant?: "full" | "compact";
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
}

export function LongTextInput({
  value,
  onChange,
  error,
  variant = "full",
  autoFocus,
  disabled,
  required,
}: LongTextInputProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const sizeClasses =
    variant === "full"
      ? "px-5 py-4 text-[18px] rounded-2xl min-h-[140px]"
      : "px-3 py-2 text-[14px] rounded-lg min-h-[80px]";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <div className="w-full">
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer here..."
          autoFocus={autoFocus}
          disabled={disabled}
          rows={4}
          className={cn(
            "input-base resize-none",
            sizeClasses,
            error &&
              "border-[rgb(var(--error))] focus:border-[rgb(var(--error))] focus:ring-[rgb(var(--error))]/20",
            error && "animate-[wiggle_0.4s_ease-in-out_1]"
          )}
        />
        {required && (
          <span className="absolute right-4 top-4 text-[rgb(var(--error))] text-lg pointer-events-none">
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
