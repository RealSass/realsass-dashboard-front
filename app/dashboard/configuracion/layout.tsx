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
