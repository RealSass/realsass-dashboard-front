// ─── API base URLs ────────────────────────────────────────────────────────────

export const API_URLS = {
  dashboard: process.env.NEXT_PUBLIC_API_URL,
  chat:      process.env.NEXT_PUBLIC_CHATIA_URL,
  pagos:     process.env.NEXT_PUBLIC_PAGOS_URL,
  campanas:  process.env.NEXT_PUBLIC_ADOPTIMIZER_URL,
} as const;

export type ApiSystem = keyof typeof API_URLS;

// ─── TanStack Query keys ───────────────────────────────────────────────────────

export const QUERY_KEYS = {
  pdv:              ['pdv']              as const,
  accesorios:       ['accesorios']       as const,
  subAccesorios:    ['sub-accesorios']   as const,
  conversaciones:   ['conversaciones']   as const,
  mensajes:         ['mensajes']         as const,
  balance:          ['balance']          as const,
  transacciones:    ['transacciones']    as const,
  campanas:         ['campanas']         as const,
  metricasCampana:  ['metricas-campana'] as const,
} as const;

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const STOCK_PAGE_SIZE   = 20;
