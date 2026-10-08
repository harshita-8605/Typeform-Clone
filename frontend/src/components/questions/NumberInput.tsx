"use client";

import { cn } from "@/lib/utils";

export interface NumberInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  variant?: "full" | "compact";
  autoFocus?: boolean;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
}

export function NumberInput({
  value,
  onChange,
  error,
  variant = "full",
  autoFocus,
  disabled,
  required,
  min,
  max,
}: NumberInputProps) {
  const sizeClasses =
    variant === "full"
      ? "px-5 py-4 text-[18px] rounded-2xl"
      : "px-3 py-2 text-[14px] rounded-lg";

  const btnSizeClasses =
    variant === "full"
      ? "w-11 h-11 text-xl rounded-xl"
      : "w-8 h-8 text-sm rounded-md";

  const step = (delta: number) => {
    const current = value ?? 0;
    let next = current + delta;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    onChange(next);
  };

  return (
    <div className="w-full">
      <div className="relative inline-flex items-stretch w-full max-w-md">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={disabled || (min !== undefined && (value ?? 0) <= min)}
          className={cn(
            btnSizeClasses,
            "shrink-0 flex items-center justify-center border border-gray-200 bg-white text-[rgb(var(--text-primary))] hover:bg-gray-50 disabled:opacity-40 transition-colors",
            variant === "full" ? "mr-3" : "mr-2"
          )}
          tabIndex={-1}
          aria-label="Decrease"
        >
          −
        </button>

        <div className="relative flex-1">
          <input
            type="number"
            value={value === null ? "" : value}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "" || raw === "-") {
                onChange(null);
                return;
              }
              const n = Number(raw);
              if (isNaN(n)) return;
              onChange(n);
            }}
            placeholder="0"
            autoFocus={autoFocus}
            disabled={disabled}
            min={min}
            max={max}
            className={cn(
              "input-base text-center",
              sizeClasses,
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
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

        <button
          type="button"
          onClick={() => step(1)}
          disabled={disabled || (max !== undefined && (value ?? 0) >= max)}
          className={cn(
            btnSizeClasses,
            "shrink-0 flex items-center justify-center border border-gray-200 bg-white text-[rgb(var(--text-primary))] hover:bg-gray-50 disabled:opacity-40 transition-colors",
            variant === "full" ? "ml-3" : "ml-2"
          )}
          tabIndex={-1}
          aria-label="Increase"
        >
          +
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[13px] text-[rgb(var(--error))] font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
