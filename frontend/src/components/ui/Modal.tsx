"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
  showClose?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  widthClass = "max-w-lg",
  showClose = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="tf-modal-backdrop"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "tf-modal-panel flex flex-col max-h-[90vh] animate-lift-in",
          widthClass
        )}
      >
        {(showClose || title !== undefined) && (
          <div className="relative px-6 pt-6 pb-2 flex items-start justify-between">
            {title !== undefined && (
              <h2 className="text-[20px] font-semibold text-[rgb(var(--tf-text))] pr-8">
                {title}
              </h2>
            )}
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="tf-btn-icon absolute top-4 right-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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
            )}
          </div>
        )}
        {children !== undefined && (
          <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        )}
        {footer !== undefined && (
          <div className="px-6 py-4 border-t border-[rgb(var(--tf-border))] flex items-center justify-end gap-3 bg-[rgb(var(--tf-bg))]/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
