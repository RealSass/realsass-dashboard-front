#!/usr/bin/env bash
# =============================================================================
# 4-dashboard-front.sh  —  reescribe archivos completos, sin sed ni awk
# USO: cd <raiz-de-dashboard-front> && bash 4-dashboard-front.sh
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
step "1/2  app/auth/layout.tsx"
mkdir -p app/auth

cat > app/auth/layout.tsx << 'EOF'
// app/auth/layout.tsx
// Sin guard de autenticación — necesario para que /auth/sso sea accesible
// sin token previo.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
EOF
ok "app/auth/layout.tsx"

# ─── 2. Página /auth/sso ─────────────────────────────────────────────────────
step "2/2  app/auth/sso/page.tsx"
mkdir -p app/auth/sso

# IMPORTANTE: useSearchParams requiere Suspense en Next.js 13+
# El componente interno usa useSearchParams; el default export lo envuelve en Suspense.
cat > app/auth/sso/page.tsx << 'EOF'
// app/auth/sso/page.tsx
// Recibe accessToken + refreshToken por query params desde real-front,
// los guarda en localStorage y redirige a /dashboard.
//
// Necesario cuando real-front y dashboard-front corren en dominios distintos
// (localStorage no se comparte entre dominios).
//
// URL de entrada:
//   /auth/sso?token=<accessToken>&refresh=<refreshToken>
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type State = 'processing' | 'success' | 'error';

// Componente interno que usa useSearchParams (debe estar dentro de Suspense)
function SsoHandler() {
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
          <button
            onClick={() => window.history.back()}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Volver
          </button>
        </>
      )}
    </main>
  );
}

// Default export envuelto en Suspense — requerido por Next.js para useSearchParams
export default function SsoEntryPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </main>
      }
    >
      <SsoHandler />
    </Suspense>
  );
}
EOF
ok "app/auth/sso/page.tsx"

echo ""
echo -e "${GREEN}══ dashboard-front listo ═════════════════════════════════════${NC}"
echo "  Archivos creados:"
echo "    app/auth/layout.tsx"
echo "    app/auth/sso/page.tsx  (con Suspense — fix del error de build)"
echo ""
echo "  Ruta: GET /auth/sso?token=<accessToken>&refresh=<refreshToken>"
echo ""
echo "  Solo necesitás este script si real-front y dashboard-front"
echo "  corren en DOMINIOS DISTINTOS. En localhost no hace falta."
echo ""
echo "  Si lo usás, actualizá hooks/use-dashboard-sso.ts en real-front:"
echo "    Reemplazá:"
echo "      window.location.href = DASHBOARD_FRONT_URL + '/dashboard'"
echo "    Por:"
echo "      const u = new URL(DASHBOARD_FRONT_URL + '/auth/sso')"
echo "      u.searchParams.set('token',   tokens.accessToken)"
echo "      u.searchParams.set('refresh', tokens.refreshToken)"
echo "      window.location.href = u.toString()"
echo ""
echo "  → pnpm dev"
echo ""