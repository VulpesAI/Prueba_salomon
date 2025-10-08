"use client";

import * as React from "react";
import clsx from "clsx";

export interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = "Selecciona…",
  disabled,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<string | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const baseId = React.useId();
  const listboxId = `${baseId}-listbox`;
  const labelId = label ? `${baseId}-label` : undefined;
  const selected = options.find((option) => option.value === value);

  const close = React.useCallback(() => setOpen(false), []);
  const openList = React.useCallback(() => {
    if (disabled || options.length === 0) return;
    setOpen(true);
  }, [disabled, options.length]);
  const toggle = React.useCallback(() => {
    if (open) {
      close();
    } else {
      openList();
    }
  }, [open, close, openList]);

  React.useEffect(() => {
    if (open) {
      const selectedIndex = options.findIndex((option) => option.value === value);
      if (selectedIndex >= 0) {
        setActive(options[selectedIndex]?.value ?? null);
      } else {
        setActive(options[0]?.value ?? null);
      }
      listRef.current?.focus();
    }
  }, [open, options, value]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!open) return;
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) {
        return;
      }
      if (listRef.current?.contains(target)) {
        return;
      }
      close();
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, close]);

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLUListElement>) => {
      if (!open) return;
      const currentIndex = options.findIndex((option) => option.value === active);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (options.length === 0) return;
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % options.length : 0;
        setActive(options[nextIndex]?.value ?? null);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (options.length === 0) return;
        const prevIndex = currentIndex >= 0 ? (currentIndex - 1 + options.length) % options.length : options.length - 1;
        setActive(options[prevIndex]?.value ?? null);
      } else if (event.key === "Enter" && active) {
        event.preventDefault();
        onChange?.(active);
        close();
        buttonRef.current?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        close();
        buttonRef.current?.focus();
      }
    },
    [active, close, onChange, open, options]
  );

  const handleButtonKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) {
          openList();
        }
        listRef.current?.focus();
      } else if ((event.key === "Enter" || event.key === " ") && !open) {
        event.preventDefault();
        openList();
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    },
    [close, disabled, open, openList]
  );

  return (
    <div className="w-full">
      {label && (
        <label id={labelId} htmlFor={baseId} className="mb-1 block text-[14px] text-text">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          id={baseId}
          type="button"
          disabled={disabled}
          className={clsx(
            "w-full rounded-xl border bg-card px-3 py-2 text-left text-[16px]",
            "focus:outline-none focus-visible:ring-2 ring-accent ring-offset-2 ring-offset-bg",
            disabled && "cursor-not-allowed opacity-60"
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-disabled={disabled || undefined}
          aria-labelledby={labelId}
          onClick={toggle}
          onKeyDown={handleButtonKeyDown}
        >
          <span className={clsx(!selected && "text-text-muted")}>{selected ? selected.label : placeholder}</span>
        </button>

        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelId ?? baseId}
            aria-activedescendant={active ? `opt-${baseId}-${active}` : undefined}
            onKeyDown={onKeyDown}
            className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-xl border bg-card p-1 shadow-lg focus:outline-none"
          >
            {options.map((option) => (
              <li
                key={option.value}
                id={`opt-${baseId}-${option.value}`}
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setActive(option.value)}
                onClick={() => {
                  onChange?.(option.value);
                  close();
                  buttonRef.current?.focus();
                }}
                className={clsx(
                  "cursor-pointer rounded-lg px-3 py-2",
                  option.value === active
                    ? "bg-accent text-white"
                    : "hover:bg-[var(--bg-muted)] text-text"
                )}
              >
                {option.label}
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-3 py-2 text-[14px] text-text-muted">Sin opciones</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
