# =============================================================================
# Dockerfile — Next.js (node:22-alpine + pnpm@10.11.1)
# node:22-alpine  →  Node.js v22 LTS (requiere pnpm >= 9, compatible con 10/11)
# pnpm@10.11.1    →  última versión con soporte oficial Node 20 y 22
# Multi-stage: deps → builder → runner
# =============================================================================

# ── Stage 1: dependencias ─────────────────────────────────────────────────────
FROM node:22-alpine AS deps

# Instalar pnpm con versión fija — no usar corepack prepare pnpm@latest
# porque resuelve la última versión en build-time y puede romper con cambios de API
RUN corepack enable \
 && corepack prepare pnpm@10.11.1 --activate

WORKDIR /app

COPY package.json .npmrc* ./

RUN pnpm install --no-frozen-lockfile

# ── Stage 2: build de producción ──────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable \
 && corepack prepare pnpm@10.11.1 --activate

WORKDIR /app

# Variables públicas de Next.js
# Railway las inyecta como Build Variables si las definís en el proyecto
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# ── Stage 3: imagen de producción mínima ──────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public                               ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
