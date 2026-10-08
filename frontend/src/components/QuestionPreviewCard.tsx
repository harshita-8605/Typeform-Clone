"use client";

import React, { useState } from "react";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";

interface QuestionPreviewCardProps {
  question: Question;
  variant?: "full" | "compact";
  value?: unknown;
  onChange?: (value: unknown) => void;
  onNext?: () => void;
  onBack?: () => void;
  showBack?: boolean;
  error?: string;
}

export function QuestionPreviewCard({
  question,
  variant = "full",
  value,
  onChange,
  onNext,
  onBack,
  showBack,
  error,
}: QuestionPreviewCardProps) {
  const isFull = variant === "full";

  return (
    <div className={cn("flex flex-col", isFull ? "w-full" : "w-full")}>
      <div className={cn("mb-6", isFull ? "text-center" : "text-left")}>
        <div
          className={cn(
            "inline-block rounded-full bg-[rgb(var(--brand))]/10 text-[rgb(var(--brand))] px-2.5 py-0.5 text-[11px] font-semibold mb-3"
          )}
        >
          Question
        </div>
        <h2
          className={cn(
            "font-semibold text-[rgb(var(--text-primary))] leading-tight",
            isFull ? "text-2xl md:text-3xl" : "text-lg"
          )}
        >
          {question.title || "Untitled question"}
          {question.required && (
            <span className="text-[rgb(var(--error))] ml-1">*</span>
          )}
        </h2>
        {question.description && (
          <p
            className={cn(
              "italic text-[rgb(var(--text-secondary))] mt-2",
              isFull ? "text-base" : "text-sm"
            )}
          >
            {question.description}
          </p>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <QuestionInput
            question={question}
            value={value}
            onChange={onChange}
            variant={variant}
          />
          {error && (
            <p className="mt-2 text-sm text-[rgb(var(--error))] font-medium">
              {error}
            </p>
          )}
        </div>
      </div>

      {isFull && (onNext || showBack) && (
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={!showBack}
            className={cn(
              "px-5 py-2.5 rounded-full font-medium transition-colors",
              showBack
                ? "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface))]"
                : "opacity-0 pointer-events-none"
            )}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={onNext}
            className="btn-primary"
          >
            OK →
          </button>
        </div>
      )}
    </div>
  );
}

interface QuestionInputProps {
  question: Question;
  value?: unknown;
  onChange?: (value: unknown) => void;
  variant?: "full" | "compact";
}

function QuestionInput({
  question,
  value,
  onChange,
  variant = "full",
}: QuestionInputProps) {
  const inputSize = variant === "full" ? "text-2xl py-4" : "text-base py-3";

  switch (question.type) {
    case "short_text":
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Type your answer here..."
          className={cn(
            "w-full bg-transparent border-b-2 border-gray-200 focus:border-[rgb(var(--brand))] outline-none transition-colors placeholder:text-gray-300",
            inputSize
          )}
        />
      );

    case "long_text":
      return (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Type your answer here..."
          rows={variant === "full" ? 5 : 3}
          className={cn(
            "w-full bg-transparent border-2 border-gray-200 rounded-xl focus:border-[rgb(var(--brand))] outline-none resize-none p-4 transition-colors placeholder:text-gray-300",
            variant === "full" ? "text-xl" : "text-base"
          )}
        />
      );

    case "email":
      return (
        <input
          type="email"
          value={(value as string) ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="name@example.com"
          className={cn(
            "w-full bg-transparent border-b-2 border-gray-200 focus:border-[rgb(var(--brand))] outline-none transition-colors placeholder:text-gray-300",
            inputSize
          )}
        />
      );

    case "number": {
      const min = question.options?.min;
      const max = question.options?.max;
      return (
        <input
          type="number"
          value={(value as number) ?? ""}
          min={min}
          max={max}
          onChange={(e) =>
            onChange?.(
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
          placeholder="0"
          className={cn(
            "w-full bg-transparent border-b-2 border-gray-200 focus:border-[rgb(var(--brand))] outline-none transition-colors placeholder:text-gray-300",
            inputSize
          )}
        />
      );
    }

    case "yes_no":
      return (
        <div className="flex gap-3 justify-center">
          {(["no", "yes"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange?.(opt === "yes")}
              className={cn(
                "flex-1 max-w-[120px] h-16 rounded-2xl border-2 font-semibold transition-all text-lg",
                value === (opt === "yes")
                  ? "border-[rgb(var(--brand))] bg-[rgb(var(--brand))]/10 text-[rgb(var(--brand))]"
                  : "border-gray-200 hover:border-gray-300 text-[rgb(var(--text-primary))] bg-white"
              )}
            >
              {opt === "yes" ? "Yes" : "No"}
            </button>
          ))}
        </div>
      );

    case "rating": {
      const maxRating = question.options?.max ?? 5;
      const current = typeof value === "number" ? value : 0;
      return (
        <div className="flex gap-2 justify-center flex-wrap">
          {Array.from({ length: maxRating }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange?.(n)}
              className={cn(
                "w-12 h-12 rounded-xl border-2 font-semibold text-lg transition-all",
                current >= n
                  ? "border-[rgb(var(--brand))] bg-[rgb(var(--brand))] text-white"
                  : "border-gray-200 hover:border-gray-300 bg-white text-[rgb(var(--text-primary))]"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    case "multiple_choice": {
      const options = question.options?.options ?? [];
      const selected = value as string | undefined;
      return (
        <div className="flex flex-col gap-2 w-full">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange?.(opt.id)}
              className={cn(
                "w-full text-left px-5 py-4 rounded-2xl border-2 transition-all font-medium",
                selected === opt.id
                  ? "border-[rgb(var(--brand))] bg-[rgb(var(--brand))]/5 text-[rgb(var(--text-primary))]"
                  : "border-gray-200 hover:border-gray-300 bg-white text-[rgb(var(--text-primary))]"
              )}
            >
              <span className="inline-flex items-center gap-3">
                <span
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    selected === opt.id
                      ? "border-[rgb(var(--brand))]"
                      : "border-gray-300"
                  )}
                >
                  {selected === opt.id && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[rgb(var(--brand))]" />
                  )}
                </span>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      );
    }

    case "dropdown": {
      const options = question.options?.options ?? [];
      const selected = value as string | undefined;
      return (
        <select
          value={selected ?? ""}
          onChange={(e) => onChange?.(e.target.value || null)}
          className={cn(
            "w-full border-2 border-gray-200 rounded-2xl bg-white focus:border-[rgb(var(--brand))] outline-none transition-colors appearance-none px-5",
            variant === "full" ? "py-4 text-xl" : "py-3 text-base"
          )}
        >
          <option value="">Select an option...</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    default:
      return (
        <p className="text-[rgb(var(--text-secondary))] text-center py-4">
          Unsupported question type
        </p>
      );
  }
}
