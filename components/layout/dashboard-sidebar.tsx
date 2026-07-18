'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Package, ShoppingBag, ExternalLink,
  MessageSquare, CreditCard, TrendingUp,
  Palette, ToggleLeft, Webhook, BarChart2,
  LogOut, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { siteConfig } from '@/config/site';
import { NAV_GROUPS } from '@/config/navigation';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Package, ShoppingBag, ExternalLink,
  MessageSquare, CreditCard, TrendingUp,
  Palette, ToggleLeft, Webhook, BarChart2,
};

export function DashboardSidebar() {
  const pathname         = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-border bg-sidebar h-screen sticky top-0 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border">
        <span className="font-semibold text-sm text-sidebar-foreground">{siteConfig.name}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon   = ICON_MAP[item.icon] ?? Package;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                        !item.active && 'opacity-50 pointer-events-none',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.name}
                      {!item.active && (
                        <span className="ml-auto text-[9px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          Pronto
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      {user && (
        <div className="border-t border-sidebar-border px-3 py-3">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors"
          >
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user.displayName ?? user.email}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', menuOpen && 'rotate-180')} />
          </button>

          {menuOpen && (
            <div className="mt-1 rounded-md border border-border bg-popover shadow-md overflow-hidden">
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
