import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Form, Question, QuestionType, QuestionOption, ResponseDetail, AnswerOut, ResponseListItem } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toLocalQuestion(raw: any): Question {
  const orderIndex =
    typeof raw.order_index === "number"
      ? raw.order_index
      : typeof raw.orderIndex === "number"
      ? raw.orderIndex
      : 0;

  let options: Question["options"] = null;
  const rawOptions = raw.options_json ?? raw.options;
  if (rawOptions && typeof rawOptions === "object") {
    if (Array.isArray(rawOptions.options)) {
      const mappedOpts: QuestionOption[] = rawOptions.options.map((o: any) => ({
        id: String(o.id ?? ""),
        label: String(o.label ?? ""),
      }));
      options = { options: mappedOpts };
    } else if (raw.type === "rating") {
      options = {
        min: typeof rawOptions.min === "number" ? rawOptions.min : 1,
        max: typeof rawOptions.max === "number" ? rawOptions.max : 5,
      };
    } else if (raw.type === "number") {
      options = {
        min: typeof rawOptions.min === "number" ? rawOptions.min : undefined,
        max: typeof rawOptions.max === "number" ? rawOptions.max : undefined,
      };
    }
  }

  return {
    id: Number(raw.id ?? 0),
    formId: raw.form_id ?? raw.formId,
    type: (raw.type ?? "short_text") as QuestionType,
    title: String(raw.title ?? ""),
    description:
      raw.description ?? raw.description === "" ? raw.description : null,
    required: Boolean(raw.required),
    orderIndex,
    options,
  };
}

export function toLocalForm(raw: any): Form {
  const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];
  const questions: Question[] = rawQuestions.map(toLocalQuestion);

  return {
    id: Number(raw.id ?? 0),
    title: String(raw.title ?? "Untitled form"),
    slug: raw.slug ?? undefined,
    status: (raw.status ?? "draft") as Form["status"],
    responseCount:
      typeof raw.response_count === "number"
        ? raw.response_count
        : typeof raw.responseCount === "number"
        ? raw.responseCount
        : 0,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? new Date().toISOString(),
    questions,
    themeJson: raw.theme_json ?? raw.themeJson ?? undefined,
    thankYouText: raw.thank_you_text ?? raw.thankYouText ?? undefined,
  };
}

export function toLocalResponseListItem(raw: any): ResponseListItem {
  return {
    id: Number(raw.id ?? 0),
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    answerCount: Number(raw.answer_count ?? raw.answerCount ?? 0),
    answeredCount:
      typeof raw.answered_count === "number"
        ? raw.answered_count
        : typeof raw.answeredCount === "number"
        ? raw.answeredCount
        : undefined,
  };
}

export function toLocalAnswerOut(raw: any): AnswerOut {
  return {
    id: Number(raw.id ?? 0),
    questionId: Number(raw.question_id ?? raw.questionId ?? 0),
    valueText: raw.value_text !== undefined ? raw.value_text : undefined,
    valueNumber: raw.value_number !== undefined ? raw.value_number : undefined,
    valueBoolean: raw.value_boolean !== undefined ? raw.value_boolean : undefined,
    valueJson: raw.value_json !== undefined ? raw.value_json : undefined,
  };
}

export function toLocalResponseDetail(raw: any): ResponseDetail {
  const rawAnswers = Array.isArray(raw.answers) ? raw.answers : [];
  return {
    id: Number(raw.id ?? 0),
    formId: Number(raw.form_id ?? raw.formId ?? 0),
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    meta: raw.meta ?? raw.respondent_meta_json ?? undefined,
    answers: rawAnswers.map(toLocalAnswerOut),
  };
}
