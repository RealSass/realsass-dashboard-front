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
