/** Tiny fetch wrapper: JSON in, JSON out, typed errors, never throws on parse. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      method: rest.method ?? (json !== undefined ? "POST" : "GET"),
      headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Network unavailable", 0, "network");
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON (e.g. static hosting with no API) */
  }
  if (!res.ok) {
    const b = body as { error?: string; code?: string } | null;
    throw new ApiError(b?.error ?? res.statusText, res.status, b?.code);
  }
  return body as T;
}
