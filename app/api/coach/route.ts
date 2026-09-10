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

/**
 * Per-IP rate limiting. This endpoint is public and every request spends real
 * OpenAI credits, so without a cap anyone who finds the URL can drain the
 * budget in a loop.
 *
 * Two windows: the short one blocks rapid scripted loops, the long one caps
 * how much a single IP can spend even at a patient pace. Both sit far above a
 * real conversation (a person sends a message every 10-30 seconds).
 *
 * Caveat: state is per warm serverless instance, not shared across them.
 * Vercel reuses warm instances, so a single client hammering the endpoint does
 * get caught in practice -- but this is not a distributed limiter, and traffic
 * spread across cold starts can slip through. If that ever matters, move the
 * counter to a shared store (Vercel KV / Upstash) behind this same interface.
 */
const RATE_LIMIT_WINDOWS = [
  { windowMs: 60_000, max: 10 },
  { windowMs: 3_600_000, max: 100 },
];

const LONGEST_WINDOW_MS = Math.max(...RATE_LIMIT_WINDOWS.map((w) => w.windowMs));
const SWEEP_INTERVAL_MS = 300_000;

const requestLog = new Map<string, number[]>();
let lastSweptAt = Date.now();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Drop stale entries so the map can't grow unbounded across many IPs. */
function sweepStaleEntries(now: number) {
  if (now - lastSweptAt < SWEEP_INTERVAL_MS) return;
  lastSweptAt = now;
  for (const [ip, timestamps] of requestLog) {
    const fresh = timestamps.filter((t) => now - t < LONGEST_WINDOW_MS);
    if (fresh.length === 0) requestLog.delete(ip);
    else requestLog.set(ip, fresh);
  }
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweepStaleEntries(now);

  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < LONGEST_WINDOW_MS);

  for (const { windowMs, max } of RATE_LIMIT_WINDOWS) {
    const inWindow = timestamps.filter((t) => now - t < windowMs);
    if (inWindow.length >= max) {
      const oldest = Math.min(...inWindow);
      requestLog.set(ip, timestamps);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
      };
    }
  }

  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

const KNOWN_UPSTREAM_KINDS: ApiErrorKind[] = [
  "validation_error",
  "rate_limit_exceeded",
  "upstream_timeout",
  "upstream_error",
];

function errorResponse(
  kind: ApiErrorKind,
  message: string,
  status: number,
  headers?: Record<string, string>
) {
  return NextResponse.json({ error: kind, message }, { status, headers });
}

export async function POST(request: Request) {
  // Checked first: cheapest possible rejection, and it protects everything
  // downstream (body parsing, and the paid upstream call) from abuse.
  const { allowed, retryAfterSeconds } = checkRateLimit(getClientIp(request));
  if (!allowed) {
    return errorResponse(
      "rate_limit_exceeded",
      "Too many messages from this address. Give it a moment and try again.",
      429,
      { "Retry-After": String(retryAfterSeconds) }
    );
  }

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
