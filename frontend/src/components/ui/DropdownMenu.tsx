"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DropdownMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

export interface DropdownMenuProps {
  trigger?: React.ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = "right",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const defaultTrigger = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="tf-btn-icon"
      aria-haspopup="true"
      aria-expanded={open}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <circle cx="12" cy="5" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="12" cy="19" r="1.8" />
      </svg>
    </button>
  );

  const triggerElement = trigger
    ? React.cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => setOpen((o) => !o),
      })
    : defaultTrigger;

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {triggerElement}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1.5 min-w-[220px] rounded-menu bg-white py-1 shadow-card animate-fade-in",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-[14px] text-left transition-colors focus:outline-none",
                item.disabled
                  ? "text-gray-400 cursor-not-allowed"
                  : item.danger
                  ? "text-[rgb(var(--tf-error))] hover:bg-red-50"
                  : "text-[rgb(var(--tf-text))] hover:bg-[rgb(var(--tf-bg))]"
              )}
            >
              {item.icon && (
                <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-[rgb(var(--tf-muted))]">
                  {item.icon}
                </span>
              )}
              <span className="flex-1 font-medium">{item.label}</span>
              {item.shortcut && (
                <span className="text-[12px] text-[rgb(var(--tf-muted))] ml-4">
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
