"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/api";
import type { Form, Question, QuestionType, QuestionOption } from "@/lib/types";
import { useToast } from "@/hooks/useToast";
import { cn, toLocalForm, toLocalQuestion } from "@/lib/utils";
import { QuestionPreviewCard } from "@/components/QuestionPreviewCard";

interface BuilderPageProps {
  params: {
    formId: string;
  };
}

type SaveStatus = "idle" | "saving" | "saved";

const QUESTION_LIBRARY: Array<{
  group: string;
  items: Array<{ type: QuestionType; label: string; icon: string }>;
}> = [
  {
    group: "Text",
    items: [
      { type: "short_text", label: "Short Text", icon: "⌨" },
      { type: "long_text", label: "Long Text", icon: "☰" },
    ],
  },
  {
    group: "Choice",
    items: [
      { type: "multiple_choice", label: "Multiple choice", icon: "✔" },
      { type: "dropdown", label: "Dropdown", icon: "▾" },
    ],
  },
  {
    group: "Other",
    items: [
      { type: "email", label: "Email", icon: "@" },
      { type: "number", label: "Number", icon: "#" },
      { type: "yes_no", label: "Yes / No", icon: "✓✗" },
      { type: "rating", label: "Rating", icon: "★" },
    ],
  },
];

function generateTempId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createNewQuestion(type: QuestionType, orderIndex: number): Question {
  const base: Question = {
    id: generateTempId(),
    type,
    title: "",
    description: null,
    required: false,
    orderIndex,
    options: null,
  };

  switch (type) {
    case "multiple_choice":
    case "dropdown":
      base.options = {
        options: [
          { id: generateTempId(), label: "Option A" },
          { id: generateTempId(), label: "Option B" },
        ],
      };
      break;
    case "rating":
      base.options = { max: 5, min: 1 };
      break;
    case "number":
      base.options = { min: undefined, max: undefined };
      break;
    default:
      break;
  }

  return base;
}

function questionToBackend(q: Question, index: number) {
  let optionsJson: unknown = null;
  if (q.options) {
    if (q.options.options) {
      optionsJson = { options: q.options.options };
    } else if (q.type === "rating") {
      optionsJson = {
        max: q.options.max ?? 5,
        min: q.options.min ?? 1,
      };
    } else if (q.type === "number") {
      optionsJson = {
        min: q.options.min ?? null,
        max: q.options.max ?? null,
      };
    }
  }

  return {
    id: typeof q.id === "number" && q.id > 0 ? q.id : undefined,
    type: q.type,
    title: q.title,
    description: q.description ?? null,
    required: q.required,
    order_index: index,
    options_json: optionsJson,
  };
}

