#!/usr/bin/env bash
# =============================================================================
# 4-dashboard-front.sh
# Agrega app/auth/sso/page.tsx al dashboard-front.
# Necesario cuando real-front y dashboard-front corren en DOMINIOS DISTINTOS
# (localStorage no se comparte entre dominios).
# Sin Python — solo cat.
#
# Flujo en multi-dominio:
#   real-front → obtiene tokens del dashboard-back
#   real-front → redirige a: dashboard-front.com/auth/sso?token=X&refresh=Y
#   esta página → guarda tokens en localStorage del dashboard-front
#   esta página → redirige a /dashboard
#
# USO:
#   cd <raiz-de-dashboard-front>
#   bash 4-dashboard-front.sh
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓  $*${NC}"; }
warn() { echo -e "${YELLOW}  ⚠  $*${NC}"; }
fail() { echo -e "${RED}  ✗  $*${NC}"; exit 1; }
step() { echo -e "\n${BLUE}── $* ──────────────────────────────${NC}"; }

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║  dashboard-front — página entrada SSO    ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

[[ -f "package.json" ]] || fail "Corré desde la raíz de dashboard-front"
[[ -d "app" ]]          || fail "No encontré el directorio app/"

# ─── 1. Layout sin guard para /auth/* ────────────────────────────────────────
step "1/3  app/auth/layout.tsx"

mkdir -p app/auth

if [[ -f "app/auth/layout.tsx" ]]; then
  warn "app/auth/layout.tsx ya existe — saltando"
else
  cat > app/auth/layout.tsx << 'EOF'
// app/auth/layout.tsx
// Layout para rutas de auth (/auth/sso, etc.)
// No aplica guard de autenticación — es intencional.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
EOF
  ok "app/auth/layout.tsx creado (sin guards)"
fi

# ─── 2. Página /auth/sso ─────────────────────────────────────────────────────
step "2/3  app/auth/sso/page.tsx"

mkdir -p app/auth/sso

if [[ -f "app/auth/sso/page.tsx" ]]; then
  warn "app/auth/sso/page.tsx ya existe — saltando"
else
  cat > app/auth/sso/page.tsx << 'EOF'
// app/auth/sso/page.tsx
// Recibe tokens SSO por query params desde real-front,
// los guarda en localStorage y redirige a /dashboard.
//
// URL de entrada:
//   /auth/sso?token=<accessToken>&refresh=<refreshToken>
//
// Necesario cuando ambas apps corren en dominios distintos.
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type State = 'processing' | 'success' | 'error';

export default function SsoEntryPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [state,  setState]  = useState<State>('processing');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const token   = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (!token || !refresh) {
      setState('error');
      setErrMsg('Parámetros de autenticación faltantes. Volvé al sistema principal.');
      return;
    }

    try {
      localStorage.setItem('accessToken',  token);
      localStorage.setItem('refreshToken', refresh);
      setState('success');
      // replace para no dejar /auth/sso en el historial
      setTimeout(() => router.replace('/dashboard'), 600);
    } catch {
      setState('error');
      setErrMsg('Error al guardar la sesión. Intentá nuevamente.');
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      {state === 'processing' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Iniciando sesión...</p>
        </>
      )}
      {state === 'success' && (
        <>
          <CheckCircle className="h-10 w-10 text-emerald-500" />
          <p className="text-sm text-muted-foreground">Sesión iniciada. Redirigiendo...</p>
        </>
      )}
      {state === 'error' && (
        <>
          <XCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium text-foreground">Error de autenticación</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs">{errMsg}</p>
          <button onClick={() => window.history.back()} className="mt-2 text-xs text-primary hover:underline">
            Volver
          </button>
        </>
      )}
    </main>
  );
}
EOF
  ok "app/auth/sso/page.tsx creado"
fi

# ─── 3. Actualizar hook en real-front (instrucciones) ────────────────────────
step "3/3  Instrucciones para multi-dominio en real-front"

echo ""
echo -e "${YELLOW}  Si real-front y dashboard-front corren en DOMINIOS DISTINTOS:${NC}"
echo "  Editá hooks/use-dashboard-sso.ts en real-front."
echo "  Reemplazá la línea del redirect:"
echo ""
echo "    // ANTES (mismo dominio — localStorage compartido):"
echo "    window.location.href = \`\${DASHBOARD_FRONT_URL}/dashboard\`"
echo ""
echo "    // DESPUÉS (dominios distintos — pasar tokens por URL):"
echo "    const ssoUrl = new URL(\`\${DASHBOARD_FRONT_URL}/auth/sso\`)"
echo "    ssoUrl.searchParams.set('token',   tokens.accessToken)"
echo "    ssoUrl.searchParams.set('refresh', tokens.refreshToken)"
echo "    window.location.href = ssoUrl.toString()"
echo ""
echo -e "${YELLOW}  Si ambas apps corren en localhost (mismo dominio):${NC}"
echo "  No hace falta tocar nada — el script 3-real-front.sh ya es suficiente."
echo ""

echo -e "${GREEN}══ dashboard-front listo ═════════════════════════════════════${NC}"
echo "  Archivos creados:"
echo "    app/auth/layout.tsx      (layout sin guards)"
echo "    app/auth/sso/page.tsx    (entrada SSO por query params)"
echo ""
echo "  Ruta disponible:"
echo "    GET /auth/sso?token=<accessToken>&refresh=<refreshToken>"
echo ""
echo "  → pnpm dev"
echo ""