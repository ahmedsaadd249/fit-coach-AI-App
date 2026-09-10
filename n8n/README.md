# Fitness Coach — n8n contract

This document is the durable reference for the "Fitness coach" n8n workflow's contract with
the Rally frontend, independent of whatever conversation produced it. If either side's data
shape changes, update this file and the code together.

## Endpoint

```
POST https://n8n.ahmedaljaly.cfd/webhook/fitness-coach
```

The URL itself is safe to document — it's a stable path, not a bearer token. The workflow is
protected by HTTP Basic Auth; those credentials live only in `.env.local` (gitignored) and
must never be added to this file, committed, or sent to the browser.

**Nothing in the frontend calls this URL directly.** `app/api/coach/route.ts` is the only
thing that does — it reads the URL and Basic Auth credentials from server-only env vars
(`N8N_WEBHOOK_URL`, `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD`) and the browser only
ever calls the same-origin `/api/coach` route. This keeps the credentials out of the client
bundle entirely and sidesteps CORS.

## Request

```json
{ "message": "<user text>", "sessionId": "<stable per-conversation id>" }
```

Both fields are required, non-empty strings.

## Responses

**Success — 200**
```json
{ "reply": "<coach text>" }
```

**Validation error — 400** (missing/empty `message` or `sessionId`)
```json
{ "error": "validation_error", "message": "<human readable>", "details": { "message"?: "...", "sessionId"?: "..." } }
```

**Upstream error — 429 / 502 / 504**
```json
{ "error": "rate_limit_exceeded" | "upstream_timeout" | "upstream_error", "message": "<human readable>" }
```

The response is a single JSON payload, not streamed — the frontend shows a "coach is
thinking" state while waiting rather than rendering tokens as they arrive.

## Session memory

Conversation memory lives inside the n8n workflow (a Session Memory node), keyed by
`sessionId`, holding the last 20 turns. Sending a new `sessionId` starts a conversation the
coach has no memory of — this is exactly how the frontend's "New chat" control works.

## Before editing the live workflow

Per the project's CLAUDE.md: duplicate the workflow in n8n before editing it further via
MCP, so there's always a rollback copy. AI-driven edits to a live, production workflow
should never be a one-way door.
