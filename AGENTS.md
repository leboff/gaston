<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Gaston — Project Overview (read this first)

> This document is the single source of orientation for AI agents working on
> Gaston. It is written to be self-contained: you should be able to act without
> searching the repo first. It is auto-loaded via `CLAUDE.md` → `@AGENTS.md`.
> **Keep it current** — see "Updating this document" at the end.

## What Gaston is

A web app for chatting with an LLM where you can **highlight any word or phrase
in a message and branch into a linked sub-chat** anchored to that exact span.
The highlighted phrase stays marked in the parent (click it to dive back in), a
breadcrumb trail climbs back out, and nesting is unlimited. Chats are stored in
the user's own **AT Protocol** (Bluesky) repo, and the LLM is **bring-your-own-
key** via OpenRouter.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**.
- **Tailwind CSS v4** (CSS-based config in `app/globals.css`; plugins loaded with
  `@plugin`, e.g. `@tailwindcss/typography`). No `tailwind.config.js`.
- **AT Protocol**: `@atproto/api` (Agent) + `@atproto/oauth-client-node` (OAuth).
- **better-sqlite3**: tiny local DB for OAuth tokens ONLY (declared in
  `serverExternalPackages` in `next.config.ts`).
- **iron-session**: encrypted session cookie holding the user's DID.
- **zustand**: client state. **marked + dompurify**: markdown rendering.
- Path alias `@/*` → repo root.

## Architecture / data flow

```
Browser (React, zustand)         Next.js server (route handlers)      External
──────────────────────           ──────────────────────────────      ────────
Settings: OpenRouter key   ──>   /api/chat  (BYOK key in header)  ──> OpenRouter (stream)
in localStorage                  /api/models                      ──> OpenRouter
Chat UI / selection popover ─>   /api/repo/* (authed atproto Agent)──> user's PDS repo
                                 /oauth/* (login/callback/logout) <─> user's PDS
                                 /api/me (who am I)
```

- **BYOK**: there is NO server-side OpenRouter key. The user's key lives in the
  browser (`localStorage`, key `gaston.openrouter.key`) and is sent per-request
  in the `x-openrouter-key` header. `/api/chat` forwards it as the Bearer token
  and streams the SSE response straight back. The key is never logged or stored
  server-side. (Decision: changed from a server env var to BYOK early on.)
- **Storage = the user's PDS**, not an app database. The only server DB is
  `data/auth.sqlite`, which stores OAuth state/tokens exclusively (gitignored).

## Data model (atproto lexicon)

Custom record collection **`app.gaston.chatNode`** (schema:
`lexicons/app/gaston/chatNode.json`). One record = one chat node:

- `title`, `model`, `createdAt`
- `parent` (optional): **rkey** of the parent chatNode; absent on roots.
- `anchor` (optional): the highlighted span the node sprang from —
  `{ messageId, text, startUtf16, endUtf16 }`. Offsets are in **rendered-text
  coordinates** (see Conventions). Absent on roots.
- `messages[]`: `{ id, role: "user"|"assistant", text, createdAt }` — embedded
  in the node record (one `getRecord` returns a whole conversation).

The whole tree is the set of all `chatNode` records; it is rebuilt client-side by
linking `parent` rkeys. Breadcrumbs = walk parent chain. Type defs:
`types/chat.ts`. (`$type` is added on write in `lib/atproto/repo.ts`.)

## Auth model

Per-user atproto OAuth (`@atproto/oauth-client-node`). Public client
(`token_endpoint_auth_method: "none"`, no keyset). `lib/atproto/client.ts`
builds the client metadata and switches on `PUBLIC_URL`:

- **Dev (loopback host)**: uses atproto's localhost development client
  (`client_id = http://localhost?redirect_uri=…&scope=…`). The redirect host
  MUST be a loopback IP, so **open the app at `http://127.0.0.1:3000`, not
  `localhost`**.
