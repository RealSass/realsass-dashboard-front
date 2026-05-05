export const navigation = [
  { name: 'Stock',           href: '/dashboard',          icon: 'Layers'        },
  { name: 'Puntos de Venta', href: '/dashboard/pdv',      icon: 'Store'         },
  { name: 'Chat IA',         href: '/dashboard/chat',     icon: 'MessageSquare' },
  { name: 'Pagos',           href: '/dashboard/pagos',    icon: 'CreditCard'    },
  { name: 'Campanas',        href: '/dashboard/campanas', icon: 'TrendingUp'    },
] as const;

export type NavigationItem = (typeof navigation)[number];
