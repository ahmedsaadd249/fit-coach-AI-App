# CLAUDE.md

## Project Purpose
Turn an n8n workflow into a deployed web app. The app is a Next.js/React frontend that sends requests to an n8n webhook and renders the response it gets back.

## Prerequisites
- [x] n8n MCP connected (`n8n-mcp`, local scope) — pointed at https://n8n.ahmedaljaly.cfd, gives access to node/template knowledge plus this n8n instance's workflows
- [x] GitHub MCP connected (remote server, local scope) — used to push commits and manage the repo
- [x] `n8n-mcp-skills` plugin installed (14 skills covering expressions, validation, node config, code nodes, error handling, etc.)
- [x] `frontend-design` skill installed — use for all UI/UX work
- [ ] Vercel project created and linked to the GitHub repo (do this once the repo exists) so pushes auto-deploy

## Workflow (follow in order)
1. **Audit the n8n workflow.** Using the n8n MCP, confirm the workflow's trigger (Webhook node) accepts the shape of data the app will send, and that the final node returns clean JSON (e.g. via "Respond to Webhook") the frontend can render. Fix the workflow in n8n directly before building UI against it.
2. **Build the frontend locally.** Next.js + React app at the repo root. Read the webhook URL from an env var — never hardcode it. Use the front-end designer skill for UI/UX work.
3. **Test end-to-end locally.** Run `npm run dev`, submit real requests, and confirm the full round trip (app → n8n → app) works, including error cases.
4. **Push to GitHub.** Once verified locally, commit and push using the GitHub MCP.
5. **Deploy on Vercel.** First time: connect the GitHub repo to a new Vercel project. After that, every push to the tracked branch auto-deploys — no manual redeploy step.
6. **Iterate.** Future changes to the workflow or the frontend: edit → test locally → push to GitHub → Vercel syncs automatically.

## File Structure
Keep this lean — one app, flat layout:

```
/
├── CLAUDE.md
├── app/               # Next.js app router pages/components
├── package.json       # npm
├── .env.local         # local env vars (n8n webhook URL, etc.) — gitignored
├── .env.example       # documents required env vars
└── n8n/
    ├── README.md      # workflow contract notes: expected input/output shape, webhook URL(s)
    └── workflows/     # exported workflow JSON snapshots (optional, for reference/backup)
```

## Conventions
- Package manager: npm
- Never commit secrets (n8n API keys, webhook URLs with tokens). Use `.env.local` (gitignored) and document required vars in `.env.example`.
- Make n8n workflow changes through the n8n MCP against the live instance; optionally export a snapshot to `n8n/workflows/` for reference.
- Before editing an existing production workflow via MCP, duplicate it first so there's a safe rollback copy — AI-driven edits to live workflows should never be a one-way door.
- Keep the frontend and the n8n workflow's input/output contract in sync — if one side's data shape changes, update the other in the same change.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
