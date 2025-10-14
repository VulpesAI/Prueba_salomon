"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Loader2, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/config/query-keys";
import { ENV } from "@/config/env";
import { useUploadStatement, pollStatementUntilDone } from "@/lib/hooks-statements";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const statusLabels = {
  idle: { label: "Listo", className: "bg-muted text-muted-foreground", icon: null },
  uploading: {
    label: "Subiendo",
    className: "bg-amber-100 text-amber-800",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />,
  },
  processing: {
    label: "Procesando",
    className: "bg-blue-100 text-blue-800",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />,
  },
  done: {
    label: "Completado",
    className: "bg-emerald-100 text-emerald-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-800",
    icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />,
  },
} as const;

type UploadStatus = keyof typeof statusLabels;

type StatementUploaderProps = {
  className?: string;
};

const defaultAllowed = ENV.NEXT_PUBLIC_UPLOAD_ALLOWED || ".pdf,.csv,.xlsx,.ofx,.qif";
const maxSize = ENV.NEXT_PUBLIC_UPLOAD_MAX_MB || "15";

export default function StatementUploader({ className }: StatementUploaderProps) {
  const [fileName, setFileName] = useState<string>("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [statementInfo, setStatementInfo] = useState<{ bank: string | null; period: string | null } | null>(null);
  const uploadMutation = useUploadStatement();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const busy = status === "uploading" || status === "processing";

  const updateState = (runId: number, nextStatus: UploadStatus, nextMessage: string) => {
    if (!mountedRef.current || runIdRef.current !== runId) return;
    setStatus(nextStatus);
    setMessage(nextMessage);
  };

  const updateInfo = (runId: number, info: { bank: string | null; period: string | null } | null) => {
    if (!mountedRef.current || runIdRef.current !== runId) return;
    setStatementInfo(info);
  };

  const handleFile = async (file: File) => {
    const runId = ++runIdRef.current;
    updateInfo(runId, null);
    setFileName(file.name);
    updateState(runId, "uploading", "Subiendo estado de cuenta…");

    try {
      const { statement_id } = await uploadMutation.mutateAsync(file);
      updateState(runId, "processing", "Procesando archivo… esto puede tardar unos segundos.");

      const result = await pollStatementUntilDone(statement_id, (currentStatus) => {
        if (currentStatus === "processing") {
          updateState(runId, "processing", "Extrayendo y categorizando movimientos…");
        }
      });

      if (!mountedRef.current || runIdRef.current !== runId) {
        return;
      }

      if (result.status === "processed") {
        updateInfo(runId, { bank: result.bank, period: result.period });
        updateState(
          runId,
          "done",
          `Cartola procesada correctamente${
            result.bank ? ` (${result.bank}${result.period ? ` • ${result.period}` : ""})` : ""
          }.`,
        );

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["dashboard", "resumen"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard", "proyeccion"] }),
          queryClient.invalidateQueries({ queryKey: ["movimientos"] }),
          queryClient.invalidateQueries({ queryKey: queryKeys.statements.list() }),
        ]);
      } else {
        updateState(
          runId,
          "error",
          `Error al procesar la cartola: ${result.error ?? "intenta nuevamente"}.`,
        );
      }
    } catch (error) {
      if (!mountedRef.current || runIdRef.current !== runId) {
        return;
      }

      let friendlyMessage = "No se pudo completar la carga. Intenta otra vez.";
      if (error instanceof Error) {
        switch (error.message) {
          case "invalid_extension":
            friendlyMessage = "Formato no permitido. Sube archivos PDF, CSV, XLSX, OFX o QIF.";
            break;
          case "file_too_large":
            friendlyMessage = "Archivo demasiado grande para procesar.";
            break;
          case "poll_timeout":
            friendlyMessage = "El procesamiento está tardando demasiado. Intenta nuevamente más tarde.";
            break;
          default:
            if (error.message.startsWith("upload_failed_")) {
              friendlyMessage = "No pudimos subir la cartola. Revisa tu conexión e intenta otra vez.";
            } else if (error.message.startsWith("status_failed_")) {
              friendlyMessage = "No pudimos consultar el estado de la cartola. Intenta nuevamente.";
            }
            break;
        }
      }

      updateState(runId, "error", friendlyMessage);
    }
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleFile(file);
    event.target.value = "";
  };

  const triggerFileDialog = () => {
    inputRef.current?.click();
  };

  return (
    <Card className={cn("border-dashed border-primary/40 bg-card", className)}>
      <CardHeader>
        <CardTitle>Subir Estado de Cuenta</CardTitle>
        <CardDescription>
          Sube tu cartola bancaria en formato PDF, CSV, XLSX, OFX o QIF (máx. {maxSize} MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            id="statement-upload-input"
            type="file"
            accept={defaultAllowed}
            className="sr-only"
            onChange={onInputChange}
            aria-label="Seleccionar estado de cuenta para subir"
          />
          <Button
            type="button"
            onClick={triggerFileDialog}
            disabled={busy}
            className="inline-flex items-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {status === "uploading" ? "Subiendo…" : "Procesando…"}
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                Subir Estado de Cuenta
              </>
            )}
          </Button>
          {fileName && (
            <span className="text-sm text-muted-foreground truncate" title={fileName}>
              Archivo seleccionado: <span className="font-medium text-foreground">{fileName}</span>
            </span>
          )}
        </div>

        {status !== "idle" && (
          <div
            className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-sm"
            role="status"
            aria-live="polite"
          >
            <StatusBadge status={status} />
            <span>{message}</span>
            {statementInfo && status === "done" && (
              <span className="text-xs text-muted-foreground">
                Banco: {statementInfo.bank ?? "-"} · Periodo: {statementInfo.period ?? "-"}
              </span>
            )}
            {status === "error" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={triggerFileDialog}
                className="self-start"
              >
                Intentar nuevamente
              </Button>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Tip: usa navegadores actualizados y evita cerrar esta ventana durante el procesamiento.
        </p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: UploadStatus }) {
  const config = statusLabels[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 self-start rounded-full px-2 py-1 text-xs font-medium",
        config.className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
