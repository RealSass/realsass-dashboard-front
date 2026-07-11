'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, ClipboardList, Eye, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIENDA_TABS = [
  { name: 'Productos',    href: '/dashboard/tienda/productos', Icon: Package       },
  { name: 'Pedidos',      href: '/dashboard/tienda/pedidos',    Icon: ClipboardList },
  { name: 'Vista previa', href: '/dashboard/tienda/preview',    Icon: Eye           },
] as const;

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Store className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Tienda</h1>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TIENDA_TABS.map(({ name, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors',
                active
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {name}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
