'use client';

import { AlertTriangle, CheckCircle, CloudOff, RefreshCcw } from 'lucide-react';
import { useMemo } from 'react';
import { useSync } from '@/hooks/useSync';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SyncStatusWidget() {
  const { queue, isOnline } = useSync();

  const stats = useMemo(() => {
    const failed = queue.filter(item => item.status === 'FAILED');
    const pending = queue.filter(item => item.status === 'QUEUED' || item.status === 'IN_PROGRESS');
    return { failed, pending };
  }, [queue]);

  const hasQueue = queue.length > 0;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sincronización en tiempo real</h3>
          <p className="text-sm text-muted-foreground">
            {isOnline
              ? 'Las acciones se enviarán automáticamente al recuperar la conexión.'
              : 'Estás sin conexión, almacenamos los cambios de forma segura.'}
          </p>
        </div>
        {isOnline ? <CheckCircle className="h-6 w-6 text-emerald-500" /> : <CloudOff className="h-6 w-6 text-yellow-500" />}
      </div>

      {!hasQueue && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4" />
          No hay operaciones pendientes.
        </div>
      )}

      {hasQueue && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <RefreshCcw className="h-4 w-4 text-blue-500" />
            <span>
              {stats.pending.length} operación{stats.pending.length === 1 ? '' : 'es'} encolada{stats.pending.length === 1 ? '' : 's'}.
            </span>
          </div>
          {stats.failed.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {stats.failed.length} operación{stats.failed.length === 1 ? '' : 'es'} requiere tu atención.
              </span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Revisamos cada intento con reintentos exponenciales hasta 15 minutos.
          </div>
          <Button variant="outline" size="sm" disabled={!isOnline}>
            Forzar sincronización
          </Button>
        </div>
      )}
    </Card>
  );
}
