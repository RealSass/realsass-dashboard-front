export const NAV_GROUPS = [
  {
    label: 'Tienda',
    items: [
      { name: 'Productos',   href: '/dashboard/tienda/productos', icon: 'Package',    active: true  },
      { name: 'Pedidos',     href: '/dashboard/tienda/pedidos',   icon: 'ShoppingBag', active: true  },
      { name: 'Preview',     href: '/dashboard/tienda/preview',   icon: 'ExternalLink', active: true },
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
      { name: 'Tema visual',   href: '/dashboard/configuracion/tema',     icon: 'Palette',    active: true },
      { name: 'Feature Flags', href: '/dashboard/configuracion/flags',    icon: 'ToggleLeft', active: true },
      { name: 'Webhooks',      href: '/dashboard/configuracion/webhooks', icon: 'Webhook',    active: true },
      { name: 'Quotas',        href: '/dashboard/configuracion/quotas',   icon: 'BarChart2',  active: true },
    ],
  },
] as const;
