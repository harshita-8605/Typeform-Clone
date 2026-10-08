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

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-[rgb(var(--success))] text-white",
  error: "bg-[rgb(var(--error))] text-white",
  info: "bg-[rgb(var(--brand))] text-white",
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
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none"
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
        "pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-start gap-3 min-h-0",
        variantStyles[toast.variant],
        toast.removing ? "animate-toast-slide-out" : "animate-toast-slide-in"
      )}
      onClick={onDismiss}
    >
      <span className="flex-1 break-words">{toast.text}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
        aria-label="Dismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
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