- **Prod**: hosts `client-metadata.json` / `jwks.json` at `<PUBLIC_URL>/oauth/…`.

`lib/atproto/session.ts#getAgent()` restores the session for the request and
returns an authed `Agent`, or null. Session cookie via iron-session
(`COOKIE_SECRET`, ≥32 chars).

## Key files (so you don't have to search)

- `app/page.tsx` — client shell; bootstraps the store; gates on auth
  (loading → `LoginScreen` → app).
- `lib/store.ts` — zustand store: `bootstrap`, `sendMessage`, `digIn`,
  `newRootChat`, key/model persistence, streaming state. The hub of client logic.
- `components/ChatView.tsx` — messages, selection→"Dig in" popover, breadcrumbs,
  composer, streaming bubble, **scroll-follow logic**.
- `components/MessageBubble.tsx` — renders a message via `renderMessageHtml`
  (`dangerouslySetInnerHTML`) and delegates clicks on `<mark>` highlights.
- `lib/markdown.ts` — `renderMessageHtml(text,isUser,spans)`: markdown→sanitized
  HTML and DOM-walks to inject `<mark data-child-rkey>` highlights at offsets.
- `lib/tree.ts` — tree/breadcrumb helpers + `selectionOffsets` (rendered-text
  coordinates) + `HighlightSpan`.
- `lib/chatClient.ts` — `streamChat`: fetch `/api/chat`, parse SSE deltas.
- `lib/openrouter.ts` — `KEY_HEADER`, base URL, attribution headers.
- `lib/atproto/{client,session,db,repo}.ts` — OAuth client, session/getAgent,
  SQLite token stores, repo CRUD (`listNodes/getNode/createNode/putNode`).
- `app/api/**` and `app/oauth/**` — route handlers (chat, models, me, repo, oauth).
- Components: `Sidebar`, `Breadcrumbs`, `ModelPicker`, `Settings`, `TopBar`,
  `LoginScreen`.

## Conventions & gotchas (important)

- **Next 16 is not your training data.** Read `node_modules/next/dist/docs/`
  before using framework APIs. `cookies()`, `headers()`, and dynamic route
  `params` are **async** (await them).
- **React 19 lint rule `set-state-in-effect`**: do not call `setState`
  synchronously inside `useEffect`. Use lazy `useState` initializers or the
  "adjust state during render with a prev-value guard" pattern (see
  `ChatView.tsx` composer reset, `LoginScreen.tsx` authError).
- **Highlight offset coordinate system**: both selection capture
  (`selectionOffsets`, via `Range.cloneContents().textContent.length`) and
  highlight re-rendering (DOM walker in `lib/markdown.ts`) count **only real
  text-node characters** — NOT the synthetic newlines `Range.toString()` inserts
  at block boundaries. This is what keeps dig-in highlighting correct over
  rendered markdown. Keep both sides in this same system if you touch either.
- **Markdown is sanitized** (DOMPurify) before `dangerouslySetInnerHTML`; `<mark>`
  highlights are injected AFTER sanitize. User messages stay plain text.
- **Flexbox scrolling**: scroll containers and their flex ancestors need
  `min-h-0` (and `min-w-0` where relevant) or they grow to fit content instead of
  scrolling. The body is `h-dvh … overflow-hidden`.
- **Chat scroll-follow**: auto-scroll to bottom only when the user is pinned to
  the bottom (`atBottomRef`, 80px threshold); sending / switching chats snaps to
  bottom. Don't reintroduce unconditional scroll-on-token.
- **Dev server hydration quirk in sandboxes**: `next dev`'s HMR websocket can be
  blocked by proxies, which stalls hydration (page stuck on "Loading…"). This is
  NOT an app bug — verify UI with a **production build** (`npm run build && npm
  start`) instead.
- **rkeys** are `crypto.randomUUID()`. **Never** commit `.env*` except
  `.env.example` (the `.gitignore` has a `!.env.example` exception).

