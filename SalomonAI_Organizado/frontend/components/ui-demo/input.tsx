"use client";

import * as React from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helpText?: string;
  errorText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helpText, errorText, id, className, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const helpId = helpText ? `${inputId}-help` : undefined;
    const errId = errorText ? `${inputId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-[14px] text-text">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full rounded-xl border bg-card px-3 py-2 text-[16px] text-text placeholder:text-text-muted",
            "focus:outline-none focus-visible:ring-2 ring-accent ring-offset-2 ring-offset-bg",
            errorText && "border-negative",
            className
          )}
          aria-describedby={[helpId, errId].filter(Boolean).join(" ") || undefined}
          aria-invalid={Boolean(errorText) || undefined}
          {...props}
        />
        {helpText && (
          <p id={helpId} className="mt-1 text-[12px] text-text-muted">
            {helpText}
          </p>
        )}
        {errorText && (
          <p id={errId} className="mt-1 text-[12px] text-negative">
            {errorText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
