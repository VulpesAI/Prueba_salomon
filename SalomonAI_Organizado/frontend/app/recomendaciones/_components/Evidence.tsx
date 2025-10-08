"use client";

import { useId, useState } from "react";
import { EvidenceItem } from "@/types/recommendations";

export default function Evidence({ items }: { items: EvidenceItem[] }) {
  const [open, setOpen] = useState(false);
  const disclosureId = useId();

  if (!items?.length) {
    return null;
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-sm underline transition hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
        aria-expanded={open}
        aria-controls={disclosureId}
      >
        {open ? "Ocultar evidencia" : "Ver evidencia"}
      </button>
      {open ? (
        <div
          id={disclosureId}
          className="mt-2 rounded-lg border border-border bg-background/40 p-3 text-sm"
        >
          <ul className="list-disc space-y-1 pl-5">
            {items.map((evidence, index) => (
              <li key={`${evidence.label}-${index}`}>
                <span className="font-medium">{evidence.label}:</span> {evidence.value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
