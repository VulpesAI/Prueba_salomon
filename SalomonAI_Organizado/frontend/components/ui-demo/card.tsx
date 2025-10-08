"use client";

import * as React from "react";
import clsx from "clsx";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border bg-card p-4 md:p-6",
        "shadow-sm dark:shadow-none",
        className
      )}
    >
      {children}
    </div>
  );
}
