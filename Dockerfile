# syntax=docker/dockerfile:1

# Debian slim rather than Alpine: @node-rs/argon2 ships a prebuilt glibc binary,
# and this keeps the container on the same libc as Vercel's runtime.
FROM node:22-bookworm-slim AS base


# ── deps ─────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci


# ── builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next/font/google downloads and self-hosts the typefaces at BUILD time, so this
# stage needs network access. The running container never calls out to a CDN.
ENV NEXT_TELEMETRY_DISABLED=1

# No DATABASE_URL / AUTH_SECRET placeholders needed: the Drizzle client connects
# lazily on first use (see src/lib/db/index.ts), so the build never requires
# credentials it would not connect with anyway.
RUN npm run build


# ── runner ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs delver

# `output: "standalone"` traces exactly the files the server needs, so no
# node_modules copy is required here.
COPY --from=builder --chown=delver:nodejs /app/.next/standalone ./
COPY --from=builder --chown=delver:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=delver:nodejs /app/public ./public

# Chronicles are bind-mounted here in Compose so you can read them from the host.
RUN mkdir -p /data/campaigns && chown -R delver:nodejs /data
VOLUME /data

USER delver
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
