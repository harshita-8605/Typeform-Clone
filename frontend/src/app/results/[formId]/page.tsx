"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { cn, toLocalForm, toLocalResponseListItem } from "@/lib/utils";
import type { Question, QuestionType } from "@/lib/types";

interface ResultsPageProps {
  params: {
    formId: string;
  };
}

type TabKey = "summary" | "responses";
type LoadingState = "loading" | "ready" | "notfound";

interface FormMeta {
  id: number;
  title: string;
  status: "draft" | "published";
  slug: string | null;
  questions: Question[];
  responseCount: number;
  thankYouText: string | null;
}

interface QuestionStat {
  questionId: number | string;
  type: QuestionType;
  answeredCount: number;
  [key: string]: unknown;
}

interface ChoiceStat extends QuestionStat {
  type: "multiple_choice" | "dropdown";
  distribution: Array<{ id: string; label: string; count: number; percentage: number }>;
}

interface YesNoStat extends QuestionStat {
  type: "yes_no";
  true_count: number;
  false_count: number;
}

interface RatingStat extends QuestionStat {
  type: "rating";
  average: number | null;
  min: number;
  max: number;
  distribution: Record<string, number>;
}

interface NumberStat extends QuestionStat {
  type: "number";
  min: number | null;
  max: number | null;
  average: number | null;
}

interface TextStat extends QuestionStat {
  type: "short_text" | "long_text" | "email";
  response_count: number;
  samples: string[];
}

interface FormSummary {
  formId: number;
  totalResponses: number;
  questionStats: QuestionStat[];
}

interface ResponseRow {
  id: number;
  createdAt: string;
  answerCount: number;
  answeredCount: number | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day}/${year} ${hh}:${mm}`;
}

function formatTimeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Math.max(0, now - then);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins === 1 ? "1 min ago" : `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  return formatDate(iso);
}

