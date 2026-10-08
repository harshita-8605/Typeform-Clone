"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { validateAnswer } from "@/lib/validators";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import { cn } from "@/lib/utils";
import type { Question, QuestionType } from "@/lib/types";

interface FormViewPageProps {
  params: {
    slug: string;
  };
}

interface PublicQuestion {
  id: number;
  form_id: number;
  order_index: number;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  options_json: {
    options?: { id: string; label: string }[];
    min?: number;
    max?: number;
  } | null;
}

interface PublicForm {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published";
  thank_you_text: string | null;
  questions: PublicQuestion[];
}

type Status = "loading" | "ready" | "submitting" | "done" | "notfound";

interface Answer {
  value_text?: string | null;
  value_number?: number | null;
  value_boolean?: boolean | null;
  value_json?: unknown;
}

function toLocalQuestion(pq: PublicQuestion): Question {
  return {
    id: pq.id,
    formId: pq.form_id,
    type: pq.type,
    title: pq.title,
    description: pq.description,
    required: pq.required,
    orderIndex: pq.order_index,
    options: pq.options_json ?? null,
  };
}

function valueToAnswer(type: QuestionType, value: unknown): Answer {
  const ans: Answer = {};
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);

  if (isEmpty) return ans;

  switch (type) {
    case "short_text":
    case "long_text":
    case "email":
    case "multiple_choice":
    case "dropdown":
      if (Array.isArray(value)) {
        ans.value_json = value;
      } else {
        ans.value_text = String(value);
      }
      break;
    case "yes_no":
      ans.value_boolean = Boolean(value);
      break;
    case "number":
    case "rating": {
      const n = Number(value);
      if (!Number.isNaN(n)) ans.value_number = n;
      break;
    }
  }
  return ans;
}

function extractAnswerValue(type: QuestionType, ans: Answer | undefined): unknown {
  if (!ans) return undefined;
  switch (type) {
    case "short_text":
    case "long_text":
    case "email":
      return ans.value_text ?? ans.value_json;
    case "multiple_choice":
    case "dropdown":
      return ans.value_json ?? ans.value_text;
    case "yes_no":
      return ans.value_boolean;
    case "number":
    case "rating":
      return ans.value_number;
  }
}

