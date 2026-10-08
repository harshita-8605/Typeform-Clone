import type { Question } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAnswer(
  question: Question,
  value: unknown
): { valid: boolean; error?: string } {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);

  if (question.required && isEmpty) {
    return {
      valid: false,
      error: "This question is required",
    };
  }

  if (isEmpty) {
    return { valid: true };
  }

  switch (question.type) {
    case "email": {
      const str = String(value);
      if (!EMAIL_REGEX.test(str)) {
        return {
          valid: false,
          error: "Please enter a valid email address",
        };
      }
      return { valid: true };
    }

    case "number": {
      const num = Number(value);
      if (isNaN(num)) {
        return {
          valid: false,
          error: "Please enter a valid number",
        };
      }
      const min = question.options?.min;
      const max = question.options?.max;
      if (min !== undefined && num < min) {
        return {
          valid: false,
          error: `Number must be at least ${min}`,
        };
      }
      if (max !== undefined && num > max) {
        return {
          valid: false,
          error: `Number must be at most ${max}`,
        };
      }
      return { valid: true };
    }

    case "rating": {
      const num = Number(value);
      if (isNaN(num) || !Number.isInteger(num)) {
        return {
          valid: false,
          error: "Please select a valid rating",
        };
      }
      const min = question.options?.min ?? 1;
      const max = question.options?.max ?? 5;
      if (num < min || num > max) {
        return {
          valid: false,
          error: `Rating must be between ${min} and ${max}`,
        };
      }
      return { valid: true };
    }

    case "yes_no": {
      if (typeof value !== "boolean") {
        return {
          valid: false,
          error: "Please select Yes or No",
        };
      }
      return { valid: true };
    }

    case "multiple_choice":
    case "dropdown": {
      const opts = question.options?.options ?? [];
      const optionIds = opts.map((o) => o.id);
      const optionLabels = opts.map((o) => o.label.toLowerCase());

      const isValidValue = (v: string): boolean => {
        if (optionIds.includes(v)) return true;
        if (optionLabels.includes(v.toLowerCase())) return true;
        return false;
      };

      if (Array.isArray(value)) {
        for (const v of value) {
          if (!isValidValue(String(v))) {
            return {
              valid: false,
              error: "Please select a valid option",
            };
          }
        }
      } else {
        if (!isValidValue(String(value))) {
          return {
            valid: false,
            error: "Please select a valid option",
          };
        }
      }
      return { valid: true };
    }

    case "short_text":
    case "long_text":
    default:
      return { valid: true };
  }
}
