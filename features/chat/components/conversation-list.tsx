'use client';

import { useState, useMemo } from 'react';
import { MessageSquare, SlidersHorizontal, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/helpers';
import { CanalBadge } from './canal-badge';
import { EtapaBadge, ETAPA_CONFIG } from './etapa-badge';
import { useConversaciones } from '../hooks';
import type { Canal, EtapaCliente } from '../types';

const CANAL_LABELS: Record<Canal, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', telegram: 'Telegram', web: 'Web',
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function Avatar({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <div className={cn('rounded-full bg-accent flex items-center justify-center flex-shrink-0 font-medium text-foreground', className)}>
      {getInitials(nombre)}
    </div>
  );
}

function ConversacionSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [search,      setSearch]      = useState('');
  const [filterCanal, setFilterCanal] = useState<Canal | ''>('');
  const [filterEtapa, setFilterEtapa] = useState<EtapaCliente | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: convData,
    isLoading,
    error,
  } = useConversaciones({ canal: filterCanal || undefined, etapa: filterEtapa || undefined, limit: 50 });

  const conversaciones = convData?.items ?? [];
  const totalNoLeidos  = conversaciones.reduce((acc, c) => acc + (c.noLeidos ?? 0), 0);

  const filtered = useMemo(() => {
    if (!search) return conversaciones;
    const q = search.toLowerCase();
    return conversaciones.filter(
      (c) =>
        c.cliente.nombre.toLowerCase().includes(q) ||
        c.ultimoMensaje?.contenido.toLowerCase().includes(q),
    );
  }, [conversaciones, search]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">Conversaciones</h2>
            {totalNoLeidos > 0 && (
              <span
                className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                {totalNoLeidos}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-secondary border-border"
          />
        </div>

        {showFilters && (
          <div className="space-y-2">
            <select
              value={filterCanal}
              onChange={(e) => setFilterCanal(e.target.value as Canal | '')}
              className="w-full h-8 text-xs rounded-md bg-secondary border border-border text-foreground px-2"
            >
              <option value="">Todos los canales</option>
              {(Object.keys(CANAL_LABELS) as Canal[]).map((c) => (
                <option key={c} value={c}>{CANAL_LABELS[c]}</option>
              ))}
            </select>
            <select
              value={filterEtapa}
              onChange={(e) => setFilterEtapa(e.target.value as EtapaCliente | '')}
              className="w-full h-8 text-xs rounded-md bg-secondary border border-border text-foreground px-2"
            >
              <option value="">Todas las etapas</option>
              {(Object.keys(ETAPA_CONFIG) as EtapaCliente[]).map((e) => (
                <option key={e} value={e}>{ETAPA_CONFIG[e].label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <>{[1, 2, 3, 4].map((i) => <ConversacionSkeleton key={i} />)}</>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-xs text-muted-foreground">Error al cargar conversaciones</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Sin conversaciones</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected    = conv.id === selectedId;
            const ultimoMensaje = conv.ultimoMensaje;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50',
                  isSelected ? 'bg-secondary' : 'hover:bg-secondary/50',
                )}
              >
                <div className="relative flex-shrink-0">
                  <Avatar nombre={conv.cliente.nombre} className="h-10 w-10 text-sm" />
                  {conv.oportunidadDetectada && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{conv.cliente.nombre}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {conv.noLeidos > 0 && (
                        <span
                          className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-bold"
                          style={{ background: 'rgba(245,158,11,0.25)', color: '#fbbf24' }}
                        >
                          {conv.noLeidos}
                        </span>
                      )}
                      {ultimoMensaje && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(ultimoMensaje.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CanalBadge canal={conv.cliente.canal} />
                    <EtapaBadge etapa={conv.cliente.etapa} />
                  </div>
                  {ultimoMensaje && (
                    <p className="text-xs text-muted-foreground truncate">{ultimoMensaje.contenido}</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}
