'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { navigation } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Layers,
  Store,
  MessageSquare,
  CreditCard,
  TrendingUp,
  LogOut,
  User,
  Menu,
} from 'lucide-react';
import { Logo } from '@/components/logo';

const ICON_MAP: Record<string, React.ElementType> = {
  Layers,
  Store,
  MessageSquare,
  CreditCard,
  TrendingUp,
};

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleNavigation = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-full px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo className="h-6 w-6 text-foreground" />
          <span className="font-semibold text-foreground">TodoApple</span>
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0 bg-sidebar border-l border-sidebar-border">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-sidebar-border">
                <div className="flex items-center gap-3">
                  <Logo className="h-7 w-7 text-sidebar-foreground" />
                  <span className="text-lg font-semibold text-sidebar-foreground">Todo Apple</span>
                </div>
              </div>

              <nav className="flex-1 p-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = ICON_MAP[item.icon];
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 w-full rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                      )}
                    >
                      {Icon && <Icon className="h-5 w-5" />}
                      {item.name}
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-sidebar-border space-y-3">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                    <User className="h-5 w-5 text-sidebar-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user?.nombre || 'Usuario'}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  Cerrar sesion
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
