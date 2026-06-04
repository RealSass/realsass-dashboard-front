#!/usr/bin/env bash
# =============================================================================
# fix-railway-dashboard-front.sh
#
# Problema:  pnpm-workspace.yaml existe con solo "allowBuilds: sharp: true"
#            sin campo "packages" → Railway activa el path de monorepo y falla
#            con "packages field missing or empty".
#
# Solución:
#   1. Elimina pnpm-workspace.yaml y mueve allowBuilds a .npmrc
#   2. Inyecta output: 'standalone' en next.config.mjs (necesario para Dockerfile)
#   3. Crea Dockerfile multi-stage (deps → builder → runner)
#   4. Crea railway.json forzando builder Dockerfile
#   5. Crea .dockerignore
#   6. Regenera pnpm-lock.yaml limpio
#
# USO:
#   chmod +x fix-railway-dashboard-front.sh
#   ./fix-railway-dashboard-front.sh
#
# PREREQUISITO: estar en la raíz del proyecto real-dashboard-front con pnpm instalado.
# =============================================================================

set -e
set -o pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Validaciones ─────────────────────────────────────────────────────────────
[ -f "package.json" ]         || err "Correr desde la raíz del proyecto real-dashboard-front"
command -v pnpm &>/dev/null   || err "pnpm no encontrado. Instalar: npm i -g pnpm"
grep -q '"next"' package.json || err "No parece ser un proyecto Next.js"

# ─── 1. Eliminar pnpm-workspace.yaml ─────────────────────────────────────────
log "Paso 1 — Eliminando pnpm-workspace.yaml..."

if [ -f "pnpm-workspace.yaml" ]; then
  rm pnpm-workspace.yaml
  ok "pnpm-workspace.yaml eliminado"
else
  warn "pnpm-workspace.yaml no encontrado — ya fue eliminado"
fi

# ─── 2. Escribir .npmrc ───────────────────────────────────────────────────────
log "Paso 2 — Escribiendo .npmrc..."

cat > .npmrc << 'NPMRC'
# Permite script de build para Sharp (procesamiento de imágenes Next.js)
allow-build[]=sharp
fund=false
update-notifier=false
NPMRC

ok ".npmrc escrito"

# ─── 3. Inyectar output:standalone en next.config.mjs ────────────────────────
log "Paso 3 — Agregando output:standalone a next.config.mjs..."

CONFIG_FILE=""
[ -f "next.config.mjs" ] && CONFIG_FILE="next.config.mjs"
[ -f "next.config.ts"  ] && CONFIG_FILE="next.config.ts"
[ -f "next.config.js"  ] && CONFIG_FILE="next.config.js"

if [ -z "$CONFIG_FILE" ]; then
  warn "No se encontró next.config — creando next.config.mjs mínimo con standalone"
  cat > next.config.mjs << 'NEXTCONF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}
export default nextConfig
NEXTCONF
  ok "next.config.mjs creado"
else
  if grep -q "output.*standalone" "$CONFIG_FILE"; then
    ok "output:standalone ya presente en $CONFIG_FILE"
  else
    # Inyectar como primera propiedad dentro de nextConfig = {
    sed -i "s/const nextConfig = {/const nextConfig = {\n  output: 'standalone',/" "$CONFIG_FILE"
    ok "output:standalone inyectado en $CONFIG_FILE"
  fi
fi

# ─── 4. Crear Dockerfile multi-stage ─────────────────────────────────────────
log "Paso 4 — Creando Dockerfile..."

cat > Dockerfile << 'DOCKERFILE'
# =============================================================================
# Dockerfile — real-dashboard-front (Next.js)
# Multi-stage: deps → builder → runner
# =============================================================================

# ── Stage 1: dependencias ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json .npmrc ./
RUN pnpm install --no-frozen-lockfile

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Variables públicas de Next.js (inyectadas como build args en Railway)
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

# ── Stage 3: runner mínimo ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public                              ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
DOCKERFILE

ok "Dockerfile creado"

# ─── 5. railway.json ──────────────────────────────────────────────────────────
log "Paso 5 — Creando railway.json..."

cat > railway.json << 'RAILWAYJSON'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
RAILWAYJSON

ok "railway.json creado"

# ─── 6. .dockerignore ─────────────────────────────────────────────────────────
log "Paso 6 — Creando .dockerignore..."

cat > .dockerignore << 'DOCKERIGNORE'
node_modules
.pnpm-store
.next
out
.env
.env.local
.env.*.local
.git
.gitignore
*.md
README*
.github
Dockerfile*
.dockerignore
railway.json
__tests__
*.test.ts
*.test.tsx
*.spec.ts
*.spec.tsx
coverage
.DS_Store
Thumbs.db
DOCKERIGNORE

ok ".dockerignore creado"

# ─── 7. Regenerar pnpm-lock.yaml ─────────────────────────────────────────────
log "Paso 7 — Regenerando pnpm-lock.yaml..."
pnpm install --no-frozen-lockfile
ok "pnpm-lock.yaml regenerado"

# ─── Resumen ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Fix completado — real-dashboard-front${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "  ${YELLOW}ELIMINADO${NC}   pnpm-workspace.yaml"
echo -e "  ${GREEN}CREADO${NC}      .npmrc"
echo -e "  ${GREEN}MODIFICADO${NC}  next.config.mjs  (+ output: 'standalone')"
echo -e "  ${GREEN}CREADO${NC}      Dockerfile"
echo -e "  ${GREEN}CREADO${NC}      railway.json"
echo -e "  ${GREEN}CREADO${NC}      .dockerignore"
echo -e "  ${GREEN}CREADO${NC}      pnpm-lock.yaml   (regenerado)"
echo ""
echo -e "${BLUE}Próximos pasos:${NC}"
echo -e "  1. git add -A"
echo -e "  2. git commit -m 'fix: railway deploy dashboard — remove workspace.yaml, add Dockerfile'"
echo -e "  3. git push"
echo -e "  4. En Railway → Variables agregar: NEXT_PUBLIC_API_URL y NEXT_PUBLIC_FIREBASE_*"
echo ""