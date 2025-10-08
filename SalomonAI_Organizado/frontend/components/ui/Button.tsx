"use client";

import * as React from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus-visible:ring-2 ring-offset-2 ring-offset-bg";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-[color-mix(in_oklab,var(--accent),black_10%)]",
  secondary:
    "bg-[var(--bg-muted)] text-text hover:bg-[color-mix(in_oklab,var(--bg-muted),black_7%)] border",
  ghost: "bg-transparent text-accent hover:bg-[var(--accent-muted)]",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[14px]",
  md: "h-10 px-4 text-[16px]",
  lg: "h-12 px-5 text-[18px]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      className={clsx(
        base,
        variants[variant],
        sizes[size],
        isDisabled && "cursor-not-allowed opacity-70",
        className
      )}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}