export default function FormViewPage({ params }: FormViewPageProps) {
  const { showToast } = useToast();

  const [status, setStatus] = useState<Status>("loading");
  const [form, setForm] = useState<PublicForm | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [questionErrors, setQuestionErrors] = useState<Record<number, string>>({});
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [submittedResponseId, setSubmittedResponseId] = useState<number | undefined>();

  const okButtonRef = useRef<HTMLButtonElement | null>(null);

  const questions: Question[] = useMemo(() => {
    if (!form) return [];
    const sorted = [...form.questions].sort(
      (a, b) => a.order_index - b.order_index
    );
    return sorted.map(toLocalQuestion);
  }, [form]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIdx];
  const currentError = currentQuestion ? questionErrors[currentQuestion.id] : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<PublicForm>(`/api/public/forms/${params.slug}`);
        if (cancelled) return;
        if (!data || data.status !== "published") {
          setStatus("notfound");
          return;
        }
        setForm(data);
        setStatus("ready");
      } catch (err: any) {
        if (cancelled) return;
        const msg = err?.message ?? "";
        if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
          setStatus("notfound");
        } else {
          setStatus("notfound");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  const triggerShake = useCallback(() => {
    setShakeKey((k) => k + 1);
  }, []);

  const validateCurrent = useCallback((): boolean => {
    if (!currentQuestion) return true;
    const rawValue = extractAnswerValue(currentQuestion.type, answers[currentQuestion.id]);
    const { valid, error } = validateAnswer(currentQuestion, rawValue);
    if (!valid && error) {
      setQuestionErrors((prev) => ({ ...prev, [currentQuestion.id]: error }));
      triggerShake();
      window.setTimeout(() => {
        setQuestionErrors((prev) => {
          const next = { ...prev };
          delete next[currentQuestion.id];
          return next;
        });
      }, 2200);
      return false;
    }
    setQuestionErrors((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
    return true;
  }, [currentQuestion, answers, triggerShake]);

  const handleOK = useCallback(async () => {
    if (status !== "ready") return;
    const valid = validateCurrent();
    if (!valid) return;

    const isLast = currentIdx === totalQuestions - 1;
    if (!isLast) {
      setDirection(1);
      setCurrentIdx((i) => i + 1);
      return;
    }

    setStatus("submitting");
    try {
      const answersPayload = Object.entries(answers)
        .filter(([qid]) =>
          questions.some((q) => q.id === Number(qid))
        )
        .map(([qid, ans]) => {
          const q = questions.find((x) => x.id === Number(qid))!;
          return {
            question_id: q.id,
            ...(ans.value_text !== undefined ? { value_text: ans.value_text } : {}),
            ...(ans.value_number !== undefined ? { value_number: ans.value_number } : {}),
            ...(ans.value_boolean !== undefined ? { value_boolean: ans.value_boolean } : {}),
            ...(ans.value_json !== undefined ? { value_json: ans.value_json } : {}),
          };
        });

      const res = await api.post<{ id: number }>(
        `/api/public/forms/${params.slug}/responses`,
        {
          answers: answersPayload,
          meta: {
            user_agent:
              typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            started_at: new Date().toISOString(),
          },
        }
      );

      setSubmittedResponseId(res?.id);
      setStatus("done");
    } catch (err: any) {
      const detail = err?.message ?? "";
      try {
        const m = detail.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          if (parsed?.detail?.errors && typeof parsed.detail.errors === "object") {
            const mapped: Record<number, string> = {};
            for (const [k, v] of Object.entries(parsed.detail.errors)) {
              const m2 = k.match(/question_(\d+)/);
              if (m2) mapped[Number(m2[1])] = String(v);
            }
            if (Object.keys(mapped).length > 0) {
              setQuestionErrors((prev) => ({ ...prev, ...mapped }));
              const firstQid = Object.keys(mapped).map(Number)[0];
              const idx = questions.findIndex((q) => q.id === firstQid);
              if (idx >= 0 && idx !== currentIdx) {
                setDirection(idx > currentIdx ? 1 : -1);
                setCurrentIdx(idx);
              }
              triggerShake();
              setStatus("ready");
              showToast("Please correct the highlighted fields", "error");
              return;
            }
          }
        }
      } catch {
        // ignore parse errors
      }
      showToast("Something went wrong submitting — please try again.", "error");
      setStatus("ready");
    }
  }, [
    status,
    validateCurrent,
    currentIdx,
    totalQuestions,
    answers,
    questions,
    params.slug,
    triggerShake,
    showToast,
  ]);

  const handleBack = useCallback(() => {
    if (status !== "ready") return;
    if (currentIdx > 0) {
      setDirection(-1);
      setCurrentIdx((i) => i - 1);
    }
  }, [status, currentIdx]);

  const handleReset = useCallback(() => {
    setAnswers({});
    setQuestionErrors({});
    setCurrentIdx(0);
    setDirection(1);
    setSubmittedResponseId(undefined);
    setStatus("ready");
  }, []);

  const handleChange = useCallback(
    (questionId: number, type: QuestionType, value: unknown) => {
      const answer = valueToAnswer(type, value);
      setAnswers((prev) => {
        const next = { ...prev };
        next[questionId] = answer;
        return next;
      });
      setQuestionErrors((prev) => {
        if (!(questionId in prev)) return prev;
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (status !== "ready") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      const isTextarea = tag === "TEXTAREA";
      const isTextInput =
        tag === "INPUT" &&
        (target as HTMLInputElement).type !== "radio" &&
        (target as HTMLInputElement).type !== "checkbox";

      if (e.key === "Enter") {
        if (isTextarea) return;
        e.preventDefault();
        okButtonRef.current?.click();
        return;
      }

      if (e.key === "ArrowLeft") {
        if (isTextarea || isTextInput) return;
        if (currentIdx > 0) {
          e.preventDefault();
          handleBack();
        }
        return;
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [status, currentIdx, handleBack]);

  const pct = totalQuestions > 0 ? ((currentIdx + 1) / totalQuestions) * 100 : 0;

  if (status === "loading") {
    return <LoadingShell slug={params.slug} />;
  }

  if (status === "notfound") {
    return <NotFoundShell />;
  }

  if (status === "done") {
    return (
      <ThankYouShell
        thankYouText={form?.thank_you_text ?? null}
        onStartOver={handleReset}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex flex-col">
      <div className="sticky top-0 z-40 bg-[rgb(var(--background))]/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[rgb(var(--brand))] flex items-center justify-center text-white font-bold text-sm">
              T
            </div>
            <span className="text-[rgb(var(--text-primary))] font-semibold tracking-tight text-sm">
              Typeform
            </span>
          </div>
          <div className="text-sm font-medium text-[rgb(var(--text-secondary))] tabular-nums">
            {totalQuestions > 0 ? currentIdx + 1 : 0} / {totalQuestions}
          </div>
        </div>
        <div className="h-[3px] w-full bg-gray-100">
          <motion.div
            className="h-full bg-[rgb(var(--brand))]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
      </div>

      <main className="flex-1 relative">
        <div className="max-w-3xl mx-auto px-6 pt-16 pb-36">
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <QuestionScreen
                key={currentIdx}
                direction={direction}
                idx={currentIdx}
                total={totalQuestions}
                question={currentQuestion}
                value={extractAnswerValue(
                  currentQuestion.type,
                  answers[currentQuestion.id]
                )}
                onChange={(v) =>
                  handleChange(currentQuestion.id, currentQuestion.type, v)
                }
                error={currentError}
                shakeKey={shakeKey}
                isLast={currentIdx === totalQuestions - 1}
                isSubmitting={status === "submitting"}
                onBack={handleBack}
                onOK={handleOK}
                okButtonRef={okButtonRef}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function LoadingShell({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-[rgb(var(--text-secondary))] mb-2">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="font-medium">Loading form...</span>
        </div>
        <p className="text-sm text-[rgb(var(--text-secondary))]">
          Slug: {slug}
        </p>
      </div>
    </div>
  );
}

function NotFoundShell() {
  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[rgb(var(--text-secondary))]"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] mb-3">
          This form doesn&apos;t exist
        </h1>
        <p className="text-[rgb(var(--text-secondary))] mb-8 text-lg leading-relaxed">
          This form doesn&apos;t exist or isn&apos;t published right now.
        </p>
        <a
          href="/workspace"
          className="inline-flex items-center gap-2 btn-primary"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <polyline points="3 12 12 3 21 12" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
          Go to workspace
        </a>
      </div>
    </div>
  );
}

function ThankYouShell({
  thankYouText,
  onStartOver,
}: {
  thankYouText: string | null;
  onStartOver: () => void;
}) {
  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center max-w-xl"
      >
        <div className="mx-auto mb-8 relative">
          <svg
            width="112"
            height="112"
            viewBox="0 0 112 112"
            className="mx-auto"
          >
            <circle
              cx="56"
              cy="56"
              r="50"
              fill="none"
              stroke="rgb(var(--success))"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="320"
              strokeDashoffset="300"
              className="animate-circle-draw"
              style={{ transformOrigin: "56px 56px" }}
            />
            <polyline
              points="34,58 50,74 82,40"
              fill="none"
              stroke="rgb(var(--success))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="100"
              strokeDashoffset="100"
              className="animate-checkmark-draw"
            />
          </svg>
        </div>

        <h2 className="text-4xl sm:text-5xl font-bold text-[rgb(var(--text-primary))] mb-4 leading-tight">
          🎉 Thank you!
        </h2>
        <p className="text-[rgb(var(--text-secondary))] text-lg leading-relaxed mb-10">
          {thankYouText || "Thanks for completing this form!"}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onStartOver}
            className="btn-secondary"
          >
            Start over
          </button>
          <a
            href="/workspace"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Create your own typeform
            <svg
              className="ml-2"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </motion.div>
    </div>
  );
}

interface QuestionScreenProps {
  direction: 1 | -1;
  idx: number;
  total: number;
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  shakeKey: number;
  isLast: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onOK: () => void;
  okButtonRef: React.MutableRefObject<HTMLButtonElement | null>;
}

function QuestionScreen({
  direction,
  idx,
  question,
  value,
  onChange,
  error,
  shakeKey,
  isLast,
  isSubmitting,
  onBack,
  onOK,
  okButtonRef,
}: QuestionScreenProps) {
  const variants = useMemo(
    () => ({
      enter: (dir: 1 | -1) => ({
        opacity: 0,
        x: dir === 1 ? 60 : -60,
      }),
      center: {
        opacity: 1,
        x: 0,
      },
      exit: (dir: 1 | -1) => ({
        opacity: 0,
        x: dir === 1 ? -60 : 60,
      }),
    }),
    []
  );

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0 }}
      >
        <div className="text-[20px] font-medium text-gray-400 tabular-nums">
          {String(idx + 1).padStart(2, "0")}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.03 }}
        className="mt-3"
      >
        <h1 className="text-[36px] sm:text-[42px] font-bold leading-[1.1] tracking-tight text-[rgb(var(--text-primary))]">
          {question.title}
          {question.required && (
            <span className="text-[rgb(var(--error))] ml-1 align-top text-[0.7em]">
              *
            </span>
          )}
        </h1>
        {question.description && (
          <p className="text-[17px] leading-relaxed text-[rgb(var(--text-secondary))] mt-3">
            {question.description}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.08 }}
        key={`renderer-${shakeKey}`}
        className={cn(error && "animate-shake")}
      >
        <label
          htmlFor={`q-${question.id}-input`}
          className="sr-only"
        >
          {question.title}
        </label>
        <QuestionRenderer
          question={question}
          value={value}
          onChange={onChange}
          error={error}
          variant="full"
          autoFocus
        />
        {error && (
          <div
            id={`q-${question.id}-input-err`}
            className="mt-4 flex items-start gap-2 text-[rgb(var(--error))] text-sm font-medium"
            role="alert"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 flex-shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.16 }}
        className="fixed left-0 right-0 bottom-0 z-30 pointer-events-none"
      >
        <div className="max-w-3xl mx-auto px-6 pb-8 pt-4 flex items-end justify-between pointer-events-auto">
          <div className="min-w-[100px]">
            {idx > 0 && (
              <button
                type="button"
                onClick={onBack}
                className="btn-secondary !h-11 !px-5 text-sm"
              >
                <svg
                  className="mr-2"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back
              </button>
            )}
          </div>

          <button
            ref={okButtonRef}
            type="button"
            onClick={onOK}
            disabled={isSubmitting}
            className="btn-primary !h-12 !px-7 text-base"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin mr-2"
                  width="18"
                  height="18"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Submitting...
              </>
            ) : isLast ? (
              <>
                Submit
                <svg
                  className="ml-2"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </>
            ) : (
              <>
                OK
                <svg
                  className="ml-2"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
