"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[rgb(var(--tf-purple))] text-white hover:bg-[rgb(var(--tf-purple-dark))] active:bg-[rgb(var(--tf-purple-dark))] focus:shadow-[var(--tf-shadow-focus)] shadow-none",
  outline:
    "bg-white text-[rgb(var(--tf-text))] border border-[rgb(var(--tf-border-strong))] hover:border-[rgb(var(--tf-purple))] hover:text-[rgb(var(--tf-purple))] focus:shadow-[var(--tf-shadow-focus)]",
  ghost:
    "bg-transparent text-[rgb(var(--tf-text))] hover:bg-[rgb(var(--tf-bg))] focus:shadow-[var(--tf-shadow-focus)]",
  destructive:
    "bg-[rgb(var(--tf-error))] text-white hover:bg-red-700 focus:shadow-[0_0_0_3px_rgba(220,38,38,0.15)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[14px]",
  md: "h-11 px-6 text-[14px]",
  lg: "h-12 px-7 text-[15px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
