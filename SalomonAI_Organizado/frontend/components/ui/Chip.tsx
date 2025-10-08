"use client";

import * as React from "react";
import clsx from "clsx";

type ChipKind = "positive" | "negative" | "warning" | "neutral";

interface ChipProps {
  kind?: ChipKind;
  children: React.ReactNode;
}

export function Chip({ kind = "neutral", children }: ChipProps) {
  const styles = {
    positive: "bg-[color-mix(in_oklab,var(--positive),transparent_85%)] text-[var(--positive)]",
    negative: "bg-[color-mix(in_oklab,var(--negative),transparent_85%)] text-[var(--negative)]",
    warning: "bg-[color-mix(in_oklab,var(--warning),transparent_85%)] text-[var(--warning)]",
    neutral: "bg-[var(--bg-muted)] text-text-muted",
  }[kind];

  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium", styles)}>
      {children}
    </span>
  );
}
