export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export type FormStatus = "draft" | "published";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: number | string;
  formId?: number;
  type: QuestionType;
  title: string;
  description?: string | null;
  required: boolean;
  orderIndex: number;
  options?: {
    options?: QuestionOption[];
    min?: number;
    max?: number;
  } | null;
}

export interface Form {
  id: number;
  title: string;
  slug?: string | null;
  status: FormStatus;
  responseCount?: number;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
  themeJson?: any;
  thankYouText?: string;
}

export interface AnswerOut {
  id: number;
  questionId: number;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueJson?: any;
}

export interface ResponseListItem {
  id: number;
  createdAt: string;
  answerCount: number;
  answeredCount?: number;
}

export interface ResponseDetail {
  id: number;
  formId: number;
  createdAt: string;
  meta?: any;
  answers: AnswerOut[];
}

export type QuestionSummary =
  | {
      questionId: number;
      type: "short_text" | "long_text" | "email";
      totalResponses: number;
      skipped: number;
    }
  | {
      questionId: number;
      type: "multiple_choice" | "dropdown";
      totalResponses: number;
      skipped: number;
      optionCounts: Record<string, number>;
    }
  | {
      questionId: number;
      type: "number";
      totalResponses: number;
      skipped: number;
      min: number | null;
      max: number | null;
      avg: number | null;
    }
  | {
      questionId: number;
      type: "yes_no";
      totalResponses: number;
      skipped: number;
      yesCount: number;
      noCount: number;
    }
  | {
      questionId: number;
      type: "rating";
      totalResponses: number;
      skipped: number;
      average: number | null;
      distribution: Record<number, number>;
    };
