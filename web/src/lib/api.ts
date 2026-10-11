// Small fetch client. The browser only talks to this Next app; next.config rewrites
// /gw/* to the main gateway and /support-gw/* to the support gateway, so there is no CORS.

export const GATEWAY = "/gw";
export const SUPPORT_GATEWAY = "/support-gw";

export const GATEWAY_URL = process.env.NEXT_PUBLIC_APPRENTICE_URL || "http://localhost:8000";
export const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL || "http://localhost:8001";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function targetFor(base: string): string {
  return base === SUPPORT_GATEWAY ? SUPPORT_URL : GATEWAY_URL;
}

async function parse<T>(res: Response, base: string): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    // The proxy answers 500/502/503 with an HTML page when the gateway is down.
    if (body === null && res.status >= 500) {
      throw new ApiError(`Gateway not reachable at ${targetFor(base)}`, res.status);
    }
    const err = (body as { error?: string | { message?: string } } | null)?.error;
    const message = typeof err === "string" ? err : err?.message || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

async function send<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { cache: "no-store", ...init });
  } catch {
    throw new ApiError(`Gateway not reachable at ${targetFor(base)}`, 0);
  }
  return parse<T>(res, base);
}

export function getJSON<T>(base: string, path: string): Promise<T> {
  return send<T>(base, path);
}

export function postJSON<T>(base: string, path: string, body: unknown = {}): Promise<T> {
  return send<T>(base, path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
