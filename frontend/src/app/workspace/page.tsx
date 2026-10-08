"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  FormsList,
  type FormListItem,
} from "@/components/workspace/FormsList";

export default function WorkspacePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [forms, setForms] = useState<FormListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const createInputRef = React.useRef<HTMLInputElement>(null);

  const fetchForms = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = (await api.get<unknown>("/api/forms")) as FormListItem[];
      setForms(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load forms";
      showToast(msg, "error");
      setForms([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const openCreate = () => {
    setCreateTitle("");
    setCreateLoading(false);
    setCreateOpen(true);
  };

  useEffect(() => {
    if (createOpen && createInputRef.current) {
      window.setTimeout(() => {
        createInputRef.current?.focus();
        createInputRef.current?.select();
      }, 50);
    }
  }, [createOpen]);

  const submitCreate = async () => {
    const title = createTitle.trim() || "Untitled form";
    setCreateLoading(true);
    try {
      const newForm = (await api.post<unknown>("/api/forms", { title })) as {
        id: number;
      } | null;
      if (!newForm || typeof newForm.id !== "number") {
        throw new Error("Failed to create form");
      }
      showToast("Form created", "success");
      setCreateOpen(false);
      router.push(`/builder/${newForm.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create form";
      showToast(msg, "error");
      setCreateLoading(false);
    }
  };

  const onCreateFormKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submitCreate();
    }
  };

  const handleEmptyCreate = () => {
    openCreate();
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))]">
      <header
        className="sticky top-0 z-30 h-16 bg-[rgb(var(--background))]/80 backdrop-blur border-b border-gray-100"
      >
        <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="rgb(var(--brand))"
            >
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.5 17.25h-9v-1.5h9v1.5zm1.5-3h-12v-1.5h12v1.5zm0-3H7.5v-1.5h10.5v1.5zm0-3h-9v-1.5h9v1.5z" />
            </svg>
            <span
              className="text-[22px] font-bold tracking-tight"
              style={{ color: "rgb(var(--brand))" }}
            >
              Typeform
            </span>
          </div>
          <div className="flex items-center">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold text-sm"
              style={{ backgroundColor: "rgb(var(--brand))" }}
            >
              H
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-[28px] font-bold text-[rgb(var(--text-primary))] leading-tight mb-2">
              My Workspace
            </h1>
            <p className="text-[15px] text-[rgb(var(--text-secondary))] max-w-xl">
              Manage your typeforms and see how they&apos;re performing
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button size="md" onClick={openCreate}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create form
            </Button>
          </div>
        </div>

        <div className="relative">
          <FormsList
            forms={forms}
            isLoading={isLoading}
            onRefresh={fetchForms}
          />

          {!isLoading && forms.length === 0 && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none -translate-y-4">
              <div className="pointer-events-auto">
                <Button size="md" onClick={handleEmptyCreate}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create your first typeform
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Modal
        open={createOpen}
        onClose={() => !createLoading && setCreateOpen(false)}
        title="Create a new form"
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setCreateOpen(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={submitCreate}
              isLoading={createLoading}
            >
              Create form
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
          Form title
        </label>
        <input
          ref={createInputRef}
          type="text"
          value={createTitle}
          onChange={(e) => setCreateTitle(e.target.value)}
          onKeyDown={onCreateFormKeyDown}
          placeholder="Untitled form"
          className="input-base"
        />
        <p className="mt-3 text-xs text-[rgb(var(--text-secondary))]">
          You can change this later at any time.
        </p>
      </Modal>
    </div>
  );
}
