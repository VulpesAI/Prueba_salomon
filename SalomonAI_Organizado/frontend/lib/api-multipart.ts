import { StatementStatus, StatementUploadResp } from "./schemas";
import type { TStatementStatus, TStatementUploadResp } from "./schemas";
import { apiUrl, authHeader } from "./api";

export async function uploadStatement(file: File): Promise<TStatementUploadResp> {
  const fd = new FormData();
  fd.append("file", file, file.name);
  const res = await fetch(apiUrl('/statements/upload'), {
    method: "POST",
    headers: {
      ...(await authHeader()),
    },
    body: fd,
  });

  if (!res.ok) {
    throw new Error(`upload_failed_${res.status}`);
  }

  const json = await res.json();
  return StatementUploadResp.parse(json);
}

export async function fetchStatementStatus(id: string): Promise<TStatementStatus> {
  const res = await fetch(apiUrl(`/statements/${id}`), {
    headers: {
      ...(await authHeader()),
    },
  });

  if (!res.ok) {
    throw new Error(`status_failed_${res.status}`);
  }

  const json = await res.json();
  return StatementStatus.parse(json);
}
