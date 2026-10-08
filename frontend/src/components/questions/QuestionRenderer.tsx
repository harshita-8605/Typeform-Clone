"use client";

import type { Question } from "@/lib/types";
import { ShortTextInput } from "./ShortTextInput";
import { LongTextInput } from "./LongTextInput";
import { EmailInput } from "./EmailInput";
import { NumberInput } from "./NumberInput";
import { MultipleChoiceInput } from "./MultipleChoiceInput";
import { DropdownInput } from "./DropdownInput";
import { YesNoInput } from "./YesNoInput";
import { RatingInput } from "./RatingInput";

export interface QuestionRendererProps {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  onSubmit?: () => void;
  error?: string;
  variant?: "full" | "compact";
  autoFocus?: boolean;
  disabled?: boolean;
}

function GlobalQuestionStyles() {
  if (typeof document === "undefined") return null;
  const id = "question-renderer-keyframes";
  if (document.getElementById(id)) return null;
  return (
    <style
      id={id}
      dangerouslySetInnerHTML={{
        __html: `
          @keyframes wiggle {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-6px); }
            40% { transform: translateX(6px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
        `,
      }}
    />
  );
}

export default function QuestionRenderer({
  question,
  value,
  onChange,
  onSubmit,
  error,
  variant = "full",
  autoFocus,
  disabled,
}: QuestionRendererProps) {
  const v = variant;
  const common = { error, variant: v, autoFocus, disabled };

  return (
    <>
      <GlobalQuestionStyles />
      {(() => {
        switch (question.type) {
          case "short_text":
            return (
              <ShortTextInput
                {...common}
                required={question.required}
                value={(value as string) ?? ""}
                onChange={(nv) => onChange(nv)}
              />
            );
          case "long_text":
            return (
              <LongTextInput
                {...common}
                required={question.required}
                value={(value as string) ?? ""}
                onChange={(nv) => onChange(nv)}
              />
            );
          case "email":
            return (
              <EmailInput
                {...common}
                required={question.required}
                value={(value as string) ?? ""}
                onChange={(nv) => onChange(nv)}
              />
            );
          case "number":
            return (
              <NumberInput
                {...common}
                required={question.required}
                value={(value as number | null) ?? null}
                onChange={(nv) => onChange(nv)}
                min={question.options?.min}
                max={question.options?.max}
              />
            );
          case "multiple_choice":
            return (
              <MultipleChoiceInput
                {...common}
                value={(value as string) ?? ""}
                onChange={(nv) => onChange(nv)}
                onSubmit={onSubmit}
                options={question.options?.options ?? []}
              />
            );
          case "dropdown":
            return (
              <DropdownInput
                {...common}
                required={question.required}
                value={(value as string) ?? ""}
                onChange={(nv) => onChange(nv)}
                options={question.options?.options ?? []}
              />
            );
          case "yes_no":
            return (
              <YesNoInput
                {...common}
                value={(value as boolean | null) ?? null}
                onChange={(nv) => onChange(nv)}
              />
            );
          case "rating":
            return (
              <RatingInput
                {...common}
                value={(value as number | null) ?? null}
                onChange={(nv) => onChange(nv)}
                max={question.options?.max ?? 5}
                min={question.options?.min ?? 1}
              />
            );
          default:
            return null;
        }
      })()}
    </>
  );
}
