# Deploying Gaston with Dokploy

Gaston ships as a Docker image built from the repo's [`Dockerfile`](./Dockerfile)
(Next.js 16 standalone output). These steps cover a [Dokploy](https://dokploy.com)
deploy, but any Docker host works the same way.

> **Deploy gaston as a dokploy "Docker Compose" service, not an "Application."**
> Dokploy runs Applications as Docker **Swarm services**, which route through a
> Swarm VIP / overlay load balancer. On some hosts that overlay LB fails to
> register the backend, so Traefik returns **502** even though the container is
> healthy (reachable by its direct container IP but not via the service VIP).
> Symptoms: `curl -H 'Host: <domain>' http://localhost:80` → 502 on the host,
> while `curl http://<container-ip>:3000/api/me` → 200. Compose deploys gaston as
> a plain container that Traefik reaches by **direct DNS** — no Swarm VIP. See
> [Option A](#option-a--docker-compose-recommended).

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

## Option A — Docker Compose (recommended)

Uses [`docker-compose.yml`](./docker-compose.yml), which attaches gaston to the
external `dokploy-network` so Traefik routes to it by direct container DNS (no
Swarm VIP — see the note above).

1. **Create service** in Dokploy → **Docker Compose** → source = this Git repo,
   branch = your deploy branch, compose path `./docker-compose.yml`.
2. **Environment** → add:
   ```
   COOKIE_SECRET=<output of: openssl rand -base64 32>
   PUBLIC_URL=https://gaston.example.com
   ```
   (`docker-compose.yml` reads both via `${...}`.)
3. **Domains** → add your domain, **Service = `gaston`**, **Container Port =
   3000**. Behind a Cloudflare tunnel, leave dokploy's HTTPS/cert **off** and let
   Cloudflare terminate TLS; otherwise enable Let's Encrypt.
4. **Deploy**. The `gaston-data` volume persists `/app/data` across redeploys.

If you already deployed gaston as an Application and are getting 502s, delete
that Application and recreate it as a Compose service as above (the Swarm service
and its broken VIP go away with it).

## Option B — Dockerfile (Application)

> Only if your host's Swarm overlay LB is healthy. If you hit 502s, switch to
> Option A.

1. **Create Application** in Dokploy → source = this Git repo, branch = your
   deploy branch.
2. **Build Type**: `Dockerfile` (path `./Dockerfile`).
3. **Environment** → add `COOKIE_SECRET` and `PUBLIC_URL` (as above).
4. **Volumes / Mounts** → add a persistent volume → mount path `/app/data`.
5. **Domains** → add your domain, target port **3000**, HTTPS per your setup.
6. **Deploy**.

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
