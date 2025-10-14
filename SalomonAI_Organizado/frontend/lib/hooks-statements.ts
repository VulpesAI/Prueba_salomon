import { useMutation } from "@tanstack/react-query";

import { ENV } from "@/config/env";

import { fetchStatementStatus, uploadStatement } from "./api-multipart";
import type { TStatementStatus, TStatementUploadResp } from "./schemas";

const defaultAllowed = ".pdf,.csv,.xlsx,.ofx,.qif";

export function useUploadStatement() {
  return useMutation({
    mutationFn: async (file: File): Promise<TStatementUploadResp> => {
      const allowed = (ENV.NEXT_PUBLIC_UPLOAD_ALLOWED || defaultAllowed)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const maxMB = Number(ENV.NEXT_PUBLIC_UPLOAD_MAX_MB || 15);

      const fileName = file.name.toLowerCase();
      const okExt = allowed.length === 0 || allowed.some((ext) => fileName.endsWith(ext));
      if (!okExt) {
        throw new Error("invalid_extension");
      }

      if (Number.isFinite(maxMB) && maxMB > 0) {
        const maxBytes = maxMB * 1024 * 1024;
        if (file.size > maxBytes) {
          throw new Error("file_too_large");
        }
      }

      return uploadStatement(file);
    },
  });
}

export async function pollStatementUntilDone(
  statementId: string,
  onTick?: (status: TStatementStatus["status"]) => void,
): Promise<TStatementStatus> {
  const interval = Number(ENV.NEXT_PUBLIC_POLL_INTERVAL_MS || 4000);
  const maxMinutes = Number(ENV.NEXT_PUBLIC_POLL_MAX_MINUTES || 5);
  const deadline = Date.now() + maxMinutes * 60_000;
  let wait = Number.isFinite(interval) && interval > 0 ? interval : 4000;

  while (Date.now() < deadline) {
    const status = await fetchStatementStatus(statementId);
    onTick?.(status.status);
    if (status.status === "processed" || status.status === "failed") {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, wait));
    wait = Math.min(wait * 1.25, 10_000);
  }

  throw new Error("poll_timeout");
}
