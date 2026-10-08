"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DropdownMenu, type DropdownMenuItem } from "@/components/ui/DropdownMenu";

export interface FormListItem {
  id: number;
  title: string;
  slug: string | null;
  status: "draft" | "published";
  updated_at: string;
  response_count: number;
}

interface FormsListProps {
  forms: FormListItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

function formatTimeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return isoString;
  const diffMs = Math.max(0, now - then);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins === 1 ? "1 minute ago" : `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? "about 1 hour ago" : `about ${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function FormsList({ forms, isLoading, onRefresh }: FormsListProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [renameFormId, setRenameFormId] = useState<number | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  const [deleteFormId, setDeleteFormId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const openRename = (form: FormListItem) => {
    setRenameFormId(form.id);
    setRenameInput(form.title);
    setRenameLoading(false);
  };

  const submitRename = async () => {
    if (renameFormId === null) return;
    const title = renameInput.trim();
    if (!title) {
      showToast("Title cannot be empty", "error");
      return;
    }
    setRenameLoading(true);
    try {
      await api.patch(`/api/forms/${renameFormId}`, { title });
      showToast("Form renamed", "success");
      setRenameFormId(null);
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to rename";
      showToast(msg, "error");
    } finally {
      setRenameLoading(false);
    }
  };

  const submitDelete = async () => {
    if (deleteFormId === null) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/forms/${deleteFormId}`);
      showToast("Form deleted", "success");
      setDeleteFormId(null);
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      showToast(msg, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const duplicateForm = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.post(`/api/forms/${id}/duplicate`);
      showToast("Form duplicated", "success");
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to duplicate";
      showToast(msg, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const publishForm = async (form: FormListItem) => {
    setActionLoadingId(form.id);
    try {
      const data = (await api.post(`/api/forms/${form.id}/publish`)) as {
        slug?: string | null;
      } | null;
      const slug = (data && data.slug) || form.slug;
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
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to publish";
      showToast(msg, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const unpublishForm = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.post(`/api/forms/${id}/unpublish`);
      showToast("Unpublished", "success");
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to unpublish";
      showToast(msg, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyShareLink = async (form: FormListItem) => {
    if (!form.slug) {
      showToast("Form is not published", "error");
      return;
    }
    if (typeof navigator === "undefined") return;
    try {
      const url = `${window.location.origin}/f/${form.slug}`;
      await navigator.clipboard.writeText(url);
      showToast("Link copied", "success");
    } catch {
      showToast("Could not copy link", "error");
    }
  };

  const buildMenuItems = (form: FormListItem): DropdownMenuItem[] => {
    const isPublished = form.status === "published";
    const items: DropdownMenuItem[] = [
      {
        key: "rename",
        label: "Rename",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
        ),
        onClick: () => openRename(form),
      },
      {
        key: "duplicate",
        label: "Duplicate",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
        ),
        onClick: () => duplicateForm(form.id),
        disabled: actionLoadingId === form.id,
      },
    ];
    if (isPublished) {
      items.push({
        key: "unpublish",
        label: "Unpublish",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
        ),
        onClick: () => unpublishForm(form.id),
        disabled: actionLoadingId === form.id,
      });
    } else {
      items.push({
        key: "publish",
        label: "Publish",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        ),
        onClick: () => publishForm(form),
        disabled: actionLoadingId === form.id,
      });
    }
    items.push({
      key: "copy-link",
      label: "Copy share link",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
      ),
      onClick: () => copyShareLink(form),
      disabled: !isPublished,
    });
    items.push({
      key: "results",
      label: "View results",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
      ),
      onClick: () => router.push(`/results/${form.id}`),
    });
    items.push({
      key: "delete",
      label: "Delete",
      danger: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
      ),
      onClick: () => {
        setDeleteFormId(form.id);
        setDeleteLoading(false);
      },
    });
    return items;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-2xl p-6 h-[180px] flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <div className="h-5 w-3/4 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
            <div className="flex-1" />
            <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[rgb(var(--surface))]">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--brand))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-semibold text-[rgb(var(--text-primary))]">
          No forms yet
        </h3>
        <p className="mb-6 max-w-sm text-sm text-[rgb(var(--text-secondary))]">
          Create your first typeform to start collecting responses.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form) => (
          <div
            key={form.id}
            className="group relative bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow duration-200 flex flex-col cursor-pointer min-h-[180px]"
            onClick={() => router.push(`/builder/${form.id}`)}
          >
            <div className="flex justify-between items-start gap-3 mb-3">
              <h3 className="text-[18px] font-semibold text-[rgb(var(--text-primary))] leading-snug line-clamp-2 flex-1">
                {form.title || "Untitled form"}
              </h3>
              <span
                className={cn(
                  "flex-shrink-0 inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold",
                  form.status === "published"
                    ? "bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {form.status === "published" ? "Published" : "Draft"}
              </span>
            </div>
            <p className="text-[13px] text-[rgb(var(--text-secondary))] mb-4">
              Updated {formatTimeAgo(form.updated_at)}
            </p>
            <div className="mt-auto flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="font-medium">
                  {form.response_count}{" "}
                  {form.response_count === 1 ? "response" : "responses"}
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu
                  items={buildMenuItems(form)}
                  align="right"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={renameFormId !== null}
        onClose={() => setRenameFormId(null)}
        title="Rename form"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setRenameFormId(null)}
              disabled={renameLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={submitRename}
              isLoading={renameLoading}
            >
              Rename
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
          Form title
        </label>
        <input
          type="text"
          value={renameInput}
          onChange={(e) => setRenameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitRename();
          }}
          placeholder="Untitled form"
          className="input-base"
          autoFocus
        />
      </Modal>

      <Modal
        open={deleteFormId !== null}
        onClose={() => setDeleteFormId(null)}
        title="Delete form"
        widthClass="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setDeleteFormId(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="md"
              onClick={submitDelete}
              isLoading={deleteLoading}
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--error))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-medium text-[rgb(var(--text-primary))] mb-1">
              Are you sure?
            </p>
            <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
              This will also delete all responses permanently. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