## Running & verifying

- Setup: `npm install`; `cp .env.example .env.local` and set `COOKIE_SECRET`
  (`openssl rand -base64 32`) and `PUBLIC_URL` (`http://127.0.0.1:3000` for dev).
- Dev: `npm run dev` → open `http://127.0.0.1:3000`. For reliable UI checks in
  CI/sandboxes use `npm run build && npm start`.
- Quality gates (run before committing): `npx tsc --noEmit`, `npx eslint .`,
  `npm run build` — all must be clean.
- **Network note**: some sandboxes block `openrouter.ai`, so live LLM streaming
  and the model catalog can't be exercised there; the code degrades gracefully.
- **Headless UI verification pattern** (used throughout this project): Chromium
  is preinstalled at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`;
  install `playwright-core` in a scratch dir (not the project) and launch with
  that `executablePath`. To test logged-in flows without real atproto/OpenRouter,
  mock `/api/me`, `/api/models`, `/api/repo/*` with `page.route`, and to simulate
  streaming, override `window.fetch` for `/api/chat` with a slow `ReadableStream`
  via `page.addInitScript`. (Note: there are two `overflow-y-auto` divs — the
  sidebar and the chat; target the chat with `div.overflow-y-auto.px-5`.)

## Repository / workflow state

- **`main` is the source of truth.** The repo started empty; per the owner's
  choice the app was pushed straight to `main` (no PR). A stale feature branch
  `claude/nested-llm-chat-breadcrumbs-7sar04` exists at an early commit. NOTE:
  GitHub's default branch may still be that feature branch, not `main` — confirm
  before assuming.
- GitHub access in this environment is via MCP tools (`mcp__github__*`), not the
  `gh` CLI. Do not open PRs unless explicitly asked.
- Commits in this project end with `Co-Authored-By:` and `Claude-Session:`
  trailers. Don't put model identifiers in committed artifacts.

## Decision log (most recent last)

- Stack: Next.js + TS + Tailwind. Storage: AT Protocol (user's PDS). LLM:
  OpenRouter.
- LLM key: **BYOK** (browser-stored, per-request) — replaced the original
  server-env-var design. App is multi-tenant by default; each user pays their own
  usage.
- atproto OAuth as a **public client** (no keyset) to avoid key management; can be
  upgraded to confidential later.
- Messages **embedded** in the chatNode record (simpler reads; atproto
  `listRecords` has no field filtering). ~1 MB record ceiling is the known limit;
  future scaling path is a separate `app.gaston.message` collection.
- Assistant replies render **Markdown**; highlight offsets moved to rendered-text
  coordinates to keep dig-in working over markup.
- Chat scroll: pin-to-bottom auto-follow (don't yank while reading).
- Project pushed straight to `main`, no PR (owner preference).

## Preferences (owner)

- Don't create PRs unless explicitly requested.
- Verify changes by actually running the app (prod build) and observing behavior,
  not just by building — include concrete verification when reporting.
- Keep secrets out of git; BYOK key stays client-side only.

## Updating this document

Treat this file as living documentation. **When you make a change that future
agents should not have to rediscover, update the relevant section here in the
same change (commit) that makes it.** Specifically:

- **New/changed feature, file move, or data-model change** → update "Key files",
  "Data model", and/or "Architecture".
- **A decision or trade-off** (library choice, approach, something you rejected
  and why) → append a dated-by-order bullet to the **Decision log**.
- **A non-obvious gotcha / footgun you hit** → add it to "Conventions & gotchas"
  so the next agent avoids it.
- **An owner instruction about how they like things done** → add/adjust
  "Preferences".
- Keep it **scannable and current**: prefer editing an existing line over piling
  on; delete statements that have become false. Don't enumerate every file or
  line number — describe patterns and name representative paths.
- This doc must stay **self-contained** (an agent reading only this should be
  oriented) and must not contain secrets.
