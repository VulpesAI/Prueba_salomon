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
    <div className="space-y-2 rounded-xl border p-4">
      <h3 className="text-base font-semibold">Exportación de datos</h3>
      <p className="text-sm text-muted-foreground">
        Descarga futura de reporte consolidado (CSV/JSON). Próximamente.
      </p>
      <button
        className="h-9 rounded-md border px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
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
