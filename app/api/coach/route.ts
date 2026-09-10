import { NextResponse } from "next/server";
import type { ApiErrorKind } from "@/app/lib/types";

// Uses Buffer for Basic Auth encoding, so pin the Node runtime explicitly.
export const runtime = "nodejs";

// Vercel's default function duration (10s on the Hobby plan) is shorter than
// our own upstream timeout below -- without this, a slow-but-healthy n8n
// reply gets cut off by the platform before COACH_REQUEST_TIMEOUT_MS ever
// fires, producing a confusing generic 504 instead of our own handling.
export const maxDuration = 30;

const COACH_REQUEST_TIMEOUT_MS = 25_000;

const KNOWN_UPSTREAM_KINDS: ApiErrorKind[] = [
  "validation_error",
  "rate_limit_exceeded",
  "upstream_timeout",
  "upstream_error",
];

function errorResponse(kind: ApiErrorKind, message: string, status: number) {
  return NextResponse.json({ error: kind, message }, { status });
}

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const authUser = process.env.N8N_BASIC_AUTH_USER;
  const authPassword = process.env.N8N_BASIC_AUTH_PASSWORD;

  if (!webhookUrl || !authUser || !authPassword) {
    console.error(
      "Rally API route: missing N8N_WEBHOOK_URL / N8N_BASIC_AUTH_USER / N8N_BASIC_AUTH_PASSWORD env vars."
    );
    return errorResponse(
      "auth_error",
      "Rally's coach isn't configured correctly. Check the server credentials.",
      500
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("validation_error", "Request body must be valid JSON.", 400);
  }

  const message =
    typeof (body as { message?: unknown })?.message === "string"
      ? (body as { message: string }).message.trim()
      : "";
  const sessionId =
    typeof (body as { sessionId?: unknown })?.sessionId === "string"
      ? (body as { sessionId: string }).sessionId.trim()
      : "";

  if (!message || !sessionId) {
    const missing = [!message && "message", !sessionId && "sessionId"].filter(Boolean).join(" and ");
    return errorResponse("validation_error", `${missing} required.`, 400);
  }

  const authHeader = `Basic ${Buffer.from(`${authUser}:${authPassword}`).toString("base64")}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COACH_REQUEST_TIMEOUT_MS);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ message, sessionId }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return errorResponse(
        "client_timeout",
        "That's taking longer than it should. Try again in a moment.",
        504
      );
    }
    console.error("Rally API route: failed to reach the n8n webhook.", err);
    return errorResponse(
      "network_error",
      "Rally can't reach the coach right now. Check your connection and try again.",
      502
    );
  } finally {
    clearTimeout(timeout);
  }

  // Read the body once as text -- n8n's own auth failures come back as plain
  // text ("Authorization is required!"), not JSON, so a blind .json() call
  // would throw. Everything else on the contract is JSON.
  const rawText = await upstreamResponse.text();
  let parsed: { reply?: unknown; error?: unknown; message?: unknown } | null = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  if (upstreamResponse.ok) {
    if (parsed && typeof parsed.reply === "string") {
      return NextResponse.json({ reply: parsed.reply }, { status: 200 });
    }
    console.error("Rally API route: n8n returned 200 without a reply field.", rawText);
    return errorResponse("unknown_error", "Something went wrong on this end. Try again.", 502);
  }

  if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
    console.error(
      "Rally API route: n8n rejected our Basic Auth credentials.",
      upstreamResponse.status,
      rawText
    );
    return errorResponse(
      "auth_error",
      "Rally's coach isn't configured correctly. Check the server credentials.",
      502
    );
  }

  const kind: ApiErrorKind =
    parsed && typeof parsed.error === "string" && KNOWN_UPSTREAM_KINDS.includes(parsed.error as ApiErrorKind)
      ? (parsed.error as ApiErrorKind)
      : "upstream_error";
  const upstreamMessage =
    parsed && typeof parsed.message === "string"
      ? parsed.message
      : "Something went sideways on the coach's end. Give it another shot.";

  return errorResponse(kind, upstreamMessage, upstreamResponse.status);
}
