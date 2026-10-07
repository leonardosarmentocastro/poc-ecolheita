const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/** One validation issue of a 400, as the API's Zod handler reports it. */
export interface ApiIssue {
  path: (string | number)[];
  message: string;
}

/**
 * A non-2xx answer. `message` is what `request` has always thrown — the API's `error`
 * string — so a caller that only shows `err.message` is unchanged. `status` and `issues`
 * are for a caller that must tell failures apart: a form that puts a 409 by one field and
 * a 404 by another, a page that tells "gone" from "failed".
 */
export class ApiError extends Error {
  readonly status: number;
  readonly issues: ApiIssue[];

  constructor(message: string, status: number, issues: ApiIssue[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.error ?? `request failed: ${res.status}`,
      res.status,
      Array.isArray(body.issues) ? body.issues : [],
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
