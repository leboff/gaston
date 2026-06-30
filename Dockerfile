# syntax=docker/dockerfile:1

# Multi-stage build for Gaston (Next.js 16, standalone output).
# Debian-slim (glibc) base so better-sqlite3 can use its prebuilt binary;
# build toolchain is present in the deps stage as a fallback for source compile.

ARG NODE_VERSION=22-bookworm-slim

# --- deps: install node_modules (with native build fallback) ---
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

# --- builder: compile the Next.js standalone bundle ---
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Produce the standalone server bundle (see next.config.ts gate).
ENV BUILD_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner: minimal runtime image ---
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone server + its statically traced assets.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Defensive: ensure the native better-sqlite3 module (and its .node binary) is
# present even if output-file-tracing missed it.
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

# Writable dir for the atproto OAuth SQLite store (mount a volume here in prod).
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.js"]
