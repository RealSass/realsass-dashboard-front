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
