"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export interface RatingInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  variant?: "full" | "compact";
  autoFocus?: boolean;
  disabled?: boolean;
  max?: number;
  min?: number;
}

export function RatingInput({
  value,
  onChange,
  error,
  variant = "full",
  autoFocus,
  disabled,
  max = 5,
  min = 1,
}: RatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const bubbleSize =
    variant === "full" ? "w-12 h-12 text-lg" : "w-9 h-9 text-sm";
  const gapSize = variant === "full" ? "gap-3" : "gap-2";

  const ratings: number[] = [];
  for (let n = min; n <= max; n++) ratings.push(n);

  return (
    <div className="w-full">
      <div
        className={cn("flex flex-wrap", gapSize)}
        onMouseLeave={() => setHovered(null)}
        tabIndex={autoFocus ? 0 : -1}
        ref={(el) => {
          if (autoFocus && el) setTimeout(() => el.focus({ preventScroll: true }), 0);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            const cur = value ?? min - 1;
            if (cur < max) onChange(cur + 1);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            const cur = value ?? min + 1;
            if (cur > min) onChange(cur - 1);
          }
        }}
      >
        {ratings.map((n) => {
          const isSelected = value !== null && n <= value;
          const isExact = value === n;
          const isHoverFill = hovered !== null && n <= hovered;
          const showLightFill = !isSelected && isHoverFill;

          return (
            <button
              key={n}
              type="button"
              onClick={() => !disabled && onChange(n)}
              onMouseEnter={() => !disabled && setHovered(n)}
              disabled={disabled}
              aria-pressed={isExact}
              className={cn(
                bubbleSize,
                "rounded-full border flex items-center justify-center font-semibold cursor-pointer transition-all",
                "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--brand))]/30",
                isSelected
                  ? "bg-[rgb(var(--brand))] text-white border-[rgb(var(--brand))]"
                  : showLightFill
                  ? "bg-[rgb(var(--brand))]/15 text-[rgb(var(--brand-dark))] border-[rgb(var(--brand))]/60"
                  : "bg-white text-[rgb(var(--text-primary))] border-gray-200 hover:border-[rgb(var(--brand))]",
                disabled && "opacity-50 cursor-not-allowed",
                error && !value && "animate-[wiggle_0.4s_ease-in-out_1]"
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-3 text-[13px] text-[rgb(var(--error))] font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
