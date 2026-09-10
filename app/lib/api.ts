import type { ApiErrorKind } from "./types";

export interface CoachApiSuccess {
  ok: true;
  reply: string;
}

export interface CoachApiFailure {
  ok: false;
  kind: ApiErrorKind;
  rawMessage: string;
}

export type CoachApiResult = CoachApiSuccess | CoachApiFailure;

/**
 * The only place in the client that talks to our backend. Always hits the
 * same-origin /api/coach route -- never the n8n webhook directly -- so
 * credentials never reach the browser and CORS never comes up.
 */
export async function postCoachMessage(
  message: string,
  sessionId: string,
  signal?: AbortSignal
): Promise<CoachApiResult> {
  let response: Response;
  try {
    response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId }),
      signal,
    });
  } catch {
    return {
      ok: false,
      kind: "network_error",
      rawMessage: "Failed to reach /api/coach.",
    };
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.ok && data && typeof (data as { reply?: unknown }).reply === "string") {
    return { ok: true, reply: (data as { reply: string }).reply };
  }

  const errorBody = data as { error?: unknown; message?: unknown } | null;
  const kind: ApiErrorKind =
    errorBody && typeof errorBody.error === "string"
      ? (errorBody.error as ApiErrorKind)
      : "unknown_error";
  const rawMessage =
    errorBody && typeof errorBody.message === "string"
      ? errorBody.message
      : `Request failed with status ${response.status}.`;

  return { ok: false, kind, rawMessage };
}
