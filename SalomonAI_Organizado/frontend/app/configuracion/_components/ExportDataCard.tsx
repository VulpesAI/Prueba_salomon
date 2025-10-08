'use client';

import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';

export default function ExportDataCard() {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function handleExport() {
    setBusy(true);
    try {
      const response = await fetch('/api/export', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Error al solicitar exportación');
      }
      toast({
        title: 'Exportación iniciada',
        description: 'Se está generando tu reporte. Te avisaremos cuando esté listo.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'No pudimos iniciar la exportación',
        description: 'Intenta nuevamente en unos minutos.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-card border border-soft bg-gradient-card p-4 text-surface">
      <h3 className="text-base font-semibold text-surface">Exportación de datos</h3>
      <p className="text-sm text-muted">
        Descarga futura de reporte consolidado (CSV/JSON). Próximamente.
      </p>
      <button
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-soft bg-[rgba(8,17,52,0.06)] px-4 text-sm font-medium text-surface transition-colors hover:bg-[rgba(8,17,52,0.1)] focus-brand disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.1)]"
        type="button"
        onClick={handleExport}
        disabled={busy}
        aria-label="Exportar datos"
      >
        {busy ? 'Procesando…' : 'Exportar'}
      </button>
    </div>
  );
}
