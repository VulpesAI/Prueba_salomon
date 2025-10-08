import { StatementStatus, StatementUploadResp } from "./schemas";
import type { TStatementStatus, TStatementUploadResp } from "./schemas";
import { authHeader } from "./api";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
}

export async function uploadStatement(file: File): Promise<TStatementUploadResp> {
  const fd = new FormData();
  fd.append("file", file, file.name);
  const res = await fetch(`${API}/statements/upload`, {
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
  const res = await fetch(`${API}/statements/${id}`, {
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
