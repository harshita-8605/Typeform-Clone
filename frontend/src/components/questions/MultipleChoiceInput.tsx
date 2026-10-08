"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { QuestionOption } from "@/lib/types";

export interface MultipleChoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  error?: string;
  variant?: "full" | "compact";
  autoFocus?: boolean;
  disabled?: boolean;
  options?: QuestionOption[];
}

export function MultipleChoiceInput({
  value,
  onChange,
  onSubmit,
  error,
  variant = "full",
  autoFocus,
  disabled,
  options = [],
}: MultipleChoiceInputProps) {
  const [focusedIdx, setFocusedIdx] = useState<number>(() => {
    if (!value) return -1;
    const idx = options.findIndex((o) => o.label === value || o.id === value);
    return idx >= 0 ? idx : -1;
  });

  useEffect(() => {
    if (!value) {
      setFocusedIdx(-1);
      return;
    }
    const idx = options.findIndex((o) => o.label === value || o.id === value);
    if (idx >= 0) setFocusedIdx(idx);
  }, [value, options]);

  const pillSize =
    variant === "full"
      ? "rounded-full px-5 py-3 text-[16px] min-h-[54px]"
      : "rounded-full px-4 py-2 text-[14px] min-h-[40px]";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (options.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const next =
        focusedIdx < 0 ? 0 : (focusedIdx + 1) % options.length;
      setFocusedIdx(next);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prev =
        focusedIdx < 0
          ? options.length - 1
          : (focusedIdx - 1 + options.length) % options.length;
      setFocusedIdx(prev);
    } else if (e.key === "Enter") {
      if (focusedIdx >= 0) {
        e.preventDefault();
        const selected = options[focusedIdx];
        onChange(selected.label);
        if (onSubmit) onSubmit();
      }
    }
  };

  return (
    <div
      className="w-full"
      onKeyDown={handleKeyDown}
      tabIndex={autoFocus ? 0 : -1}
      ref={(el) => {
        if (autoFocus && el) setTimeout(() => el.focus({ preventScroll: true }), 0);
      }}
    >
      <div
        className={cn(
          "flex flex-col",
          variant === "full" ? "gap-3" : "gap-2"
        )}
        role="radiogroup"
      >
        {options.map((opt, idx) => {
          const isSelected =
            value === opt.label || value === opt.id;
          const isFocused = focusedIdx === idx;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => !disabled && onChange(opt.label)}
              onMouseEnter={() => setFocusedIdx(idx)}
              disabled={disabled}
              className={cn(
                pillSize,
                "w-full text-left font-medium border transition-colors",
                "flex items-center",
                isSelected
                  ? "bg-[rgb(var(--brand))] text-white border-[rgb(var(--brand))]"
                  : "bg-white border-gray-200 text-[rgb(var(--text-primary))] hover:border-[rgb(var(--brand))]",
                isFocused && !isSelected && "border-[rgb(var(--brand))]/60",
                disabled && "opacity-50 cursor-not-allowed",
                error && isSelected === false && !value && "animate-[wiggle_0.4s_ease-in-out_1]"
              )}
            >
              <span className="flex-1 truncate">{opt.label}</span>
              {isSelected && (
                <svg
                  className="ml-2 w-5 h-5 flex-shrink-0"
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
            </button>
          );
        })}
        {options.length === 0 && (
          <p className="text-sm text-[rgb(var(--text-secondary))] italic">
            No options configured
          </p>
        )}
      </div>
      {error && (
        <p className="mt-3 text-[13px] text-[rgb(var(--error))] font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
