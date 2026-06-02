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
