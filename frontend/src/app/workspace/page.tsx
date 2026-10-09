"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  FormsList,
  type FormListItem,
} from "@/components/workspace/FormsList";

export default function WorkspacePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [forms, setForms] = useState<FormListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"updated" | "title" | "responses">("updated");
  const [creatorName, setCreatorName] = useState("Creator");
  const [creatorInitials, setCreatorInitials] = useState("CR");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const createInputRef = React.useRef<HTMLInputElement>(null);
  const [workspaceNames, setWorkspaceNames] = useState<string[]>(["My workspace"]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("My workspace");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [renameWorkspaceOpen, setRenameWorkspaceOpen] = useState(false);
  const [workspaceToRename, setWorkspaceToRename] = useState("");
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false);
  const [deleteWorkspaceLoading, setDeleteWorkspaceLoading] = useState(false);
  const [workspaceFormAssignments, setWorkspaceFormAssignments] = useState<Record<string, number[]>>({});
  const workspaceInputRef = React.useRef<HTMLInputElement>(null);
  const isDefaultWorkspace = selectedWorkspace === workspaceNames[0];

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
  }, [creatorEmail, showToast]);

  useEffect(() => {
    void getSession().then((session) => {
      const name = session?.user?.name?.trim() || session?.user?.email || "Creator";
      const initials = name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      setCreatorName(name);
      setCreatorInitials(initials || "CR");
      setCreatorEmail(session?.user?.email || "");
    });
  }, []);

  useEffect(() => {
    if (creatorEmail) void fetchForms();
  }, [creatorEmail, fetchForms]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("typeform-workspaces");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((name) => typeof name === "string")) {
          const uniqueNames = Array.from(new Set(parsed.map((name) => name.trim()).filter(Boolean)));
          const savedAssignments = window.localStorage.getItem("typeform-workspace-form-assignments");
          const assignments = savedAssignments ? JSON.parse(savedAssignments) : {};
          const hasAssignments = assignments && Object.keys(assignments).length > 0;
          const names =
            uniqueNames.length > 1 &&
            uniqueNames[0] === "My workspace" &&
            !hasAssignments
              ? uniqueNames.slice(1)
              : uniqueNames;
          setWorkspaceNames(names.length > 0 ? names : ["My workspace"]);
          setSelectedWorkspace(names.length > 0 ? names[0] : "My workspace");
        }
      }
      const savedAssignments = window.localStorage.getItem("typeform-workspace-form-assignments");
      if (savedAssignments) {
        const parsedAssignments = JSON.parse(savedAssignments);
        if (parsedAssignments && typeof parsedAssignments === "object") {
          setWorkspaceFormAssignments(parsedAssignments);
        }
      }
    } catch {
      // Workspace names are a UI preference; fall back to the default workspace.
    }
  }, []);

  const visibleForms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return forms
      .filter((form) => !query || form.title.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "responses") return b.response_count - a.response_count;
        const parseTimestamp = (value: string) =>
          new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`).getTime();
        return parseTimestamp(b.updated_at) - parseTimestamp(a.updated_at);
      });
  }, [forms, search, sort]);

  const openCreate = () => {
    setCreateTitle("");
    setCreateLoading(false);
    setCreateOpen(true);
  };

  const openWorkspaceCreate = () => {
    setWorkspaceName("");
    setWorkspaceLoading(false);
    setWorkspaceOpen(true);
  };

  const openWorkspaceRename = (name: string) => {
    setWorkspaceToRename(name);
    setWorkspaceName(name);
    setWorkspaceLoading(false);
    setRenameWorkspaceOpen(true);
  };

  useEffect(() => {
    if ((workspaceOpen || renameWorkspaceOpen) && workspaceInputRef.current) {
      window.setTimeout(() => workspaceInputRef.current?.focus(), 50);
    }
  }, [renameWorkspaceOpen, workspaceOpen]);

  const submitWorkspaceCreate = () => {
    const name = workspaceName.trim();
    if (!name) return;
    if (workspaceNames.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
      showToast("A workspace with that name already exists", "error");
      return;
    }
    setWorkspaceLoading(true);
    const next = [...workspaceNames, name];
    setWorkspaceNames(next);
    setSelectedWorkspace(name);
    window.localStorage.setItem("typeform-workspaces", JSON.stringify(next));
    setWorkspaceLoading(false);
    setWorkspaceOpen(false);
    showToast("Workspace created", "success");
  };

  const submitWorkspaceRename = () => {
    const name = workspaceName.trim();
    if (!name) return;
    if (
      workspaceNames.some(
        (existing) =>
          existing !== workspaceToRename &&
          existing.toLowerCase() === name.toLowerCase()
      )
    ) {
      showToast("A workspace with that name already exists", "error");
      return;
    }

    setWorkspaceLoading(true);
    const next = workspaceNames.map((workspace) =>
      workspace === workspaceToRename ? name : workspace
    );
    const nextAssignments = { ...workspaceFormAssignments };
    if (nextAssignments[workspaceToRename]) {
      nextAssignments[name] = nextAssignments[workspaceToRename];
      delete nextAssignments[workspaceToRename];
      setWorkspaceFormAssignments(nextAssignments);
      window.localStorage.setItem(
        "typeform-workspace-form-assignments",
        JSON.stringify(nextAssignments)
      );
    }
    setWorkspaceNames(next);
    if (selectedWorkspace === workspaceToRename) {
      setSelectedWorkspace(name);
    }
    window.localStorage.setItem("typeform-workspaces", JSON.stringify(next));
    setWorkspaceLoading(false);
    setRenameWorkspaceOpen(false);
    showToast("Workspace renamed", "success");
  };

  const openWorkspaceDelete = (name: string) => {
    setWorkspaceToRename(name);
    setDeleteWorkspaceLoading(false);
    setDeleteWorkspaceOpen(true);
  };

  const workspaceFormIds = (name: string) => {
    if (name === workspaceNames[0]) {
      const assignedIds = new Set(Object.values(workspaceFormAssignments).flat());
      return forms
        .filter((form) => !assignedIds.has(form.id))
        .map((form) => form.id)
        .concat(workspaceFormAssignments[name] || []);
    }
    return workspaceFormAssignments[name] || [];
  };

  const currentWorkspaceForms = visibleForms.filter((form) =>
    workspaceFormIds(selectedWorkspace).includes(form.id)
  );

  const submitWorkspaceDelete = async () => {
    const name = workspaceToRename;
    if (workspaceNames.length <= 1) {
      showToast("You must keep at least one workspace", "error");
      return;
    }
    const ids = workspaceFormIds(name);
    setDeleteWorkspaceLoading(true);
    try {
      await Promise.all(ids.map((id) => api.delete(`/api/forms/${id}`)));
      const nextNames = workspaceNames.filter((workspace) => workspace !== name);
      const nextAssignments = { ...workspaceFormAssignments };
      delete nextAssignments[name];
      const fallbackWorkspace = nextNames[0];
      setWorkspaceNames(nextNames);
      setWorkspaceFormAssignments(nextAssignments);
      setSelectedWorkspace((selected) => selected === name ? fallbackWorkspace : selected);
      window.localStorage.setItem("typeform-workspaces", JSON.stringify(nextNames));
      window.localStorage.setItem(
        "typeform-workspace-form-assignments",
        JSON.stringify(nextAssignments)
      );
      setDeleteWorkspaceOpen(false);
      await fetchForms();
      showToast("Workspace and its forms deleted", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete workspace";
      showToast(msg, "error");
    } finally {
      setDeleteWorkspaceLoading(false);
    }
  };

  const onWorkspaceKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    submit: () => void
  ) => {
    if (event.key === "Enter") submit();
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
      const nextAssignments = {
        ...workspaceFormAssignments,
        [selectedWorkspace]: [
          ...(workspaceFormAssignments[selectedWorkspace] || []),
          newForm.id,
        ],
      };
      setWorkspaceFormAssignments(nextAssignments);
      window.localStorage.setItem(
        "typeform-workspace-form-assignments",
        JSON.stringify(nextAssignments)
      );
      showToast("Form created", "success");
      setCreateOpen(false);
      router.push(`/builder/${newForm.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create form";
      showToast(msg, "error");
      setCreateLoading(false);
    }
  };

  const openComingSoon = (feature: string) => {
    router.push(`/coming-soon/${encodeURIComponent(feature)}`);
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
    <div className="min-h-screen bg-[#f8f8f8] text-[#463d49] flex flex-col">
      <header className="relative z-20 h-[74px] shrink-0 bg-white border-b border-[#eeeeef] flex items-center justify-between px-7">
        <div className="flex items-center gap-3"><span className="h-10 w-2 rounded-full bg-[#29212b]" /><span className="h-10 w-10 rounded-[10px] bg-[#a669cb] text-white flex items-center justify-center text-[16px]">{creatorInitials}</span><span className="max-w-[190px] truncate font-medium text-[17px]">{creatorName}</span></div>
        <div className="flex items-center gap-5 text-[16px] text-[#6b636c]">
          <button type="button" onClick={() => openComingSoon("Integrations")}>⌘ Integrations</button>
          <button type="button" onClick={() => openComingSoon("Brand kit")}>♜ Brand kit</button>
          <button type="button" onClick={() => openComingSoon("Plans")} className="rounded-xl bg-[#16806e] px-5 py-3 text-white font-medium">View plans</button>
          <button type="button" onClick={() => openComingSoon("Help")} aria-label="Help">?</button>
          <button type="button" onClick={() => setProfileOpen((open) => !open)} aria-label="Open account menu" className="h-10 w-10 rounded-full bg-[#e8cfff] flex items-center justify-center text-[#593466]">{creatorInitials}</button>
          {profileOpen && (
            <div className="absolute right-5 top-[66px] w-[280px] rounded-b-2xl border border-[#e7e3e8] bg-white px-5 py-5 shadow-xl text-[#665d69]">
              <div className="border-b border-[#eee9ed] pb-4">
                <p className="text-[13px] uppercase tracking-[.12em] text-[#403343]">Account</p>
                <button type="button" onClick={() => openComingSoon("Account settings")} className="mt-3 text-left text-[16px] hover:text-[#332735]">Account settings</button>
              </div>
              <div className="border-b border-[#eee9ed] py-4">
                <p className="text-[13px] uppercase tracking-[.12em] text-[#403343]">Resources</p>
                {["Support", "Help center", "Community", "Apps & integrations", "What's New"].map((item) => (
                  <button key={item} type="button" onClick={() => openComingSoon(item)} className="mt-3 block text-left text-[16px] hover:text-[#332735]">{item}</button>
                ))}
              </div>
              <button type="button" onClick={() => openComingSoon("Refer friends, get rewards")} className="border-b border-[#eee9ed] py-4 text-left text-[16px] w-full">Refer friends, get rewards</button>
              <button type="button" onClick={() => router.push("/")} className="block border-b border-[#eee9ed] py-4 text-left text-[16px] w-full">Homepage</button>
              <div className="pt-4 text-[#a4482c]"><SignOutButton /></div>
            </div>
          )}
        </div>
      </header>
      <nav className="h-[78px] mx-5 mt-0 rounded-t-[18px] bg-[#f1f1f3] border-b border-[#e8e7ea] flex items-center gap-9 px-8 text-[16px] font-medium text-[#6a626b]">
        <button type="button" onClick={() => router.push("/workspace")} className="h-full flex items-center border-b-[3px] border-[#4b3b50] text-[#45394a]">▣ &nbsp; Forms</button>
        {[
          ["Contacts", "♧"],
          ["Automations", "♧"],
          ["Insights", "⌁"],
          ["Pages", "▧"],
          ["Research Flow", "◉"],
        ].map(([feature, icon], index) => (
          <button key={feature} type="button" onClick={() => openComingSoon(feature)} className={index === 4 ? "border-l border-[#d9d7da] pl-8" : ""}>
            {icon} &nbsp; {feature}
            {feature === "Insights" && <i className="ml-1 rounded-full border border-[#82ccc2] bg-white px-1.5 py-0.5 not-italic text-[12px] text-[#287a73]">◇</i>}
            {feature === "Pages" && <i className="ml-1 rounded-lg border border-[#9dcce9] bg-[#edf8ff] px-2 py-0.5 not-italic text-[12px] text-[#397498]">Beta</i>}
          </button>
        ))}
      </nav>
      <div className="flex flex-1 min-h-0">
      <aside className="hidden lg:flex w-[362px] min-h-full shrink-0 border-r border-[#e8e8e6] bg-[#fbfbfc] px-5 py-6 flex-col">
        <button type="button" onClick={openCreate} className="h-11 w-full rounded-xl bg-[#403343] px-3 text-center text-[16px] font-semibold text-white hover:bg-[#332735] transition-colors flex items-center justify-center gap-2">
          <span className="text-[24px] leading-none font-normal">+</span> Create form
        </button>
        <nav className="mt-7 space-y-1 text-[14px]">
          <p className="px-3 pb-2 text-[11px] tracking-[.08em] font-semibold text-[#777]">WORKSPACES</p>
          {workspaceNames.map((workspace) => (
            <div
              key={workspace}
              className={`group w-full flex items-center justify-between gap-2 rounded-md ${
                selectedWorkspace === workspace ? "bg-[#efefed] text-[#403343]" : "text-[#5f5f5c] hover:bg-[#f4f4f2]"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedWorkspace(workspace)}
                className="min-w-0 flex-1 flex items-center gap-2 px-3 py-2 text-left font-medium"
              >
                <span className="h-5 w-5 rounded-full bg-[#dcdad6] flex items-center justify-center text-[11px]">⌂</span>
                <span className="truncate">{workspace}</span>
              </button>
              <div className="flex items-center gap-1 pr-2">
                <span className="text-xs text-[#777]">
                  {workspace === workspaceNames[0] ? forms.length : 0}
                </span>
                <button
                  type="button"
                  onClick={() => openWorkspaceRename(workspace)}
                  aria-label={`Rename ${workspace}`}
                  title={`Rename ${workspace}`}
                  className="rounded p-1 text-[#777] opacity-0 transition-opacity hover:bg-white hover:text-[#403343] group-hover:opacity-100 focus:opacity-100"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => openWorkspaceDelete(workspace)}
                  aria-label={`Delete ${workspace}`}
                  title={`Delete ${workspace}`}
                  className="rounded p-1 text-[#a4482c] opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 focus:opacity-100"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="m19 6-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={openWorkspaceCreate} className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-[#5f5f5c] hover:bg-[#f4f4f2]">
            <span className="text-[17px]">+</span> Create workspace
          </button>
        </nav>
        <nav className="mt-8 space-y-1 text-[14px] text-[#5f5f5c]">
          <button type="button" onClick={() => openComingSoon("Apps & integrations")} className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-[#f4f4f2]"><span>◫</span> Apps & integrations</button>
          <button type="button" onClick={() => openComingSoon("Brand kit")} className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-[#f4f4f2]"><span>◇</span> Brand kit</button>
        </nav>
        <div className="mt-auto border-t border-[#ececea] pt-4">
          <button type="button" className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] hover:bg-[#f4f4f2]">
            <span className="h-7 w-7 rounded-full bg-[#e7d4c6] flex items-center justify-center text-[12px] font-semibold">{creatorInitials}</span> {creatorName}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <section className="max-w-[1240px] mx-auto px-5 sm:px-8 py-9 sm:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-9">
            <div>
              <p className="text-[13px] text-[#777] mb-2">Workspace</p>
              <h1 className="text-[30px] font-semibold tracking-[-.045em] text-[#20201f] leading-tight">{selectedWorkspace}</h1>
            </div>
            <Button size="md" onClick={openCreate} className="!rounded-lg !bg-[#242424] hover:!bg-black !h-10 !px-4">
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
              Create a new form
            </Button>
          </div>

          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-[360px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858582]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input
                aria-label="Search forms"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search forms"
                className="h-10 w-full rounded-md border border-[#dededb] bg-white pl-9 pr-3 text-[14px] outline-none focus:border-[#242424]"
              />
            </div>
            <label className="text-[13px] text-[#696966]">
              Sort by{" "}
              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as "updated" | "title" | "responses")
                }
                className="ml-1 bg-transparent font-medium text-[#242424] outline-none"
              >
                <option value="updated">Last updated</option>
                <option value="title">Name</option>
                <option value="responses">Responses</option>
              </select>
            </label>
          </div>

        <div className="relative rounded-lg border border-[#e5e5e2] bg-white">
          <FormsList
            forms={currentWorkspaceForms}
            isLoading={isLoading}
            onRefresh={fetchForms}
          />

          {!isLoading && currentWorkspaceForms.length === 0 && (
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
        </section>
      </main>
      </div>

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

      <Modal
        open={workspaceOpen}
        onClose={() => !workspaceLoading && setWorkspaceOpen(false)}
        title="Add workspace"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setWorkspaceOpen(false)} disabled={workspaceLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={submitWorkspaceCreate} isLoading={workspaceLoading} disabled={!workspaceName.trim()}>
              Add workspace
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
          Workspace name
        </label>
        <input
          ref={workspaceInputRef}
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          onKeyDown={(e) => onWorkspaceKeyDown(e, submitWorkspaceCreate)}
          placeholder="New workspace"
          className="input-base"
        />
      </Modal>

      <Modal
        open={renameWorkspaceOpen}
        onClose={() => !workspaceLoading && setRenameWorkspaceOpen(false)}
        title="Rename workspace"
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setRenameWorkspaceOpen(false)}
              disabled={workspaceLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={submitWorkspaceRename}
              isLoading={workspaceLoading}
              disabled={!workspaceName.trim()}
            >
              Rename workspace
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
          Workspace name
        </label>
        <input
          ref={workspaceInputRef}
          type="text"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          onKeyDown={(e) => onWorkspaceKeyDown(e, submitWorkspaceRename)}
          placeholder="Workspace name"
          className="input-base"
        />
      </Modal>

      <Modal
        open={deleteWorkspaceOpen}
        onClose={() => !deleteWorkspaceLoading && setDeleteWorkspaceOpen(false)}
        title="Delete workspace?"
        footer={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => setDeleteWorkspaceOpen(false)}
              disabled={deleteWorkspaceLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="md"
              onClick={submitWorkspaceDelete}
              isLoading={deleteWorkspaceLoading}
            >
              Delete workspace
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-[rgb(var(--text-secondary))]">
          Are you sure you want to delete <strong>{workspaceToRename}</strong>?
          This will permanently delete all forms included in this workspace,
          along with their responses. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
