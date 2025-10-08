'use client';

import { Horizon } from '@/types/forecasts';

const options: Horizon[] = [7, 30, 90];

export default function HorizonSelector({
  value,
  onChange,
}: {
  value: Horizon;
  onChange: (horizon: Horizon) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border p-1"
      role="tablist"
      aria-label="Selector de horizonte"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          className={`px-3 py-1.5 rounded-md text-sm focus:outline-none focus-visible:ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary/60 transition-colors ${value === option ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted'}`}
          onClick={() => onChange(option)}
        >
          {option} días
        </button>
      ))}
    </div>
  );
}