function resolveQuestionTitle(qMap: Record<number | string, Question>, qid: number | string): string {
  return qMap[qid]?.title ?? `Question ${qid}`;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const formIdNum = Number(params.formId);

  const [state, setState] = useState<LoadingState>("loading");
  const [tab, setTab] = useState<TabKey>("summary");
  const [form, setForm] = useState<FormMeta | null>(null);
  const [summary, setSummary] = useState<FormSummary | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [actionLoading, setActionLoading] = useState<"publish" | "unpublish" | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [formDataRaw, summaryData, responsesDataRaw] = await Promise.all([
        api.get<any>(`/api/forms/${formIdNum}`),
        api.get<any>(`/api/forms/${formIdNum}/summary`),
        api.get<any[]>(`/api/forms/${formIdNum}/responses`),
      ]);

      if (!formDataRaw) {
        setState("notfound");
        return;
      }

      const formData = toLocalForm(formDataRaw);

      setForm({
        id: formData.id,
        title: formData.title,
        status: formData.status,
        slug: formData.slug ?? null,
        questions: formData.questions,
        responseCount: formData.responseCount ?? 0,
        thankYouText: formData.thankYouText ?? null,
      });

      const rawStats = Array.isArray(summaryData.question_stats) ? summaryData.question_stats : [];
      const transformedStats = rawStats.map((s: any) => ({
        ...s,
        questionId: typeof s.question_id === "number" ? s.question_id : s.questionId,
        answeredCount:
          typeof s.answered_count === "number"
            ? s.answered_count
            : typeof s.answeredCount === "number"
            ? s.answeredCount
            : 0,
      }));
      setSummary({
        formId: summaryData.form_id ?? summaryData.formId,
        totalResponses: summaryData.total_responses ?? summaryData.totalResponses ?? 0,
        questionStats: transformedStats,
      });

      const responsesData = Array.isArray(responsesDataRaw)
        ? responsesDataRaw.map(toLocalResponseListItem)
        : [];

      setResponses(
        responsesData.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          answerCount: r.answerCount,
          answeredCount: r.answeredCount ?? null,
        }))
      );
      setState("ready");
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("404")) {
        setState("notfound");
      } else {
        showToast(msg || "Failed to load results", "error");
        setState("ready");
      }
    }
  }, [formIdNum, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePublish = async () => {
    if (!form) return;
    setActionLoading("publish");
    try {
      const res = (await api.post<any>(`/api/forms/${formIdNum}/publish`)) as { slug?: string | null } | null;
      const slug = res?.slug ?? form.slug;
      setForm({ ...form, status: "published", slug });
      if (slug && typeof navigator !== "undefined") {
        const url = `${window.location.origin}/f/${slug}`;
        try {
          await navigator.clipboard.writeText(url);
          showToast("Published — link copied!", "success");
        } catch {
          showToast("Published", "success");
        }
      } else {
        showToast("Published", "success");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to publish", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpublish = async () => {
    if (!form) return;
    setActionLoading("unpublish");
    try {
      await api.post<any>(`/api/forms/${formIdNum}/unpublish`);
      setForm({ ...form, status: "draft" });
      showToast("Unpublished", "info");
    } catch (e: any) {
      showToast(e.message || "Failed to unpublish", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const copyShareLink = async () => {
    if (!form?.slug) {
      showToast("Form is not published", "error");
      return;
    }
    try {
      const url = `${window.location.origin}/f/${form.slug}`;
      await navigator.clipboard.writeText(url);
      showToast("Share link copied", "success");
    } catch {
      showToast("Could not copy link", "error");
    }
  };

  const isPublished = form?.status === "published";

  if (state === "loading") {
    return <LoadingShell />;
  }

  if (state === "notfound") {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[rgb(var(--text-primary))] mb-2">
            Form not found
          </h1>
          <p className="text-[rgb(var(--text-secondary))] mb-6">
            This form doesn&apos;t exist or you don&apos;t have access.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => router.push("/workspace")}
          >
            ← Back to workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex flex-col">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 h-16 flex items-center px-6 gap-4">
        <button
          type="button"
          onClick={() => router.push("/workspace")}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-[rgb(var(--text-secondary))] transition-colors"
          aria-label="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-[20px] text-[rgb(var(--text-primary))] truncate">
              {form?.title || "Untitled form"}
            </h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold flex-shrink-0",
                isPublished
                  ? "bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyShareLink}
            className="h-10 px-4 rounded-full font-medium text-sm text-[rgb(var(--text-primary))] hover:bg-gray-100 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            disabled={!isPublished}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Share
          </button>

          <Link
            href={`/builder/${formIdNum}`}
            className="h-10 px-4 rounded-full font-medium text-sm text-[rgb(var(--text-primary))] hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit
          </Link>

          {isPublished ? (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={actionLoading !== null}
              className="h-10 px-5 rounded-full font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {actionLoading === "unpublish" ? "..." : "Unpublish"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={actionLoading !== null}
              className="h-10 px-5 rounded-full font-medium text-white bg-[rgb(var(--brand))] hover:bg-[rgb(var(--brand-dark))] transition-colors text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {actionLoading === "publish" ? "..." : "Publish"}
            </button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total responses"
            value={String(form?.responseCount ?? summary?.totalResponses ?? 0)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Questions"
            value={String(form?.questions.length ?? 0)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
          />
          <StatCard
            label="Completion rate"
            value={completionRate(form, summary)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          />
        </div>

        <div className="flex items-center gap-1 mb-6 border-b border-gray-100">
          {(["summary", "responses"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "relative px-5 py-3 text-sm font-medium transition-colors capitalize",
                tab === t
                  ? "text-[rgb(var(--brand))]"
                  : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
              )}
            >
              {t}
              {tab === t && (
                <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-[rgb(var(--brand))] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {tab === "summary" && (
          <SummaryTab form={form} summary={summary} />
        )}

        {tab === "responses" && (
          <ResponsesTab
            form={form}
            responses={responses}
            onRefresh={load}
          />
        )}
      </div>
    </div>
  );
}

function completionRate(form: FormMeta | null, summary: FormSummary | null): string {
  if (!form || form.questions.length === 0) return "—";
  const total = summary?.totalResponses ?? form.responseCount ?? 0;
  if (total === 0) return "—";
  const avg = summary?.questionStats?.length
    ? summary.questionStats.reduce((acc, s) => acc + (s.answeredCount ?? 0), 0) /
      summary.questionStats.length
    : 0;
  const pct = Math.min(100, (avg / Math.max(total, 1)) * 100);
  return `${Math.round(pct)}%`;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}
function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-[rgb(var(--text-secondary))] mb-1">{label}</p>
          <p className="text-[32px] font-bold text-[rgb(var(--text-primary))] leading-none">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[rgb(var(--brand))]/10 flex items-center justify-center text-[rgb(var(--brand))]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">
      <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))]">
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="font-medium">Loading results...</span>
      </div>
    </div>
  );
}

interface SummaryTabProps {
  form: FormMeta | null;
  summary: FormSummary | null;
}
function SummaryTab({ form, summary }: SummaryTabProps) {
  const qMap = useMemo(() => {
    const m: Record<number | string, Question> = {};
    for (const q of form?.questions ?? []) {
      m[q.id] = q;
    }
    return m;
  }, [form]);

  const stats = summary?.questionStats ?? [];
  if (stats.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No summary yet"
        description="Once your typeform receives responses, insights will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      {stats.map((stat) => {
        const title = resolveQuestionTitle(qMap, stat.questionId);
        const type = stat.type;
        switch (type) {
          case "multiple_choice":
          case "dropdown":
            return (
              <ChoiceStatCard
                key={stat.questionId}
                title={title}
                stat={stat as unknown as ChoiceStat}
              />
            );
          case "yes_no":
            return (
              <YesNoStatCard
                key={stat.questionId}
                title={title}
                stat={stat as unknown as YesNoStat}
              />
            );
          case "rating":
            return (
              <RatingStatCard
                key={stat.questionId}
                title={title}
                stat={stat as unknown as RatingStat}
              />
            );
          case "number":
            return (
              <NumberStatCard
                key={stat.questionId}
                title={title}
                stat={stat as unknown as NumberStat}
              />
            );
          case "short_text":
          case "long_text":
          case "email":
          default:
            return (
              <TextStatCard
                key={stat.questionId}
                title={title}
                type={type}
                stat={stat as unknown as TextStat}
              />
            );
        }
      })}
    </div>
  );
}

interface ResponsesTabProps {
  form: FormMeta | null;
  responses: ResponseRow[];
  onRefresh: () => void;
}
function ResponsesTab({ form, responses, onRefresh }: ResponsesTabProps) {
  const router = useRouter();
  const qCount = form?.questions.length ?? 0;

  if (responses.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title="No responses yet"
        description="Publish your typeform and share the link to start collecting responses."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/60">
              <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wide text-[rgb(var(--text-secondary))] w-[100px]">
                #
              </th>
              <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wide text-[rgb(var(--text-secondary))]">
                Submitted
              </th>
              <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wide text-[rgb(var(--text-secondary))]">
                Completion
              </th>
              <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wide text-[rgb(var(--text-secondary))] text-right w-[120px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {responses.map((r, idx) => {
              const pct = qCount > 0
                ? Math.round(((r.answeredCount ?? r.answerCount) / qCount) * 100)
                : 0;
              return (
                <tr
                  key={r.id}
                  className="border-t border-gray-100 hover:bg-[rgb(var(--surface))]/50 transition-colors cursor-pointer"
                  onClick={() =>
                    router.push(`/results/${form?.id}/${r.id}`)
                  }
                >
                  <td className="px-6 py-4 text-sm font-medium text-[rgb(var(--text-secondary))] tabular-nums">
                    #{idx + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[rgb(var(--text-primary))]">
                      {formatDate(r.createdAt)}
                    </div>
                    <div className="text-xs text-[rgb(var(--text-secondary))]">
                      {formatTimeAgo(r.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 max-w-[240px]">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[rgb(var(--brand))] rounded-full transition-all"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums text-[rgb(var(--text-secondary))] w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/results/${form?.id}/${r.id}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[rgb(var(--brand))] hover:bg-[rgb(var(--brand))]/10 transition-colors"
                    >
                      View
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 bg-gray-50/40 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-[rgb(var(--text-secondary))] font-medium">
          {responses.length} response{responses.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--brand))] transition-colors inline-flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
}
function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] mb-2">{title}</h3>
      <p className="text-[rgb(var(--text-secondary))] max-w-md mx-auto">{description}</p>
    </div>
  );
}

function ChoiceStatCard({ title, stat }: { title: string; stat: ChoiceStat }) {
  const dist = stat.distribution ?? [];
  const total = dist.reduce((acc, d) => acc + d.count, 0);
  const max = Math.max(1, ...dist.map((d) => d.count));
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <StatHeader title={title} answered={stat.answeredCount} type={stat.type} />
      <div className="space-y-3 mt-4">
        {dist.length === 0 && <EmptyNote />}
        {dist.map((o) => (
          <div key={o.id ?? o.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-[rgb(var(--text-primary))] truncate pr-3">
                {o.label ?? o.id}
              </span>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-[rgb(var(--text-secondary))] tabular-nums">
                  {o.percentage?.toFixed?.(0) ?? 0}%
                </span>
                <span className="text-xs font-semibold text-[rgb(var(--text-primary))] tabular-nums w-8 text-right">
                  {o.count}
                </span>
              </div>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(o.count / max) * 100}%`,
                  background:
                    "linear-gradient(90deg, rgb(var(--brand)) 0%, rgb(var(--brand-light)) 100%)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-[rgb(var(--text-secondary))]">
          {total} answer{total === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

function YesNoStatCard({ title, stat }: { title: string; stat: YesNoStat }) {
  const yes = stat.true_count ?? 0;
  const no = stat.false_count ?? 0;
  const total = yes + no;
  const yesPct = total > 0 ? (yes / total) * 100 : 0;
  const noPct = total > 0 ? (no / total) * 100 : 0;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <StatHeader title={title} answered={stat.answeredCount} type="yes_no" />
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 bg-[rgb(var(--success))]/8 border border-[rgb(var(--success))]/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[rgb(var(--success))]">Yes</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--success))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-[rgb(var(--text-primary))] leading-none">
            {yes}
            <span className="ml-2 text-sm font-semibold text-[rgb(var(--text-secondary))]">
              {yesPct.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="rounded-2xl p-5 bg-[rgb(var(--error))]/8 border border-[rgb(var(--error))]/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[rgb(var(--error))]">No</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--error))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-[rgb(var(--text-primary))] leading-none">
            {no}
            <span className="ml-2 text-sm font-semibold text-[rgb(var(--text-secondary))]">
              {noPct.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RatingStatCard({ title, stat }: { title: string; stat: RatingStat }) {
  const dist = stat.distribution ?? {};
  const entries = Object.entries(dist).sort(([a], [b]) => Number(a) - Number(b));
  const max = Math.max(1, ...entries.map(([, v]) => Number(v) || 0));
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <StatHeader title={title} answered={stat.answeredCount} type="rating" />
      <div className="mt-5 flex items-center gap-6">
        <div className="flex-shrink-0">
          <div className="text-[48px] font-bold leading-none text-[rgb(var(--brand))]">
            {stat.average?.toFixed?.(1) ?? "—"}
          </div>
          <div className="mt-1 text-xs text-[rgb(var(--text-secondary))] font-medium">
            Average rating
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {entries.length === 0 && <EmptyNote />}
          {entries.map(([k, v]) => {
            const count = Number(v) || 0;
            const pct = (count / max) * 100;
            return (
              <div key={k} className="flex items-center gap-3">
                <span className="w-6 text-xs font-semibold text-[rgb(var(--text-secondary))] tabular-nums">
                  {k}
                </span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        "linear-gradient(90deg, rgb(var(--brand)) 0%, rgb(var(--brand-light)) 100%)",
                    }}
                  />
                </div>
                <span className="w-6 text-xs font-medium text-right tabular-nums text-[rgb(var(--text-primary))]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NumberStatCard({ title, stat }: { title: string; stat: NumberStat }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <StatHeader title={title} answered={stat.answeredCount} type="number" />
      <div className="mt-5 grid grid-cols-3 gap-4">
        <MiniStat label="Average" value={stat.average?.toFixed?.(1) ?? "—"} />
        <MiniStat label="Min" value={stat.min ?? "—"} />
        <MiniStat label="Max" value={stat.max ?? "—"} />
      </div>
    </div>
  );
}

function TextStatCard({
  title,
  type,
  stat,
}: {
  title: string;
  type: QuestionType;
  stat: TextStat;
}) {
  const samples = stat.samples ?? [];
  const count = stat.answeredCount ?? stat.response_count ?? 0;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <StatHeader title={title} answered={count} type={type} />
      {samples.length === 0 ? (
        <div className="mt-4">
          <EmptyNote />
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {samples.map((s, i) => (
            <li
              key={i}
              className="rounded-xl bg-[rgb(var(--surface))]/70 border border-gray-100 px-4 py-3 text-sm text-[rgb(var(--text-primary))] leading-relaxed"
            >
              {s || <span className="italic text-gray-400">(empty)</span>}
            </li>
          ))}
          {count > samples.length && (
            <li className="text-xs text-[rgb(var(--text-secondary))] px-1 pt-1">
              +{count - samples.length} more response{count - samples.length === 1 ? "" : "s"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="text-xs font-medium text-[rgb(var(--text-secondary))] mb-1">{label}</div>
      <div className="text-2xl font-bold text-[rgb(var(--text-primary))] leading-none">
        {value}
      </div>
    </div>
  );
}

function StatHeader({
  title,
  answered,
  type,
}: {
  title: string;
  answered: number;
  type: QuestionType;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--brand))] mb-1.5">
          {type.replace(/_/g, " ")}
        </div>
        <h3 className="text-[17px] font-semibold text-[rgb(var(--text-primary))] leading-snug">
          {title || "Untitled question"}
        </h3>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xl font-bold text-[rgb(var(--text-primary))] tabular-nums">
          {answered}
        </div>
        <div className="text-[11px] font-medium text-[rgb(var(--text-secondary))]">
          answers
        </div>
      </div>
    </div>
  );
}

function EmptyNote() {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-[rgb(var(--text-secondary))] italic">
      No data yet
    </div>
  );
}
