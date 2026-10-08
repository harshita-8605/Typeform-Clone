"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  text: string;
  variant: ToastVariant;
  createdAt: number;
  removing?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (text: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function generateToastId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const variantBarClass: Record<ToastVariant, string> = {
  success: "tf-toast-success",
  error: "tf-toast-error",
  info: "",
};

const variantIcon: Record<ToastVariant, React.ReactNode> = {
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] text-[rgb(var(--tf-purple))] flex-shrink-0">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] text-[rgb(var(--tf-success))] flex-shrink-0">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] text-[rgb(var(--tf-error))] flex-shrink-0">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, removing: true } : t))
    );
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback(
    (text: string, variant: ToastVariant = "info") => {
      const id = generateToastId();
      const toast: Toast = {
        id,
        text,
        variant,
        createdAt: Date.now(),
      };
      setToasts((current) => [...current, toast]);

      window.setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, showToast, removeToast }),
    [toasts, showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function Toaster() {
  const context = useContext(ToastContext);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !context) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-[80] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
    >
      {context.toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => context.removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto tf-toast",
        variantBarClass[toast.variant],
        toast.removing ? "animate-toast-slide-out" : "animate-toast-slide-in"
      )}
      onClick={onDismiss}
    >
      {variantIcon[toast.variant]}
      <span className="flex-1 break-words text-[13px] font-medium leading-snug pt-[2px]">
        {toast.text}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 ml-2 text-[rgb(var(--tf-muted))]"
        aria-label="Dismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