export default function BuilderPage({ params }: BuilderPageProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const formIdNum = Number(params.formId);

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedQuestionId, setFocusedQuestionId] = useState<number | string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewValue, setPreviewValue] = useState<unknown>(null);

  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTitleRef = useRef<string>("");
  const lastSavedStatusRef = useRef<Form["status"]>("draft");
  const lastSavedQuestionsRef = useRef<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const rawData = await api.get<any>(`/api/forms/${formIdNum}`);
        if (cancelled) return;
        const data = toLocalForm(rawData);
        setForm(data);
        lastSavedTitleRef.current = data.title;
        lastSavedStatusRef.current = data.status;
        lastSavedQuestionsRef.current = JSON.stringify(data.questions);
        if (data.questions.length > 0) {
          setFocusedQuestionId(data.questions[0].id);
        }
      } catch (e: any) {
        if (cancelled) return;
        if (String(e.message || "").includes("404") || (e as any).status === 404) {
          setNotFound(true);
        } else {
          showToast(e.message || "Failed to load form", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [formIdNum, showToast]);

  const orderedQuestions = useMemo(() => {
    if (!form) return [];
    return [...form.questions].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [form]);

  useEffect(() => {
    if (!form) return;
    const ids = orderedQuestions.map((q) => String(q.id));
    if (focusedQuestionId === null) return;
    if (!ids.includes(String(focusedQuestionId))) {
      setFocusedQuestionId(ids[0] ?? null);
      setPreviewIndex(0);
    } else {
      const idx = ids.indexOf(String(focusedQuestionId));
      if (idx >= 0) setPreviewIndex(idx);
    }
  }, [orderedQuestions, focusedQuestionId, form]);

  const patchTitleStatus = useCallback(
    async (title: string, status?: Form["status"]) => {
      setSaveStatus("saving");
      try {
        const payload: { title: string; status?: Form["status"] } = { title };
        if (status) payload.status = status;
        await api.patch(`/api/forms/${formIdNum}`, payload);
        lastSavedTitleRef.current = title;
        if (status) lastSavedStatusRef.current = status;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 1400);
      } catch (e: any) {
        showToast(e.message || "Failed to save", "error");
        setSaveStatus("idle");
      }
    },
    [formIdNum, showToast]
  );

  const putQuestions = useCallback(
    async (questions: Question[]) => {
      setSaveStatus("saving");
      try {
        const ordered = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);
        const payload = ordered.map((q, idx) => questionToBackend(q, idx));
        const updatedRaw = await api.put<any[]>(
          `/api/forms/${formIdNum}/questions`,
          payload
        );
        const updated = Array.isArray(updatedRaw) ? updatedRaw.map(toLocalQuestion) : [];
        setForm((prev) =>
          prev ? { ...prev, questions: updated.map((q, i) => ({ ...q, orderIndex: i })) } : prev
        );
        lastSavedQuestionsRef.current = JSON.stringify(updated);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 1400);
      } catch (e: any) {
        showToast(e.message || "Failed to save questions", "error");
        setSaveStatus("idle");
      }
    },
    [formIdNum, showToast]
  );

  const scheduleTitleSave = useCallback(
    (newTitle: string, newStatus?: Form["status"]) => {
      const needsSave =
        newTitle !== lastSavedTitleRef.current ||
        (newStatus && newStatus !== lastSavedStatusRef.current);
      if (!needsSave) return;
      setSaveStatus("saving");
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = setTimeout(() => {
        void patchTitleStatus(newTitle, newStatus);
      }, 1200);
    },
    [patchTitleStatus]
  );

  const scheduleQuestionsSave = useCallback(
    (nextQuestions: Question[]) => {
      const serial = JSON.stringify(nextQuestions);
      if (serial === lastSavedQuestionsRef.current) return;
      setSaveStatus("saving");
      if (questionsSaveTimer.current) clearTimeout(questionsSaveTimer.current);
      questionsSaveTimer.current = setTimeout(() => {
        void putQuestions(nextQuestions);
      }, 1200);
    },
    [putQuestions]
  );

  const updateFormTitle = (title: string) => {
    if (!form) return;
    setForm({ ...form, title });
    scheduleTitleSave(title);
  };

  const updateQuestions = (updater: (prev: Question[]) => Question[]) => {
    if (!form) return;
    const next = updater(form.questions);
    setForm({ ...form, questions: next });
    scheduleQuestionsSave(next);
  };

  const appendQuestion = (type: QuestionType) => {
    if (!form) return;
    const nextOrder = form.questions.length;
    const newQ = createNewQuestion(type, nextOrder);
    updateQuestions((prev) => [...prev, newQ]);
    setFocusedQuestionId(newQ.id || generateTempId());
  };

  const removeQuestion = (id: number | string) => {
    updateQuestions((prev) => {
      const filtered = prev.filter((q) => String(q.id) !== String(id));
      return filtered.map((q, i) => ({ ...q, orderIndex: i }));
    });
  };

  const updateQuestionField = <K extends keyof Question>(
    id: number | string,
    key: K,
    value: Question[K]
  ) => {
    updateQuestions((prev) =>
      prev.map((q) => (String(q.id) === String(id) ? { ...q, [key]: value } : q))
    );
  };

  const updateQuestionOption = (
    id: number | string,
    fn: (opts: NonNullable<Question["options"]>) => NonNullable<Question["options"]>
  ) => {
    updateQuestions((prev) =>
      prev.map((q) => {
        if (String(q.id) !== String(id)) return q;
        const current = q.options ?? {};
        return { ...q, options: fn(current as any) };
      })
    );
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    updateQuestions((prev) => {
      const ordered = [...prev].sort((a, b) => a.orderIndex - b.orderIndex);
      const oldIdx = ordered.findIndex((q) => String(q.id) === String(active.id));
      const newIdx = ordered.findIndex((q) => String(q.id) === String(over.id));
      if (oldIdx < 0 || newIdx < 0) return prev;
      const moved = arrayMove(ordered, oldIdx, newIdx);
      return moved.map((q, i) => ({ ...q, orderIndex: i }));
    });
  };

  const handlePublish = async () => {
    if (!form) return;
    try {
      if (titleSaveTimer.current) {
        clearTimeout(titleSaveTimer.current);
        await patchTitleStatus(form.title);
      }
      if (questionsSaveTimer.current) {
        clearTimeout(questionsSaveTimer.current);
        const qs = [...form.questions].sort((a, b) => a.orderIndex - b.orderIndex);
        await putQuestions(qs);
      }

      const result = await api.post<{ slug?: string | null }>(
        `/api/forms/${formIdNum}/publish`
      );
      const slug = result.slug ?? form.slug;
      if (slug) {
        const shareUrl = `${window.location.origin}/f/${slug}`;
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch {
          // ignore clipboard failure
        }
      }
      setForm((prev) => (prev ? { ...prev, status: "published", slug: slug ?? prev.slug } : prev));
      lastSavedStatusRef.current = "published";
      showToast("Published! Share link copied", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to publish", "error");
    }
  };

  const handleUnpublish = async () => {
    if (!form) return;
    try {
      await api.post(`/api/forms/${formIdNum}/unpublish`);
      setForm((prev) => (prev ? { ...prev, status: "draft" } : prev));
      lastSavedStatusRef.current = "draft";
      showToast("Unpublished", "info");
    } catch (e: any) {
      showToast(e.message || "Failed to unpublish", "error");
    }
  };

  const copyShareLink = async () => {
    if (!form || !form.slug) {
      showToast("Publish the form first to get a share link", "info");
      return;
    }
    const shareUrl = `${window.location.origin}/f/${form.slug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied", "success");
    } catch {
      showToast("Could not copy link", "error");
    }
  };

  const handleBuilderTabClick = (tab: string) => {
    if (tab === "Results") {
      router.push(`/results/${formIdNum}`);
      return;
    }
    if (tab === "Share") {
      void copyShareLink();
      return;
    }
    if (tab === "Workflow" || tab === "Connect") {
      showToast(`${tab} settings are coming soon`, "info");
    }
  };

  const previewQuestion = orderedQuestions[previewIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))]">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-medium">Loading form...</span>
        </div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[rgb(var(--text-primary))] mb-2">Form not found</h1>
          <p className="text-[rgb(var(--text-secondary))] mb-6">This form doesn't exist or you don't have access.</p>
          <button type="button" className="btn-primary" onClick={() => router.push("/workspace")}>
            ← Back to workspace
          </button>
        </div>
      </div>
    );
  }

  const isDraft = form.status === "draft";

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col text-[#252523]">
      <header className="sticky top-0 z-20 bg-white border-b border-[#e5e5e1] h-14 flex items-center px-4 gap-3">
        <button
          type="button"
          onClick={() => router.push("/workspace")}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#f2f2ef] text-[#6e6e69] transition-colors"
          aria-label="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <input
          type="text"
          value={form.title}
          onChange={(e) => updateFormTitle(e.target.value)}
          className="font-semibold text-[14px] bg-transparent border-none outline-none border-b border-transparent hover:border-gray-200 focus:border-[#242424] transition-colors px-1 py-0.5 min-w-[130px] max-w-[230px] rounded-none"
          placeholder="Untitled form"
        />

        <div className="flex-1 flex items-center justify-center gap-1">
          {["Content", "Workflow", "Connect", "Share", "Results"].map((tab, index) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleBuilderTabClick(tab)}
              className={cn(
                "h-8 px-3 text-[13px] font-medium rounded-md transition-colors",
                index === 0
                  ? "bg-[#eeeeeb] text-[#222]"
                  : "text-[#6c6c68] hover:bg-[#f5f5f3]"
              )}
            >
              {tab}
            </button>
          ))}
          <div className="hidden xl:flex items-center gap-1.5 text-[12px] ml-3 text-[#777]">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                saveStatus === "saving"
                  ? "bg-[rgb(var(--brand))] animate-pulse"
                  : saveStatus === "saved"
                  ? "bg-[rgb(var(--success))]"
                  : "bg-gray-300"
              )}
            />
            <span
              className={cn(
                "font-medium",
                saveStatus === "saving"
                  ? "text-[rgb(var(--brand))]"
                  : "text-gray-500"
              )}
            >
              {saveStatus === "saving" ? "Saving..." : "Saved"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyShareLink}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#f2f2ef] text-[#6e6e69] transition-colors"
            aria-label="Copy share link"
            title="Copy share link"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
              settingsOpen
                ? "bg-gray-100 text-[rgb(var(--text-primary))]"
                : "hover:bg-gray-100 text-[rgb(var(--text-secondary))]"
            )}
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={isDraft ? handlePublish : handleUnpublish}
            className={cn(
              "h-9 px-4 rounded-md font-semibold text-white transition-colors text-[13px] flex items-center gap-1.5",
              isDraft
                ? "bg-[#242424] hover:bg-black"
                : "bg-[#5d5d58] hover:bg-[#3d3d39]"
            )}
          >
            {isDraft ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Publish
              </>
            ) : (
              <>Unpublish</>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        <aside className="w-[252px] border-r border-[#e5e5e1] bg-white h-[calc(100vh-3.5rem)] overflow-auto p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-[12px] font-semibold text-[#343431]">Content</h3>
            <button type="button" className="h-7 px-2 rounded-md bg-[#242424] text-white text-[12px] font-semibold" onClick={() => appendQuestion('short_text')}>+ Add</button>
          </div>
          <h4 className="text-[11px] font-semibold uppercase tracking-[.06em] text-[#85857f] mb-2 px-1">
            Question types
          </h4>

          {QUESTION_LIBRARY.map((group) => (
            <div key={group.group} className="mb-5">
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => appendQuestion(item.type)}
                    className="group flex items-center gap-3 rounded-md px-3 py-2 text-left font-medium text-[13px] text-[#454541] hover:bg-[#f2f2ef] hover:text-[#191918] transition-colors"
                  >
                    <span className="w-5 h-5 flex items-center justify-center rounded text-[#777] group-hover:text-[#191918] transition-colors text-xs">
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-3 border-t border-[#ececea] space-y-0.5 mt-4">
            {["File upload", "Payment"].map((label) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-[13px] text-gray-400 grayscale cursor-not-allowed opacity-70"
                title="Coming soon"
              >
                <span className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 text-xs">
                  {label === "File upload" ? "📎" : "💳"}
                </span>
                {label} <span className="text-[10px] ml-auto uppercase font-semibold">(soon)</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-6 sm:p-10 bg-[#f5f5f3]">
          {orderedQuestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] mb-2">
                Start by adding your first question
              </h2>
              <p className="text-[rgb(var(--text-secondary))] max-w-md mb-8">
                Pick a question type from the left sidebar to begin building your form.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
                {QUESTION_LIBRARY.flatMap((g) => g.items).slice(0, 4).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => appendQuestion(item.type)}
                    className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed border-gray-200 bg-white hover:border-[rgb(var(--brand))] hover:bg-[rgb(var(--brand))]/5 transition-all"
                  >
                    <span className="text-2xl text-gray-400">{item.icon}</span>
                    <span className="text-sm font-medium text-[rgb(var(--text-primary))]">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={orderedQuestions.map((q) => String(q.id))}
                strategy={verticalListSortingStrategy}
              >
                {orderedQuestions.map((q, index) => (
                  <SortableQuestionCard
                    key={String(q.id)}
                    question={q}
                    index={index}
                    focused={String(focusedQuestionId) === String(q.id)}
                    onFocus={() => setFocusedQuestionId(q.id)}
                    onUpdateField={(k, v) => updateQuestionField(q.id, k, v as any)}
                    onUpdateOption={(fn) => updateQuestionOption(q.id, fn)}
                    onRemove={() => {
                      if (window.confirm("Delete this question?")) {
                        removeQuestion(q.id);
                      }
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </main>

        <aside className="w-[336px] border-l border-[#e5e5e1] bg-white h-[calc(100vh-3.5rem)] overflow-auto p-4 flex-shrink-0">
          <h3 className="text-[12px] font-semibold text-[#343431] mb-4 px-1">
            Preview
          </h3>

          <div className="mx-auto max-w-sm">
            <div className="rounded-lg border border-[#dededb] bg-[#fcfcfb] p-4 min-h-[560px] flex flex-col shadow-[0_1px_2px_rgba(0,0,0,.03)]">
              <div className="flex justify-center mb-3">
                <div className="h-1.5 w-16 bg-gray-200 rounded-full" />
              </div>
              <div className="flex-1 flex flex-col py-3">
                {previewQuestion ? (
                  <QuestionPreviewCard
                    key={`${previewQuestion.id}-${previewIndex}`}
                    question={previewQuestion}
                    variant="full"
                    value={previewValue}
                    onChange={(v) => setPreviewValue(v)}
                    showBack={previewIndex > 0}
                    onBack={() => {
                      if (previewIndex > 0) {
                        setPreviewIndex((i) => i - 1);
                        setPreviewValue(null);
                      }
                    }}
                    onNext={() => {
                      if (previewIndex < orderedQuestions.length - 1) {
                        setPreviewIndex((i) => i + 1);
                        setPreviewValue(null);
                      }
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-sm text-[rgb(var(--text-secondary))] px-4">
                    Add questions to see how they'll look to respondents.
                  </div>
                )}
              </div>
            </div>
            {orderedQuestions.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                <span>Question {previewIndex + 1} of {orderedQuestions.length}</span>
              </div>
            )}
          </div>
        </aside>

        {settingsOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-30 animate-fade-in"
              onClick={() => setSettingsOpen(false)}
            />
            <div className="fixed right-0 top-16 bottom-0 w-80 bg-white shadow-2xl z-40 p-6 overflow-auto animate-[toast-slide-in_0.25s_ease-out]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Settings</h3>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[rgb(var(--text-secondary))]"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: "🎨",
                    title: "Theme",
                  },
                  {
                    icon: "🔀",
                    title: "Logic & branching",
                  },
                  {
                    icon: "💌",
                    title: "Thank-you screen",
                  },
                ].map((section) => (
                  <div
                    key={section.title}
                    className="rounded-2xl p-5 text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, rgb(var(--brand)) 0%, rgb(var(--brand-light)) 100%)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{section.icon}</span>
                      <h4 className="font-semibold">{section.title}</h4>
                    </div>
                    <div className="rounded-xl bg-white/15 backdrop-blur-sm px-4 py-3 text-sm font-medium">
                      Coming soon
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface SortableQuestionCardProps {
  question: Question;
  index: number;
  focused: boolean;
  onFocus: () => void;
  onUpdateField: <K extends keyof Question>(key: K, value: Question[K]) => void;
  onUpdateOption: (
    fn: (opts: NonNullable<Question["options"]>) => NonNullable<Question["options"]>
  ) => void;
  onRemove: () => void;
}

function SortableQuestionCard({
  question,
  index,
  focused,
  onFocus,
  onUpdateField,
  onUpdateOption,
  onRemove,
}: SortableQuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(question.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const [editingDescription, setEditingDescription] = useState(
    !!question.description
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onFocus}
      className={cn(
        "relative bg-white rounded-2xl border p-6 mb-4 shadow-sm hover:shadow-md transition-all",
        focused ? "border-[rgb(var(--brand))]/40 ring-1 ring-[rgb(var(--brand))]/20" : "border-gray-100"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="absolute left-2 top-5 w-6 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-4 top-4 w-8 h-8 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"
        aria-label="Delete question"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>

      <div className="pl-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block rounded-full bg-[rgb(var(--brand))]/10 text-[rgb(var(--brand))] px-2.5 py-0.5 text-[12px] font-semibold">
            {index + 1}
          </span>
          <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
            {question.type.replace(/_/g, " ")}
          </span>
        </div>

        <div className="flex items-start gap-1">
          <input
            type="text"
            value={question.title}
            placeholder="What's your question?"
            onChange={(e) => onUpdateField("title", e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-[rgb(var(--brand))] outline-none text-[20px] font-semibold w-full mb-2 py-1 px-0 placeholder:text-gray-300"
          />
          {question.required && (
            <span className="text-[rgb(var(--error))] text-xl font-semibold pt-1">*</span>
          )}
        </div>

        {!editingDescription ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingDescription(true);
            }}
            className="text-sm text-gray-500 hover:text-[rgb(var(--brand))] mb-3 inline-flex items-center gap-1"
          >
            + Add description
          </button>
        ) : (
          <textarea
            value={question.description ?? ""}
            onChange={(e) => onUpdateField("description", e.target.value)}
            onClick={(e) => e.stopPropagation()}
            rows={2}
            placeholder="Add a description (optional)"
            className="w-full text-sm italic text-gray-600 bg-transparent border border-gray-200 rounded-lg p-2 mb-3 outline-none focus:border-[rgb(var(--brand))] resize-none"
          />
        )}

        <QuestionOptionsEditor
          question={question}
          onUpdateOption={onUpdateOption}
          onClick={(e) => e.stopPropagation()}
        />

        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ToggleSwitch
              checked={question.required}
              onChange={(v) => onUpdateField("required", v)}
            />
            <span className="text-sm text-[rgb(var(--text-primary))] font-medium">
              Required
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-6 rounded-full transition-colors flex-shrink-0",
        checked ? "bg-[rgb(var(--brand))]" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

interface QuestionOptionsEditorProps {
  question: Question;
  onUpdateOption: (
    fn: (opts: NonNullable<Question["options"]>) => NonNullable<Question["options"]>
  ) => void;
  onClick?: (e: React.MouseEvent) => void;
}

function QuestionOptionsEditor({
  question,
  onUpdateOption,
  onClick,
}: QuestionOptionsEditorProps) {
  const { type } = question;

  if (type === "multiple_choice" || type === "dropdown") {
    const options = question.options?.options ?? [];
    return (
      <div className="mt-3 space-y-2" onClick={onClick}>
        {options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
            </span>
            <input
              type="text"
              value={opt.label}
              onChange={(e) => {
                const newLabel = e.target.value;
                onUpdateOption((prev) => {
                  const existing = (prev.options ?? []) as QuestionOption[];
                  return {
                    options: existing.map((o, idx) =>
                      idx === i ? { ...o, label: newLabel } : o
                    ),
                  };
                });
              }}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className="flex-1 bg-transparent border-b border-gray-200 hover:border-gray-300 focus:border-[rgb(var(--brand))] outline-none text-sm py-1.5 px-0"
            />
            {options.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  onUpdateOption((prev) => {
                    const existing = (prev.options ?? []) as QuestionOption[];
                    return {
                      options: existing.filter((_, idx) => idx !== i),
                    };
                  });
                }}
                className="w-7 h-7 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 flex items-center justify-center flex-shrink-0"
                aria-label="Delete option"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            onUpdateOption((prev) => {
              const existing = [...((prev.options ?? []) as QuestionOption[])];
              existing.push({
                id: generateTempId(),
                label: `Option ${String.fromCharCode(65 + existing.length)}`,
              });
              return { options: existing };
            });
          }}
          className="text-sm text-[rgb(var(--brand))] hover:underline font-medium pl-7 inline-flex items-center gap-1"
        >
          + Add option
        </button>
      </div>
    );
  }

  if (type === "rating") {
    const max = question.options?.max ?? 5;
    return (
      <div className="mt-3 flex items-center gap-2 text-sm" onClick={onClick}>
        <span className="text-[rgb(var(--text-secondary))] font-medium">★ Max rating:</span>
        <input
          type="number"
          min={3}
          max={10}
          value={max}
          onChange={(e) => {
            const v = Math.min(10, Math.max(3, Number(e.target.value) || 3));
            onUpdateOption(() => ({ max: v, min: 1 }));
          }}
          className="w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[rgb(var(--brand))]"
        />
        <div className="flex items-center gap-1 ml-2 text-gray-400">
          {Array.from({ length: Math.min(7, max) }, (_, i) => i + 1).map((n) => (
            <span key={n} className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-xs">
              {n}
            </span>
          ))}
          {max > 7 && <span className="text-xs">+{max - 7} more</span>}
        </div>
      </div>
    );
  }

  if (type === "number") {
    const min = question.options?.min;
    const max = question.options?.max;
    return (
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="text-[rgb(var(--text-secondary))] font-medium">Min:</span>
          <input
            type="number"
            value={min ?? ""}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value === "" ? undefined : Number(e.target.value);
              onUpdateOption((prev) => ({ ...prev, min: v }));
            }}
            className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[rgb(var(--brand))]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[rgb(var(--text-secondary))] font-medium">Max:</span>
          <input
            type="number"
            value={max ?? ""}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value === "" ? undefined : Number(e.target.value);
              onUpdateOption((prev) => ({ ...prev, max: v }));
            }}
            className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[rgb(var(--brand))]"
          />
        </div>
      </div>
    );
  }

  return null;
}
