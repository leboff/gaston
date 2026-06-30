# Gaston

Chat with an LLM and **dig in**. Highlight any word or phrase in a message and
spin off a new sub-chat anchored to that exact text. The phrase you highlighted
stays marked in the parent (click it to dive back in), and a breadcrumb trail
lets you climb back out. Nest as deep as you like — a sub-chat's replies can be
highlighted to go deeper still.

- **Nested, linked chats.** Highlight → "Dig in ↳" → a child chat scoped to that
  phrase, seeded with the surrounding context.
- **Your data, your repo.** Chats are stored as records in your own
  [AT Protocol](https://atproto.com) PDS (the network behind Bluesky) — not in
  an app database. Sign in with your Bluesky / atproto handle.
- **Bring your own key (BYOK).** Use any model on
  [OpenRouter](https://openrouter.ai). Your API key is stored only in your
  browser and sent with each request — never saved on the server.

## How it works

| Concern | Approach |
| --- | --- |
| UI | Next.js (App Router) + TypeScript + Tailwind |
| Auth | atproto OAuth (`@atproto/oauth-client-node`); a small SQLite file holds **only** OAuth tokens |
| Chat storage | Custom lexicon `app.gaston.chatNode` records written to your PDS repo |
| LLM | OpenRouter, proxied server-side so streaming + attribution headers stay consistent; your key never touches server storage |

Each chat is a `chatNode` record holding its messages and, for sub-chats, an
`anchor` (the parent message id + the highlighted text + its UTF-16 offsets).
The whole tree is rebuilt on load by linking each node's `parent`, so
breadcrumbs and highlights restore exactly. See
[`lexicons/app/gaston/chatNode.json`](lexicons/app/gaston/chatNode.json).

## Getting started

Requires Node 18+.

```bash
npm install
cp .env.example .env.local        # then edit .env.local (see below)
npm run dev
```

Open **http://127.0.0.1:3000** (use `127.0.0.1`, not `localhost` — atproto's
local development client requires a loopback IP for the redirect).

Sign in with your Bluesky / atproto handle, open **Settings**, paste your
OpenRouter key (from <https://openrouter.ai/keys>), pick a model, and start
chatting. Highlight any part of a reply to branch off.

### Environment

`.env.local` (see [`.env.example`](.env.example)):

- `COOKIE_SECRET` — ≥32-char secret for the session cookie. Generate with
  `openssl rand -base64 32`.
- `PUBLIC_URL` — app origin. Leave as `http://127.0.0.1:3000` for local dev.
  In production set it to your public HTTPS origin; the app then serves its
  OAuth client metadata at `<PUBLIC_URL>/oauth/client-metadata.json`.

There is **no** OpenRouter key in the environment — it's BYOK, entered per-user
in the browser.

## Notes & limits

- **Multi-tenant by default.** Every user signs in with their own atproto
  identity and pays for their own OpenRouter usage with their own key.
- **Record size.** Messages are embedded in each node record, which has an
  atproto size ceiling (~1 MB). Fine for normal chats; a very long single
  conversation could approach it. The scaling path is to split messages into a
  separate `app.gaston.message` collection.
- **Public OAuth client.** Uses `token_endpoint_auth_method: "none"` (no keyset
  to manage). Adding a keyset would upgrade it to a confidential client with
  longer-lived sessions.
- **Production scripts:** `npm run build` then `npm start`.

> Heads up: in local `next dev`, hot-reload relies on a websocket that some
> proxies block; if the page hangs on "Loading…", run a production build
> (`npm run build && npm start`) instead.
