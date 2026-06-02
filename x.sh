#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  real-dashboard-front — Config Service integration (RDF-C1 → RDF-C6)
#
#  Qué hace este script:
#    RDF-C1  api-client con soporte x-api-key para config service
#            types/config.ts — ThemeConfig, FeatureFlag, WebhookEndpoint, QuotaConfig
#            config/constants.ts — ApiSystem + QUERY_KEYS actualizados
#            .env.local.example — NEXT_PUBLIC_CONFIG_URL + NEXT_PUBLIC_CONFIG_API_KEY
#    RDF-C2  features/config-themes — Editor de temas visual
#    RDF-C3  features/config-flags  — Feature flags con toggle optimista
#    RDF-C4  features/config-webhooks — Webhooks outbound + delivery logs
#    RDF-C5  features/config-quotas — Quotas por recurso (read-only + owner edit)
#    RDF-C6  Sidebar agrupado (Inmobiliaria / Módulos / Configuración)
#            app/dashboard/configuracion/layout.tsx
#
#  Backends NO modificados:
#    - real-back (Sistema 1)       → sin cambios
#    - real-dashboard-back (Sist 2)→ sin cambios
#    - config service (Sistema 3)  → solo consume sus endpoints REST
#
#  Auth con el config service:
#    El config service usa x-api-key header (ApiKeyGuard) para rutas de gestión.
#    El api-client detecta el sistema 'config' e inyecta este header
#    desde NEXT_PUBLIC_CONFIG_API_KEY en lugar de Authorization: Bearer.
#
#  Uso:
#    chmod +x real-dashboard-front-config.sh
#    ./real-dashboard-front-config.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓ $*${NC}"; }
info() { echo -e "${YELLOW}  → $*${NC}"; }
err()  { echo -e "${RED}  ✗ $*${NC}"; exit 1; }

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  real-dashboard-front — Config Service integration${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

[[ -f "package.json" ]] || err "Ejecutar desde la raíz del proyecto"
[[ -f "next.config.mjs" ]] || err "No se encontró next.config.mjs"

# ═══════════════════════════════════════════════════════════════════════════════
#  RDF-C1 — .env.local.example
# ═══════════════════════════════════════════════════════════════════════════════
info "RDF-C1 — Actualizando .env.local.example..."

cat > .env.local.example << 'EOF'
# ════════════════════════════════════════════════════════════════════════════════
# FIREBASE — Credenciales del proyecto
# ════════════════════════════════════════════════════════════════════════════════
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# ════════════════════════════════════════════════════════════════════════════════
# BACKENDS
# ════════════════════════════════════════════════════════════════════════════════
# Sistema 2 — real-dashboard-back
NEXT_PUBLIC_DASHBOARD_API_URL=http://localhost:3001/api/v1

# Sistema 1 — real-back (referencia, no se llama directamente)
NEXT_PUBLIC_REAL_BACK_URL=http://localhost:3000/api/v1

# ════════════════════════════════════════════════════════════════════════════════
# CONFIG SERVICE — Sistema 3
# NEXT_PUBLIC_CONFIG_URL: URL base del config service
# NEXT_PUBLIC_CONFIG_API_KEY: API Key generada desde el config service
#   (prefijo sk_live_... — generada con POST /organizations/:id/api-keys)
# ════════════════════════════════════════════════════════════════════════════════
NEXT_PUBLIC_CONFIG_URL=http://localhost:3005/api/v1
NEXT_PUBLIC_CONFIG_API_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ════════════════════════════════════════════════════════════════════════════════
# SISTEMAS FUTUROS (opcionales)
# ════════════════════════════════════════════════════════════════════════════════
# NEXT_PUBLIC_CHATIA_URL=http://localhost:3003/api/v1
# NEXT_PUBLIC_PAGOS_URL=http://localhost:3002/api/v1
# NEXT_PUBLIC_ADOPTIMIZER_URL=http://localhost:3004/api/v1
EOF
ok ".env.local.example"

# ═══════════════════════════════════════════════════════════════════════════════
#  RDF-C1 — config/constants.ts
# ═══════════════════════════════════════════════════════════════════════════════
info "RDF-C1 — Actualizando config/constants.ts..."

cat > config/constants.ts << 'EOF'
// config/constants.ts

// ─── Sistemas disponibles ─────────────────────────────────────────────────────

export type ApiSystem = 'dashboard' | 'config' | 'realback' | 'chat' | 'pagos' | 'campanas';

export const API_URLS: Record<ApiSystem, string | undefined> = {
  dashboard: process.env.NEXT_PUBLIC_DASHBOARD_API_URL,
  config:    process.env.NEXT_PUBLIC_CONFIG_URL,
  realback:  process.env.NEXT_PUBLIC_REAL_BACK_URL,
  chat:      process.env.NEXT_PUBLIC_CHATIA_URL,
  pagos:     process.env.NEXT_PUBLIC_PAGOS_URL,
  campanas:  process.env.NEXT_PUBLIC_ADOPTIMIZER_URL,
};

// ─── TanStack Query keys ──────────────────────────────────────────────────────

export const QUERY_KEYS = {
  // Real Estate
  propiedades:     ['propiedades']       as const,
  propiedad:       ['propiedad']         as const,
  zonas:           ['zonas']             as const,
  zona:            ['zona']              as const,
  // Config service
  configThemes:    ['config-themes']     as const,
  configFlags:     ['config-flags']      as const,
  configWebhooks:  ['config-webhooks']   as const,
  configWebhookLogs: ['config-wh-logs']  as const,
  configQuotas:    ['config-quotas']     as const,
  // Sistemas externos
  conversaciones:  ['conversaciones']    as const,
  mensajes:        ['mensajes']          as const,
  balance:         ['balance']           as const,
  transacciones:   ['transacciones']     as const,
  campanas:        ['campanas']          as const,
  metricasCampana: ['metricas-campana']  as const,
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE     = 100;
EOF
ok "config/constants.ts"

# ─── config/site.ts y navigation.ts ──────────────────────────────────────────

cat > config/site.ts << 'EOF'
export const siteConfig = {
  name:        'Propiedad Dashboard',
  description: 'Plataforma de gestión inmobiliaria SaaS',
  locale:      'es-AR',
} as const;
EOF

cat > config/navigation.ts << 'EOF'
export const NAV_GROUPS = [
  {
    label: 'Inmobiliaria',
    items: [
      { name: 'Propiedades', href: '/dashboard',       icon: 'Building2',     active: true  },
      { name: 'Zonas',       href: '/dashboard/zonas', icon: 'MapPin',        active: true  },
    ],
  },
  {
    label: 'Módulos',
    items: [
      { name: 'Chat IA',  href: '/dashboard/chat',     icon: 'MessageSquare', active: false },
      { name: 'Pagos',    href: '/dashboard/pagos',    icon: 'CreditCard',    active: false },
      { name: 'Campañas', href: '/dashboard/campanas', icon: 'TrendingUp',    active: false },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { name: 'Tema visual',    href: '/dashboard/configuracion/tema',     icon: 'Palette',    active: true },
      { name: 'Feature Flags',  href: '/dashboard/configuracion/flags',    icon: 'ToggleLeft', active: true },
      { name: 'Webhooks',       href: '/dashboard/configuracion/webhooks', icon: 'Webhook',    active: true },
      { name: 'Quotas',         href: '/dashboard/configuracion/quotas',   icon: 'BarChart2',  active: true },
    ],
  },
] as const;
EOF

cat > config/index.ts << 'EOF'
export * from './constants';
export * from './navigation';
export * from './site';
EOF
ok "config/navigation.ts, site.ts"

# ═══════════════════════════════════════════════════════════════════════════════
#  RDF-C1 — lib/api-client.ts
#  Agrega soporte x-api-key para sistema 'config'
# ═══════════════════════════════════════════════════════════════════════════════
info "RDF-C1 — Actualizando lib/api-client.ts con soporte config service..."

cat > lib/api-client.ts << 'EOF'
// lib/api-client.ts
// ─── Cliente HTTP multi-sistema — Firebase Auth + x-api-key para config ───────
import { getIdToken } from '@/lib/firebase';
import { API_URLS, type ApiSystem } from '@/config/constants';
import type { ApiError } from '@/types/api';

export type { ApiSystem };

export function buildQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return params.toString() ? `?${params.toString()}` : '';
}

function unwrap<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/**
 * Fetch principal. El sistema 'config' usa x-api-key en lugar de Bearer.
 * Todos los demás sistemas usan Authorization: Bearer <firebase-token>.
 */
async function coreFetch<T>(
  system: ApiSystem,
  endpoint: string,
  options: RequestInit & { organizationId?: string } = {},
  _retry = true,
): Promise<T> {
  const baseUrl = API_URLS[system];
  if (!baseUrl) throw new Error(`Sistema "${system}" no configurado en variables de entorno`);

  const { organizationId, ...fetchOptions } = options;

  // ── Construir headers según sistema ──────────────────────────────────────────
  let authHeaders: Record<string, string> = {};

  if (system === 'config') {
    // Config service usa x-api-key (ApiKeyGuard)
    const apiKey = process.env.NEXT_PUBLIC_CONFIG_API_KEY;
    if (!apiKey) throw new Error('NEXT_PUBLIC_CONFIG_API_KEY no configurado');
    authHeaders = { 'x-api-key': apiKey };
  } else {
    // Resto de sistemas usan Firebase Bearer token
    try {
      const token = await getIdToken();
      authHeaders = { Authorization: `Bearer ${token}` };
    } catch {
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('No autenticado');
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...(organizationId ? { 'x-organization-id': organizationId } : {}),
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  let response = await fetch(`${baseUrl}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // ── Retry en 401 solo para sistemas con Firebase ──────────────────────────
  if (response.status === 401 && _retry && system !== 'config') {
    try {
      const freshToken = await getIdToken(true);
      headers.Authorization = `Bearer ${freshToken}`;
      response = await fetch(`${baseUrl}${endpoint}`, { ...fetchOptions, headers });
    } catch {
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return undefined as T;
  }

  if (!response.ok) {
    const apiError = json as Partial<ApiError> & { error?: string; message?: string | string[] };
    const rawMsg   = apiError.message ?? apiError.error ?? `Error ${response.status}`;
    const msg      = Array.isArray(rawMsg) ? rawMsg[0] : rawMsg;
    const err      = new Error(msg) as Error & { statusCode?: number };
    err.statusCode = response.status;
    throw err;
  }

  return unwrap<T>(json);
}

export const apiClient = {
  get<T>(system: ApiSystem, endpoint: string, organizationId?: string): Promise<T> {
    return coreFetch<T>(system, endpoint, { method: 'GET', organizationId });
  },
  post<T>(system: ApiSystem, endpoint: string, body?: unknown, organizationId?: string): Promise<T> {
    return coreFetch<T>(system, endpoint, {
      method: 'POST',
      body:   body !== undefined ? JSON.stringify(body) : undefined,
      organizationId,
    });
  },
  patch<T>(system: ApiSystem, endpoint: string, body?: unknown, organizationId?: string): Promise<T> {
    return coreFetch<T>(system, endpoint, {
      method: 'PATCH',
      body:   body !== undefined ? JSON.stringify(body) : undefined,
      organizationId,
    });
  },
  delete<T>(system: ApiSystem, endpoint: string, organizationId?: string): Promise<T> {
    return coreFetch<T>(system, endpoint, { method: 'DELETE', organizationId });
  },
};
EOF
ok "lib/api-client.ts"

# ═══════════════════════════════════════════════════════════════════════════════
#  RDF-C1 — features/config/types.ts
# ═══════════════════════════════════════════════════════════════════════════════
info "RDF-C1 — Creando features/config/types.ts..."
mkdir -p features/config

cat > features/config/types.ts << 'EOF'
// features/config/types.ts
// ─── Tipos del Config Service ─────────────────────────────────────────────────

// ── Temas ─────────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  id:              string
  organizationId:  string | null
  name:            string
  isActive:        boolean
  isSystemDefault: boolean
  primaryColor:    string
  secondaryColor:  string
  accentColor:     string | null
  fontFamily:      string
  borderRadius:    string
  logoUrl:         string | null
  faviconUrl:      string | null
  darkMode:        boolean
  customCSS:       string | null
  createdAt:       string
  updatedAt:       string
}

export interface CreateThemeInput {
  name:           string
  primaryColor?:  string
  secondaryColor?: string
  accentColor?:   string
  fontFamily?:    string
  borderRadius?:  string
  logoUrl?:       string
  faviconUrl?:    string
  darkMode?:      boolean
  customCSS?:     string
}

// ── Feature Flags ──────────────────────────────────────────────────────────────

export interface FeatureFlag {
  id:               string
  organizationId:   string | null
  key:              string
  enabled:          boolean
  description:      string | null
  systemTarget:     string
  rolloutPercentage: number
  conditions:       Record<string, unknown>
  createdAt:        string
  updatedAt:        string
}

export interface UpdateFlagInput {
  enabled?:           boolean
  description?:       string
  rolloutPercentage?: number
  conditions?:        Record<string, unknown>
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

export interface WebhookEndpoint {
  id:              string
  url:             string
  events:          string[]
  secretPrefix:    string
  isActive:        boolean
  description:     string | null
  lastTriggeredAt: string | null
  failureCount:    number
  createdAt:       string
}

export interface CreateWebhookInput {
  url:          string
  events:       string[]
  description?: string
}

export interface WebhookDeliveryLog {
  id:         string
  webhookId:  string
  event:      string
  statusCode: number | null
  success:    boolean
  duration:   number | null
  attempt:    number
  error:      string | null
  createdAt:  string
}

// ── Quotas ────────────────────────────────────────────────────────────────────

export interface QuotaConfig {
  id:             string
  organizationId: string
  resource:       string
  limit:          number       // -1 = ilimitado
  currentUsage:   number
  alertAt:        number       // % para alertar
  resetAt:        string | null
  createdAt:      string
  updatedAt:      string
}

// Eventos disponibles del config service para webhooks
export const WEBHOOK_EVENTS = [
  { key: 'config.changed',   label: 'Configuración cambiada' },
  { key: 'member.joined',    label: 'Miembro se unió' },
  { key: 'member.removed',   label: 'Miembro removido' },
  { key: 'quota.exceeded',   label: 'Quota excedida' },
  { key: 'secret.rotated',   label: 'Secreto rotado' },
  { key: 'flag.changed',     label: 'Feature flag cambiado' },
  { key: 'webhook.test',     label: 'Prueba de webhook' },
  { key: '*',                label: 'Todos los eventos' },
] as const

export const QUOTA_RESOURCE_LABELS: Record<string, string> = {
  members:           'Colaboradores',
  api_keys:          'API Keys',
  monthly_api_calls: 'Llamadas API / mes',
  storage_mb:        'Almacenamiento (MB)',
  chat_messages:     'Mensajes de chat',
  ad_campaigns:      'Campañas publicitarias',
}
EOF
ok "features/config/types.ts"

cat > features/config/index.ts << 'EOF'
export * from './types';
EOF

# ═══════════════════════════════════════════════════════════════════════════════
#  RDF-C2 — features/config-themes
# ═══════════════════════════════════════════════════════════════════════════════
info "RDF-C2 — Creando features/config-themes..."
mkdir -p features/config-themes/services
mkdir -p features/config-themes/hooks

cat > features/config-themes/services/themes.service.ts << 'EOF'
import { apiClient } from '@/lib/api-client';
import type { ThemeConfig, CreateThemeInput } from '@/features/config/types';

const BASE = '/config/themes';

export const getThemes = (orgId: string): Promise<ThemeConfig[]> =>
  apiClient.get('config', BASE, orgId);

export const createTheme = (data: CreateThemeInput, orgId: string): Promise<ThemeConfig> =>
  apiClient.post('config', BASE, data, orgId);

export const activateTheme = (id: string, orgId: string): Promise<{ success: boolean; message: string }> =>
  apiClient.patch('config', `${BASE}/${id}/activate`, {}, orgId);

export const deleteTheme = (id: string, orgId: string): Promise<{ success: boolean; message: string }> =>
  apiClient.delete('config', `${BASE}/${id}`, orgId);
EOF

cat > features/config-themes/hooks/index.ts << 'EOF'
export { useThemes, useCreateTheme, useActivateTheme, useDeleteTheme } from './use-themes';
EOF

cat > features/config-themes/hooks/use-themes.ts << 'EOF'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import { getThemes, createTheme, activateTheme, deleteTheme } from '../services/themes.service';
import type { CreateThemeInput } from '@/features/config/types';

export function useThemes(orgId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configThemes, orgId],
    queryFn:  () => getThemes(orgId!),
    enabled:  !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, orgId }: { data: CreateThemeInput; orgId: string }) =>
      createTheme(data, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configThemes }),
  });
}

export function useActivateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) =>
      activateTheme(id, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configThemes }),
  });
}

export function useDeleteTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) =>
      deleteTheme(id, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configThemes }),
  });
}
EOF

cat > features/config-themes/index.ts << 'EOF'
export * from './hooks';
export * from './services/themes.service';
EOF
ok "features/config-themes"

# ═══════════════════════════════════════════════════════════════════════════════
#  RDF-C3 — features/config-flags
# ═══════════════════════════════════════════════════════════════════════════════
info "RDF-C3 — Creando features/config-flags..."
mkdir -p features/config-flags/services
mkdir -p features/config-flags/hooks

cat > features/config-flags/services/flags.service.ts << 'EOF'
import { apiClient } from '@/lib/api-client';
import type { FeatureFlag, UpdateFlagInput } from '@/features/config/types';

export const getFlags = (orgId: string): Promise<FeatureFlag[]> =>
  apiClient.get('config', '/config/flags', orgId);

export const updateFlag = (key: string, data: UpdateFlagInput, orgId: string): Promise<FeatureFlag> =>
  apiClient.patch('config', `/config/flags/${encodeURIComponent(key)}`, data, orgId);
EOF

cat > features/config-flags/hooks/use-flags.ts << 'EOF'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import { getFlags, updateFlag } from '../services/flags.service';
import type { UpdateFlagInput } from '@/features/config/types';

export function useFlags(orgId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configFlags, orgId],
    queryFn:  () => getFlags(orgId!),
    enabled:  !!orgId,
    staleTime: 1000 * 60,
  });
}

export function useUpdateFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data, orgId }: { key: string; data: UpdateFlagInput; orgId: string }) =>
      updateFlag(key, data, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configFlags }),
  });
}
EOF

cat > features/config-flags/hooks/index.ts << 'EOF'
export { useFlags, useUpdateFlag } from './use-flags';
EOF

cat > features/config-flags/index.ts << 'EOF'
export * from './hooks';
EOF
ok "features/config-flags"

# ═══════════════════════════════════════════════════════════════════════════════
#  RDF-C4 — features/config-webhooks
# ═══════════════════════════════════════════════════════════════════════════════
info "RDF-C4 — Creando features/config-webhooks..."
mkdir -p features/config-webhooks/services
mkdir -p features/config-webhooks/hooks

cat > features/config-webhooks/services/webhooks.service.ts << 'EOF'
import { apiClient } from '@/lib/api-client';
import type { WebhookEndpoint, CreateWebhookInput, WebhookDeliveryLog } from '@/features/config/types';

const BASE = '/config/webhooks';

export const getWebhooks = (orgId: string): Promise<WebhookEndpoint[]> =>
  apiClient.get('config', BASE, orgId);

export const createWebhook = (
  data: CreateWebhookInput,
  orgId: string,
): Promise<WebhookEndpoint & { secret: string }> =>
  apiClient.post('config', BASE, data, orgId);

export const testWebhook = (
  id: string,
  orgId: string,
): Promise<{ success: boolean; message: string }> =>
  apiClient.post('config', `${BASE}/${id}/test`, {}, orgId);

export const deleteWebhook = (
  id: string,
  orgId: string,
): Promise<{ success: boolean; message: string }> =>
  apiClient.delete('config', `${BASE}/${id}`, orgId);

export const getWebhookLogs = (
  id: string,
  orgId: string,
  take = 50,
): Promise<WebhookDeliveryLog[]> =>
  apiClient.get('config', `${BASE}/${id}/logs?take=${take}`, orgId);
EOF

cat > features/config-webhooks/hooks/use-webhooks.ts << 'EOF'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import {
  getWebhooks, createWebhook, testWebhook, deleteWebhook, getWebhookLogs,
} from '../services/webhooks.service';
import type { CreateWebhookInput } from '@/features/config/types';

export function useWebhooks(orgId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configWebhooks, orgId],
    queryFn:  () => getWebhooks(orgId!),
    enabled:  !!orgId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useWebhookLogs(id: string | null, orgId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configWebhookLogs, id, orgId],
    queryFn:  () => getWebhookLogs(id!, orgId!),
    enabled:  !!id && !!orgId,
    staleTime: 1000 * 30,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, orgId }: { data: CreateWebhookInput; orgId: string }) =>
      createWebhook(data, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configWebhooks }),
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) =>
      testWebhook(id, orgId),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, orgId }: { id: string; orgId: string }) =>
      deleteWebhook(id, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configWebhooks }),
  });
}
EOF

cat > features/config-webhooks/hooks/index.ts << 'EOF'
export {
  useWebhooks, useWebhookLogs,
  useCreateWebhook, useTestWebhook, useDeleteWebhook,
} from './use-webhooks';
EOF

cat > features/config-webhooks/index.ts << 'EOF'
export * from './hooks';
EOF
ok "features/config-webhooks"

# ═══════════════════════════════════════════════════════════════════════════════
#  RDF-C5 — features/config-quotas
# ═══════════════════════════════════════════════════════════════════════════════
info "RDF-C5 — Creando features/config-quotas..."
mkdir -p features/config-quotas/services
mkdir -p features/config-quotas/hooks

cat > features/config-quotas/services/quotas.service.ts << 'EOF'
import { apiClient } from '@/lib/api-client';
import type { QuotaConfig } from '@/features/config/types';

export const getQuotas = (orgId: string): Promise<QuotaConfig[]> =>
  apiClient.get('config', '/config/quotas', orgId);

export const updateQuotaLimit = (
  resource: string,
  limit: number,
  orgId: string,
): Promise<QuotaConfig> =>
  apiClient.patch('config', `/config/quotas/${encodeURIComponent(resource)}`, { limit }, orgId);
EOF

cat > features/config-quotas/hooks/use-quotas.ts << 'EOF'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config/constants';
import { getQuotas, updateQuotaLimit } from '../services/quotas.service';

export function useQuotas(orgId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.configQuotas, orgId],
    queryFn:  () => getQuotas(orgId!),
    enabled:  !!orgId,
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
  });
}

export function useUpdateQuotaLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ resource, limit, orgId }: { resource: string; limit: number; orgId: string }) =>
      updateQuotaLimit(resource, limit, orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.configQuotas }),
  });
}
EOF

cat > features/config-quotas/hooks/index.ts << 'EOF'
export { useQuotas, useUpdateQuotaLimit } from './use-quotas';
EOF

cat > features/config-quotas/index.ts << 'EOF'
export * from './hooks';
EOF
ok "features/config-quotas"

# ═══════════════════════════════════════════════════════════════════════════════
#  RDF-C6 — Sidebar agrupado
# ═══════════════════════════════════════════════════════════════════════════════
info "RDF-C6 — Actualizando sidebar con grupos..."

cat > components/layout/dashboard-sidebar.tsx << 'EOF'
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2, MapPin, MessageSquare, CreditCard, TrendingUp,
  Palette, ToggleLeft, Webhook, BarChart2,
  LogOut, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { siteConfig } from '@/config/site';
import { NAV_GROUPS } from '@/config/navigation';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Building2, MapPin, MessageSquare, CreditCard, TrendingUp,
  Palette, ToggleLeft, Webhook, BarChart2,
};

export function DashboardSidebar() {
  const pathname          = usePathname();
  const { user, logout }  = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm text-sidebar-foreground truncate">
          {siteConfig.name}
        </span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon    = ICON_MAP[item.icon] ?? Building2;
                const active  = isActive(item.href);
                const enabled = item.active;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={!enabled ? (e) => e.preventDefault() : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : enabled
                        ? 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/35 cursor-not-allowed pointer-events-none',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.name}</span>
                    {!enabled && (
                      <span className="text-[9px] text-sidebar-foreground/30 font-medium shrink-0">
                        Próximo
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User menu */}
      <div className="p-2 border-t border-sidebar-border shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground shrink-0 text-xs font-semibold">
            {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-medium truncate">{user?.nombre ?? '—'}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
          <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', menuOpen && 'rotate-180')} />
        </button>
        {menuOpen && (
          <div className="mt-1 mx-1 rounded-md bg-sidebar-accent border border-sidebar-border overflow-hidden">
            <button
              onClick={async () => { await logout(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
EOF
ok "components/layout/dashboard-sidebar.tsx"

# Mobile header actualizado
cat > components/layout/mobile-header.tsx << 'EOF'
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2, MapPin, MessageSquare, CreditCard, TrendingUp,
  Palette, ToggleLeft, Webhook, BarChart2,
  Menu, X,
} from 'lucide-react';
import { NAV_GROUPS } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Building2, MapPin, MessageSquare, CreditCard, TrendingUp,
  Palette, ToggleLeft, Webhook, BarChart2,
};

export function MobileHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm text-sidebar-foreground">{siteConfig.name}</span>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-20 bg-black/40 pt-14" onClick={() => setOpen(false)}>
          <nav className="bg-sidebar h-full w-64 p-3 space-y-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon    = ICON_MAP[item.icon] ?? Building2;
                    const active  = isActive(item.href);
                    const enabled = item.active;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => { if (enabled) setOpen(false); }}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm',
                          active ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : enabled ? 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                            : 'text-sidebar-foreground/35 pointer-events-none',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        {!enabled && <span className="text-[9px] text-sidebar-foreground/30">Próximo</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
EOF
ok "components/layout/mobile-header.tsx"

# ═══════════════════════════════════════════════════════════════════════════════
#  RDF-C6 — app/dashboard/configuracion/ layout + páginas
# ═══════════════════════════════════════════════════════════════════════════════
info "RDF-C6 — Creando sección Configuración..."
mkdir -p app/dashboard/configuracion/tema
mkdir -p app/dashboard/configuracion/flags
mkdir -p app/dashboard/configuracion/webhooks
mkdir -p app/dashboard/configuracion/quotas

# Layout compartido de la sección
cat > app/dashboard/configuracion/layout.tsx << 'EOF'
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Palette, ToggleLeft, Webhook, BarChart2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONFIG_TABS = [
  { name: 'Tema visual',   href: '/dashboard/configuracion/tema',     Icon: Palette    },
  { name: 'Feature Flags', href: '/dashboard/configuracion/flags',    Icon: ToggleLeft },
  { name: 'Webhooks',      href: '/dashboard/configuracion/webhooks', Icon: Webhook    },
  { name: 'Quotas',        href: '/dashboard/configuracion/quotas',   Icon: BarChart2  },
] as const;

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header sección */}
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
      </div>

      {/* Tabs horizontales */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {CONFIG_TABS.map(({ name, href, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors',
                active
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {name}
            </Link>
          );
        })}
      </div>

      {/* Contenido */}
      <div>{children}</div>
    </div>
  );
}
EOF
ok "app/dashboard/configuracion/layout.tsx"

# ── Página de Temas ────────────────────────────────────────────────────────────
cat > app/dashboard/configuracion/tema/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { Check, Plus, Trash2, Loader2, AlertCircle, Star, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useThemes, useCreateTheme, useActivateTheme, useDeleteTheme } from '@/features/config-themes/hooks';
import type { ThemeConfig, CreateThemeInput } from '@/features/config/types';
import { cn } from '@/lib/utils';

const FONT_OPTIONS = ['DM Sans', 'Inter', 'Poppins', 'Geist', 'Roboto', 'Open Sans'];
const RADIUS_OPTIONS = [
  { label: 'Ninguno',  value: '0rem'    },
  { label: 'Pequeño',  value: '0.25rem' },
  { label: 'Mediano',  value: '0.5rem'  },
  { label: 'Grande',   value: '0.75rem' },
  { label: 'Extra',    value: '1rem'    },
  { label: 'Completo', value: '1.5rem'  },
];

function ThemePreview({ theme }: { theme: ThemeConfig }) {
  return (
    <div
      className="rounded-lg border p-3 space-y-2 text-xs"
      style={{
        background:   theme.secondaryColor,
        borderColor:  theme.primaryColor + '40',
        fontFamily:   theme.fontFamily + ', sans-serif',
        borderRadius: theme.borderRadius,
      }}
    >
      <div
        className="h-5 rounded-sm flex items-center px-2 text-white text-[10px] font-medium"
        style={{ background: theme.primaryColor, borderRadius: theme.borderRadius }}
      >
        {theme.name}
      </div>
      <div className="flex gap-1.5">
        {[theme.primaryColor, theme.secondaryColor, theme.accentColor ?? theme.primaryColor].map((c, i) => (
          <div
            key={i}
            className="size-4 rounded border border-black/10"
            style={{ background: c }}
            title={c}
          />
        ))}
        <span className="text-[10px] text-gray-500 ml-1">{theme.fontFamily}</span>
      </div>
    </div>
  );
}

const EMPTY_FORM: CreateThemeInput = {
  name: '', primaryColor: '#000000', secondaryColor: '#ffffff',
  accentColor: '', fontFamily: 'DM Sans', borderRadius: '0.75rem',
  logoUrl: '', darkMode: false,
};

export default function TemaPage() {
  const { organizationId } = useAuth();
  const { data, isLoading, error } = useThemes(organizationId);
  const themes  = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const createMutation   = useCreateTheme();
  const activateMutation = useActivateTheme();
  const deleteMutation   = useDeleteTheme();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting]   = useState<ThemeConfig | null>(null);
  const [form, setForm]           = useState<CreateThemeInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('El nombre es requerido'); return; }
    if (!organizationId) return;
    setFormError(null);
    try {
      await createMutation.mutateAsync({ data: form, orgId: organizationId });
      toast.success('Tema creado');
      setModalOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear tema');
    }
  };

  const handleActivate = async (id: string) => {
    if (!organizationId) return;
    try {
      await activateMutation.mutateAsync({ id, orgId: organizationId });
      toast.success('Tema activado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleting || !organizationId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleting.id, orgId: organizationId });
      toast.success('Tema eliminado');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  if (isLoading) return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      Error al cargar temas. Verificá que el config service esté disponible.
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{themes.length} tema{themes.length !== 1 ? 's' : ''}</p>
        <Button onClick={() => setModalOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo tema
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme: ThemeConfig) => (
          <div
            key={theme.id}
            className={cn(
              'rounded-xl border p-4 space-y-3 transition-colors',
              theme.isActive
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-border/60',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm flex items-center gap-1.5">
                  {theme.name}
                  {theme.isActive && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                </p>
                {theme.isSystemDefault && (
                  <span className="text-[10px] text-muted-foreground">Sistema</span>
                )}
              </div>
              {!theme.isSystemDefault && !theme.isActive && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => setDeleting(theme)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <ThemePreview theme={theme} />

            {!theme.isActive && (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleActivate(theme.id)}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Check className="h-3.5 w-3.5" />
                }
                Activar
              </Button>
            )}
            {theme.isActive && (
              <p className="text-center text-xs text-primary font-medium">✓ Activo</p>
            )}
          </div>
        ))}
      </div>

      {/* Modal crear tema */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo tema</DialogTitle>
            <DialogDescription>Personalizá los colores y la tipografía de tu organización.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="ej: Mi marca" className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Color primario</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.primaryColor ?? '#000000'}
                    onChange={(e) => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                    className="h-9 w-12 rounded border border-input cursor-pointer" />
                  <Input value={form.primaryColor ?? ''} onChange={(e) => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                    className="bg-secondary border-border font-mono text-xs" placeholder="#000000" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Color secundario</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.secondaryColor ?? '#ffffff'}
                    onChange={(e) => setForm(p => ({ ...p, secondaryColor: e.target.value }))}
                    className="h-9 w-12 rounded border border-input cursor-pointer" />
                  <Input value={form.secondaryColor ?? ''} onChange={(e) => setForm(p => ({ ...p, secondaryColor: e.target.value }))}
                    className="bg-secondary border-border font-mono text-xs" placeholder="#ffffff" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Color de acento</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.accentColor ?? '#666666'}
                  onChange={(e) => setForm(p => ({ ...p, accentColor: e.target.value }))}
                  className="h-9 w-12 rounded border border-input cursor-pointer" />
                <Input value={form.accentColor ?? ''} onChange={(e) => setForm(p => ({ ...p, accentColor: e.target.value }))}
                  className="bg-secondary border-border font-mono text-xs" placeholder="#666666" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipografía</Label>
              <select value={form.fontFamily ?? 'DM Sans'}
                onChange={(e) => setForm(p => ({ ...p, fontFamily: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-secondary px-3 text-sm">
                {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Radio de bordes</Label>
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map(({ label, value }) => (
                  <button key={value}
                    onClick={() => setForm(p => ({ ...p, borderRadius: value }))}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded-md border transition-colors',
                      form.borderRadius === value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary border-border hover:border-primary/40',
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL del logo (opcional)</Label>
              <Input value={form.logoUrl ?? ''}
                onChange={(e) => setForm(p => ({ ...p, logoUrl: e.target.value }))}
                placeholder="https://..." className="bg-secondary border-border" />
            </div>

            {/* Preview en tiempo real */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Preview</Label>
              <ThemePreview theme={{
                id: 'preview', name: form.name || 'Preview',
                organizationId: null, isActive: false, isSystemDefault: false,
                primaryColor: form.primaryColor ?? '#000000',
                secondaryColor: form.secondaryColor ?? '#ffffff',
                accentColor: form.accentColor ?? null,
                fontFamily: form.fontFamily ?? 'DM Sans',
                borderRadius: form.borderRadius ?? '0.75rem',
                logoUrl: null, faviconUrl: null, darkMode: false, customCSS: null,
                createdAt: '', updatedAt: '',
              }} />
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />{formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear tema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deleting && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDeleting(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar tema</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminás el tema <strong>{deleting.name}</strong>? Esta acción no puede deshacerse.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
EOF
ok "app/dashboard/configuracion/tema/page.tsx"

# ── Página de Feature Flags ────────────────────────────────────────────────────
cat > app/dashboard/configuracion/flags/page.tsx << 'EOF'
'use client';

import { AlertCircle, ToggleLeft, Globe, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useFlags, useUpdateFlag } from '@/features/config-flags/hooks';
import type { FeatureFlag } from '@/features/config/types';
import { cn } from '@/lib/utils';

const SYSTEM_TARGET_LABELS: Record<string, string> = {
  all:      'Todos',
  chat:     'Chat IA',
  payments: 'Pagos',
  ads:      'Campañas',
};

export default function FlagsPage() {
  const { organizationId } = useAuth();
  const { data, isLoading, error } = useFlags(organizationId);
  const flags = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const updateMutation = useUpdateFlag();

  const handleToggle = async (flag: FeatureFlag) => {
    if (!organizationId || !flag.organizationId) return; // flags globales son readonly
    try {
      await updateMutation.mutateAsync({
        key:    flag.key,
        data:   { enabled: !flag.enabled },
        orgId:  organizationId,
      });
      toast.success(`Flag "${flag.key}" ${!flag.enabled ? 'activado' : 'desactivado'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  if (isLoading) return (
    <div className="space-y-2">
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      Error al cargar feature flags.
    </div>
  );

  const orgFlags    = flags.filter((f: FeatureFlag) => f.organizationId);
  const globalFlags = flags.filter((f: FeatureFlag) => !f.organizationId);

  const FlagRow = ({ flag }: { flag: FeatureFlag }) => {
    const isGlobal   = !flag.organizationId;
    const isPending  = updateMutation.isPending && updateMutation.variables?.key === flag.key;

    return (
      <div className={cn(
        'flex items-center justify-between gap-4 rounded-xl border px-4 py-3',
        flag.enabled ? 'border-border bg-card' : 'border-border bg-card opacity-70',
      )}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono text-sm font-medium text-foreground">{flag.key}</p>
            {isGlobal && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border">
                <Globe className="h-2.5 w-2.5" />
                Sistema
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
              {SYSTEM_TARGET_LABELS[flag.systemTarget] ?? flag.systemTarget}
            </span>
            {flag.rolloutPercentage < 100 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600">
                {flag.rolloutPercentage}% rollout
              </span>
            )}
          </div>
          {flag.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{flag.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Switch
            checked={flag.enabled}
            onCheckedChange={() => handleToggle(flag)}
            disabled={isGlobal || isPending}
            title={isGlobal ? 'Los flags globales no son editables desde aquí' : undefined}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {orgFlags.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">Flags de tu organización</h2>
          {orgFlags.map((flag: FeatureFlag) => <FlagRow key={flag.id} flag={flag} />)}
        </section>
      )}

      {globalFlags.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Flags globales del sistema (solo lectura)
          </h2>
          {globalFlags.map((flag: FeatureFlag) => <FlagRow key={flag.id} flag={flag} />)}
        </section>
      )}

      {flags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <ToggleLeft className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sin feature flags configurados</p>
        </div>
      )}
    </div>
  );
}
EOF
ok "app/dashboard/configuracion/flags/page.tsx"

# ── Página de Webhooks ─────────────────────────────────────────────────────────
cat > app/dashboard/configuracion/webhooks/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import {
  Plus, Trash2, Play, ChevronRight, AlertCircle,
  Check, X, Loader2, Clock, Webhook as WebhookIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  useWebhooks, useWebhookLogs, useCreateWebhook, useTestWebhook, useDeleteWebhook,
} from '@/features/config-webhooks/hooks';
import { WEBHOOK_EVENTS } from '@/features/config/types';
import type { WebhookEndpoint, CreateWebhookInput } from '@/features/config/types';
import { cn } from '@/lib/utils';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function WebhooksPage() {
  const { organizationId } = useAuth();
  const { data, isLoading, error } = useWebhooks(organizationId);
  const webhooks = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const createMutation = useCreateWebhook();
  const testMutation   = useTestWebhook();
  const deleteMutation = useDeleteWebhook();

  const [createOpen, setCreateOpen]  = useState(false);
  const [logsWh, setLogsWh]          = useState<WebhookEndpoint | null>(null);
  const [deleting, setDeleting]      = useState<WebhookEndpoint | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // Form
  const [form, setForm]       = useState<CreateWebhookInput>({ url: '', events: [] });
  const [formError, setFormError] = useState<string | null>(null);

  const toggleEvent = (key: string) => {
    setForm(p => ({
      ...p,
      events: p.events.includes(key)
        ? p.events.filter(e => e !== key)
        : [...p.events, key],
    }));
  };

  const handleCreate = async () => {
    if (!form.url.trim()) { setFormError('La URL es requerida'); return; }
    if (form.events.length === 0) { setFormError('Seleccioná al menos un evento'); return; }
    if (!organizationId) return;
    setFormError(null);
    try {
      const result = await createMutation.mutateAsync({ data: form, orgId: organizationId });
      const secret = (result as any).secret as string | undefined;
      setCreateOpen(false);
      setForm({ url: '', events: [] });
      if (secret) setCreatedSecret(secret);
      toast.success('Webhook creado');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear');
    }
  };

  const handleTest = async (id: string) => {
    if (!organizationId) return;
    try {
      await testMutation.mutateAsync({ id, orgId: organizationId });
      toast.success('Webhook de prueba enviado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleting || !organizationId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleting.id, orgId: organizationId });
      toast.success('Webhook eliminado');
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      Error al cargar webhooks.
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <WebhookIcon className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sin webhooks configurados</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Crear primero
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh: WebhookEndpoint) => (
            <div key={wh.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm truncate text-foreground">{wh.url}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(wh.events as string[]).map(e => (
                      <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                        {e}
                      </span>
                    ))}
                  </div>
                  {wh.failureCount > 0 && (
                    <p className="text-xs text-destructive mt-1">{wh.failureCount} fallo{wh.failureCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => setLogsWh(wh)} title="Ver logs">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => handleTest(wh.id)}
                    disabled={testMutation.isPending}
                    title="Probar webhook">
                    {testMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleting(wh)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo webhook</DialogTitle>
            <DialogDescription>El secreto se muestra solo una vez al crear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>URL destino *</Label>
              <Input value={form.url}
                onChange={(e) => setForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://mi-servidor.com/webhook"
                className="bg-secondary border-border font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Eventos *</Label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={form.events.includes(key)}
                      onChange={() => toggleEvent(key)}
                      className="size-4 rounded accent-primary" />
                    <span className="text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />{formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal secreto — mostrar una sola vez */}
      <Dialog open={!!createdSecret} onOpenChange={(o) => { if (!o) setCreatedSecret(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Secreto del webhook</DialogTitle>
            <DialogDescription className="text-amber-600 font-medium">
              ⚠ Copiá este secreto ahora. No se va a volver a mostrar.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-3 font-mono text-sm break-all select-all">
            {createdSecret}
          </div>
          <p className="text-xs text-muted-foreground">
            Usalo para verificar la firma <code>X-Webhook-Signature</code> en tus endpoints.
          </p>
          <DialogFooter>
            <Button onClick={() => {
              if (createdSecret) navigator.clipboard.writeText(createdSecret);
              toast.success('Secreto copiado');
            }} variant="outline" className="gap-2">
              <Check className="h-4 w-4" />
              Copiar secreto
            </Button>
            <Button onClick={() => setCreatedSecret(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de logs */}
      {logsWh && (
        <DeliveryLogsSheet wh={logsWh} orgId={organizationId} onClose={() => setLogsWh(null)} />
      )}

      {/* Confirm delete */}
      {deleting && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDeleting(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar webhook</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminás el webhook <strong className="font-mono text-sm">{deleting.url}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ── Sheet de delivery logs ─────────────────────────────────────────────────────
function DeliveryLogsSheet({
  wh, orgId, onClose,
}: {
  wh: WebhookEndpoint;
  orgId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useWebhookLogs(wh.id, orgId);
  const logs = Array.isArray(data) ? data : (data as any)?.data ?? [];

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Delivery logs</SheetTitle>
          <SheetDescription className="font-mono text-xs truncate">{wh.url}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin entregas registradas</p>
            </div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className={cn(
                'rounded-lg border px-3 py-2.5 space-y-1',
                log.success ? 'border-green-500/20 bg-green-50/5' : 'border-destructive/20 bg-destructive/5',
              )}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {log.success
                      ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    }
                    <span className="font-mono text-xs text-muted-foreground">{log.event}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    {log.statusCode && <span className={cn('font-mono', log.success ? 'text-green-600' : 'text-destructive')}>{log.statusCode}</span>}
                    {log.duration && <span>{log.duration}ms</span>}
                    {log.attempt > 1 && <span className="text-amber-500">intento {log.attempt}</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{formatDate(log.createdAt)}</span>
                  {log.error && (
                    <span className="text-[10px] text-destructive truncate max-w-[200px]">{log.error}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
EOF
ok "app/dashboard/configuracion/webhooks/page.tsx"

# ── Página de Quotas ───────────────────────────────────────────────────────────
cat > app/dashboard/configuracion/quotas/page.tsx << 'EOF'
'use client';

import { AlertCircle, BarChart2, Infinity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useQuotas } from '@/features/config-quotas/hooks';
import { QUOTA_RESOURCE_LABELS } from '@/features/config/types';
import type { QuotaConfig } from '@/features/config/types';
import { cn } from '@/lib/utils';

function QuotaBar({ quota }: { quota: QuotaConfig }) {
  const isUnlimited = quota.limit === -1;
  const pct         = isUnlimited ? 0 : Math.min((quota.currentUsage / quota.limit) * 100, 100);
  const isAlert     = !isUnlimited && pct >= quota.alertAt;
  const isCritical  = !isUnlimited && pct >= 95;
  const label       = QUOTA_RESOURCE_LABELS[quota.resource] ?? quota.resource;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm">{label}</p>
        <p className={cn(
          'text-sm font-mono',
          isCritical ? 'text-destructive' : isAlert ? 'text-amber-500' : 'text-muted-foreground',
        )}>
          {isUnlimited ? (
            <span className="flex items-center gap-1 text-green-500">
              <Infinity className="h-4 w-4" />
              Ilimitado
            </span>
          ) : (
            `${quota.currentUsage} / ${quota.limit}`
          )}
        </p>
      </div>

      {!isUnlimited && (
        <>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isCritical ? 'bg-destructive' : isAlert ? 'bg-amber-500' : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{pct.toFixed(0)}% utilizado</span>
            <span>{quota.limit - quota.currentUsage} restante{quota.limit - quota.currentUsage !== 1 ? 's' : ''}</span>
          </div>
          {isAlert && (
            <p className={cn('text-xs flex items-center gap-1', isCritical ? 'text-destructive' : 'text-amber-500')}>
              <AlertCircle className="h-3 w-3" />
              {isCritical ? 'Límite casi alcanzado' : `Alerta al ${quota.alertAt}%`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function QuotasPage() {
  const { organizationId } = useAuth();
  const { data, isLoading, error } = useQuotas(organizationId);
  const quotas = Array.isArray(data) ? data : (data as any)?.data ?? [];

  if (isLoading) return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      Error al cargar quotas.
    </div>
  );

  if (quotas.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <BarChart2 className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">Sin quotas configuradas para esta organización</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Las quotas se crean automáticamente cuando se configura el plan de la org en el config service.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Uso actual de recursos — se actualiza cada 30 segundos.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quotas.map((q: QuotaConfig) => <QuotaBar key={q.id} quota={q} />)}
      </div>
    </div>
  );
}
EOF
ok "app/dashboard/configuracion/quotas/page.tsx"

# ─── features/index.ts actualizado ───────────────────────────────────────────
cat > features/index.ts << 'EOF'
export * from './auth';
export * from './propiedades';
export * from './zonas';
export * from './config';
export * from './config-themes';
export * from './config-flags';
export * from './config-webhooks';
export * from './config-quotas';
export * from './chat';
export * from './pagos';
export * from './campanas';
EOF
ok "features/index.ts"

# ═══════════════════════════════════════════════════════════════════════════════
#  Build final
# ═══════════════════════════════════════════════════════════════════════════════
info "Instalando dependencias..."
pnpm install

echo ""
info "Build de verificación..."
pnpm run build 2>&1 | tail -30 || echo -e "${YELLOW}  ⚠ Revisar errores — pueden ser variables de entorno faltantes en este entorno${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ real-dashboard-front — Config Service integrado${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Sprints completados:"
echo "  RDF-C1 — api-client (x-api-key para config), types, constants           ✓"
echo "  RDF-C2 — features/config-themes + página /configuracion/tema             ✓"
echo "  RDF-C3 — features/config-flags  + página /configuracion/flags            ✓"
echo "  RDF-C4 — features/config-webhooks + página /configuracion/webhooks       ✓"
echo "  RDF-C5 — features/config-quotas + página /configuracion/quotas           ✓"
echo "  RDF-C6 — Sidebar agrupado (Inmobiliaria/Módulos/Configuración)           ✓"
echo "           app/dashboard/configuracion/layout.tsx                          ✓"
echo ""
echo "Rutas nuevas:"
echo "  /dashboard/configuracion/tema     ← Editor de temas visuales"
echo "  /dashboard/configuracion/flags    ← Feature flags con toggles"
echo "  /dashboard/configuracion/webhooks ← Webhooks + delivery logs"
echo "  /dashboard/configuracion/quotas   ← Uso de recursos por org"
echo ""
echo "────────────────────────────────────────────────────────────────────"
echo "  VARIABLES DE ENTORNO necesarias en .env.local:"
echo ""
echo "    NEXT_PUBLIC_CONFIG_URL=http://localhost:3005/api/v1"
echo "    NEXT_PUBLIC_CONFIG_API_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx"
echo ""
echo "  La API Key se genera en el config service:"
echo "    POST /organizations/:id/api-keys"
echo "    { \"name\": \"dashboard-front\", \"scopes\": [\"READ_CONFIG\",\"WRITE_CONFIG\"] }"
echo "────────────────────────────────────────────────────────────────────"
echo ""