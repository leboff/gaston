# Deploying Gaston with Dokploy

Gaston ships as a Docker image built from the repo's [`Dockerfile`](./Dockerfile)
(Next.js 16 standalone output). These steps cover a [Dokploy](https://dokploy.com)
deploy, but any Docker host works the same way.

## What you need

- A domain pointed at your Dokploy server (PWA install **and** atproto OAuth both
  require HTTPS).
- Two environment variables:
  - `COOKIE_SECRET` — ≥32 chars, encrypts the session cookie.
    Generate: `openssl rand -base64 32`
  - `PUBLIC_URL` — the public **HTTPS** origin, e.g. `https://gaston.example.com`.
    This drives the atproto OAuth client metadata + redirect URI, so it **must**
    exactly match the domain you serve on, or login breaks.
- A persistent volume mounted at `/app/data` (holds `auth.sqlite`, the atproto
  OAuth token store). Without it, every redeploy logs all users out.

> Note: there is **no** OpenRouter API key on the server — Gaston is BYOK; each
> user pastes their own key into the in-app Settings panel.

## Option A — Dockerfile (Application)

1. **Create Application** in Dokploy → source = this Git repo, branch = your
   deploy branch.
2. **Build Type**: `Dockerfile` (path `./Dockerfile`).
3. **Environment** → add:
   ```
   COOKIE_SECRET=<output of: openssl rand -base64 32>
   PUBLIC_URL=https://gaston.example.com
   ```
4. **Volumes / Mounts** → add a persistent volume → mount path `/app/data`.
5. **Domains** → add your domain, target port **3000**, enable HTTPS
   (Let's Encrypt).
6. **Deploy**.

## Option B — Docker Compose

Dokploy can also deploy [`docker-compose.yml`](./docker-compose.yml) directly
(Compose app type). It already declares the `gaston-data` volume on `/app/data`
and a healthcheck. Provide `COOKIE_SECRET` and `PUBLIC_URL` as environment
variables, add your domain pointing at port 3000, enable HTTPS, and deploy.

## Verify

- App loads over HTTPS at your domain.
- `GET /api/me` → `{"did":null}` when logged out (server + SQLite are healthy).
- `GET /manifest.webmanifest` and `GET /sw.js` are served (PWA installable —
  look for the browser's install prompt / "Add to Home Screen").
- Log in with a Bluesky/atproto account; the redirect returns to your domain.

## Local Docker smoke test

```bash
docker build -t gaston .
docker run --rm -p 3000:3000 \
  -e COOKIE_SECRET="$(openssl rand -base64 32)" \
  -e PUBLIC_URL="http://127.0.0.1:3000" \
  -v gaston-data:/app/data \
  gaston
# then: curl -s http://127.0.0.1:3000/api/me  -> {"did":null}
```

(Local OAuth login needs the loopback host `http://127.0.0.1:3000`, not
`localhost` — see `AGENTS.md`.)
