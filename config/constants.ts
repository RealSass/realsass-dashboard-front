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
