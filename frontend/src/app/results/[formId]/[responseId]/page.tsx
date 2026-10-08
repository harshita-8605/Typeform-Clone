"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { cn, toLocalForm, toLocalResponseDetail, toLocalResponseListItem } from "@/lib/utils";
import type { Question, QuestionType, QuestionOption, AnswerOut } from "@/lib/types";
import type { Form, ResponseDetail } from "@/lib/types";

interface DetailPageProps {
  params: {
    formId: string;
    responseId: string;
  };
}

type LoadState = "loading" | "ready" | "notfound";

type ResponseData = ResponseDetail;
type FormLite = Form;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${month}/${day}/${year} ${hh}:${mm}:${ss}`;
}

function resolveOptions(q: Question): QuestionOption[] {
  if (q.options && Array.isArray(q.options.options)) {
    return q.options.options;
  }
  return [];
}

function findOptionLabel(q: Question, value: unknown): string | undefined {
  const opts = resolveOptions(q);
  const str = typeof value === "string" ? value : value != null ? String(value) : "";
  if (!str) return undefined;
  for (const o of opts) {
    if (o.id === str || o.label === str) return o.label;
  }
  return str;
}

export default function ResponseDetailPage({ params }: DetailPageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const formIdNum = Number(params.formId);
  const responseIdNum = Number(params.responseId);

  const [state, setState] = useState<LoadState>("loading");
  const [form, setForm] = useState<FormLite | null>(null);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [prevId, setPrevId] = useState<number | null>(null);
  const [nextId, setNextId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [formRes, detailRes, listRes] = await Promise.all([
        api.get<any>(`/api/forms/${formIdNum}`),
        api.get<any>(`/api/forms/${formIdNum}/responses/${responseIdNum}`),
        api.get<any[]>(`/api/forms/${formIdNum}/responses`),
      ]);

      if (!formRes || !detailRes) {
        setState("notfound");
        return;
      }

      const localForm = toLocalForm(formRes);
      setForm(localForm);

      const localResponse = toLocalResponseDetail(detailRes);
      setResponse(localResponse);

      const sorted = Array.isArray(listRes) ? listRes : [];
      const ids = sorted.map((r: any) => toLocalResponseListItem(r).id);
      const idx = ids.indexOf(responseIdNum);
      if (idx >= 0) {
        setPrevId(idx > 0 ? ids[idx - 1] : null);
        setNextId(idx < ids.length - 1 ? ids[idx + 1] : null);
      }

      setState("ready");
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("404")) {
        setState("notfound");
      } else {
        showToast(msg || "Failed to load response", "error");
        setState("ready");
      }
    }
  }, [formIdNum, responseIdNum, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))]">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-medium">Loading response...</span>
        </div>
      </div>
    );
  }

  if (state === "notfound") {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[rgb(var(--text-primary))] mb-2">
            Response not found
          </h1>
          <p className="text-[rgb(var(--text-secondary))] mb-6">
            This response doesn&apos;t exist or doesn&apos;t belong to this form.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push(`/results/${formIdNum}`)}
          >
            ← Back to results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex flex-col">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 h-16 flex items-center px-6 gap-4">
        <Link
          href={`/results/${formIdNum}`}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-[rgb(var(--text-secondary))] transition-colors"
          aria-label="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-secondary))]">
              Response
            </span>
            <span className="text-xs font-semibold text-[rgb(var(--brand))] bg-[rgb(var(--brand))]/10 px-2 py-0.5 rounded-full">
              #{response?.id}
            </span>
          </div>
          <h1 className="font-bold text-[18px] text-[rgb(var(--text-primary))] truncate mt-0.5">
            {form?.title || "Untitled form"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={prevId === null}
            onClick={() => router.push(`/results/${formIdNum}/${prevId}`)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={nextId === null}
            onClick={() => router.push(`/results/${formIdNum}/${nextId}`)}
          >
            Next
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <InfoBlock label="Submitted at" value={formatDate(response?.createdAt ?? "")} />
            <InfoBlock
              label="Questions answered"
              value={`${answeredCount(response)} of ${form?.questions.length ?? 0}`}
            />
            <InfoBlock
              label="Completion"
              value={completionPct(response, form)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {(form?.questions ?? []).map((q, idx) => (
            <AnswerBlock
              key={q.id}
              index={idx}
              question={q}
              answer={findAnswerFor(response, q.id)}
            />
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[rgb(var(--text-secondary))] mb-4">
            Respondent metadata
          </h3>
          <MetaDisplay meta={response?.meta} />
        </div>
      </div>
    </div>
  );
}

function answeredCount(response: ResponseData | null): number {
  if (!response) return 0;
  return response.answers.filter((a) =>
    a.valueText != null ||
    a.valueNumber != null ||
    a.valueBoolean != null ||
    a.valueJson != null
  ).length;
}

function completionPct(response: ResponseData | null, form: FormLite | null): string {
  const total = form?.questions.length ?? 0;
  if (total === 0) return "—";
  const pct = (answeredCount(response) / total) * 100;
  return `${Math.round(pct)}%`;
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-[rgb(var(--text-secondary))] mb-1">
        {label}
      </div>
      <div className="text-[17px] font-semibold text-[rgb(var(--text-primary))]">{value}</div>
    </div>
  );
}

function findAnswerFor(response: ResponseData | null, qid: number): AnswerOut | undefined {
  return response?.answers.find((a) => a.questionId === qid);
}

function AnswerBlock({
  index,
  question,
  answer,
}: {
  index: number;
  question: Question;
  answer?: AnswerOut;
}) {
  const hasValue =
    answer != null &&
    (answer.valueText != null ||
      answer.valueNumber != null ||
      answer.valueBoolean != null ||
      answer.valueJson != null);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="px-6 pt-5 pb-3 border-b border-gray-100 bg-gray-50/40">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(var(--brand))]/10 text-[rgb(var(--brand))] text-xs font-bold flex-shrink-0 mt-0.5">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--text-secondary))] mb-1">
              {question.type.replace(/_/g, " ")}
              {question.required && (
                <span className="ml-2 text-[rgb(var(--error))]">required</span>
              )}
            </div>
            <h3 className="text-[16px] font-semibold text-[rgb(var(--text-primary))] leading-snug">
              {question.title || "Untitled question"}
            </h3>
            {question.description && (
              <p className="mt-1 text-sm text-[rgb(var(--text-secondary))] italic leading-relaxed">
                {question.description}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            {hasValue ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Answered
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                Skipped
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="px-6 py-5">
        <AnswerValue question={question} answer={answer} />
      </div>
    </div>
  );
}

function AnswerValue({ question, answer }: { question: Question; answer?: AnswerOut }) {
  const empty = (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 px-4 py-5 text-sm italic text-[rgb(var(--text-secondary))] text-center">
      No answer provided
    </div>
  );

  if (!answer) return empty;

  const type: QuestionType = question.type;
  switch (type) {
    case "short_text":
    case "long_text": {
      const v = answer.valueText;
      if (!v) return empty;
      if (type === "long_text") {
        return (
          <div className="rounded-xl bg-[rgb(var(--surface))]/70 border border-gray-100 px-5 py-4 text-[15px] text-[rgb(var(--text-primary))] leading-relaxed whitespace-pre-wrap">
            {v}
          </div>
        );
      }
      return (
        <div className="rounded-xl bg-[rgb(var(--surface))]/70 border border-gray-100 px-5 py-4 text-[16px] text-[rgb(var(--text-primary))] leading-relaxed">
          {v}
        </div>
      );
    }

    case "email": {
      const v = answer.valueText;
      if (!v) return empty;
      return (
        <div className="rounded-xl bg-[rgb(var(--surface))]/70 border border-gray-100 px-5 py-4 text-[16px] text-[rgb(var(--text-primary))] flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--brand))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <a
            href={`mailto:${v}`}
            className="text-[rgb(var(--brand))] hover:underline font-medium break-all"
          >
            {v}
          </a>
        </div>
      );
    }

    case "number": {
      const v = answer.valueNumber;
      if (v == null || Number.isNaN(v)) return empty;
      return (
        <div className="inline-flex items-baseline gap-2 rounded-xl bg-[rgb(var(--brand))]/8 border border-[rgb(var(--brand))]/15 px-5 py-3.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--brand))]">
            #
          </span>
          <span className="text-3xl font-bold text-[rgb(var(--text-primary))] tabular-nums">
            {Number.isInteger(v) ? v : v.toFixed(2)}
          </span>
        </div>
      );
    }

    case "rating": {
      const v = answer.valueNumber;
      if (v == null || Number.isNaN(v)) return empty;
      const min = question.options?.min ?? 1;
      const max = question.options?.max ?? 5;
      const items: number[] = [];
      for (let n = min; n <= max; n++) items.push(n);
      return (
        <div className="inline-flex items-center gap-2 flex-wrap">
          {items.map((n) => (
            <div
              key={n}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm",
                n <= v
                  ? "bg-[rgb(var(--brand))] text-white"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              {n}
            </div>
          ))}
          <div className="ml-3 text-sm text-[rgb(var(--text-secondary))] font-medium">
            Rating: <span className="text-[rgb(var(--text-primary))] font-bold">{v}</span> / {max}
          </div>
        </div>
      );
    }

    case "yes_no": {
      const v = answer.valueBoolean;
      if (v == null) return empty;
      return (
        <div
          className={cn(
            "inline-flex items-center gap-3 rounded-2xl px-6 py-4",
            v
              ? "bg-[rgb(var(--success))]/8 border border-[rgb(var(--success))]/15"
              : "bg-[rgb(var(--error))]/8 border border-[rgb(var(--error))]/15"
          )}
        >
          {v ? (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--success))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-xl font-bold text-[rgb(var(--success))]">
                Yes
              </span>
            </>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--error))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="text-xl font-bold text-[rgb(var(--error))]">
                No
              </span>
            </>
          )}
        </div>
      );
    }

    case "multiple_choice": {
      const v = answer.valueText ?? answer.valueJson;
      if (!v) return empty;
      const values = Array.isArray(v) ? v : [v];
      return (
        <ul className="space-y-2">
          {values.map((val: unknown, i: number) => {
            const label = findOptionLabel(question, val) ?? String(val);
            return (
              <li
                key={i}
                className="inline-flex items-center gap-3 w-full rounded-2xl border-2 border-[rgb(var(--brand))] bg-[rgb(var(--brand))]/5 px-5 py-4 font-medium text-[rgb(var(--text-primary))]"
              >
                <span className="w-5 h-5 rounded-full border-2 border-[rgb(var(--brand))] flex items-center justify-center flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[rgb(var(--brand))]" />
                </span>
                {label}
              </li>
            );
          })}
        </ul>
      );
    }

    case "dropdown": {
      const v = answer.valueText ?? answer.valueJson;
      if (!v) return empty;
      const label = findOptionLabel(question, v) ?? String(v);
      return (
        <div className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-[rgb(var(--text-primary))] font-medium shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--brand))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {label}
        </div>
      );
    }

    default: {
      const anyVal =
        answer.valueText ??
        answer.valueNumber ??
        answer.valueBoolean ??
        answer.valueJson;
      if (anyVal == null) return empty;
      if (typeof anyVal === "object") {
        return (
          <pre className="rounded-xl bg-[rgb(var(--surface))]/70 border border-gray-100 px-5 py-4 text-sm overflow-auto">
            {JSON.stringify(anyVal, null, 2)}
          </pre>
        );
      }
      return (
        <div className="rounded-xl bg-[rgb(var(--surface))]/70 border border-gray-100 px-5 py-4 text-[rgb(var(--text-primary))]">
          {String(anyVal)}
        </div>
      );
    }
  }
}

function MetaDisplay({ meta }: { meta: unknown }) {
  if (meta == null || (typeof meta === "object" && Object.keys(meta as object).length === 0)) {
    return (
      <div className="text-sm italic text-[rgb(var(--text-secondary))]">
        No metadata captured for this response.
      </div>
    );
  }

  const entries = typeof meta === "object" ? Object.entries(meta as Record<string, unknown>) : [];
  if (entries.length === 0) {
    return (
      <pre className="rounded-xl bg-[rgb(var(--surface))]/60 border border-gray-100 px-4 py-3 text-sm overflow-auto">
        {typeof meta === "string" ? meta : JSON.stringify(meta, null, 2)}
      </pre>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
      {entries.map(([k, v]) => (
        <div key={k} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 md:last:border-b md:last:pb-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-secondary))] mb-1">
            {k.replace(/_/g, " ")}
          </div>
          <div className="text-sm text-[rgb(var(--text-primary))] break-all">
            {v == null
              ? <span className="italic text-[rgb(var(--text-secondary))]">—</span>
              : typeof v === "object"
              ? <pre className="text-xs overflow-auto">{JSON.stringify(v, null, 2)}</pre>
              : typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)
              ? formatDate(v)
              : String(v)}
          </div>
        </div>
      ))}
    </div>
  );
}
